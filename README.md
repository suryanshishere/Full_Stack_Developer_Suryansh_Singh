# Full Stack Developer — Suryansh Singh

Two tasks for the Digital Heroes full stack assessment. Each folder is a standalone project with
its own README, tests, and CI.

| | Live | Source |
|---|---|---|
| **Task A — Leadline** | https://leadline-feen.onrender.com | [task_a/](task_a/) · [README](task_a/README.md) |
| **Task B — Handover** | https://crateful-handover.onrender.com | [task_b/](task_b/) · [README](task_b/README.md) |

Both are hosted on a free tier, so the first request after ~15 idle minutes takes 30–50 seconds
to wake the server.

---

## Task A — build a lead management platform

A public capture form, a role-based team app, a drag-and-drop pipeline board, and a documented
JSON API — Next.js 15, Prisma on SQLite/Turso, JWT cookie sessions, 40 Vitest cases.

The pipeline rules (which stage moves are legal, how a lead is scored) are pure functions that
import nothing, and every screen calls the same API an external client would, so the UI cannot
bypass a rule the server enforces. Every mutation writes its audit row in the same transaction as
the change. `GET /embed.js` drops the capture form onto any website with one script tag.

Sign in as `admin@leadline.demo` / `Admin@1234`, or `member@leadline.demo` / `Member@1234`.

```bash
cd task_a && npm install && cp .env.example .env    # set AUTH_SECRET to any long random string
npx prisma db push && npm run db:seed && npm run dev
```

## Task B — inherit and improve a legacy codebase

Four documents on taking over a working but badly built system that serves real customers and
cannot go down: an [assessment](task_b/docs/01-assessment.md) of nine findings ranked by harm, a
[migration plan](task_b/docs/02-migration-plan.md) where every step is shippable and reversible,
[the refactor](task_b/docs/03-refactor.md), and ten machine-enforced
[standards](task_b/docs/04-standards.md).

The refactor is real code, not a sketch: one 40-line handler rebuilt, with 29 tests that run — eight
against **both** the old and new implementation to prove a customer cannot tell the difference, the
rest demonstrating six defects removed, including a missing ownership check, SQL concatenation, and
a retry that double-charged.

```bash
cd task_b && npm install && npm test
```

---

Every push runs both test suites and a production build in GitHub Actions
([ci.yml](.github/workflows/ci.yml)).
