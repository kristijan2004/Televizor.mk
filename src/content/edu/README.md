# Статии за „Еду“ / Edu articles

Секоја статија е еден markdown-фајл во оваа папка. Името на фајлот е и
адресата на статијата: `oled-ili-qled.md` → `/edu/oled-ili-qled`.

Each article is a single markdown file in this folder. The file name is also
the URL slug: `oled-ili-qled.md` → `/edu/oled-ili-qled`.

Папката работи исто како `src/content/novosti/` — истата скрипта ги гради
двете. Разликата е само каде одат: оваа папка пишува во
`src/Data/edu.generated.json`, сликите се во `public/images/edu/`, а
линковите почнуваат со `/edu/`.

This folder works exactly like `src/content/novosti/` — the same script builds
both. The only difference is where things go: this folder writes
`src/Data/edu.generated.json`, the pictures live in `public/images/edu/`, and
the links start with `/edu/`.

Што оди каде / What belongs where: „Еду“ објаснува како работат телевизорите и
како да се избере — текстови што важат и за една година. „Новости“ е она што е
врзано за датум: објави, цени, модели.

## Како да додадете статија / Adding an article

1. Копирајте постоечки `.md` фајл и преименувајте го (само мали букви и црти).
2. Пополнете ги полињата на почетокот (frontmatter) и напишете го текстот.
3. Пуштете `npm run build:news` (или само `npm start` — се пушта автоматски).

## Frontmatter

```
---
id: 9                                  # опционално / optional
title: Наслов на статијата
category: Совети                       # види categories.json
author: Редакција
date: 2026-10-04                       # YYYY-MM-DD
readTime: 6                            # опционално; се пресметува од текстот
publishAt: 2026-10-15 09:00            # опционално; точен час на објавување
image: /images/edu/primer.jpg
featured: false
excerpt: >
  Кратко резиме во еден или повеќе редови со два празни места на почетокот.
---
```

Задолжителни полиња: `title`, `category`, `date`. Сите останати имаат
разумни стандардни вредности.

Required fields: `title`, `category`, `date`. Everything else has a sensible
default — `excerpt` falls back to the first paragraph, `readTime` is estimated
from the word count, `author` defaults to „Редакција“.

## Слики / Pictures

Сликата оди во `public/images/edu/`. Ако ја нема, статијата го покажува
`placeholder.svg` од истата папка и градењето пишува точно кое име го бара.
Фајл спуштен подоцна се појавува по обично освежување, без ново градење.

Put the picture in `public/images/edu/`. Without one the article shows that
folder's `placeholder.svg`, and the build prints the exact file name it is
looking for. A file dropped in later shows up on a plain refresh, with no
rebuild.

## Закажано објавување / Scheduling an article

Статија со иден `date` стои во проектот и сама се појавува кога ќе дојде тој
ден — не треба ништо повторно да се гради. Ако сакаш точен час наместо полноќ,
додај `publishAt: 2026-10-15 09:00`.

An article whose `date` is in the future stays out of `/edu`, out of the
related-articles strip, and its own URL shows the „не е пронајдена" card. It
appears on its own once that moment arrives in the reader's time zone — no
rebuild needed.

Важно / One caveat: закажаната статија веќе е внатре во JavaScript-от на
сајтот пред да се објави. Тоа е закажување, не тајна. Ако текстот навистина не
смее да се види однапред, држи го фајлот како `_slug.md` (draft) додека не
биде време.

## Текстот / The body

Поддржано е: параграфи, наслови (`## Поднаслов`), списоци (`- ` или `1. `),
цитати (`> `), линија за раздвојување (`---`), како и **болд**, *италик*,
`код` и [линкови](https://example.com).

Supported: paragraphs, headings (`## Subheading`), lists (`- ` or `1. `),
blockquotes (`> `), a divider (`---`), plus **bold**, *italic*, `code` and
[links](https://example.com).

Линк кон друга статија од Еду се пишува `/edu/<slug>`, а кон статија од
Новости `/novosti/<slug>`.

A link to another Edu article is written `/edu/<slug>`; a link to a Новости
article, `/novosti/<slug>`.

## Категории / Categories

Листата на категории и нејзиниот редослед се чуваат во `categories.json` во
оваа папка. Ако го нема фајлот, се користат категориите што статиите
навистина ги употребуваат.

## Како работи / How it works

`scripts/buildNews.js` ги чита `.md` фајловите од двете папки и пишува
`src/Data/news.generated.json` и `src/Data/edu.generated.json`. Апликацијата
ги чита преку `src/Data/news.js` и `src/Data/edu.js`. Не менувајте ги
генерираните JSON фајлови рачно — се презапишуваат при секој build.

`scripts/buildNews.js` reads the `.md` files from both folders and writes
`src/Data/news.generated.json` and `src/Data/edu.generated.json`, which the
app imports through `src/Data/news.js` and `src/Data/edu.js`. Do not edit the
generated JSON by hand; it is overwritten on every build.
