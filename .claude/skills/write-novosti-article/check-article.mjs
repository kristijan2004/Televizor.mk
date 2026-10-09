// Checks that novosti articles are finished and ready to deploy.
//
// Usage (from the project root):
//   node .claude/skills/write-novosti-article/check-article.mjs <slug or path> [...]
//   node .claude/skills/write-novosti-article/check-article.mjs --all
//
// Exits 1 if any article has an ERROR. WARN lines don't fail the check.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const contentDir = path.join(root, "src/content/novosti");
const imageDir = path.join(root, "public/images/novosti");

const CATEGORIES = ["Новости", "Рецензии", "Совети", "Понуди"];
const REQUIRED = ["title", "slug", "date", "category", "excerpt", "author", "image", "readTime", "featured"];
const MIN_WORDS = 350;

// Leftover notes and placeholders that must never reach the live site.
const UNFINISHED = [
  [/<!--/, "HTML comment (<!-- ... -->) — it shows up as visible text on the page"],
  [/\b(TODO|TBD|FIXME|XXX|lorem ipsum)\b/i, "placeholder marker"],
  [/ВАЖНО:/, "editor note (ВАЖНО:)"],
  [/пред објава/i, "editor note (\"пред објава\")"],
  [/\[(цена|линк|модел|извор|датум|име)[^\]]*\]/i, "unfilled [placeholder]"],
  [/\?\?\?|…\s*$|\.\.\.\s*$/m, "unfinished sentence (??? or trailing ...)"],
  // The site owner doesn't want prices in articles.
  [/\d[\d.,\s]*\s*(ден\b|ден\.|денари|мкд|mkd|евра|евро|eur\b|€|\$|долари)|(€|\$)\s*\d/i, "price amount — articles must not contain prices"],
];

function readFrontmatter(raw) {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const data = {};
  let key = null;
  for (const line of text.slice(4, end).split("\n")) {
    if (key && /^\s+\S/.test(line)) { data[key] = `${data[key]} ${line.trim()}`.trim(); continue; }
    const m = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v === ">" || v === "|") { data[m[1]] = ""; key = m[1]; continue; }
    if (v.length > 1 && /^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    data[m[1]] = v;
    key = null;
  }
  return { data, body: text.slice(end + 4) };
}

function imageExists(image) {
  if (!image || !image.startsWith("/images/novosti/")) return false;
  const want = path.basename(image).toLowerCase().replace(/(\.(jpe?g|png|webp|avif|svg))+$/, "");
  if (!fs.existsSync(imageDir)) return false;
  return fs.readdirSync(imageDir).some(
    (f) => f.toLowerCase().replace(/(\.(jpe?g|png|webp|avif|svg))+$/, "") === want
  );
}

function check(file) {
  const errors = [];
  const warns = [];
  const raw = fs.readFileSync(file, "utf8");
  const fm = readFrontmatter(raw);
  const name = path.basename(file, ".md");

  if (!fm) return { errors: ["missing or unclosed frontmatter (--- block at the top)"], warns };
  const { data, body } = fm;

  for (const k of REQUIRED) if (!data[k]) errors.push(`frontmatter field "${k}" is missing or empty`);
  if (data.slug && data.slug !== name) errors.push(`slug "${data.slug}" does not match the file name "${name}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errors.push(`file name must be lowercase latin letters, digits and hyphens`);
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push(`date must be YYYY-MM-DD`);
  if (data.category && !CATEGORIES.includes(data.category)) errors.push(`category must be one of: ${CATEGORIES.join(", ")}`);
  if (data.readTime && !/^\d+$/.test(data.readTime)) errors.push(`readTime must be a whole number`);
  if (data.featured && !/^(true|false)$/.test(data.featured)) errors.push(`featured must be true or false`);
  if (data.excerpt && data.excerpt.length > 260) warns.push(`excerpt is ${data.excerpt.length} characters; keep it under ~250`);
  if (data.title && /[A-Za-z]{4,}/.test(data.title) && !/[А-Яа-яЃЌЉЊЏЅЈѓќљњџѕј]/.test(data.title)) errors.push(`title is not in Macedonian Cyrillic`);

  for (const [re, what] of UNFINISHED) {
    if (re.test(raw)) {
      const line = raw.split(/\r?\n/).findIndex((l) => re.test(l)) + 1;
      errors.push(`${what}${line > 0 ? ` (line ${line})` : ""}`);
    }
  }

  const lines = body.split("\n");
  if (lines.some((l) => /^\s*\|.*\|\s*$/.test(l))) errors.push(`markdown table — the article page can't render tables; use a list instead`);
  if (/!\[[^\]]*\]\(/.test(body)) errors.push(`inline image ![...](...) — not supported, use the frontmatter image`);
  if (/^#\s/m.test(body)) errors.push(`"# " heading in the body — the title comes from frontmatter, start at "## "`);
  if (/<[a-z][^>]*>/i.test(body)) errors.push(`raw HTML tag in the body — it is shown as text`);

  const words = body.replace(/[#>*_`\-\[\]()|]/g, " ").split(/\s+/).filter(Boolean).length;
  if (words < MIN_WORDS) errors.push(`only ${words} words; a finished article needs at least ${MIN_WORDS}`);

  const needsSources = data.category && data.category !== "Совети";
  const sources = body.match(/^##\s+Извори\s*$/m);
  if (needsSources && !sources) errors.push(`"${data.category}" articles need a final "## Извори" section with links`);
  if (sources) {
    const after = body.slice(sources.index);
    if (!/\]\(https?:\/\//.test(after)) errors.push(`"## Извори" has no links`);
  }

  if (!imageExists(data.image)) warns.push(`image ${data.image || "(none)"} is not in public/images/novosti/ — the placeholder will show`);

  return { errors, warns, words };
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("usage: check-article.mjs <slug|path> [...] | --all");
  process.exit(2);
}

const files = args.includes("--all")
  ? fs.readdirSync(contentDir).filter((f) => f.endsWith(".md") && f !== "README.md" && !f.startsWith("_")).map((f) => path.join(contentDir, f))
  : args.map((a) => (a.endsWith(".md") ? path.resolve(a) : path.join(contentDir, `${a}.md`)));

let failed = 0;
for (const file of files) {
  if (!fs.existsSync(file)) { console.log(`ERROR ${file}: file not found`); failed++; continue; }
  const { errors, warns, words } = check(file);
  const status = errors.length ? "NOT READY" : "READY";
  console.log(`${status}  ${path.basename(file)}${words ? `  (${words} words)` : ""}`);
  for (const e of errors) console.log(`  ERROR ${e}`);
  for (const w of warns) console.log(`  WARN  ${w}`);
  if (errors.length) failed++;
}
process.exit(failed ? 1 : 0);
