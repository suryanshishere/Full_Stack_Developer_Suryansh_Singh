---
title: The refactor
subtitle: One real handler, taken apart and put back together, with tests that prove the behaviour survived and six defects did not
order: 3
---

Everything on this page runs. `npm test` in [`task_b/`](https://github.com/suryanshishere/Full_Stack_Developer_Suryansh_Singh/tree/main/task_b)
executes 29 tests against both versions of the code.

---

## Why this file

`pages/api/subscriptions/change-plan.ts` is the busiest money path we have — around 400 requests a
day, every one of them changing what a customer pays. It is finding 6 in the
[assessment](01-assessment.html), it is the source of most of the *charged wrong amount* tickets,
and it is 40 lines long, which makes it small enough to show honestly on a page.

It is also representative rather than exceptional. Six other handlers look like this.

## The code as I found it

```ts
import { database } from "../support/database";
import { payments } from "../support/payments";
import { mailer } from "../support/mailer";

const PLAN_PRICES: Record<string, number> = {
  starter: 2400,
  classic: 3600,
  deluxe: 5400,
};

const PAYMENT_API_KEY = "sk_live_<the-real-one-was-committed-here-in-2021>";

export async function POST(req: Request) {
  const body = await req.json();
  const userId = req.headers.get("x-user-id");

  const rows = await database.query(
    `SELECT * FROM subscriptions WHERE id = '${body.subscriptionId}'`
  );
  const sub = rows[0];

  let price = PLAN_PRICES[body.newPlan];
  if (sub.discount_percent) {
    price = price - (price * Number(sub.discount_percent)) / 100;
  }
  if (body.promoCode === "SAVE10") {
    price = price * 0.9;
  }
  price = Math.round(price);

  await database.query(
    `UPDATE subscriptions SET plan = '${body.newPlan}', price_cents = ${price}, updated_at = '${new Date().toISOString()}' WHERE id = '${body.subscriptionId}'`
  );

  await payments.updateSubscriptionPrice(String(sub.payment_ref), price);

  await database.query(
    `INSERT INTO subscription_events (subscription_id, type, detail, actor_id, created_at) VALUES ('${body.subscriptionId}', 'plan_changed', '${body.newPlan}', '${userId}', '${new Date().toISOString()}')`
  );

  await mailer.sendNow(String(sub.email), `Your plan is now ${body.newPlan}`);

  return Response.json(sub);
}
```

Read quickly, it looks fine. It is short, it reads top to bottom, and it does what its name says.
That is exactly why it survived six years of review.

## What is actually wrong with it

Six defects, each with a test that demonstrates it rather than asserts it.

**1. It never checks who is asking.** `userId` is read on line 2 and then used only to stamp the
audit row. Nothing compares it to `sub.user_id`. Any signed-in customer can change any other
customer's plan by passing a different `subscriptionId` — the classic broken object-level
authorisation, and the single worst thing in the file.

**2. The id goes straight into SQL.** `subscriptionId` is concatenated into three statements. A
value of `nope' OR '1'='1` makes the `WHERE` clause match every row, so the `UPDATE` rewrites
*every subscription in the table*. One request, whole customer base on the starter plan.

**3. An unknown plan produces `NaN`.** Nothing validates `newPlan`. `PLAN_PRICES["premium"]` is
`undefined`, arithmetic on it gives `NaN`, `Math.round(NaN)` is still `NaN` — and that goes into
the database and to the payment provider.

**4. Three writes, no transaction, an external call in the middle.** The row is updated, then
Stripe is called, then the event is inserted. When Stripe fails, the customer is on the new plan,
has not been charged for it, and — because the failure happens before the `INSERT` — there is no
event recording that anything happened. Invisible, unbilled plan changes.

**5. The email is sent inside the request.** If the mail provider is slow the customer waits; if it
throws, the request 500s *after* the money moved. The client retries, and the retry charges again.

**6. The response is stale and leaks.** `sub` was read before the update, so the caller gets the
*old* plan back after a successful change. It is also the raw row, so it includes
`internal_notes` ("Churn risk, flagged by retention") and `payment_ref`.

Plus the live Stripe key sitting in the source, which is finding 2 from the assessment and is
fixed by rotation, not refactoring.

## Step one: pin the behaviour before changing anything

The first thing I wrote was not a fix, it was eight tests describing what this handler does today.

Characterization tests answer one question — *if I change this, what breaks?* — for a system with
no specification. They are written against current behaviour, including behaviour I think is
wrong. The promo code stacking on top of the account discount, for instance, might be a bug. It is
not my call, it is Dani's, and until someone decides, changing it during a refactor would be
smuggling a business decision into a technical change.

The tests take the handler as a parameter and run against **both** implementations:

```ts
describe.each(implementations)("%s: a customer upgrades their own plan", (_name, handler) => {
  it("stacks a promo code on top of the account discount", async () => {
    const outcome = await call(handler, {
      actorId: "user_ben",
      body: { subscriptionId: "sub_ben", newPlan: "deluxe", promoCode: "SAVE10" },
    });

    expect(outcome.paymentCalls).toEqual([{ reference: "pay_ben_4417", priceCents: 3645 }]);
  });
});
```

That is the whole safety net. If the refactored version charges a different amount, gets the
discount order wrong, writes a different event, or touches another customer's row, the suite goes
red — and it goes red pointing at the old behaviour as the correct one.

## Step two: the refactor

Three files, each with one job.

**`pricing.ts` — the rules, with nothing else attached**

```ts
export const PLAN_PRICES = { starter: 2400, classic: 3600, deluxe: 5400 } as const;

export type PlanName = keyof typeof PLAN_PRICES;

export function isPlanName(value: unknown): value is PlanName {
  return typeof value === "string" && value in PLAN_PRICES;
}

export function priceForPlan(input: {
  plan: PlanName;
  accountDiscountPercent: number;
  promoCode?: unknown;
}): number {
  const listPrice = PLAN_PRICES[input.plan];
  const afterAccountDiscount = listPrice * (1 - clampPercent(input.accountDiscountPercent) / 100);
  const afterPromo =
    afterAccountDiscount * (1 - clampPercent(promoDiscountPercent(input.promoCode)) / 100);
  return Math.round(afterPromo);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, 100);
}
```

No database, no request, no framework. It imports nothing. This is the file the finance team can be
walked through, and the one the mobile app can eventually share instead of reimplementing for a
fourth time. `clampPercent` also means a corrupt `discount_percent` of `-500` or `9999` can no
longer produce a negative charge.

**`subscriptions.ts` — the decisions**

```ts
export async function changePlan(
  actor: Actor,
  input: ChangePlanInput,
  now: Date = new Date()
): Promise<SubscriptionView> {
  const subscription = await database.findSubscription(input.subscriptionId);
  if (!subscription) {
    throw new DomainError(404, "subscription_not_found", "Subscription not found");
  }
  if (subscription.user_id !== actor.id) {
    throw new DomainError(403, "not_your_subscription", "This subscription belongs to someone else");
  }

  const priceCents = priceForPlan({
    plan: input.newPlan,
    accountDiscountPercent: Number(subscription.discount_percent ?? 0),
    promoCode: input.promoCode,
  });

  const changedAt = now.toISOString();
  const updated = await database.transaction(async (tx) => {
    const row = await tx.applySubscriptionChange(input.subscriptionId, {
      plan: input.newPlan,
      priceCents,
      changedAt,
    });
    await tx.recordEvent({
      subscriptionId: input.subscriptionId,
      type: "plan_changed",
      detail: input.newPlan,
      actorId: actor.id,
      createdAt: changedAt,
    });
    await payments.updateSubscriptionPrice(String(subscription.payment_ref), priceCents);
    return toView(row);
  });

  mailer.enqueue(String(subscription.email), `Your plan is now ${input.newPlan}`);

  return updated;
}
```

The ownership check is here, in the service, not in the handler and not in the UI — because this
function is the only way to change a plan, so there is no second door to forget to lock. `now` is
injected so time is testable. The email is enqueued *after* the transaction commits, so a mail
outage can no longer fail a payment that already succeeded.

**`route.ts` — the transport**

```ts
export async function POST(req: Request) {
  const actorId = req.headers.get("x-user-id");
  if (!actorId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const input = parseChangePlanInput(await req.json().catch(() => null));
    const subscription = await changePlan({ id: actorId }, input);
    return Response.json(subscription);
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
```

Fourteen lines that know about HTTP and nothing about coffee subscriptions. Establish who is
calling, parse, delegate, map errors to status codes. A second caller — the mobile app, an admin
tool, a scheduled job — reuses `changePlan` and inherits every rule automatically.

## Step three: prove it

```
✓ before: a customer upgrades their own plan > moves the subscription to the new plan
✓ before: a customer upgrades their own plan > charges the list price when the account has no discount
✓ before: a customer upgrades their own plan > applies the account discount
✓ before: a customer upgrades their own plan > stacks a promo code on top of the account discount
✓ before: a customer upgrades their own plan > ignores an unrecognised promo code
✓ before: a customer upgrades their own plan > records exactly one plan_changed event attributed to the caller
✓ before: a customer upgrades their own plan > leaves other customers untouched
✓ before: a customer upgrades their own plan > notifies the customer that their plan changed
✓ after:  a customer upgrades their own plan > moves the subscription to the new plan
✓ after:  a customer upgrades their own plan > charges the list price when the account has no discount
✓ after:  a customer upgrades their own plan > applies the account discount
✓ after:  a customer upgrades their own plan > stacks a promo code on top of the account discount
✓ after:  a customer upgrades their own plan > ignores an unrecognised promo code
✓ after:  a customer upgrades their own plan > records exactly one plan_changed event attributed to the caller
✓ after:  a customer upgrades their own plan > leaves other customers untouched
✓ after:  a customer upgrades their own plan > notifies the customer that their plan changed

Test Files  2 passed (2)
     Tests  29 passed (29)
```

The same eight assertions pass against both. Customers who use this feature correctly cannot tell
the difference, which is the definition of a refactor.

The other thirteen tests are the ones that separate them:

| Defect | Before | After |
|---|---|---|
| Ben changes Ana's plan | `200`, write succeeds | `403`, nothing written |
| `nope' OR '1'='1` as the id | every subscription rewritten | `404`, nothing matched |
| Unknown plan `premium` | `NaN` written and sent to Stripe | `422`, nothing written |
| Stripe times out mid-request | plan changed, unbilled, no audit row | rolled back completely |
| Mail provider fails | request 500s, retry double-charges | `200`, mail queued, charged once |
| Response body | stale plan, `internal_notes`, `payment_ref` | current values, four public fields |
| No auth header | proceeds anyway | `401` |

## What I did not change, on purpose

Restraint is most of the skill in a refactor on a live system:

- **The promo and discount stacking rule.** Still compounds. It may well be wrong, and it now
  lives in one readable function so the conversation can happen — but a refactor is not where you
  settle a pricing question.
- **The response field names.** `plan` and `id` keep their names even though the new object is
  camelCase elsewhere, because a mobile client I cannot redeploy reads them.
- **Rounding.** Still `Math.round` at the end. Same inputs, same pennies.
- **The endpoint, method and status codes for existing valid requests.** Unchanged.

Everything I *did* change in observable behaviour was a defect fix or a deliberate call, and there
are exactly two of the latter: the response body no longer includes internal columns, and the
notification is queued rather than sent inline. Both are listed in the pull request description,
because a reviewer should never have to discover a behaviour change by reading a diff.

## What this still does not fix

I would rather be honest about the edges than oversell the change.

**A database transaction and an external API call are not atomic.** Wrapping the Stripe call in
the transaction closes the common failure — we no longer commit a plan we failed to bill. The
remaining window is the reverse: Stripe succeeds and our commit fails, leaving Stripe ahead of us.
Two things make that survivable, and neither is in this diff:

- an **idempotency key** derived from the subscription, plan and price, so a retry cannot
  double-charge;
- the **nightly reconciliation job** from the [migration plan](02-migration-plan.html), which
  compares our rows against Stripe and reports drift.

**Holding a transaction open across a network call holds a row lock.** That is a real cost. It is
acceptable here because the transaction touches one row and the payment client has a three-second
timeout, so worst case one customer's row is locked for three seconds. If contention appears, the
next step is an outbox: commit locally, publish an intent, let a worker call Stripe with
retries. I did not start there because the outbox needs a worker, a queue and a monitoring story,
and this version ships on Thursday.

**The test doubles are doubles.** `support/database.ts` is an in-memory stand-in for Postgres with
snapshot-based rollback. It makes the demonstration runnable in under a second with no setup; it
does not prove Postgres behaves identically. In the real migration these same characterization
tests run against a real database in CI.

## How it ships

Behind a flag, in five steps, exactly as set out in month 1 of the migration plan: internal
accounts, then 5% for 48 hours, then a ramp to 100%, then delete the old handler a week later once
a billing cycle has passed through the new one. The rollback is flipping the flag — not a revert,
not a redeploy — because at 3am on a billing day the only acceptable rollback is one a tired person
cannot get wrong.

## Why this is worth doing four more times

The refactor removed a data breach, a mass-update vulnerability, a corrupt-price bug, a class of
silent billing drift, a double-charge on retry, and an information leak. But the durable win is
smaller and duller: **there is now one place where a plan change happens.**

Every future rule — annual plans, regional pricing, pausing a subscription — has one obvious home,
one set of tests, and one door that everything must come through. That is what makes the next
change cheap, and cheap changes are the only thing that actually stops a codebase getting into
this state again.
