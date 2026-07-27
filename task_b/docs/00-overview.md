---
title: Overview
subtitle: Inheriting a working but badly built codebase that serves real customers and cannot go down
order: 0
---

## The codebase

A direct-to-consumer coffee subscription. 11,000 subscribers, about £320k a month, four engineers,
six years of code. Next.js, Postgres behind Supabase, Stripe, deployed to one VPS.

It works and it earns money. It also has:

- no tests and no CI
- business logic inside route handlers
- the browser querying the database directly
- live payment and database credentials committed to the repo

It serves real customers today and it cannot go down.

## The four documents

| | |
|---|---|
| **[1. Assessment](01-assessment.html)** | Nine findings, ranked by harm, with the cost of leaving each one and the risk of fixing it |
| **[2. Migration plan](02-migration-plan.html)** | What ships in week 1, month 1 and quarter 1. Every step small, shippable and reversible |
| **[3. The refactor](03-refactor.html)** | One bad handler rebuilt, with tests proving the behaviour survived and six defects did not |
| **[4. Standards](04-standards.html)** | Ten rules, each enforced by a machine, and how to get a resistant team to adopt them |

## Running the refactor

```bash
git clone https://github.com/suryanshishere/Full_Stack_Developer_Suryansh_Singh
cd Full_Stack_Developer_Suryansh_Singh/task_b
npm install
npm test
```

29 tests, no database and no network.
