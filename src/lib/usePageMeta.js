import { useEffect } from "react";

/*
  Наслов, опис и canonical по страница.

  Досега целиот сајт имаше еден наслов и еден опис, па за Google секоја
  страница изгледаше исто. Google го извршува JavaScript-от, па поставувањето
  одовде е доволно за пребарувањето. (За преглед при споделување на Facebook
  или Viber не е доволно — тие не чекаат JS; за тоа треба пререндерирање.)
*/

const SITE = "https://display.mk";
const DEFAULT_DESCRIPTION =
  "Сите телевизори достапни во Македонија на едно место. Филтрирај по големина и технологија, спореди модели и најди го вистинскиот телевизор според твоите потреби.";
const DEFAULT_SHARE_IMAGE = `${SITE}/og-image.png`;
const DEFAULT_SHARE_IMAGE_ALT = "Display.mk — најди го твојот телевизор";

function setMeta(selector, attribute, value) {
  let tag = document.head.querySelector(selector);

  if (!tag) {
    tag = document.createElement(selector.startsWith("link") ? "link" : "meta");

    if (selector.includes("property=")) {
      tag.setAttribute("property", selector.match(/property="([^"]+)"/)[1]);
    } else if (selector.includes("name=")) {
      tag.setAttribute("name", selector.match(/name="([^"]+)"/)[1]);
    } else if (selector.includes("rel=")) {
      tag.setAttribute("rel", selector.match(/rel="([^"]+)"/)[1]);
    }

    document.head.appendChild(tag);
  }

  tag.setAttribute(attribute, value);
}

function removeMeta(selector) {
  const tag = document.head.querySelector(selector);
  if (tag) tag.remove();
}

function absoluteImage(image) {
  if (!image) return null;
  if (/^https?:\/\//.test(image)) return image;
  return `${SITE}${image.startsWith("/") ? "" : "/"}${image}`;
}

export function usePageMeta({
  title,
  description,
  path,
  image,
  type,
  publishedTime,
  section,
} = {}) {
  useEffect(() => {
    const fullTitle = title || "Display.mk";
    const desc = description || DEFAULT_DESCRIPTION;
    // Canonical секогаш без query string — ?нешто не е посебна страница.
    const cleanPath = path ? path.split("?")[0] : null;
    const img = absoluteImage(image) || DEFAULT_SHARE_IMAGE;
    const hasRealImage = Boolean(absoluteImage(image));

    document.title = fullTitle;

    setMeta('meta[name="description"]', "content", desc);

    // Google бара една вистинска адреса по страница; без ова, адреси со
    // ?нешто се сметаат за посебни страници со иста содржина.
    if (cleanPath) {
      setMeta('link[rel="canonical"]', "href", `${SITE}${cleanPath}`);
    }

    // За споделување. Работи таму каде што се чита по извршување на JS —
    // серверот (server/index.js, /__html/*) веќе го прави истото во самиот
    // HTML за crawlers/Facebook/Viber, кои не чекаат JS.
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:type"]', "content", type || "website");
    setMeta('meta[property="og:site_name"]', "content", "Display.mk");
    setMeta('meta[property="og:locale"]', "content", "mk_MK");
    if (cleanPath) {
      setMeta('meta[property="og:url"]', "content", `${SITE}${cleanPath}`);
    }
    setMeta('meta[property="og:image"]', "content", img);
    if (hasRealImage) {
      setMeta('meta[property="og:image:alt"]', "content", fullTitle);
      // Чистење по навигација од страница без своја слика (која ги постави
      // на 1200x630) — не смеат да останат за слика со непознати димензии.
      removeMeta('meta[property="og:image:width"]');
      removeMeta('meta[property="og:image:height"]');
    } else {
      setMeta('meta[property="og:image:width"]', "content", "1200");
      setMeta('meta[property="og:image:height"]', "content", "630");
      setMeta('meta[property="og:image:alt"]', "content", DEFAULT_SHARE_IMAGE_ALT);
    }
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    if (publishedTime) {
      setMeta('meta[property="article:published_time"]', "content", publishedTime);
    } else {
      removeMeta('meta[property="article:published_time"]');
    }
    if (section) {
      setMeta('meta[property="article:section"]', "content", section);
    } else {
      removeMeta('meta[property="article:section"]');
    }
  }, [title, description, path, image, type, publishedTime, section]);
}

export default usePageMeta;
