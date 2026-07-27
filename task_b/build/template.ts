export type PageMeta = {
  slug: string;
  href: string;
  title: string;
  subtitle: string;
  order: number;
};

const REPO_URL = "https://github.com/suryanshishere/Full_Stack_Developer_Suryansh_Singh";

function navigation(pages: PageMeta[], current: PageMeta): string {
  return pages
    .map((page) => {
      const active = page.slug === current.slug ? ' class="active"' : "";
      const label = page.order === 0 ? page.title : `${page.order}. ${page.title}`;
      return `<li><a href="${page.href}"${active}>${label}</a></li>`;
    })
    .join("\n        ");
}

function pager(pages: PageMeta[], current: PageMeta): string {
  const index = pages.findIndex((page) => page.slug === current.slug);
  const previous = pages[index - 1];
  const next = pages[index + 1];
  if (!previous && !next) return "";
  const left = previous
    ? `<a class="pager-link" href="${previous.href}"><span>Previous</span>${previous.title}</a>`
    : "<span></span>";
  const right = next
    ? `<a class="pager-link align-right" href="${next.href}"><span>Next</span>${next.title}</a>`
    : "<span></span>";
  return `<nav class="pager">${left}${right}</nav>`;
}

export function renderPage(options: {
  pages: PageMeta[];
  current: PageMeta;
  content: string;
}): string {
  const { pages, current, content } = options;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${current.title} · Crateful handover</title>
    <meta name="description" content="${current.subtitle}" />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <input type="checkbox" id="nav-toggle" hidden />
    <aside class="sidebar">
      <a class="workspace" href="index.html">📦 Crateful handover</a>
      <p class="workspace-note">Task B · inherit and improve</p>
      <ul class="nav">
        ${navigation(pages, current)}
      </ul>
      <div class="sidebar-foot">
        <a href="${REPO_URL}/tree/main/task_b">Source on GitHub →</a>
      </div>
    </aside>
    <div class="shell">
      <header class="topbar">
        <label for="nav-toggle" class="nav-button" aria-label="Toggle navigation">☰</label>
        <span>📦 Crateful handover</span>
      </header>
      <main>
        <article>
          <p class="eyebrow">${current.order === 0 ? "Task B" : `Document ${current.order} of 4`}</p>
          <h1>${current.title}</h1>
          <p class="lede">${current.subtitle}</p>
          ${content}
          ${pager(pages, current)}
        </article>
      </main>
      <footer class="credit">
        <a href="https://digitalheroesco.com" target="_blank" rel="noreferrer">
          Built for Digital Heroes Training Task
        </a>
      </footer>
    </div>
  </body>
</html>
`;
}
