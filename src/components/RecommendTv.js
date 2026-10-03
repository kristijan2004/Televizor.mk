import { useState } from "react";
import { Link } from "react-router-dom";
import tvs from "../data/masterTvs.json";

function getLowestPrice(stores) {
  if (!stores) return null;

  const prices = Object.values(stores)
    .filter(
      (store) =>
        store?.inStock === true &&
        typeof store.price === "number"
    )
    .map((store) => store.price);

  if (prices.length === 0) return null;

  return Math.min(...prices);
}

function getAvailableStores(stores) {
  if (!stores) return [];

  return Object.entries(stores)
    .filter(([, store]) => store?.inStock === true)
    .map(([name]) => name);
}

function getRecommendedSizes(distance) {
  switch (distance) {
    case "До 2 метри":
      return [43, 50, 55];

    case "2–2.5 метри":
      return [50, 55, 65];

    case "2.5–3 метри":
      return [55, 65, 75];

    case "Над 3 метри":
      return [65, 75, 85, 98];

    default:
      return [55, 65];
  }
}

function getSizeScore(size, distance) {
  const recommended = getRecommendedSizes(distance);

  if (recommended.includes(size)) {
    return 20;
  }

  const closest = Math.min(
    ...recommended.map((value) => Math.abs(value - size))
  );

  if (closest <= 5) return 14;
  if (closest <= 10) return 8;

  return 2;
}

function getTechnologyScore(technology) {
  if (!technology) return 0;

  const value = technology.toLowerCase();

  if (value.includes("oled")) return 20;
  if (value.includes("mini led")) return 18;
  if (value.includes("qled")) return 14;
  if (value.includes("neo qled")) return 18;
  if (value.includes("qned")) return 15;

  return 5;
}

function getPictureScore(tv) {
  let score = 0;

  score += getTechnologyScore(tv.technology);

  if (tv.resolution?.toLowerCase().includes("4k")) {
    score += 8;
  }

  if (tv.hdr === true) {
    score += 5;
  }

  if (tv.dolbyVision === true) {
    score += 6;
  }

  if (Array.isArray(tv.hdrFormats)) {
    score += Math.min(tv.hdrFormats.length * 2, 6);
  }

  const brightness = Number.parseInt(tv.brightness, 10);

  if (!Number.isNaN(brightness)) {
    if (brightness >= 1000) score += 8;
    else if (brightness >= 600) score += 6;
    else if (brightness >= 400) score += 4;
    else if (brightness >= 250) score += 2;
  }

  if (tv.pictureProcessor && tv.pictureProcessor !== "—") {
    score += 4;
  }

  return score;
}

function getGamingScore(tv, gaming) {
  let score = 0;

  if (tv.vrr === true) score += 10;
  if (tv.allm === true) score += 8;
  if (tv.freeSync === true) score += 4;
  if (tv.gSync === true) score += 4;

  const refreshRate = Number(tv.refreshRate);

  if (!Number.isNaN(refreshRate)) {
    if (refreshRate >= 144) score += 12;
    else if (refreshRate >= 120) score += 10;
    else if (refreshRate >= 100) score += 7;
    else if (refreshRate >= 60) score += 3;
  }

  if (gaming === "Не ми е важен") {
    return score * 0.25;
  }

  if (gaming === "Повремено играм") {
    return score * 0.65;
  }

  if (gaming === "Gaming ми е многу важен") {
    return score;
  }

  return score;
}

function getUsageScore(tv, usage) {
  let score = 0;

  const refreshRate = Number(tv.refreshRate);

  if (usage === "Спорт") {
    if (refreshRate >= 120) score += 15;
    else if (refreshRate >= 100) score += 11;
    else if (refreshRate >= 60) score += 5;

    if (tv.pictureProcessor && tv.pictureProcessor !== "—") {
      score += 5;
    }

    if (tv.size >= 65) {
      score += 4;
    }
  }

  if (usage === "Филмови и серии") {
    score += getPictureScore(tv) * 0.7;

    if (tv.dolbyVision === true) {
      score += 5;
    }

    if (tv.dolbyAtmos === true) {
      score += 3;
    }
  }

  if (usage === "ТВ канали") {
    if (tv.size >= 55) {
      score += 5;
    }

    if (refreshRate >= 100) {
      score += 5;
    }

    if (tv.pictureProcessor && tv.pictureProcessor !== "—") {
      score += 3;
    }
  }

  if (usage === "Сè по малку") {
    score += getPictureScore(tv) * 0.35;
    score += getGamingScore(tv, "Повремено играм") * 0.25;
  }

  return score;
}

function getPriorityScore(tv, priority, price, minBudget, maxBudget) {
  let score = 0;

  if (priority === "Најдобра слика") {
    score += getPictureScore(tv) * 1.2;
  }

  if (priority === "Најдобар gaming") {
    score += getGamingScore(tv, "Gaming ми е многу важен") * 1.2;
  }

  if (priority === "Најголем екран") {
    score += Math.min(tv.size || 0, 100) * 0.8;
  }

  if (priority === "Најдобар однос цена/квалитет") {
    const range = maxBudget - minBudget || 1;
    const position = Math.max(0, maxBudget - price);

    score += (position / range) * 20;
    score += getPictureScore(tv) * 0.5;
    score += getGamingScore(tv, "Повремено играм") * 0.3;
  }

  return score;
}

function getReasons(tv, answers) {
  const reasons = [];

  const recommendedSizes = getRecommendedSizes(answers.distance);

  if (recommendedSizes.includes(tv.size)) {
    reasons.push(`Големината од ${tv.size}" одговара на растојанието`);
  }

  if (
    answers.usage === "Спорт" &&
    Number(tv.refreshRate) >= 120
  ) {
    reasons.push(`${tv.refreshRate}Hz е одлично за спорт`);
  }

  if (
    answers.gaming !== "Не ми е важен" &&
    (tv.vrr === true || tv.allm === true)
  ) {
    reasons.push("Има функции корисни за gaming");
  }

  if (answers.priority === "Најдобра слика") {
    if (
      tv.technology &&
      tv.technology !== "LED"
    ) {
      reasons.push(`${tv.technology} технологија`);
    }

    if (tv.dolbyVision === true) {
      reasons.push("Dolby Vision");
    }

    if (tv.hdr === true) {
      reasons.push("HDR");
    }
  }

  if (reasons.length === 0) {
    reasons.push("Добро се вклопува во твоите барања");
  }

  return reasons.slice(0, 3);
}

function RecommendTv() {
  const [step, setStep] = useState(0);

  const [answers, setAnswers] = useState({
    minBudget: "",
    maxBudget: "",
    distance: "",
    usage: "",
    gaming: "",
    priority: ""
  });

  const [results, setResults] = useState([]);

  const steps = [
    {
      title: "Колку далеку седиш од телевизорот?",
      key: "distance",
      options: [
        "До 2 метри",
        "2–2.5 метри",
        "2.5–3 метри",
        "Над 3 метри"
      ]
    },
    {
      title: "Што гледаш најмногу?",
      key: "usage",
      options: [
        "Филмови и серии",
        "Спорт",
        "ТВ канали",
        "Сè по малку"
      ]
    },
    {
      title: "Колку ти е важен gaming?",
      key: "gaming",
      options: [
        "Не ми е важен",
        "Повремено играм",
        "Gaming ми е многу важен"
      ]
    },
    {
      title: "Што ти е најважно при изборот?",
      key: "priority",
      options: [
        "Најдобра слика",
        "Најдобар gaming",
        "Најголем екран",
        "Најдобар однос цена/квалитет"
      ]
    }
  ];

  const currentStep = steps[step - 1];

  const updateAnswer = (key, value) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const findRecommendations = () => {
    const minBudget = Number(answers.minBudget);
    const maxBudget = Number(answers.maxBudget);

    const candidates = tvs
      .map((tv) => {
        const price = getLowestPrice(tv.stores);

        if (price === null) return null;

        if (price < minBudget || price > maxBudget) {
          return null;
        }

        let score = 0;

        score += getSizeScore(tv.size, answers.distance);

        score += getUsageScore(tv, answers.usage);

        score += getGamingScore(tv, answers.gaming);

        score += getPriorityScore(
          tv,
          answers.priority,
          price,
          minBudget,
          maxBudget
        );

        return {
          ...tv,
          lowestPrice: price,
          availableStores: getAvailableStores(tv.stores),
          score: Math.round(score),
          reasons: getReasons(tv, answers)
        };
      })
      .filter(Boolean);

    candidates.sort((a, b) => b.score - a.score);

    setResults(candidates.slice(0, 5));
    setStep(steps.length + 1);
  };

  const next = () => {
    if (step < steps.length) {
      setStep((prev) => prev + 1);
    } else {
      findRecommendations();
    }
  };

  const back = () => {
    if (step > 0 && step <= steps.length) {
      setStep((prev) => prev - 1);
    }
  };

  const canContinue =
    step === 0
      ? Number(answers.minBudget) > 0 &&
        Number(answers.maxBudget) >= Number(answers.minBudget)
      : answers[currentStep?.key];

  const restart = () => {
    setAnswers({
      minBudget: "",
      maxBudget: "",
      distance: "",
      usage: "",
      gaming: "",
      priority: ""
    });

    setResults([]);
    setStep(0);
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "20px"
      }}
    >
      <h1>Помош да одберам ТВ</h1>

      {step <= steps.length && (
        <p>
          Одговори на неколку прашања и ќе ти предложиме
          телевизори според твоите потреби.
        </p>
      )}

      {/* БУЏЕТ */}
      {step === 0 && (
        <div>
          <h2>Кој е твојот буџет?</h2>

          <div
            style={{
              display: "flex",
              gap: "15px",
              marginTop: "20px",
              flexWrap: "wrap"
            }}
          >
            <div>
              <label>Од</label>

              <input
                type="number"
                placeholder="5000"
                value={answers.minBudget}
                onChange={(e) =>
                  updateAnswer("minBudget", e.target.value)
                }
                style={{
                  display: "block",
                  padding: "10px",
                  marginTop: "5px",
                  width: "150px"
                }}
              />

              <small>ден.</small>
            </div>

            <div>
              <label>До</label>

              <input
                type="number"
                placeholder="50000"
                value={answers.maxBudget}
                onChange={(e) =>
                  updateAnswer("maxBudget", e.target.value)
                }
                style={{
                  display: "block",
                  padding: "10px",
                  marginTop: "5px",
                  width: "150px"
                }}
              />

              <small>ден.</small>
            </div>
          </div>
        </div>
      )}

      {/* ПРАШАЊА */}
      {step > 0 &&
        step <= steps.length &&
        currentStep && (
          <div>
            <h2>{currentStep.title}</h2>

            <div
              style={{
                display: "grid",
                gap: "10px",
                marginTop: "20px"
              }}
            >
              {currentStep.options.map((option) => (
                <button
                  key={option}
                  onClick={() =>
                    updateAnswer(currentStep.key, option)
                  }
                  style={{
                    padding: "15px",
                    textAlign: "left",
                    cursor: "pointer",
                    border:
                      answers[currentStep.key] === option
                        ? "2px solid #242582"
                        : "1px solid #ccc",
                    borderRadius: "8px",
                    background:
                      answers[currentStep.key] === option
                        ? "#f0efff"
                        : "white"
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* РЕЗУЛТАТИ */}
      {step === steps.length + 1 && (
        <div>
          <h2>Телевизори што одговараат на твоите барања</h2>

          <p>
            Најдовме {results.length} модели во твојот буџет.
          </p>

          {results.length === 0 && (
            <div
              style={{
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "10px"
              }}
            >
              <h3>Нема доволно резултати</h3>

              <p>
                Пробај со поширок буџет или со поголем опсег
                на растојание.
              </p>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gap: "20px",
              marginTop: "25px"
            }}
          >
            {results.map((tv) => (
              <div
                key={tv.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "20px",
                  background: "#fff"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    flexWrap: "wrap"
                  }}
                >
                  {tv.image && (
                    <img
                      src={tv.image}
                      alt={`${tv.brand} ${tv.model}`}
                      style={{
                        width: "180px",
                        height: "130px",
                        objectFit: "contain"
                      }}
                    />
                  )}

                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginTop: 0 }}>
                      {tv.brand} {tv.model}
                    </h3>

                    <p>
                      {tv.size}" · {tv.technology} ·{" "}
                      {tv.resolution} · {tv.refreshRate}Hz
                    </p>

                    <h2>
                      {tv.lowestPrice.toLocaleString("mk-MK")} ден.
                    </h2>

                    <p>
                      Достапно во:{" "}
                      {tv.availableStores.join(" · ")}
                    </p>

                    <ul>
                      {tv.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>

                    <p>
                      Резултат: <strong>{tv.score}</strong>
                    </p>

                    <Link
                      to={`/tv/${encodeURIComponent(
                        tv.brand
                      )}/${encodeURIComponent(tv.model)}`}
                      style={{
                        display: "inline-block",
                        marginTop: "10px",
                        padding: "10px 16px",
                        background: "#242582",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "6px"
                      }}
                    >
                      Види детали
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={restart}
            style={{
              marginTop: "30px",
              padding: "12px 20px",
              cursor: "pointer"
            }}
          >
            Пробај повторно
          </button>
        </div>
      )}

      {/* КОПЧИЊА */}
      {step <= steps.length && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "30px"
          }}
        >
          <button
            onClick={back}
            disabled={step === 0}
            style={{
              padding: "12px 20px",
              cursor: step === 0 ? "default" : "pointer"
            }}
          >
            Назад
          </button>

          <button
            onClick={next}
            disabled={!canContinue}
            style={{
              padding: "12px 20px",
              cursor: canContinue ? "pointer" : "default"
            }}
          >
            {step === steps.length
              ? "Најди ми ТВ"
              : "Продолжи"}
          </button>
        </div>
      )}

      {/* ПРОГРЕС */}
      {step <= steps.length && (
        <p
          style={{
            marginTop: "20px",
            textAlign: "center",
            color: "#666"
          }}
        >
          {step + 1} / {steps.length + 1}
        </p>
      )}
    </div>
  );
}

export default RecommendTv;