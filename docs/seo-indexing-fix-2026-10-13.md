# SEO/indexing fix — 2026-10-13

Google Search Console reported the sitemap as "Couldn't fetch". Investigation
found two real, stacked problems — not the domain being new, and not a
misconfigured sitemap on our side.

## 1. Cloudflare was blocking real Googlebot (site-wide, not just the sitemap)

Cloudflare Security Events showed a genuine Googlebot request (IP
`66.249.68.39`, ASN AS15169 Google LLC) to `/sitemap.xml` blocked by the
managed rule `BOBA-199 "Block AI training crawlers"` (part of "Cloudflare Bot
Management rules for all plans" — enforces on the free plan; only *editing*
individual rules needs paid WAF). This rule was catching the search crawler
despite Cloudflare's own bot list correctly tagging it "Search Engine
Crawler". Since this isn't scoped to the sitemap path, it was blocking regular
page crawling too — the sitemap status was just the visible symptom.

**Fix (free, no WAF upgrade):** Cloudflare dashboard → Security → WAF →
Custom rules → new rule:
- Condition: `cf.verified_bot_category eq "Search Engine Crawler"`
- Action: **Skip** → "All managed rules" + "All Super Bot Fight Mode Rules"

Confirmed via Search Console "Test Live URL" on the sitemap → "URL is
available to Google", then sitemap re-read: **547/547 pages discovered**.

## 2. nginx `@html` fallback broke any TV page with a space or `&` in the model

`/etc/nginx/sites-available/display.mk` and `display.mk-ssl` (server-only,
not tracked in this repo) had:

```
location @html {
    proxy_pass http://127.0.0.1:3001/__html$uri;
    ...
}
```

`$uri` is nginx's percent-**decoded** path. For a model like "65 C7L 144Hz
B&O" this sent a literal unencoded space/`&` to Fastify, breaking the HTTP
request line — `/tv/TCL/65%20C7L%20144Hz%20B%26O` returned 400. Fastify
itself was fine (tested `127.0.0.1:3001/__html/...` directly with correct
encoding, got 200). This was a real crawl error on a URL already listed in
the sitemap, not a hypothetical edge case.

**Fix:** changed `$uri` to `$request_uri` (preserves original encoding) in
both config files, `nginx -t && systemctl reload nginx`. Verified the TCL
page now returns 200, and re-checked homepage/a normal TV page/articles/
compare/admin for no regression.

## Why this matters for next time

A curl test with a spoofed Googlebot user-agent will never reveal problem
#1 — it only proves the server *can* serve Googlebot, not that Cloudflare
*lets the real one through*. Check Cloudflare Security Events for the actual
Googlebot IP range (`66.249.x.x`, ASN 15169) first if a "couldn't fetch" /
"not indexed" symptom shows up again.

Neither nginx config nor the Cloudflare rule is tracked in this git
repository — both live only on the server / in the Cloudflare dashboard.
