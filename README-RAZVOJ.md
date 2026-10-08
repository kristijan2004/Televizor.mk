# Како да се работи локално

Од 8 октомври 2026 телевизорите повеќе не се внесуваат од `masterTvs.json` во
JavaScript-от. Доаѓаат од мало API што чита од SQLite. Значи **за да се види
сајтот локално, API-то мора да работи** — инаку страницата се отвора, но без
телевизори.

## Првпат (еднаш)

```bash
cd server
npm install          # зависностите на API-то (одделно од React апликацијата)
node import.js       # ја прави базата од src/Data/masterTvs.json
cd ..
```

`server/display.db` се генерира и не се чува во git. `masterTvs.json` останува
изворот на вистината — базата може да се направи одново кога сакаш.

## Секој ден: ДВА терминала

**Терминал 1 — API-то (остава се да работи):**

```bash
npm run api          # Fastify на http://localhost:3001
```

**Терминал 2 — сајтот:**

```bash
npm start            # React на http://localhost:3000
```

`package.json` има `"proxy": "http://localhost:3001"`, па `/api/...` од
localhost:3000 сам оди до API-то — истиот пат како на серверот преку nginx.
Нема потреба од посебни поставки.

## Ако се сменат податоците

По секое скрапирање или рачна промена во `src/Data/masterTvs.json`:

```bash
npm run api:import   # повторно ја полни базата
npm test             # проверува дека „Одбери ТВ" сè уште работи
```

## Објавување

```bash
./scripts/deploy.sh
```

Гради локално и качува само готовите фајлови на серверот. **Пушкањето на git
НЕ го објавува сајтот** — git е само за кодот. Објавува само тој што има SSH
клуч на серверот.

Ако се сменило нешто во `server/`, тоа се качува одделно:

```bash
rsync -az --exclude node_modules --exclude 'display.db*' server/ root@159.195.5.43:/opt/display-mk/server/
ssh root@159.195.5.43 'chown -R displaymk:displaymk /opt/display-mk && systemctl restart display-mk-api'
```

## Кратко за проблеми

| Симптом | Причина |
|---|---|
| Страницата се отвора, нема телевизори | API-то не работи — `npm run api` |
| „Не успеавме да ги вчитаме телевизорите" | исто како горе |
| `npm run api` се жали дека нема база | `node server/import.js` |
| Бројот покрај „Телевизори" е 0 | API-то не одговара на `/api/filters` |
