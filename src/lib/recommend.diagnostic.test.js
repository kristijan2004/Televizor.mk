import {
  DISTANCE_OPTIONS,
  LIGHT_OPTIONS,
  USE_OPTIONS,
  PRIORITY_OPTIONS,
  recommend,
} from "./recommend";

import {
  loadData,
  buildCatalogue,
  getBudgetOptions,
  getBrandOptions,
} from "./tvSpecs";

// Тестот смее да ги внесе JSON датотеките директно — тој не оди во bundle-от.
import masterTvs from "../Data/masterTvs.json";
import anhochTvs from "../Data/anhochTvs.json";
import setecTvs from "../Data/setecTvs.json";
import neptunTvs from "../Data/neptunTvs.json";
import ddstoreTvs from "../Data/ddstoreTvs.json";

loadData({ masterTvs, anhochTvs, setecTvs, neptunTvs, ddstoreTvs });

const catalogue = buildCatalogue(masterTvs);
const budgets = getBudgetOptions(catalogue);
const brands = getBrandOptions(catalogue);

test("catalogue builds and every entry has the shape recommend() expects", () => {
  expect(catalogue.length).toBeGreaterThan(0);

  const missingGaming = catalogue.filter((tv) => !tv.gaming);
  const missingOffers = catalogue.filter((tv) => !Array.isArray(tv.offers));

  console.log(`
catalogue entries ......... ${catalogue.length}
  technology known ........ ${catalogue.filter((t) => t.technology !== null).length}
  size known .............. ${catalogue.filter((t) => t.size !== null).length}
  price known ............. ${catalogue.filter((t) => t.price !== null).length}
  in stock ................ ${catalogue.filter((t) => t.inStock).length}
  refreshRate known ....... ${catalogue.filter((t) => t.refreshRate !== null).length}
  os known ................ ${catalogue.filter((t) => t.os).length}
missing .gaming ........... ${missingGaming.length}
missing .offers ........... ${missingOffers.length}
budget brackets ........... ${budgets.length}
brand options ............. ${brands.length}
`);

  for (const field of ["technology", "refreshRate", "os"]) {
    const gaps = catalogue.filter((t) => !t[field]);
    for (const t of gaps) {
      console.log(
        `  spec gap [${field}]: ${t.brand} ${t.model} (${t.size}") — ` +
          `catalogue could not verify it, so the scorer stays neutral`
      );
    }
  }

  expect(missingGaming).toHaveLength(0);
  expect(missingOffers).toHaveLength(0);
});

test("every panel type in the catalogue is known to the scorer", () => {
  const techs = [...new Set(catalogue.map((t) => t.technology))].filter(Boolean);
  console.log("panel types reaching the scorer:", techs.sort().join(", "));

  // PANEL in recommend.js keys off these exact strings.
  const known = ["OLED", "MICRO_RGB", "MINI_LED", "QNED", "QLED", "NANOCELL", "LED"];
  expect(techs.filter((t) => !known.includes(t))).toHaveLength(0);
});

test("recommend() survives every combination of quiz answers", () => {
  const failures = [];
  const empty = [];
  let combos = 0;

  for (const distance of DISTANCE_OPTIONS) {
    for (const light of LIGHT_OPTIONS) {
      for (const use of USE_OPTIONS) {
        for (const priority of PRIORITY_OPTIONS) {
          for (const budget of [null, ...budgets]) {
            combos += 1;

            const answers = {
              distance: distance.id,
              light: light.id,
              use: use.id,
              priority: priority.id,
              budget,
              brands: [],
            };

            let result;
            try {
              result = recommend(catalogue, answers);
            } catch (error) {
              failures.push(`${distance.id}/${light.id}/${use.id}/${priority.id}/${budget?.id ?? "no-budget"}: ${error.message}`);
              continue;
            }

            if (result.picks.length === 0) {
              empty.push(`${use.id}/${priority.id}/${budget?.id ?? "no-budget"} (blocked=${result.blocked})`);
              continue;
            }

            if (result.picks.length > 3) {
              failures.push(`more than 3 picks: ${result.picks.length}`);
            }

            for (const pick of result.picks) {
              if (!pick.reasons || pick.reasons.length === 0) {
                failures.push(`pick with no reasons: ${pick.tv.brand} ${pick.tv.model}`);
              }
              if (!pick.tv) {
                failures.push("pick with no tv");
              }
            }

            const kinds = result.picks.map((p) => p.kind);
            if (new Set(kinds).size !== kinds.length) {
              failures.push(`duplicate kinds: ${kinds.join(",")}`);
            }

            const ids = result.picks.map((p) => p.tv.id);
            if (new Set(ids).size !== ids.length) {
              failures.push(`same TV twice: ${ids.join(",")}`);
            }
          }
        }
      }
    }
  }

  console.log(`
combinations tested ....... ${combos}
threw an error ............ ${failures.length}
returned zero picks ....... ${empty.length}
`);

  if (empty.length) console.log("empty results:\n  " + [...new Set(empty)].join("\n  "));
  if (failures.length) console.log("failures:\n  " + [...new Set(failures)].slice(0, 20).join("\n  "));

  expect(failures).toHaveLength(0);
});

test("brand preference actually steers the picks", () => {
  const problems = [];
  const lines = [];

  for (const option of brands) {
    const result = recommend(catalogue, {
      distance: "2.5-3",
      light: "umerena",
      use: "meshano",
      priority: "slika",
      budget: null,
      brands: [option.brand],
    });

    if (result.picks.length === 0) {
      problems.push(`no picks at all for ${option.brand}`);
      continue;
    }

    // The contract is that the brand appears in ANY of the three picks,
    // not necessarily as the top one.
    const honoured = result.picks.some((p) => p.tv.brand === option.brand);
    const topBrand = result.picks[0].tv.brand;

    // brandNote is how the UI explains "your brand did not make the top 3".
    const explained = honoured || result.brandNote !== null;

    if (!explained) {
      problems.push(`${option.brand}: not picked AND not explained`);
    }

    lines.push(
      `  ${option.brand.padEnd(12)} ${option.count.toString().padStart(3)} models  -> top ${topBrand.padEnd(10)} ${honoured ? `in picks (${result.picks.filter((p) => p.tv.brand === option.brand).length}/${result.picks.length})` : "NOT in picks, brandNote set"}`
    );
  }

  console.log(`\nbrand preference (${brands.length} brands offered in the quiz):\n` + lines.join("\n") + "\n");

  expect(problems).toHaveLength(0);
});

test("gaming wishes are preferences, never filters", () => {
  const strict = {
    distance: "2.5-3",
    light: "umerena",
    use: "gejming",
    priority: "gejming",
    budget: { id: "cheap", min: 0, max: 19000 },
    brands: [],
    gamingWishes: { hz120: true, vrr: true, allm: true },
  };

  const result = recommend(catalogue, strict);

  // Со низок буџет и сите три желби, строг филтер би вратил празно.
  // Желбите не смеат да го направат тоа.
  expect(result.picks.length).toBeGreaterThan(0);

  const missing = result.picks.filter((p) =>
    p.warnings.some((w) => /Нема/.test(w))
  );

  console.log(`
gaming wishes on a low budget:
  picks ..................... ${result.picks.length}
  of which miss a wish ...... ${missing.length} (told to the user, not filtered out)
  top ....................... ${result.picks[0].tv.brand} ${result.picks[0].tv.model}`);
});

test("the third card is only shown when it has a real advantage", () => {
  let withAlt = 0;
  let total = 0;
  const examples = [];

  for (const distance of DISTANCE_OPTIONS) {
    for (const use of USE_OPTIONS) {
      total += 1;
      const r = recommend(catalogue, {
        distance: distance.id,
        light: "umerena",
        use: use.id,
        priority: "slika",
        budget: null,
        brands: [],
      });

      const alt = r.picks.find((p) => p.kind === "alternativa");
      if (alt) {
        withAlt += 1;
        // ако е прикажана, МОРА да има именувана предност
        expect(alt.advantage).toBeTruthy();
        if (examples.length < 5) examples.push(`${alt.tv.brand} ${alt.tv.model} — ${alt.advantage}`);
      }
    }
  }

  console.log(`
alternative card:
  shown in .................. ${withAlt}/${total} combinations
  each with a named advantage:`);
  examples.forEach((e) => console.log("    " + e));
});

test("picks are never duplicates of each other", () => {
  for (const use of USE_OPTIONS) {
    for (const priority of PRIORITY_OPTIONS) {
      const r = recommend(catalogue, {
        distance: "2.5-3",
        light: "temna",
        use: use.id,
        priority: priority.id,
        budget: null,
        brands: [],
      });
      const ids = r.picks.map((p) => p.tv.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  }
});

test("an explicit size preference overrides the distance suggestion", () => {
  // 32" is never "ideal" for 3–3.5m distance (that distance wants 65/75),
  // so this only passes if preferredSize actually takes over scoreSize.
  const withoutPreference = recommend(catalogue, {
    distance: "3-3.5",
    light: "umerena",
    use: "meshano",
    priority: "slika",
    budget: null,
    brands: [],
  });

  const withPreference = recommend(catalogue, {
    distance: "3-3.5",
    light: "umerena",
    use: "meshano",
    priority: "slika",
    budget: null,
    brands: [],
    preferredSize: 32,
  });

  expect(withPreference.picks.length).toBeGreaterThan(0);
  expect(withPreference.picks[0].tv.size).toBe(32);

  console.log(`
preferred size override:
  without preference ........ top pick ${withoutPreference.picks[0]?.tv.size}"
  with 32" preference ........ top pick ${withPreference.picks[0].tv.size}"`);
});

test("a size preference the budget can't afford is explained, not hidden", () => {
  // A tight budget has no 100" TV in it, so sizeNote must say so rather than
  // silently returning whatever small TV scored best on everything else.
  const tight = recommend(catalogue, {
    distance: null,
    light: null,
    use: null,
    priority: null,
    budget: budgets.find((b) => b.id === "do-20000") || budgets[0],
    brands: [],
    preferredSize: 100,
  });

  expect(tight.picks.length).toBeGreaterThan(0);
  expect(tight.sizeNote).toBe(100);

  // No budget constraint: the preference IS affordable, so no note.
  const open = recommend(catalogue, {
    distance: null,
    light: null,
    use: null,
    priority: null,
    budget: null,
    brands: [],
    preferredSize: 100,
  });

  expect(open.sizeNote).toBeNull();
  expect(open.picks[0].tv.size).toBe(100);

  console.log(`
size preference vs budget:
  tight budget ............. sizeNote=${tight.sizeNote}, top ${tight.picks[0].tv.size}"
  no budget ................. sizeNote=${open.sizeNote}, top ${open.picks[0].tv.size}"`);
});

test("extra results do not repeat the picks", () => {
  const r = recommend(
    catalogue,
    { distance: "2.5-3", light: "umerena", use: "meshano", priority: "slika", budget: null, brands: [] },
    { extra: 12 }
  );

  const pickIds = new Set(r.picks.map((p) => p.tv.id));
  const overlap = r.more.filter((m) => pickIds.has(m.tv.id));

  console.log(`
show more:
  extra returned ............ ${r.more.length}
  total available ........... ${r.moreAvailable}
  overlapping with picks .... ${overlap.length}`);

  expect(overlap).toHaveLength(0);
  expect(r.more.length).toBeLessThanOrEqual(12);
});
