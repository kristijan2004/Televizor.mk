// Рачно парсирање/градење колачиња — само две колачиња во целиот проект
// (сесија + CSRF токен), па не е потребен нов пакет за ова.

export function parseCookies(header) {
  const out = {};
  if (!header) return out;

  for (const part of String(header).split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;

    const key = part.slice(0, idx).trim();
    const raw = part.slice(idx + 1).trim();

    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }

  return out;
}

/*
  `secure` се одлучува по барање (request.protocol), не по фиксна поставка:
  во продукција барањата доаѓаат преку nginx кој го поставува
  X-Forwarded-Proto, а trustProxy во Fastify го чита; локално (без nginx)
  протоколот е http и Secure правилно отсуствува, инаку прелистувачот
  воопшто не би го испратил колачето назад.
*/
export function serializeCookie(name, value, options = {}) {
  const {
    httpOnly = false,
    secure = true,
    sameSite = "Strict",
    maxAge,
    path = "/",
  } = options;

  let str = `${name}=${encodeURIComponent(value)}; Path=${path}`;

  if (maxAge !== undefined) str += `; Max-Age=${maxAge}`;
  if (httpOnly) str += "; HttpOnly";
  if (secure) str += "; Secure";
  if (sameSite) str += `; SameSite=${sameSite}`;

  return str;
}

export function clearCookie(name, options = {}) {
  return serializeCookie(name, "", { ...options, maxAge: 0 });
}
