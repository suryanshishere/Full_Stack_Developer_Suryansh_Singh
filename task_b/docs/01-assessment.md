---
title: Assessment
subtitle: What I found in two weeks, what it costs us to leave it, and the order I would fix it in
order: 1
---

**To:** Dani (CTO), engineering team
**From:** Suryansh, senior engineer — week 2
**Status:** for discussion Thursday. Nothing here has been actioned.

---

## The short version

Crateful works. Eleven thousand people get a coffee box every month and the money mostly arrives,
which is more than a lot of six-year-old codebases can say. The team built a real business under
real deadlines and I am not here to relitigate those trade-offs.

Two of the things I found are live exposures that need closing this week, and neither of them is a
code quality problem. The rest is debt that is slowing you down and quietly costing money, and it
should be paid down in a specific order — not the order an engineer's instincts suggest.

The thing I most want to argue for is this: **we do not touch the architecture first.** The messy
route handlers are the most visible problem and the least urgent one. What we fix first is what is
leaking, then we buy the ability to change things safely, and only then do we change them.

---

## What I did, and what I did not do

Over two weeks I read the codebase end to end, walked the deploy, sat with Priya in support for two
afternoons, read every incident note since January, and ran a read-only audit of the database and
the repository history. I opened one pull request, and it only added a README.

I have changed nothing. On a system that cannot go down, the first two weeks of a new senior hire
should be the cheapest two weeks the company ever gets — all observation, no risk.

**Where I looked**

| Source | What it told me |
|---|---|
| Repository history, all 6 years | When shortcuts were taken and why; who has had access |
| Support inbox, tagged tickets | What customers actually experience when we get it wrong |
| Incident notes since January | How we find out about failures, and how long it takes |
| A deploy, shadowed | Bus factor, rollback story, what "cannot go down" means in practice |
| Read-only database session | Data volumes, what is exposed, what is indexed |
| My own test account + browser devtools | What a customer can reach that they should not |

**Context for anyone reading this later:** Crateful is a direct-to-consumer speciality coffee
subscription. About 11,000 active subscribers, roughly £320k monthly recurring revenue, four
engineers plus a part-time contractor. Next.js on the pages router, Node 16, Postgres behind
Supabase, Stripe for payments, deployed to a single VPS.

---

## Findings, in the order I would fix them

Ordered by expected harm, not by how much the code annoys me.

| # | Finding | If we leave it | Likelihood | Cost of delay | Fix by |
|---|---|---|---|---|---|
| 1 | Browser reads the database directly, row-level security off | Any customer can read every customer's name, address and order history | Happening now | Reportable breach, unbounded | Week 1 |
| 2 | Live payment and database credentials committed to the repo | Anyone with a clone can charge, refund, or read everything | High | Existential, silent | Week 1 |
| 3 | No error tracking or alerting | We learn about outages from Twitter | Every incident | Hours of unnecessary downtime | Week 1 |
| 4 | Deploys run from one laptop, no rollback | A bad release on a peak day has no fast undo | Medium | A day of orders | Week 1 |
| 5 | No tests, no CI | Nothing above can be fixed safely; the team is right to be scared | Certain | Blocks everything else | Month 1 |
| 6 | Money paths have no transactions or idempotency | Customers charged the wrong amount; manual reconciliation | Weekly | Revenue + trust + support time | Month 1 |
| 7 | One shared admin login | No attribution for refunds or data access | Ongoing | Fails diligence; insider risk | Month 1 |
| 8 | Business logic inside route handlers | Pricing rules drift; every change is archaeology | Ongoing | Velocity, compounding | Quarter 1 |
| 9 | Node 16 (end of life), dependencies 3 years stale | Known CVEs, and we cannot adopt better tooling | Medium | Grows quietly | Quarter 1 |

Findings 1 and 2 are both week 1, and people will reasonably ask which comes first. I would close
1 first: exploiting it requires nothing but a free account and the browser devtools, so the
population who *could* is every customer we have. Finding 2 has higher impact per actor but a
bounded population — fourteen people have ever had repository access. Wider and easier beats
deeper and harder.

---

## The findings in detail

### 1. The storefront talks to the database directly, with row-level security switched off

The account pages use the Supabase client straight from the browser with the shared anon key.
That is a supported way to use Supabase, but only with row-level security enabled, and it is
enabled on none of the six tables that matter.

I signed up as a customer with my own email and, from the browser console, read the full
`customers` table — names, delivery addresses, emails, subscription status — in about four
minutes. No special tooling. The key is in the page source of every visitor.

**Risk of leaving it:** this is not a bug that might cause harm later, it is a live exposure of
every customer record we hold. One curious customer, one bored teenager, one competitor. If
anyone has already done this we have no way to know, because there is no query logging. Under UK
GDPR this is a notifiable breach with a 72-hour clock that starts when we become aware — so the
worst version of this story is finding out from a journalist.

**What fixed looks like:** row-level security enforced on every table; the browser can read only
rows it owns. Reads that cannot be expressed as ownership move behind the API.

**Risk of the fix:** enabling RLS blind will break pages, and broken account pages on a
subscription site means cancellations. So it goes on in log-only mode first, we watch which
queries *would* have been denied for a day, then enforce table by table starting with
`customers`. Each table is a separate, revertible change.

### 2. Live credentials are committed to the repository

`.env.production` was committed in March 2021 and is still in the history. It contains a live
Stripe secret key, the Postgres connection string with the owner password, and the session signing
secret. The Stripe key still works; I checked with a zero-amount authorisation, which is the least
invasive test I could think of, and told Dani before I ran it.

Fourteen people have had access to this repository, including three contractors whose engagements
ended in 2022 and 2023. Their laptops still have clones.

**Risk of leaving it:** a live payment key allows creating charges and issuing refunds. The
session secret allows forging an admin session. The database password, combined with finding 1's
network exposure, is full read-write access to everything. There is no alerting on any of it, so
misuse would be silent. The exposure did not start when I found it; it started in 2021 and has
been growing since.

**What fixed looks like:** every credential rotated, secrets in a managed store injected at
deploy, history purged, push-time scanning so it cannot recur.

**Risk of the fix:** rotating the database password will take the site down if a consumer is
missed — and I have already found two I did not expect, a Metabase dashboard and a Zapier
integration that syncs to the warehouse. So: inventory every consumer first, rotate the payment
key using Stripe's dual-key window so both work during the cutover, and rotate the database
password in the Tuesday 04:00 trough with the old password ready to restore. Rotation is the
riskiest thing we do in week 1 and it gets a rehearsal and a written rollback.

### 3. We cannot see production

No error tracking, no alerting, no dashboards. Uptime is checked by someone opening the site.
Reading the incident notes: of the nine incidents since January, seven were first reported by a
customer, and the median time from failure to anyone noticing was just over three hours.

**Risk of leaving it:** every hour of every incident is longer than it needs to be. More
importantly, this blocks everything else on this list — I am about to start changing a system
that cannot go down, and right now the feedback signal for "did that break something" is a
customer's tweet. Observability is not a maturity milestone here, it is the safety equipment for
the rest of the work.

**Risk of the fix:** almost none. It is additive, it touches no business logic, and it can be
turned off. This is why it goes in week 1 despite not being an exposure — it is nearly free and it
makes everything after it safer.

### 4. Deploys run from Marcus's laptop and there is no way back

Deploying is `git pull && npm run build && pm2 restart` over SSH, run by one person. No staging.
Rolling back means reverting the commit and repeating the process, which took 25 minutes the last
time it happened. If Marcus is on a train, we cannot ship a fix.

**Risk of leaving it:** the failure mode is a bad deploy during a peak window — and for a
subscription box, peak is billing day, when a broken checkout costs orders that do not come back.
Bus factor one on the deploy path of a system that cannot go down is the sort of risk that reads
as fine right up until the day it is not.

### 5. There are no tests and no CI

Zero test files in six years. This is not a moral failing, it is what happens when a small team
ships continuously under pressure, and the codebase's shape — logic welded into route handlers —
makes tests genuinely hard to write, which made skipping them rational each individual time.

**Risk of leaving it:** on its own it harms no customer today. But it is the multiplier on
everything else here. Every fix above is a change to a system nobody can verify. It is also the
reason the team avoids the billing code, which is the reason the billing bugs in finding 6 have
survived so long. Fear of a codebase is a rational response to the absence of a safety net, and
you do not fix it with encouragement.

This is why tests come before the architectural work rather than alongside it. **A refactor
without characterization tests is not a refactor, it is a rewrite with extra confidence.**

### 6. The money paths have no transactions and no idempotency

`pages/api/subscriptions/change-plan.ts` and the checkout handler both do the same thing: write to
the database, call Stripe, write again. No transaction, no idempotency key. If Stripe times out
between the writes, the database says one thing and Stripe says another, and nothing detects it.

Support has 23 tickets tagged *charged wrong amount* in six months. Priya reconciles each one by
hand against the Stripe dashboard, roughly 40 minutes each. That is a fortnight of someone's year
spent on a bug we could fix in a day.

**Risk of leaving it:** direct revenue leakage, refunds we should not owe, and a support burden
that scales with growth. It also erodes something harder to rebuild: a coffee subscription is a
low-consideration purchase, and people cancel over a wrong charge rather than complain about it.

This is the file I refactor in the [worked example](03-refactor.html).

### 7. Everyone shares one admin login

`admin@crateful.co` with a password in the team's shared notes. Refunds, address changes and
subscription cancellations are all performed through it, and the audit log — where one exists —
records `admin` as the actor.

**Risk of leaving it:** we cannot attribute any administrative action to a person. That is an
insider risk we currently could not investigate, it makes offboarding meaningless, and it will
fail the first serious due diligence we face. Individual accounts are a day of work.

### 8. Business logic lives inside route handlers

Pricing appears in four places with three different rounding behaviours, and the mobile app
reimplements it a fourth way. There is no single answer to "what does a deluxe box cost for a
customer with a 25% legacy discount and a promo code" — there are four answers, and which one you
get depends on which surface you asked.

**Risk of leaving it:** this one is almost pure velocity cost, which is exactly why it is eighth
and not first. It makes every pricing change slow and frightening, it guarantees the web and
mobile experiences drift, and it makes the code untestable — which loops back into finding 5. It
is the largest body of work here and the least urgent, and confusing "most annoying" with "most
urgent" is the classic way a rescue plan gets cancelled in month two.

### 9. Node 16 and three-year-old dependencies

Node 16 left security support in September 2023. `npm audit` reports 47 advisories, 6 of them high
severity in packages that touch request handling.

**Risk of leaving it:** the honest answer is that most advisories are not exploitable in our
configuration, and I am not going to inflate this to make it sound urgent. The real cost is that
being this far behind blocks the tooling that makes everything else cheaper, and the gap grows on
its own. It gets fixed in quarter 1, security advisories first.

---

## How I ordered these

Five rules, applied in this sequence:

1. **Stop the leaking before fixing the plumbing.** Anything actively exposing customer data or
   money outranks everything else, no matter how good the code around it looks.
2. **Buy the ability to see and to verify before changing anything substantial.** Observability
   and tests are not deliverables the business will ever ask for, and they are the prerequisite
   for doing the rest without an outage.
3. **Cost to customers beats cost to engineers.** Anything that harms customers or loses money
   outranks anything that merely slows us down. Finding 8 is the one I most want to fix and it
   waits.
4. **Cheap and reversible jumps the queue.** Error tracking is not urgent, but it is a morning's
   work, touches nothing, and makes every later step safer. Sequence by value per risk, not by
   severity alone.
5. **Unblocking work counts as value.** Tests score higher than their direct impact because six
   other items get safer once they exist.

**If I could only do one thing:** enable row-level security. It is the only finding where the harm
is unbounded, ongoing, and invisible to us.

---

## The incident I expect if we change nothing

Not a prediction, a pre-mortem — this is the shape of what the current findings produce.

It is a billing day in the first week of the month, our highest-traffic morning. A Stripe API
incident causes elevated timeouts for about twenty minutes. Several hundred plan changes and
renewals hit the path in finding 6: the database is updated, the Stripe call fails, no event is
written. Customers are now on plans they were never charged for, and there is no record that it
happened.

We do not notice, because of finding 3. Support starts seeing tickets four hours later, and Priya
reconciles them one at a time, because that is the only tool we have. Around day three someone
notices the shortfall in the revenue report, and by then the affected set has to be reconstructed
by reading Stripe's logs against our rows — for accounts where finding 8 means we cannot even
recompute with certainty what we *should* have charged.

Nothing in that story requires an attacker or an unlikely coincidence. It requires one dependency
to have a bad twenty minutes, which Stripe openly reports doing a few times a year.

---

## What I am deliberately not proposing

- **No rewrite.** The system works and it earns money. A rewrite would take a year, and the team
  would spend that year unable to ship anything the business wants.
- **No framework migration.** Moving off the pages router is a real improvement that solves none
  of the nine findings.
- **No microservices, no Kubernetes.** Four engineers. A monolith we can test is the correct
  architecture for this company for the next two years.
- **No code freeze.** Product work continues throughout. A plan that stops the business is a plan
  that gets cancelled in week three, and it should be.
- **No blame archaeology.** I know who wrote what because I read the history. It is not
  interesting. Every shortcut here was a reasonable trade at the time by people with less
  information and less runway.

---

## What I need

1. **Roughly 30% of engineering capacity** for a quarter. Not a freeze, not a task force — about
   a day and a half per engineer per week, protected.
2. **A two-hour maintenance window** on a Tuesday morning for the credential rotation, with
   Marcus and me both available.
3. **A decision on finding 1 by Friday.** If we agree it is a live exposure, we should also agree
   now what we would do if we found evidence it had been used, because that decision is much
   worse to make in the middle of it.
4. **Air cover for the boring work.** Weeks 1 and 2 produce almost nothing a customer can see. If
   that reads as a new hire not delivering, the plan dies at exactly the moment it is doing its
   most valuable work.

The [migration plan](02-migration-plan.html) sets out what ships in week 1, month 1 and quarter 1,
and how each step rolls back.
