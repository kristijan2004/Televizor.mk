/*
  Рангирање телевизори според одговорите од квизот.
  Ranking TVs against the quiz answers.

  Pure functions, no React, no imports from the app.

  Two rules shape everything here:

  1. Budget is the only hard filter. Everything else scores, so a TV that is
     wrong on one answer but excellent on the rest still surfaces — someone who
     says "gaming" should not be shown a bad television just because it is the
     only one with a known refresh rate.

  2. A reason is only ever written from a spec the catalogue actually knows.
     `tvSpecs.js` leaves unknown specs as `null`, and nothing below invents a
     value for them. The user reads the reasons, never a score.
*/

/* ------------------------------------------------------------------ *
 * Question 1 — viewing distance
 * ------------------------------------------------------------------ */

/*
  Roughly "distance in cm / 2 = diagonal in cm" for 4K, which is the guidance
  the site's own article gives. Expressed as the sizes people can actually buy.
*/
export const DISTANCE_OPTIONS = [
  { id: "do-2", label: "До 2 метри", ideal: [32, 43, 50], good: [55] },
  { id: "2-2.5", label: "2 – 2,5 метри", ideal: [43, 50, 55], good: [65] },
  { id: "2.5-3", label: "2,5 – 3 метри", ideal: [55, 65], good: [50, 75] },
  { id: "3-3.5", label: "3 – 3,5 метри", ideal: [65, 75], good: [55, 85] },
  { id: "nad-3.5", label: "Над 3,5 метри", ideal: [75, 85, 98], good: [65, 100] },
];

/* ------------------------------------------------------------------ *
 * Question 2 — room light
 * ------------------------------------------------------------------ */

export const LIGHT_OPTIONS = [
  { id: "svetla", label: "Многу прозорци и директно сонце" },
  { id: "umerena", label: "Умерена светлина" },
  { id: "temna", label: "Темна соба или можам да ја затемнам" },
];

/* ------------------------------------------------------------------ *
 * Question 3 — what they watch
 * ------------------------------------------------------------------ */

export const USE_OPTIONS = [
  { id: "filmovi", label: "Филмови и серии навечер" },
  { id: "sport", label: "Спорт и дневна програма" },
  { id: "gejming", label: "Гејминг" },
  { id: "meshano", label: "Мешано" },
];

/* ------------------------------------------------------------------ *
 * Question 5 — what matters most
 * ------------------------------------------------------------------ */

export const PRIORITY_OPTIONS = [
  { id: "slika", label: "Квалитет на слика" },
  { id: "golemina", label: "Најголем екран за парите" },
  { id: "gejming", label: "Гејминг можности" },
  { id: "smart", label: "Smart функции и апликации" },
];

/* ------------------------------------------------------------------ *
 * Panel-type tendencies
 * ------------------------------------------------------------------ */

const PANEL = {
  OLED: { label: "OLED", bright: 1, dark: 5, picture: 5 },
  MICRO_RGB: { label: "Micro RGB", bright: 5, dark: 4, picture: 5 },
  MINI_LED: { label: "Mini LED", bright: 5, dark: 4, picture: 4 },
  QNED: { label: "QNED", bright: 4, dark: 3, picture: 3 },
  QLED: { label: "QLED", bright: 4, dark: 3, picture: 3 },
  NANOCELL: { label: "NanoCell", bright: 3, dark: 2, picture: 3 },
  LED: { label: "LED", bright: 2, dark: 2, picture: 2 },
};

function panelOf(tv) {
  return tv.technology ? PANEL[tv.technology] || null : null;
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

/*
  Each part returns points plus, when it has something factual to say, a reason
  in Macedonian. A part with nothing to go on returns a neutral score and no
  reason, so a TV with thin data is neither rewarded nor punished.
*/

function scoreSize(tv, answers) {
  const distance = DISTANCE_OPTIONS.find((o) => o.id === answers.distance);

  if (!distance || tv.size === null) {
    return { points: 0, reason: null };
  }

  if (distance.ideal.includes(tv.size)) {
    return {
      points: 30,
      reason: `${tv.size} инчи, идеално за твоето растојание`,
    };
  }

  if (distance.good.includes(tv.size)) {
    return {
      points: 18,
      reason: `${tv.size} инчи, добро се вклопува во твојот простор`,
    };
  }

  // Not on the list, but how far off is it really?
  const nearest = Math.min(
    ...distance.ideal.map((size) => Math.abs(size - tv.size))
  );

  if (nearest <= 5) {
    return { points: 10, reason: `${tv.size} инчи, близу до препорачаното` };
  }

  if (nearest <= 12) {
    return { points: 2, reason: null };
  }

  const tooBig = tv.size > Math.max(...distance.ideal);

  return {
    points: -14,
    reason: null,
    warning: tooBig
      ? `${tv.size} инчи е голем за твоето растојание`
      : `${tv.size} инчи е мал за твоето растојание`,
  };
}

function scoreLight(tv, answers) {
  const panel = panelOf(tv);

  if (!panel || !answers.light) {
    return { points: 0, reason: null };
  }

  if (answers.light === "svetla") {
    if (panel.bright >= 4) {
      return {
        points: 22,
        reason: `${panel.label}, добар избор за светла соба`,
      };
    }

    if (panel.bright <= 1) {
      return {
        points: -10,
        reason: null,
        warning: `${panel.label} е најдобар во затемнета соба`,
      };
    }

    return { points: 4, reason: null };
  }

  if (answers.light === "temna") {
    if (panel.dark >= 5) {
      return {
        points: 24,
        reason: `${panel.label}, вистинска црна боја во затемнета соба`,
      };
    }

    if (panel.dark >= 4) {
      return {
        points: 14,
        reason: `${panel.label}, добар контраст навечер`,
      };
    }

    return { points: 2, reason: null };
  }

  // Moderate light — a panel that handles both is mildly preferred.
  if (panel.bright >= 4 && panel.dark >= 4) {
    return {
      points: 12,
      reason: `${panel.label}, се снаоѓа и дење и навечер`,
    };
  }

  return { points: 4, reason: null };
}

function scoreUse(tv, answers) {
  const panel = panelOf(tv);

  if (answers.use === "gejming" || answers.priority === "gejming") {
    // Only what the catalogue genuinely knows about this model.
    if (tv.gaming.highRefresh) {
      return {
        points: 26,
        reason: `${tv.refreshRate}Hz панел, погоден за гејминг`,
      };
    }

    if (tv.gaming.vrr || tv.gaming.allm || tv.gaming.hdmi21) {
      const features = [
        tv.gaming.hdmi21 && "HDMI 2.1",
        tv.gaming.vrr && "VRR",
        tv.gaming.allm && "ALLM",
      ].filter(Boolean);

      return {
        points: 18,
        reason: `Поддржува ${features.join(" и ")}`,
      };
    }

    if (tv.refreshRate !== null && tv.refreshRate < 120) {
      return {
        points: -6,
        reason: null,
        warning: `${tv.refreshRate}Hz — доволно за игри, но не и за 120fps`,
      };
    }

    // Unknown rather than bad: say nothing and stay neutral.
    return { points: 0, reason: null };
  }

  if (!panel) {
    return { points: 0, reason: null };
  }

  if (answers.use === "filmovi" && panel.dark >= 4) {
    return {
      points: 16,
      reason: `${panel.label}, силен контраст за филмови`,
    };
  }

  if (answers.use === "sport" && panel.bright >= 4) {
    return {
      points: 14,
      reason: `${panel.label}, светла слика за дневна програма`,
    };
  }

  return { points: 2, reason: null };
}

function scorePriority(tv, answers) {
  const panel = panelOf(tv);

  if (answers.priority === "slika") {
    if (!panel) {
      return { points: 0, reason: null };
    }

    if (panel.picture >= 5) {
      return { points: 22, reason: `${panel.label}, врвен панел` };
    }

    if (panel.picture >= 4) {
      return { points: 14, reason: `${panel.label}, квалитетен панел` };
    }

    return { points: 2, reason: null };
  }

  if (answers.priority === "golemina") {
    if (tv.size === null || tv.price === null) {
      return { points: 0, reason: null };
    }

    // Denar per inch — the plainest "screen for the money" measure there is.
    const perInch = tv.price / tv.size;

    if (perInch < 400) {
      return {
        points: 22,
        reason: `${tv.size} инчи за оваа цена е одличен однос`,
      };
    }

    if (perInch < 700) {
      return { points: 12, reason: `Добар однос големина и цена` };
    }

    return { points: 0, reason: null };
  }

  if (answers.priority === "smart") {
    if (!tv.os) {
      return { points: 0, reason: null };
    }

    const known = /GOOGLE|ANDROID|TIZEN|WEBOS|VIDAA/i.test(tv.os);

    if (known) {
      return {
        points: 16,
        reason: `${tv.os}, со сите почести апликации`,
      };
    }

    return { points: 2, reason: null };
  }

  // Gaming priority is handled inside scoreUse so the reason is not duplicated.
  return { points: 0, reason: null };
}

function scoreBrand(tv, answers) {
  const brands = answers.brands || [];

  if (brands.length === 0 || brands.includes("site")) {
    return { points: 0, reason: null };
  }

  if (brands.includes(tv.brand)) {
    return { points: 16, reason: null };
  }

  // A preference, not a filter: another brand can still win on merit.
  return { points: -18, reason: null };
}

function scoreAvailability(tv) {
  if (!tv.inStock) {
    return {
      points: -8,
      reason: null,
      warning: "Моментално не е означен како достапен",
    };
  }

  if (tv.storeCount > 1) {
    return {
      points: 6,
      reason: `Достапен кај ${tv.storeCount} трговци`,
    };
  }

  return { points: 0, reason: null };
}

/* ------------------------------------------------------------------ *
 * Putting a TV through every part
 * ------------------------------------------------------------------ */

function scoreTv(tv, answers) {
  const parts = [
    scoreSize(tv, answers),
    scoreLight(tv, answers),
    scoreUse(tv, answers),
    scorePriority(tv, answers),
    scoreBrand(tv, answers),
    scoreAvailability(tv),
  ];

  let score = parts.reduce((total, part) => total + part.points, 0);

  const reasons = parts.map((part) => part.reason).filter(Boolean);
  const warnings = parts.map((part) => part.warning).filter(Boolean);

  // How much of what the user was asked about we can actually speak to.
  const knownSpecs = [tv.size, tv.technology, tv.price].filter(
    (value) => value !== null
  ).length;

  /*
    A model with neither a size nor a panel type cannot be matched to anyone's
    room, so it should not win on the strength of never being penalised. It
    stays in the running, but behind anything we can actually justify.
  */
  if (tv.size === null && tv.technology === null) {
    score -= 25;
  }

  /*
    Never show a card with nothing under it. If the catalogue has nothing to
    say about this model, say that — it is more useful than silence, and it
    tells the reader to check the specs at the shop.
  */
  if (reasons.length === 0) {
    reasons.push(
      tv.price !== null
        ? "Се вклопува во твојот буџет, но спецификациите не ни се целосни — провери ги кај трговецот"
        : "Спецификациите за овој модел не ни се целосни — провери ги кај трговецот"
    );
  }

  return { tv, score, reasons, warnings, knownSpecs };
}

/* ------------------------------------------------------------------ *
 * Budget — the one hard filter
 * ------------------------------------------------------------------ */

function withinBudget(tv, budget) {
  if (!budget) {
    return true;
  }

  if (tv.price === null) {
    return false;
  }

  return tv.price > budget.min - 1 && tv.price <= budget.max;
}

/* ------------------------------------------------------------------ *
 * Public entry point
 * ------------------------------------------------------------------ */

/*
  Returns up to three picks, each labelled with the job it does:

    najdobar — best overall match
    vrednost — the cheapest TV that still scores well, when it is not the same
               model as the best match
    premium  — the strongest pick in the top of the budget, when one exists

  `blocked` explains an empty or thin result so the UI never has to show a bare
  "no results" screen, and `relax` names the single constraint most worth
  loosening.
*/
export function recommend(catalogue, answers) {
  const budget = answers.budget || null;

  const affordable = catalogue.filter((tv) => withinBudget(tv, budget));

  if (affordable.length === 0) {
    return {
      picks: [],
      blocked: "budget",
      relax: suggestRelaxation(catalogue, answers),
      consideredCount: 0,
    };
  }

  const ranked = affordable
    .map((tv) => scoreTv(tv, answers))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Between equals, prefer the one we can say more about, then the cheaper.
      if (b.knownSpecs !== a.knownSpecs) {
        return b.knownSpecs - a.knownSpecs;
      }

      return (a.tv.price || Infinity) - (b.tv.price || Infinity);
    });

  const best = ranked[0];

  const picks = [{ ...best, kind: "najdobar" }];

  // Best value: among the genuinely good matches, the cheapest one.
  const strong = ranked.filter(
    (entry) => entry.score >= best.score * 0.6 && entry.tv.price !== null
  );

  const value = strong
    .slice()
    .sort((a, b) => a.tv.price - b.tv.price)
    .find((entry) => entry.tv.id !== best.tv.id);

  if (value) {
    picks.push({ ...value, kind: "vrednost" });
  }

  // Premium: the strongest pick that costs clearly more than the best match.
  const premium = ranked.find(
    (entry) =>
      entry.tv.price !== null &&
      best.tv.price !== null &&
      entry.tv.price > best.tv.price * 1.25 &&
      !picks.some((pick) => pick.tv.id === entry.tv.id)
  );

  if (premium) {
    picks.push({ ...premium, kind: "premium" });
  }

  /*
    Brand is a preference rather than a filter, so it can happen that nothing
    from the chosen brands makes the top three. Saying so is better than
    leaving the user to wonder whether their answer was ignored.
  */
  const brands = answers.brands || [];

  const brandHonoured =
    brands.length === 0 ||
    brands.includes("site") ||
    picks.some((pick) => brands.includes(pick.tv.brand));

  return {
    picks,
    blocked: null,
    relax: null,
    consideredCount: affordable.length,
    brandNote: brandHonoured ? null : brands,
  };
}

/*
  When the budget empties the catalogue, work out what to suggest. Looks at the
  cheapest TV that fits everything else, so the message can name a real number
  rather than a vague "try again".
*/
function suggestRelaxation(catalogue, answers) {
  const priced = catalogue.filter((tv) => tv.price !== null);

  if (priced.length === 0) {
    return null;
  }

  const brands = answers.brands || [];

  const matchingBrand =
    brands.length > 0 && !brands.includes("site")
      ? priced.filter((tv) => brands.includes(tv.brand))
      : priced;

  // Does dropping the brand preference alone open anything up?
  if (matchingBrand.length === 0) {
    return { constraint: "brands", cheapest: null };
  }

  const cheapest = matchingBrand.reduce((lowest, tv) =>
    tv.price < lowest.price ? tv : lowest
  );

  const distance = DISTANCE_OPTIONS.find((o) => o.id === answers.distance);

  // Would a smaller screen fit the budget?
  if (distance) {
    const smaller = matchingBrand.filter(
      (tv) => tv.size !== null && tv.size < Math.min(...distance.ideal)
    );

    if (smaller.length > 0) {
      const cheapestSmaller = smaller.reduce((lowest, tv) =>
        tv.price < lowest.price ? tv : lowest
      );

      return {
        constraint: "size",
        cheapest: cheapestSmaller.price,
        size: cheapestSmaller.size,
      };
    }
  }

  return { constraint: "budget", cheapest: cheapest.price };
}
