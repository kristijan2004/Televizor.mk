/*
  Заеднички читач на frontmatter. Користен и од scripts/buildNews.js (чита сè
  при градење) и од server/admin.js (менува само date/publishAt, без да
  ре-генерира остатокот од фајлот) — извадено тука за да не постои истата
  логика на два места.

  Shared frontmatter reader. Used by both scripts/buildNews.js (reads
  everything at build time) and server/admin.js (changes only date/publishAt,
  without re-serialising the rest of the file) — pulled out here so the same
  logic does not live in two places.
*/

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

/*
  Rewrites only the `date`/`publishAt` lines inside the frontmatter block,
  leaving every other line (order, quoting, folded values) exactly as it was —
  the admin schedule editor must not reformat an article just because it
  touched one field.
*/
function updateDateFields(raw, fileName, { date, publishAt }) {
  const normalized = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---\n")) {
    throw new Error(`${fileName}: missing frontmatter block (--- at the top)`);
  }

  const end = normalized.indexOf("\n---", 3);

  if (end === -1) {
    throw new Error(`${fileName}: frontmatter block is never closed with ---`);
  }

  const lines = normalized.slice(4, end).split("\n");

  let dateIndex = -1;
  let publishAtIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (/^date\s*:/.test(lines[i])) dateIndex = i;
    if (/^publishAt\s*:/.test(lines[i])) publishAtIndex = i;
  }

  if (dateIndex === -1) {
    throw new Error(`${fileName}: missing frontmatter field "date"`);
  }

  lines[dateIndex] = `date: ${date}`;

  if (publishAt) {
    const line = `publishAt: ${publishAt}`;

    if (publishAtIndex !== -1) {
      lines[publishAtIndex] = line;
    } else {
      lines.splice(dateIndex + 1, 0, line);
    }
  } else if (publishAtIndex !== -1) {
    lines.splice(publishAtIndex, 1);
  }

  return normalized.slice(0, 4) + lines.join("\n") + normalized.slice(end);
}

module.exports = { parseFrontmatter, stripQuotes, updateDateFields };
