---
title: Engineering standards
subtitle: Ten rules worth having, how each one is enforced by a machine rather than a person, and how to get a team that has heard this before to actually adopt them
order: 4
---

## Start by admitting why this usually fails

I have watched standards documents die three times. They die the same way each time: someone
senior writes an excellent document, everyone agrees in the meeting, and six weeks later the only
person who mentions it is the author, in code review, sounding increasingly like a nag.

The failure is never the content. It is that the standard asked people to remember something, at
the exact moment they were under pressure to ship. A rule enforced by human vigilance is a rule
with a half-life.

So there is one idea underneath all of this: **if a standard matters, a machine enforces it. If no
machine can enforce it, it is not a standard, it is advice — and it should be written down as
advice and not pretended otherwise.**

The second idea matters just as much. This team is not resistant because they are careless. They
are resistant because they shipped a real business with four people and no runway, every shortcut
was a rational trade at the time, and a new senior hire arriving with a document about quality is
a genre they have seen before. Any plan that does not take that seriously deserves to fail.

---

## The standards

Ten rules. Each one exists because of something specific in the
[assessment](01-assessment.html), and each one has an enforcement mechanism that is not a person.

| # | Standard | Enforced by | On failure |
|---|---|---|---|
| 1 | Formatting is automatic and never discussed | Prettier, pre-commit and CI | CI fails; fix is `npm run format` |
| 2 | No credential ever enters the repository | Secret scanning on push | Push rejected |
| 3 | Route handlers only do transport | Review checklist + module boundary lint | Review blocks; new routes only |
| 4 | Authorisation is checked in the service layer | Test required per service method | CI fails on an untested public method |
| 5 | Money paths are transactional and idempotent | Reconciliation job + code owners on billing paths | Nightly drift alert; billing changes need a second reviewer |
| 6 | Every bug fix ships with the test that would have caught it | Pull request template + review | Review blocks |
| 7 | Coverage on changed lines never falls | Coverage ratchet in CI | CI fails |
| 8 | Everything reaches production through CI | Deploy keys removed from laptops | Impossible by construction |
| 9 | API responses are explicit objects, never raw rows | Review checklist + type boundary | Review blocks; new endpoints only |
| 10 | Security advisories patched within a week, dependencies monthly | Scheduled dependency PRs | Ticket auto-created; visible in standup |

Some notes on choices that people will argue with, because they should:

**Rule 6 is deliberately not "write tests".** "Write tests" is a value, not a rule, and it loses
to a deadline every time. "The bug fix includes a test reproducing the bug" is narrow, obviously
reasonable, and lands at the one moment when writing a test is genuinely satisfying — you have
just spent two hours finding the thing. Nobody argues against it in that moment. Over a year it
builds a suite that is concentrated exactly where the bugs actually are, which is better targeting
than any coverage target would produce.

**Rule 7 is a ratchet, not a target.** There is no percentage. No one backfills tests for code
they are not touching. Coverage on the lines you changed cannot be lower than what was there
before. Targets get gamed — I have seen a team hit 80% with tests that asserted nothing — because
a target is a number to satisfy. A ratchet is just a door that closes behind you.

**Rules 3 and 9 apply to new and modified code only.** Never retroactively. This is the single
most important sentence in this document for adoption, and I will come back to it.

**Rule 5 has a second reviewer requirement**, which is the one rule I am willing to make a person
enforce, because billing is where mistakes cost money we cannot get back.

---

## What is deliberately not a standard

Being explicit about the rules I am *not* proposing is how a team learns this document is not the
opening bid in a negotiation.

- **No branch naming or commit message convention.** I have opinions. They are not worth the
  goodwill it would cost to impose them.
- **No mandated architecture for the frontend.** The components are messy. They are also not the
  source of a single finding in the assessment.
- **No pull request size limit.** Well-intentioned, and it teaches people to split changes in ways
  that make them harder to review.
- **No estimation or story point policy.** Not an engineering standard, and not mine to set.
- **No "no `any` in TypeScript".** In a codebase this age it would mean either a thousand
  suppressions or a month of work for nothing a customer notices. It becomes reasonable once the
  modules are extracted; it is not reasonable now.

---

## Getting a resistant team to adopt them

### First, understand what the resistance actually is

It is rarely "I disagree that tests are good". Underneath, in my experience, it is one of five
things, and they need different answers:

| What it sounds like | What it usually means | What actually helps |
|---|---|---|
| "We don't have time for this" | I am measured on delivery and this reads as a tax | Make the first changes *save* them time, visibly |
| "That won't work here" | You do not understand our constraints yet | Be right about something hard first |
| "We tried that before" | An initiative was abandoned and they looked silly for investing | Start small, finish it, point at it |
| Silence in the meeting, nothing changes after | This feels like criticism of my code | Never audit old code. Rules apply going forward |
| "Just this once, we need to ship" | The rule has no legitimate escape hatch | Give them one, and make using it cheap but visible |

### The sequence I would actually follow

**Weeks 1–2: propose nothing.**

I spend the first two weeks doing the week-1 work from the [migration
plan](02-migration-plan.html): error tracking, CI, the deploy pipeline, the credential rotation.
All of it removes pain the team already feels — Marcus stops being the only person who can deploy,
and everyone stops finding out about outages from Priya forwarding an email.

This is not a manipulation tactic, it is the correct order of work anyway. But it also buys the
only currency that matters here: the person proposing standards should first be the person who
deleted your worst chore. You cannot skip this and you cannot fake it.

**Week 3: they write the list, I edit it.**

Ninety minutes, whole team. One question on the board: *what has wasted your time in the last
month?*

I have run this several times and the list that comes back is always close to the list I would
have written — flaky deploys, the fear of touching billing, three places to change a price, the
pricing bug that reached a customer. People know what is wrong with their codebase. What they have
not had is a forum where saying so leads to anything.

Then we turn their list into rules together, and I contribute the two or three they did not raise
(secret scanning, authorisation in the service layer) with the evidence from the assessment behind
them. The output is 90% theirs. That is not a trick to create buy-in; it produces genuinely better
rules, because they know things about this system that I do not, and it means the standards
survive me leaving.

**Week 4: the mechanical rules, with the tooling already working.**

Formatting, secret scanning, CI. All three are unarguable, none requires judgment, and each one
lands as a tool that already works rather than a rule to remember. The formatter reformats the
repository in a single commit that we all agree to ignore in `git blame`.

Deliberately first because they are the standards where nobody has to change how they think. The
team gets to experience "a standard landed and it was fine" before anything harder arrives.

**Weeks 5–8: the test rules.**

Rule 6 first, then the coverage ratchet once there is something to ratchet from. By now the
characterization tests exist on the money paths, so there is a working example in our codebase
rather than a blog post from a company with 400 engineers.

**Weeks 9–12: the architectural rules.**

Thin handlers, explicit response objects, authorisation in services. These come last because by
then the extracted `pricing` and `subscriptions` modules exist, and the rule is no longer abstract
— it is "like the subscriptions module", which is a thing they can open.

**Day 90: review with data, and delete what is not working.**

Every rule is up for removal. I bring the four numbers from the migration plan. If a standard has
not moved anything and people resent it, it goes — and it going is the most credible thing that
can happen to the rest of them, because it proves the document is a tool and not a monument.

### The specific tactics that matter most

**Never audit existing code.** The rules apply to what you touch. This removes the "we would have
to rewrite everything" objection, which is the objection that kills these initiatives, and it is
also just correct: untouched code is not where the risk is.

**Machines say no; people say why.** I will never leave a review comment about formatting or a
missing test that CI could have caught. Once a person is the enforcement mechanism, the standard
becomes a relationship problem, and people start routing around the reviewer rather than the rule.

**A cheap, visible escape hatch.** Any rule can be bypassed with `[skip-standard: reason]` in the
pull request. It works immediately, no approval needed. Every use is collected and reviewed at the
monthly session — not to shame anyone, but because a rule that gets bypassed six times a month is
a badly designed rule and the bypasses are the bug report. This single mechanism defuses most of
"just this once, we need to ship", because that objection is usually true.

**Model it before requiring it.** My pull requests follow every rule from day one, including the
ones not yet adopted. And I take the ugliest module — the checkout handler — rather than the clean
greenfield work. A standard proposed by someone who took the nice work is not a standard, it is a
preference with authority attached.

**Convert the sceptic personally, do not overrule them.** There is always one, usually the
longest-tenured engineer, and they are usually right about something. Here it is likely Marcus,
who owns the deploy and has seen two of these initiatives fail. I would give him ownership of the
standards he cares most about — the deploy pipeline and the billing review rule — and let him
present them. Converting the sceptic converts the team. Overruling them ends the initiative on a
timer, because everyone else is watching to see which of you wins.

**Timebox the debate.** Two weeks to argue, then we decide, then we revisit at 90 days. Bikeshedding
is how teams avoid adopting anything while feeling productive, and an explicit revisit date is what
makes it safe to stop arguing — nobody is being asked to agree forever.

### How I would know it is working

Not by compliance rates, which measure fear.

- Someone quotes a standard back at me in a review of *my* code.
- Someone proposes a new one without being asked.
- The escape hatch gets used two or three times a month rather than fifteen or zero. Fifteen means
  the rules are wrong; zero means people are quietly ignoring them and not telling me.
- A new joiner in month four asks "is there a pattern for this?" and there is one.
- Change failure rate falls, from the [migration plan](02-migration-plan.html) numbers.

### If it does not work

Possible. If at day 90 the rules are being followed only when I am in the review, I would take
that as evidence I got the sequencing or the rules wrong rather than that the team is at fault, and
I would cut the list to the three that are pure automation — formatting, secret scanning, CI-only
deploys — which need no consent to keep working. A small standard that holds is worth considerably
more than a comprehensive one that everyone has quietly agreed to ignore.

---

## The one-page version

If the rest of this is too long to be read by the people it is about, this is what I would put on
the wall:

1. Machines enforce standards. People explain them.
2. Rules apply to code you touch, never to code you inherited.
3. Every bug fix brings the test that would have caught it.
4. Nothing reaches production except through CI.
5. Money paths are transactional, idempotent, and reviewed by two people.
6. There is always an escape hatch, and using it is a data point rather than a failure.
7. Every rule is reviewed in 90 days and can be deleted.
