# 📦 Crateful handover — Task B

Inheriting a working but badly built codebase that serves real customers and cannot go down:
an assessment, a phased migration plan, a worked refactor, and an engineering standards proposal.

**Live: https://crateful-handover.onrender.com**

Written as an internal memo from a new senior engineer in week two at *Crateful*, a fictional
direct-to-consumer coffee subscription — £320k monthly recurring revenue, 11,000 subscribers,
four engineers, six years of code, no tests, and live payment keys in the repository.

| Document | What it covers |
|---|---|
| [Assessment](docs/01-assessment.md) | Nine findings ranked by expected harm, the cost of leaving each one, and the risk of the fix itself |
| [Migration plan](docs/02-migration-plan.md) | Week 1, month 1 and quarter 1 — every step shippable and reversible, no big-bang, no code freeze |
| [The refactor](docs/03-refactor.md) | One handler rebuilt, with characterization tests proving behaviour survived and six defects did not |
| [Standards](docs/04-standards.md) | Ten machine-enforced rules, and how to get a resistant team to adopt them |

## The refactor runs

```bash
npm install
npm test
```

29 tests, no database and no network. Eight of them run against **both** the old and the new
implementation to show that a customer using the feature correctly cannot tell the difference —
that is what makes it a refactor rather than a rewrite. The other thirteen demonstrate the defects
the refactor removed: a missing ownership check, SQL string concatenation, an unvalidated plan
producing a `NaN` charge, a payment failure leaving the database ahead of billing, a retry
double-charging, and a response leaking internal columns.

```
refactor/
├── before/change-plan.ts     the handler as inherited: 40 lines, six defects
├── after/pricing.ts          pure rules, imports nothing
├── after/subscriptions.ts    ownership, validation, one transaction, audit trail
├── after/route.ts            transport only
├── support/                  in-memory test doubles for Postgres, payments, mail
└── tests/                    behaviour.test.ts (both versions) + defects.test.ts
```

## Building the site

```bash
npm run build     # docs/*.md -> dist/
```

The four documents are Markdown, and [`build/build.ts`](build/build.ts) renders them into the
static site so there is one source of truth rather than a copy that drifts.
