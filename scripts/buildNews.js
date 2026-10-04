/*
  Чита статиите од `src/content/novosti/*.md` и ги претвора во
  `src/Data/news.generated.json`, кој потоа го користи `src/Data/news.js`.

  Reads the markdown articles in `src/content/novosti/*.md` and compiles them
  into `src/Data/news.generated.json`, which `src/Data/news.js` imports.

  Run it with:  npm run build:news
  It also runs automatically before `npm start` and `npm run build`.
*/

const fs = require("fs");
const path = require("path");

const contentDir = path.join(__dirname, "../src/content/novosti");
const outFile = path.join(__dirname, "../src/Data/news.generated.json");

// Where article images live, and the public URL they are served from.
const imageDir = path.join(__dirname, "../public/images/novosti");
const imageUrlBase = "/images/novosti";

const PLACEHOLDER_IMAGE = `${imageUrlBase}/placeholder.svg`;

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".svg",
  // Windows hides known extensions, so renaming a file often produces
  // "name.jpg.jpg". Those are matched too rather than silently ignored.
  ".jpg.jpg",
  ".jpeg.jpeg",
  ".png.png",
  ".webp.webp",
];

const FALLBACK_CATEGORIES = ["Новости", "Рецензии", "Совети", "Понуди"];

// Average reading speed used when an article has no explicit `readTime`.
const WORDS_PER_MINUTE = 200;

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

/*
  A deliberately small frontmatter reader: `key: value` lines, plus folded
  blocks written as `key: >` followed by indented lines. That covers what the
  articles need without pulling in a YAML dependency.
*/
function parseFrontmatter(raw, fileName) {
  const normalized = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---\n")) {
    throw new Error(`${fileName}: missing frontmatter block (--- at the top)`);
  }

  const end = normalized.indexOf("\n---", 3);

  if (end === -1) {
    throw new Error(`${fileName}: frontmatter block is never closed with ---`);
  }

  const headLines = normalized.slice(4, end).split("\n");
  const body = normalized.slice(end + 4).replace(/^\n+/, "");

  const data = {};

  let currentKey = null;

  for (const line of headLines) {
    if (line.trim() === "") {
      continue;
    }

    // Continuation line of a folded (`key: >`) value.
    if (currentKey && /^\s+\S/.test(line)) {
      data[currentKey] = `${data[currentKey]} ${line.trim()}`.trim();

      continue;
    }

    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);

    if (!match) {
      throw new Error(`${fileName}: cannot read frontmatter line "${line}"`);
    }

    const [, key, value] = match;

    if (value === ">" || value === "|") {
      data[key] = "";
      currentKey = key;

      continue;
    }

    data[key] = stripQuotes(value.trim());
    currentKey = null;
  }

  return { data, body };
}

function stripQuotes(value) {
  if (value.length > 1) {
    const first = value[0];
    const last = value[value.length - 1];

    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }

  return value;
}

// ---------------------------------------------------------------------------
// Markdown body
// ---------------------------------------------------------------------------

/*
  Turns the markdown body into a list of blocks the article page knows how to
  render: paragraphs, headings, blockquotes and lists. Each block carries
  already-parsed inline runs (plain text, bold, italic, links), so the React
  side never has to touch raw markdown.
*/
function parseBody(markdown, fileName) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  const blocks = [];

  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({
        type: "paragraph",
        content: parseInline(paragraph.join(" ")),
      });

      paragraph = [];
    }
  };

  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "") {
      flushParagraph();
      flushList();

      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);

    if (heading) {
      flushParagraph();
      flushList();

      blocks.push({
        type: "heading",
        // `#` is the article title (it lives in the frontmatter), so the first
        // in-body level we render is h2.
        level: Math.min(heading[1].length + 1, 6),
        content: parseInline(heading[2]),
      });

      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);

    if (quote) {
      flushParagraph();
      flushList();

      blocks.push({ type: "quote", content: parseInline(quote[1]) });

      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);

    if (bullet || numbered) {
      flushParagraph();

      const ordered = Boolean(numbered);

      if (!list || list.ordered !== ordered) {
        flushList();

        list = { type: "list", ordered, items: [] };
      }

      list.items.push(parseInline((bullet || numbered)[1]));

      continue;
    }

    if (line === "---" || line === "***") {
      flushParagraph();
      flushList();

      blocks.push({ type: "divider" });

      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  if (blocks.length === 0) {
    throw new Error(`${fileName}: the article has no body text`);
  }

  return blocks;
}

/*
  Inline markdown -> runs of { text, bold, italic, href }. Anything that is not
  bold, italic or a link stays plain text, which keeps unexpected markup from
  silently disappearing from an article.
*/
function parseInline(text) {
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;

  const runs = [];

  let lastIndex = 0;
  let match;

  const pushText = (value) => {
    if (value) {
      runs.push({ text: value });
    }
  };

  while ((match = pattern.exec(text)) !== null) {
    pushText(text.slice(lastIndex, match.index));

    if (match[1] !== undefined) {
      runs.push({ text: match[1], href: match[2] });
    } else if (match[3] !== undefined) {
      runs.push({ text: match[3], bold: true });
    } else if (match[4] !== undefined) {
      runs.push({ text: match[4], italic: true });
    } else {
      runs.push({ text: match[5], code: true });
    }

    lastIndex = pattern.lastIndex;
  }

  pushText(text.slice(lastIndex));

  return runs;
}

// ---------------------------------------------------------------------------
// Article assembly
// ---------------------------------------------------------------------------

function blockText(block) {
  if (block.type === "list") {
    return block.items
      .map((item) => item.map((run) => run.text).join(""))
      .join(" ");
  }

  if (!block.content) {
    return "";
  }

  return block.content.map((run) => run.text).join("");
}

function countWords(blocks) {
  return blocks.reduce((total, block) => {
    const words = blockText(block).split(/\s+/).filter(Boolean);

    return total + words.length;
  }, 0);
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

function listImageFiles() {
  if (!fs.existsSync(imageDir)) {
    return [];
  }

  return fs.readdirSync(imageDir).filter((file) => {
    const lower = file.toLowerCase();

    return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  });
}

/*
  Strips every image extension from a name, so `lg-w6.jpg`, `lg-w6.jpg.jpg` and
  `LG-W6.PNG` all reduce to the same key.
*/
function imageKey(name) {
  let base = name.toLowerCase();

  let changed = true;

  while (changed) {
    changed = false;

    for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"]) {
      if (base.endsWith(ext)) {
        base = base.slice(0, -ext.length);
        changed = true;
      }
    }
  }

  return base;
}

/*
  Works out which picture belongs to an article, and leaves a trail of fallbacks
  for the browser.

  `image` is the file that actually exists on disk right now. `imageCandidates`
  are the names the article page will try, in order, if that file is missing —
  so dropping `<slug>.jpg` (or `<slug>.webp`, or even a double-extension
  `<slug>.jpg.jpg`) into public/images/novosti/ is enough to make a picture
  appear on refresh, with no rebuild.
*/
function resolveImage(data, slug, availableImages) {
  // Names worth trying: whatever the article asked for, then the slug itself.
  const bases = [];

  if (data.image) {
    bases.push(imageKey(path.basename(data.image)));
  }

  if (!bases.includes(slug.toLowerCase())) {
    bases.push(slug.toLowerCase());
  }

  // What is really on disk, matched case-insensitively and ignoring the
  // doubled extensions Windows likes to create.
  let found = "";

  for (const base of bases) {
    const match = availableImages.find((file) => imageKey(file) === base);

    if (match) {
      found = `${imageUrlBase}/${match}`;

      break;
    }
  }

  const candidates = [];

  const push = (url) => {
    if (url && !candidates.includes(url)) {
      candidates.push(url);
    }
  };

  push(found);

  // An explicit path to somewhere else (another folder, or a full URL) is
  // honoured even though it is not in the images folder.
  if (data.image && !data.image.startsWith(imageUrlBase)) {
    push(data.image);
  }

  for (const base of bases) {
    for (const ext of IMAGE_EXTENSIONS) {
      push(`${imageUrlBase}/${base}${ext}`);
    }
  }

  push(PLACEHOLDER_IMAGE);

  return { image: found || data.image || PLACEHOLDER_IMAGE, candidates, found };
}

function requireField(data, key, fileName) {
  const value = data[key];

  if (value === undefined || value === "") {
    throw new Error(`${fileName}: missing required frontmatter field "${key}"`);
  }

  return value;
}

function buildArticle(fileName, availableImages) {
  const raw = fs.readFileSync(path.join(contentDir, fileName), "utf8");

  const { data, body } = parseFrontmatter(raw, fileName);

  const blocks = parseBody(body, fileName);

  const slug = data.slug || fileName.replace(/\.md$/, "");

  const date = requireField(data, "date", fileName);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${fileName}: date must be written as YYYY-MM-DD`);
  }

  const readTime = data.readTime
    ? Number(data.readTime)
    : Math.max(1, Math.round(countWords(blocks) / WORDS_PER_MINUTE));

  if (!Number.isFinite(readTime)) {
    throw new Error(`${fileName}: readTime must be a number`);
  }

  // The first paragraph doubles as the excerpt when none is given.
  const firstParagraph = blocks.find((block) => block.type === "paragraph");

  const picture = resolveImage(data, slug, availableImages);

  return {
    id: data.id ? Number(data.id) : slug,
    slug,
    title: requireField(data, "title", fileName),
    excerpt: data.excerpt || blockText(firstParagraph || blocks[0]),
    category: requireField(data, "category", fileName),
    author: data.author || "Редакција",
    date,
    readTime,
    image: picture.image,
    // Fallbacks the browser walks through if `image` 404s — this is what lets a
    // newly dropped-in file show up without re-running the build.
    imageCandidates: picture.candidates,
    hasImage: Boolean(picture.found),
    featured: String(data.featured).toLowerCase() === "true",
    blocks,
    // Plain-text paragraphs, kept so anything that only needs running text
    // (search, meta descriptions) does not have to walk the block list.
    body: blocks
      .filter((block) => block.type === "paragraph")
      .map((block) => blockText(block)),
  };
}

function readCategories(articles) {
  const file = path.join(contentDir, "categories.json");

  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  // Fall back to the categories actually used by the articles, in the usual
  // display order.
  const used = new Set(articles.map((article) => article.category));

  return [
    ...FALLBACK_CATEGORIES.filter((category) => used.has(category)),
    ...[...used].filter((category) => !FALLBACK_CATEGORIES.includes(category)),
  ];
}

function main() {
  if (!fs.existsSync(contentDir)) {
    console.error(`Missing content folder: ${contentDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith(".md"))
    // `README.md` documents the folder, and a leading underscore marks a
    // draft — neither is an article.
    .filter((file) => file !== "README.md" && !file.startsWith("_"))
    .sort();

  const availableImages = listImageFiles();

  const articles = [];
  const errors = [];

  for (const file of files) {
    try {
      articles.push(buildArticle(file, availableImages));
    } catch (error) {
      errors.push(error.message);
    }
  }

  const seen = new Map();

  for (const article of articles) {
    const key = String(article.slug);

    if (seen.has(key)) {
      errors.push(`duplicate slug "${key}"`);
    }

    seen.set(key, article);
  }

  if (errors.length > 0) {
    console.error("Could not build the news content:\n");

    for (const message of errors) {
      console.error(`  - ${message}`);
    }

    process.exit(1);
  }

  // Newest first, so the app gets a sensible order even before it sorts.
  articles.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const payload = {
    generatedAt: new Date().toISOString(),
    categories: readCategories(articles),
    articles,
  };

  fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${articles.length} article(s) from src/content/novosti to src/Data/news.generated.json`
  );

  reportImages(articles, availableImages);
}

/*
  A missing picture is not a reason to fail the build — the article still reads
  fine with the placeholder. It is worth saying out loud, though, together with
  the exact file name to use, so a missing image never turns into a hunt.
*/
function reportImages(articles, availableImages) {
  const withoutImage = articles.filter((article) => !article.hasImage);

  const used = new Set();

  for (const article of articles) {
    const match = availableImages.find(
      (file) => `${imageUrlBase}/${file}` === article.image
    );

    if (match) {
      used.add(match);
    }
  }

  const unused = availableImages.filter(
    (file) => !used.has(file) && imageKey(file) !== "placeholder"
  );

  if (withoutImage.length > 0) {
    console.log("\nArticles still showing the placeholder image:");

    for (const article of withoutImage) {
      console.log(
        `  - ${article.slug}  ->  put the picture in public/images/novosti/${article.slug}.jpg`
      );
    }
  }

  if (unused.length > 0) {
    console.log("\nImages in public/images/novosti/ that no article uses:");

    for (const file of unused) {
      console.log(`  - ${file}`);
    }
  }
}

main();
