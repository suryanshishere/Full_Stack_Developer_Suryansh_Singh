---
title: Migration plan
subtitle: What ships in week 1, month 1 and quarter 1 — every step small, reversible, and shipped while the business keeps selling
order: 2
---

**Companion to the [assessment](01-assessment.html).** That document says what is wrong and in
what order. This one says what actually ships, who does it, how we know it worked, and how we undo
it at 3am.

---

## The constraints I am planning against

- **The site cannot go down.** Billing days are the first week of the month; nothing risky ships
  in that window.
- **Four engineers and a part-time contractor**, all currently committed to product work.
- **The business has a roadmap** and did not hire me to stop it. Product delivery continues at
  roughly 70% of capacity throughout.
- **Peak season is November.** Everything structural lands before October.
- **Nobody on the team has worked with a test suite here.** Plans that assume unfamiliar practice
  arrives fully formed are fiction.

## The rules this plan follows

1. **No big-bang.** Nothing in here requires a moment where the old system stops and the new one
   starts.
2. **Every step ships on its own.** If the plan is cancelled after any given week, what shipped so
   far still has value and nothing is left half-migrated.
3. **Every step has a written rollback**, rehearsed for the risky ones.
4. **Additive before subtractive.** Add the new path, move traffic to it, delete the old path last
   — usually a week later, once it has survived a billing cycle.
5. **The team does the work; I do the unglamorous parts.** I take the credential rotation and the
   first characterization tests. Ownership has to end up with the people who stay.

## Capacity, stated honestly

| | Product work | Rescue work |
|---|---|---|
| Week 1 | 60% | 40% — mostly me and Marcus |
| Weeks 2–4 | 70% | 30% |
| Quarter 1 | 70% | 30% |

That is about six engineer-days a week. It is deliberately modest: a plan that needs 60% capacity
gets negotiated down to 20% in month two anyway, and I would rather commit to something we hit
every week for a quarter than something impressive that slips.

---

## Week 1 — stop the bleeding

**Goal:** close the two live exposures, and be able to see and undo what we do. No architecture
changes. No refactoring. Not one route handler is touched this week.

| Day | Ships | Verified by | Rollback |
|---|---|---|---|
| Mon | Error tracking and uptime alerting in production | Deliberately throw in a canary route; alert fires within 60s | Remove the SDK; it is additive |
| Mon | Inventory of every consumer of the database credential | Reviewed with Marcus and Dani | n/a — document only |
| Tue | CI pipeline: build, deploy, one-command rollback | Deploy a no-op change through it; roll it back | Laptop deploy path stays available all week |
| Wed | Row-level security in **log-only** mode on all tables | 24h of "would have denied" logs, reviewed | Flag off, single setting |
| Thu | RLS **enforced** on `customers`, then `subscriptions`, then `orders` | Account pages walked manually per table; denial log empty | Per-table, revert one at a time |
| Thu 04:00 | Stripe key rotated via dual-key window | Test charge on new key; old key traffic drops to zero | Old key still live for 24h |
| Fri 04:00 | Database password rotated, secrets moved to managed store | Smoke test all consumers from the Monday inventory | Old password restorable; rehearsed Thursday |
| Fri | Git history purged, push-time secret scanning enabled | Scanner blocks a deliberately planted fake key | Scanning is advisory for 48h before it blocks |

**Definition of done for week 1:** no customer can read another customer's row; no credential in
the repository works; an incident pages someone within a minute; anyone on the team can deploy and
roll back without Marcus.

**What we do not do:** delete the old deploy path, touch business logic, or start writing tests.
Week 1 buys safety, nothing else.

**Biggest risk this week is the Friday rotation.** It is the one step that can take the site down.
Mitigations: complete consumer inventory on Monday, a full rehearsal against staging-in-name-only
(a copy of the VPS) on Thursday, a 04:00 window, both of us awake, and the old password held ready
for 24 hours before it is revoked.

---

## Month 1 — build the net, then make the first cut

**Goal:** be able to change the money paths without fear, then change one. By the end of the
month, one module is properly structured and the pattern is visible to everyone.

### Weeks 2–3: the safety net

**Characterization tests on the three money paths** — checkout, plan change, cancellation. These
tests pin down what the system *does today*, bugs included. Where behaviour is wrong, the test
records the wrong behaviour and gets a linked ticket. That feels strange to write and it is the
whole point: you cannot prove a refactor is safe against a specification nobody wrote down.

I write the first path myself, in a pairing session with whoever owns billing. The second is
written by them with me watching. The third they do alone. Three weeks later nobody remembers
these were "my" tests.

**A staging environment** from a sanitised production dump — real data volumes, scrambled personal
details. Without it, "we tested it" means "it worked on a laptop with eleven rows".

**Individual admin accounts**, shared login disabled, administrative actions attributed to a
person. One day of work; closes finding 7.

**Node 18, then 20; security advisories only.** No feature-driven upgrades yet.

### Week 4: the first real fix

**Transactions and idempotency on the plan-change path** — the [worked
refactor](03-refactor.html). It ships behind a flag:

1. New service path added alongside the old handler; flag off.
2. Enabled for internal accounts only. We change our own plans, deliberately break things.
3. Enabled for 5% of traffic for 48 hours, watching the error rate and payment-failure rate.
4. Ramped to 100% over three days.
5. Old code path deleted a week later, after one billing cycle has passed through the new one.

**Rollback:** flip the flag. Not a redeploy, not a revert — a flag, because at 3am on a billing day
the only acceptable rollback is one that a tired person cannot get wrong.

**A nightly reconciliation job** comparing our subscription rows against Stripe, reporting drift
into Slack. This is worth more than it looks: it turns finding 6 from an invisible problem into a
number we can watch go down, and it keeps working as a safety net long after the code is fixed.

**Definition of done for month 1:** the three money paths have characterization tests running in
CI on every push; plan changes are transactional and idempotent behind a flag at 100%; drift
against Stripe is reported nightly and trending to zero; every engineer has deployed through CI at
least once.

**And we ship product.** At 70% capacity the roadmap continues. This matters more than it sounds —
the fastest way to lose permission for this work is for month 1 to produce nothing the business
recognises.

---

## Quarter 1 — strangle the monolith's worst habits

**Goal:** business logic out of route handlers, module by module, with the old code deleted as we
go. No rewrite, no parallel system, no branch that lives for a month.

### The pattern, applied repeatedly

For each domain — pricing, subscriptions, orders, inventory — the same five steps:

1. Characterization tests around the existing behaviour.
2. Create the service module; move the logic; the handler calls it and does nothing else.
3. Point one caller at it behind a flag; ramp.
4. Point the remaining callers at it, including the mobile app's endpoint.
5. Delete the duplicated logic. **This step is not optional and it is not "later".** Strangler
   patterns that skip the deletion produce two implementations instead of one, which is worse
   than where we started.

One module per fortnight. Six sprints, four modules, two sprints of slack — because there will be
an incident, someone will be on holiday, and a plan with no slack is a plan that fails in week
three and then gets abandoned entirely.

### Also in the quarter

**Frontend direct-database burn-down.** There are 31 direct Supabase calls in the frontend today.
The number goes on a dashboard and only ever goes down. Each one becomes an API endpoint as its
module gets extracted. RLS made them safe in week 1; this makes them unnecessary.

**Schema changes by expand and contract**, so no migration ever needs a maintenance window:
add the new column, write to both, backfill, read from the new one, stop writing the old, drop it.
Five deploys instead of one, every one of them reversible.

**A coverage ratchet, not a coverage target.** Coverage on changed lines must not fall. No number
is set, nobody is asked to backfill tests for code they are not touching, and the trend goes one
way. Targets invite gaming; ratchets just close the door behind you.

**The standards land**, in the sequence set out in the [standards proposal](04-standards.html) —
mechanical rules first, architectural ones only once the modules exist to demonstrate them.

**A performance pass in October**, before peak: the N+1 on the orders page, missing indexes on
`subscriptions(user_id)` and `orders(created_at)`, and a load test at three times December's peak.

**Definition of done for the quarter:** pricing has exactly one implementation and the mobile app
uses it; direct database calls from the browser are under five and scheduled; every money path is
transactional, idempotent and covered; the deploy path is boring; the reconciliation job reports
zero drift for four consecutive weeks.

---

## What is explicitly not in this plan

| Not doing | Why |
|---|---|
| Rewrite | A year of no product delivery to arrive back where we are, minus the bugs we forgot to reimplement |
| Framework migration | Solves none of the nine findings |
| Microservices | Four engineers. This is a distribution problem we do not have |
| 80% coverage mandate | Produces tests written to hit a number; the ratchet produces tests that catch bugs |
| Backfilling tests across the codebase | Test what you touch. Untouched code is not where the risk is |
| Replacing Supabase | It is fine. It was configured badly, which we fixed in week 1 |

---

## How we know it is working

Four numbers, reviewed monthly, on the wall:

| Measure | Today | Target at 90 days |
|---|---|---|
| Change failure rate | ~1 in 4 deploys needs a follow-up fix | Under 1 in 10 |
| Time to detect an incident | ~3 hours | Under 5 minutes |
| Billing drift found by reconciliation | Unknown — we cannot see it | Zero, four weeks running |
| Direct database calls from the browser | 31 | Under 5 |

Deliberately not measured: lines refactored, test count, coverage percentage. Those measure
activity, and activity is what a rescue plan produces when it has stopped producing outcomes.

## What could derail this, and what we do

**An incident eats week 3.** Expected. The two slack sprints exist for this. We drop scope, not
sequence — the order is the part that matters.

**The business needs a big feature in month 2.** Fine. Rescue work drops to 15% for that sprint
and the quarter extends. What does not happen is the safety net being skipped so the feature can
land faster, because that trade is how the current situation was built.

**RLS breaks an account page we did not think about.** Most likely week-1 failure. Log-only mode
for 24 hours first, per-table enforcement, and each table reverts independently.

**The team does not adopt the practices.** The real risk, and the one the [standards
proposal](04-standards.html) is about. Signals I would watch for: characterization tests only ever
written by me, or the flag ramp being skipped "just this once".

**I leave.** Everything here is documented, the work is done by the team rather than by me, and no
step depends on a person. That is not modesty, it is a design requirement — a plan that only works
while its author is present is a bus factor, which is finding 4 wearing a different hat.
