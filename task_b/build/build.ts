import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import hljs from "highlight.js";
import { Marked } from "marked";
import { renderPage, type PageMeta } from "./template";

const root = path.resolve(import.meta.dirname, "..");
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist");

const marked = new Marked({ gfm: true });

marked.use({
  renderer: {
    code({ text, lang }) {
      const requested = (lang ?? "").split(/\s+/)[0];
      const language = requested && hljs.getLanguage(requested) ? requested : "plaintext";
      const highlighted = hljs.highlight(text, { language }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>\n`;
    },
    table(token) {
      const header = token.header
        .map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`)
        .join("");
      const body = token.rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`)
              .join("")}</tr>`
        )
        .join("\n");
      return `<div class="table-scroll"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>\n`;
    },
  },
});

function parseFrontmatter(raw: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { meta: {} as Record<string, string>, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) {
      meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
  }
  return { meta, body: raw.slice(match[0].length) };
}

function stripLeadingHeading(body: string, title: string) {
  return body.replace(new RegExp(`^\\s*#\\s+${title}\\s*\\n`), "");
}

const sources = readdirSync(docsDir)
  .filter((name) => name.endsWith(".md"))
  .sort();

const documents = sources.map((name) => {
  const raw = readFileSync(path.join(docsDir, name), "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const order = Number(meta.order ?? 99);
  const slug = name.replace(/\.md$/, "");
  return {
    page: {
      slug,
      href: order === 0 ? "index.html" : `${slug}.html`,
      title: meta.title ?? slug,
      subtitle: meta.subtitle ?? "",
      order,
    } satisfies PageMeta,
    body: stripLeadingHeading(body, meta.title ?? ""),
  };
});

documents.sort((left, right) => left.page.order - right.page.order);
const pages = documents.map((document) => document.page);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const document of documents) {
  const content = marked.parse(document.body) as string;
  const html = renderPage({ pages, current: document.page, content });
  writeFileSync(path.join(outDir, document.page.href), html, "utf8");
}

copyFileSync(path.join(root, "build", "styles.css"), path.join(outDir, "styles.css"));

console.log(`Built ${documents.length} pages into dist/`);
for (const document of documents) console.log(`  ${document.page.href}  ${document.page.title}`);
