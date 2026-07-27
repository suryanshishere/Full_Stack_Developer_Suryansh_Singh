---
title: Overview
subtitle: Inheriting a working but badly built codebase that serves real customers and cannot go down
order: 0
---

## The situation

You have just joined **Crateful**, a direct-to-consumer coffee subscription doing about £320k a
month across 11,000 subscribers. Four engineers. Six years of code written under real deadlines.

It works. It also has no tests, business logic welded into route handlers, a frontend that queries
the database directly, and live payment credentials committed to the repository. It serves real
customers today and it cannot go down.

This is Task B of the Digital Heroes full-stack brief: assess it, plan the rescue, prove you can
actually do the work, and get a team that has heard this speech before to change how it builds.

Everything here is written as an internal memo from a new senior hire in week two — not as a
consultant's report, because a consultant leaves and an employee has to live with the standards
they propose.

## The four documents

**[1. Assessment](01-assessment.html)**
Nine findings, ranked by expected harm rather than by how much the code annoys me, each with the
cost of leaving it in place and the risk of the fix itself. Includes the argument I most want to
win: that we do not touch the architecture first.

**[2. Migration plan](02-migration-plan.html)**
What ships in week 1, month 1 and quarter 1. Every step independently shippable, every step with a
written rollback, no big-bang, no code freeze, and honest capacity numbers.

**[3. The refactor](03-refactor.html)**
One real handler taken apart and put back together. Characterization tests written first, against
both versions, proving the behaviour survived — and thirteen more proving six defects did not.
The code runs; the test output on that page is real.

**[4. Engineering standards](04-standards.html)**
Ten rules, each enforced by a machine rather than by a person nagging in code review, plus the
part that actually decides whether any of it works: how to get a resistant team to adopt them.

## Running the refactor yourself

```bash
git clone https://github.com/suryanshishere/Full_Stack_Developer_Suryansh_Singh
cd Full_Stack_Developer_Suryansh_Singh/task_b
npm install
npm test
```

29 tests. Eight of them run against the old and the new implementation to show a customer could
not tell them apart; the rest demonstrate the defects the refactor removed. No database, no
network, no setup.

## A note on what this task is really testing

The brief asks for four documents, but the thing being measured is judgment under a constraint:
the system earns money today, so every good idea has to survive contact with "and it cannot go
down while you do it".

That constraint is what rules out the rewrite, what puts observability before architecture, and
what makes "which of these do I fix first" a harder question than "which of these is worst".
