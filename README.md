# Full Stack Developer — Suryansh Singh

[![CI](https://github.com/suryanshishere/Full_Stack_Developer_Suryansh_Singh/actions/workflows/ci.yml/badge.svg)](https://github.com/suryanshishere/Full_Stack_Developer_Suryansh_Singh/actions/workflows/ci.yml)

Submission for the Digital Heroes Full Stack Development training tasks.

| Task | What it is | Where |
|------|------------|-------|
| Task A | **Leadline** — a lead management platform: public capture + embeddable widget, role-based team app, drag-and-drop pipeline board, JSON API, 40 automated tests, free-tier deployment | [`taska/`](taska/) |
| Task B | Coming next | `taskb/` |

**Task A live app: https://leadline-feen.onrender.com**

Demo logins — admin `admin@leadline.demo` / `Admin@1234` · member `member@leadline.demo` /
`Member@1234`. Hosted on Render's free tier, so the first request after ~15 minutes idle takes
30–50 seconds to wake the instance.

**Task A docs:** architecture, API reference, demo credentials, and setup guide live in
[taska/README.md](taska/README.md).

Deployment is declared as code in [render.yaml](render.yaml); every push to `main` runs CI
(install → schema → 40 tests → build) and redeploys the live service.
