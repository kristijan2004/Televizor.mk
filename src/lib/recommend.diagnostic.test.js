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
