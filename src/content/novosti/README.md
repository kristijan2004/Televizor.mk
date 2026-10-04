# Статии за „Новости“ / News articles

Секоја статија е еден markdown-фајл во оваа папка. Името на фајлот е и
адресата на статијата: `oled-ili-qled.md` → `/novosti/oled-ili-qled`.

Each article is a single markdown file in this folder. The file name is also
the URL slug: `oled-ili-qled.md` → `/novosti/oled-ili-qled`.

## Како да додадете статија / Adding an article

1. Копирајте постоечки `.md` фајл и преименувајте го (само мали букви и црти).
2. Пополнете ги полињата на почетокот (frontmatter) и напишете го текстот.
3. Пуштете `npm run build:news` (или само `npm start` — се пушта автоматски).

## Frontmatter

```
---
id: 9                                  # опционално / optional
title: Наслов на статијата
category: Рецензии                     # види categories.json
author: Редакција
date: 2026-10-04                       # YYYY-MM-DD
readTime: 6                            # опционално; се пресметува од текстот
image: /images/news/primer.svg
featured: false                        # true = голема картичка на врвот
excerpt: >
  Кратко резиме во еден или повеќе редови со два празни места на почетокот.
---
```

Задолжителни полиња: `title`, `category`, `date`. Сите останати имаат
разумни стандардни вредности.

Required fields: `title`, `category`, `date`. Everything else has a sensible
default — `excerpt` falls back to the first paragraph, `readTime` is estimated
from the word count, `author` defaults to „Редакција“.

## Текстот / The body

Поддржано е: параграфи, наслови (`## Поднаслов`), списоци (`- ` или `1. `),
цитати (`> `), линија за раздвојување (`---`), како и **болд**, *италик*,
`код` и [линкови](https://example.com).

Supported: paragraphs, headings (`## Subheading`), lists (`- ` or `1. `),
blockquotes (`> `), a divider (`---`), plus **bold**, *italic*, `code` and
[links](https://example.com).

## Категории / Categories

Листата на категории и нејзиниот редослед се чуваат во `categories.json`.

## Како работи / How it works

`scripts/buildNews.js` ги чита `.md` фајловите и пишува
`src/Data/news.generated.json`. Апликацијата го чита тој фајл преку
`src/Data/news.js`. Не менувајте го `news.generated.json` рачно — се
презапишува при секој build.

`scripts/buildNews.js` reads the `.md` files and writes
`src/Data/news.generated.json`, which the app imports through
`src/Data/news.js`. Do not edit the generated JSON by hand; it is overwritten
on every build.
