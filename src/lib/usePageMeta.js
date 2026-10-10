import { useEffect } from "react";

/*
  Наслов, опис и canonical по страница.

  Досега целиот сајт имаше еден наслов и еден опис, па за Google секоја
  страница изгледаше исто. Google го извршува JavaScript-от, па поставувањето
  одовде е доволно за пребарувањето. (За преглед при споделување на Facebook
  или Viber не е доволно — тие не чекаат JS; за тоа треба пререндерирање.)

  Почетната намерно останува само „Display.mk".
*/

const SITE = "https://display.mk";
const DEFAULT_DESCRIPTION =
  "Display.mk — споредба на телевизори во Македонија. Спореди спецификации, технологии и големини.";

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

export function usePageMeta({ title, description, path } = {}) {
  useEffect(() => {
    const fullTitle = title || "Display.mk";
    const desc = description || DEFAULT_DESCRIPTION;

    document.title = fullTitle;

    setMeta('meta[name="description"]', "content", desc);

    // Google бара една вистинска адреса по страница; без ова, адреси со
    // ?нешто се сметаат за посебни страници со иста содржина.
    if (path) {
      setMeta('link[rel="canonical"]', "href", `${SITE}${path}`);
    }

    // За споделување. Работи таму каде што се чита по извршување на JS.
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:type"]', "content", "website");
    if (path) {
      setMeta('meta[property="og:url"]', "content", `${SITE}${path}`);
    }
  }, [title, description, path]);
}

export default usePageMeta;
