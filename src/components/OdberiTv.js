import React, { useEffect, useMemo, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { Link } from "react-router-dom";

import Navigation from "./Navigation";
import { formatPrice, technologyLabel } from "../lib/tvSpecs";
import {
  DISTANCE_OPTIONS,
  LIGHT_OPTIONS,
  PRIORITY_OPTIONS,
  USE_OPTIONS,
} from "../lib/recommend";

/*
  Прашањата се тука (не зависат од податоци), но оценувањето е на серверот:
  за да избере три телевизори мора да ги измери сите 514, а тоа значеше
  целата база да замине кај посетителот. Сега се праќаат одговорите и се
  враќаат само трите препораки.
*/
const API = process.env.REACT_APP_API_URL || "/api";

/* ------------------------------------------------------------------ *
 * Shared bits
 * ------------------------------------------------------------------ */

const PURPLE = "#242582";

const focusRing = css`
  &:focus-visible {
    outline: 3px solid ${PURPLE};

    outline-offset: 3px;
  }
`;

const PageCont = styled.div`
  min-height: 100vh;

  background-color: #f7f7f9;
`;

const Shell = styled.main`
  width: 100%;
  max-width: 820px;

  margin: 0 auto;
  padding: 28px 16px 72px;

  box-sizing: border-box;
`;

/* ---------- Progress ---------- */

const ProgressCont = styled.div`
  margin-bottom: 26px;
`;

const ProgressTop = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;

  gap: 12px;

  margin-bottom: 10px;
`;

const StepCount = styled.span`
  color: #6a6a85;

  font-size: 13px;

  font-weight: 600;

  letter-spacing: 0.04em;

  text-transform: uppercase;
`;

const ProgressTrack = styled.div`
  height: 6px;

  background-color: #e4e4ee;

  border-radius: 999px;

  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;

  width: ${(props) => props.$percent}%;

  background-color: ${PURPLE};

  border-radius: 999px;

  transition: width 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* ---------- Question ---------- */

const Question = styled.h1`
  margin: 0 0 6px;

  color: ${PURPLE};

  font-size: 27px;

  font-weight: 800;

  line-height: 1.25;

  @media (max-width: 600px) {
    font-size: 22px;
  }
`;

const Hint = styled.p`
  margin: 0 0 22px;

  color: #65657d;

  font-size: 15px;

  line-height: 1.6;
`;

/*
  One column on a phone, two where there is room. Options are deliberately tall
  so they stay easy to hit with a thumb.
*/
const Options = styled.div`
  display: grid;

  grid-template-columns: 1fr;

  gap: 12px;

  @media (min-width: 620px) {
    grid-template-columns: ${(props) => (props.$wide ? "1fr" : "1fr 1fr")};
  }
`;

const Option = styled.button`
  width: 100%;

  min-height: 64px;

  padding: 18px 20px;

  display: flex;
  align-items: center;

  gap: 14px;

  text-align: left;

  color: ${(props) => (props.$selected ? "#ffffff" : "#2a2a3c")};

  background-color: ${(props) => (props.$selected ? PURPLE : "#ffffff")};

  font-family: inherit;

  font-size: 16px;

  font-weight: 600;

  line-height: 1.4;

  border: 2px solid ${(props) => (props.$selected ? PURPLE : "#e2e2ec")};
  border-radius: 14px;

  cursor: pointer;

  transition: border-color 0.15s, background-color 0.15s, transform 0.08s;

  ${focusRing}

  &:hover {
    border-color: ${PURPLE};
  }

  &:active {
    transform: scale(0.99);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active {
      transform: none;
    }
  }
`;

/* The tick box on multi-select options. */
const Check = styled.span`
  width: 22px;
  height: 22px;

  flex-shrink: 0;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  color: ${PURPLE};

  background-color: ${(props) => (props.$on ? "#ffffff" : "transparent")};

  font-size: 14px;

  font-weight: 800;

  border: 2px solid ${(props) => (props.$on ? "#ffffff" : "#c9c9d8")};
  border-radius: 6px;
`;

const OptionNote = styled.span`
  margin-left: auto;

  padding-left: 10px;

  color: ${(props) => (props.$selected ? "rgba(255,255,255,0.75)" : "#8a8aa0")};

  font-size: 13px;

  font-weight: 600;

  white-space: nowrap;
`;

/* ---------- Footer controls ---------- */

const Controls = styled.div`
  margin-top: 26px;

  display: flex;
  align-items: center;

  gap: 12px;

  flex-wrap: wrap;
`;

const buttonBase = css`
  min-height: 48px;

  padding: 12px 24px;

  font-family: inherit;

  font-size: 15px;

  font-weight: 700;

  border-radius: 999px;

  cursor: pointer;

  ${focusRing}
`;

const PrimaryButton = styled.button`
  ${buttonBase}

  color: #ffffff;

  background-color: ${PURPLE};

  border: 2px solid ${PURPLE};

  &:disabled {
    opacity: 0.45;

    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  ${buttonBase}

  color: ${PURPLE};

  background-color: transparent;

  border: 2px solid #d4d4e2;

  &:hover {
    border-color: ${PURPLE};
  }
`;

/* ---------- Results ---------- */

const ResultsHead = styled.div`
  margin-bottom: 24px;
`;

const ResultsTitle = styled.h1`
  margin: 0 0 8px;

  color: ${PURPLE};

  font-size: 28px;

  font-weight: 800;

  @media (max-width: 600px) {
    font-size: 23px;
  }
`;

const ResultsSub = styled.p`
  margin: 0;

  color: #65657d;

  font-size: 15px;

  line-height: 1.6;
`;

const PickCard = styled.article`
  margin-bottom: 18px;

  background-color: #ffffff;

  border: 1px solid #e4e4ee;
  border-radius: 18px;

  overflow: hidden;
`;

const PickKind = styled.div`
  padding: 10px 20px;

  color: #ffffff;

  background-color: ${(props) =>
    props.$kind === "najdobar"
      ? PURPLE
      : props.$kind === "vrednost"
      ? "#1f7a4d"
      : "#8a5a1f"};

  font-size: 12px;

  font-weight: 800;

  letter-spacing: 0.08em;

  text-transform: uppercase;
`;

const PickBody = styled.div`
  padding: 20px;

  display: flex;

  gap: 20px;

  @media (max-width: 600px) {
    flex-direction: column;

    gap: 14px;
  }
`;

const PickImage = styled.img`
  width: 160px;
  height: 120px;

  flex-shrink: 0;

  object-fit: contain;

  background-color: #f4f4f8;

  border-radius: 12px;

  @media (max-width: 600px) {
    width: 100%;
    height: 180px;
  }
`;

const PickMain = styled.div`
  flex: 1;

  min-width: 0;
`;

const PickName = styled.h2`
  margin: 0 0 4px;

  color: ${PURPLE};

  font-size: 19px;

  font-weight: 800;

  line-height: 1.3;
`;

const PickSpecs = styled.p`
  margin: 0 0 14px;

  color: #65657d;

  font-size: 14px;
`;

const Reasons = styled.ul`
  margin: 0 0 14px;
  padding: 0;

  list-style: none;

  display: flex;
  flex-direction: column;

  gap: 7px;
`;

const Reason = styled.li`
  position: relative;

  padding-left: 24px;

  color: #33334a;

  font-size: 15px;

  line-height: 1.5;

  &::before {
    content: "✓";

    position: absolute;
    left: 0;

    color: #1f7a4d;

    font-weight: 800;
  }
`;

const Warning = styled(Reason)`
  color: #7a5a1f;

  &::before {
    content: "!";

    color: #b07a1f;
  }
`;

const Offers = styled.div`
  padding-top: 14px;

  display: flex;
  flex-direction: column;

  gap: 8px;

  border-top: 1px solid #ededf3;
`;

const OfferRow = styled.a`
  padding: 10px 14px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 12px;

  color: #2a2a3c;

  text-decoration: none;

  background-color: ${(props) => (props.$best ? "#f1f8f4" : "#f7f7fa")};

  font-size: 15px;

  border: 1px solid ${(props) => (props.$best ? "#bfe0cd" : "#ececf2")};
  border-radius: 10px;

  ${focusRing}

  &:hover {
    border-color: ${PURPLE};
  }
`;

const OfferStore = styled.span`
  font-weight: 700;
`;

const OfferPrice = styled.span`
  display: flex;
  align-items: center;

  gap: 8px;

  font-weight: 800;

  white-space: nowrap;
`;

const CheapestTag = styled.span`
  padding: 3px 8px;

  color: #1f7a4d;

  background-color: #dff0e6;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: 0.04em;

  text-transform: uppercase;

  border-radius: 999px;
`;

const OutOfStock = styled.span`
  color: #8a8aa0;

  font-size: 13px;

  font-weight: 600;
`;

/* ---------- Answer chips on the results screen ---------- */

const Chips = styled.div`
  margin: 26px 0 16px;

  display: flex;

  gap: 9px;

  flex-wrap: wrap;
`;

const Chip = styled.button`
  padding: 9px 15px;

  color: #46465e;

  background-color: #ffffff;

  font-family: inherit;

  font-size: 13px;

  font-weight: 600;

  border: 1px solid #dcdce8;
  border-radius: 999px;

  cursor: pointer;

  ${focusRing}

  &:hover {
    border-color: ${PURPLE};

    color: ${PURPLE};
  }
`;

const EmptyCard = styled.div`
  padding: 28px 24px;

  background-color: #ffffff;

  border: 1px solid #e4e4ee;
  border-radius: 18px;
`;

const EmptyTitle = styled.h2`
  margin: 0 0 10px;

  color: ${PURPLE};

  font-size: 20px;

  font-weight: 800;
`;

const EmptyText = styled.p`
  margin: 0 0 18px;

  color: #46465e;

  font-size: 15px;

  line-height: 1.6;
`;

const Note = styled.p`
  margin: 0 0 18px;
  padding: 12px 16px;

  color: #6a5520;

  background-color: #fdf6e6;

  font-size: 14px;

  line-height: 1.55;

  border: 1px solid #f0e2bd;
  border-radius: 12px;
`;

const BackHome = styled(Link)`
  display: inline-block;

  margin-bottom: 18px;

  color: ${PURPLE};

  font-size: 14px;

  font-weight: 600;

  text-decoration: none;

  ${focusRing}

  &:hover {
    text-decoration: underline;
  }
`;

/* Screen-reader-only live region for step announcements. */
const SrOnly = styled.div`
  position: absolute;

  width: 1px;
  height: 1px;

  margin: -1px;
  padding: 0;

  overflow: hidden;

  clip: rect(0 0 0 0);

  white-space: nowrap;

  border: 0;
`;

/* ------------------------------------------------------------------ *
 * The questions
 * ------------------------------------------------------------------ */

const BRAND_ANY = "site";

function buildSteps(budgetOptions, brandOptions) {
  return [
    {
      key: "distance",
      question: "Колку си оддалечен од телевизорот?",
      hint: "Измери од каучот до ѕидот каде што ќе стои телевизорот. Ова е најважниот податок за големината.",
      options: DISTANCE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    },
    {
      key: "light",
      question: "Колку светлина има во собата попладне?",
      hint: "Во светла соба подобро се снаоѓаат панели со висока светлина. Во темна доаѓа до израз контрастот.",
      options: LIGHT_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
      wide: true,
    },
    {
      key: "use",
      question: "Што гледаш најмногу?",
      hint: "Според ова се одредува дали е поважен контрастот, светлината или брзината на панелот.",
      options: USE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    },
    {
      key: "budget",
      question: "Колку сакаш да потрошиш?",
      hint: "Опсезите се пресметани од вистинските цени кај македонските трговци во нашата база.",
      options: budgetOptions.map((o) => ({ id: o.id, label: o.label, value: o })),
      wide: true,
    },
    {
      key: "priority",
      question: "Што ти е најважно?",
      hint: "Ако мораш да избереш едно нешто за кое вреди да се плати повеќе.",
      options: PRIORITY_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    },
    {
      key: "brands",
      question: "Имаш ли преференца за бренд?",
      hint: "Можеш да избереш повеќе. Ова е желба, не филтер — ако друг бренд е значително подобар избор, сепак ќе ти го прикажеме.",
      multi: true,
      options: [
        { id: BRAND_ANY, label: "Нема важност" },
        ...brandOptions.map((b) => ({
          id: b.brand,
          label: b.brand,
          note: `${b.count} модели`,
        })),
      ],
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

const OdberiTv = () => {
  const [quizOptions, setQuizOptions] = useState({ brands: [], budgets: [] });

  useEffect(() => {
    let cancelled = false;

    fetch(`${API}/quiz-options`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((d) => {
        if (!cancelled) {
          setQuizOptions({ brands: d.brands || [], budgets: d.budgets || [] });
        }
      })
      .catch(() => {
        /* прашањата работат и без нив — само буџетот и брендовите ќе бидат празни */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const steps = useMemo(
    () => buildSteps(quizOptions.budgets, quizOptions.brands),
    [quizOptions]
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);

  const optionsRef = useRef(null);

  const step = steps[stepIndex];

  const isLast = stepIndex === steps.length - 1;

  /*
    Arrow keys walk the options. The options are plain buttons, so Enter and
    Space already select — this only adds the movement a radio group is
    expected to have.
  */
  const handleOptionKeys = (event) => {
    const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];

    if (!keys.includes(event.key)) {
      return;
    }

    event.preventDefault();

    const buttons = [...(optionsRef.current?.querySelectorAll("button") || [])];

    if (buttons.length === 0) {
      return;
    }

    const current = buttons.indexOf(document.activeElement);

    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";

    const next =
      current === -1
        ? 0
        : (current + (forward ? 1 : -1) + buttons.length) % buttons.length;

    buttons[next].focus();
  };

  const goTo = (index) => {
    setStepIndex(index);
    setDone(false);
  };

  const answerSingle = (option) => {
    const value = option.value || option.id;

    setAnswers((previous) => ({ ...previous, [step.key]: value }));

    if (isLast) {
      setDone(true);
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  const toggleMulti = (option) => {
    setAnswers((previous) => {
      const current = previous[step.key] || [];

      // "Нема важност" and a brand list are mutually exclusive.
      if (option.id === BRAND_ANY) {
        return { ...previous, [step.key]: [BRAND_ANY] };
      }

      const without = current.filter((id) => id !== BRAND_ANY);

      const next = without.includes(option.id)
        ? without.filter((id) => id !== option.id)
        : [...without, option.id];

      return { ...previous, [step.key]: next };
    });
  };

  const isSelected = (option) => {
    const answer = answers[step.key];

    if (step.multi) {
      return (answer || []).includes(option.id);
    }

    if (option.value) {
      return answer?.id === option.value.id;
    }

    return answer === option.id;
  };

  const [result, setResult] = useState(null);
  const [scoring, setScoring] = useState(false);

  useEffect(() => {
    if (!done) {
      setResult(null);
      return undefined;
    }

    let cancelled = false;
    setScoring(true);

    fetch(`${API}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distance: answers.distance,
        light: answers.light,
        use: answers.use,
        budget: answers.budget,
        priority: answers.priority,
        brands: answers.brands || [],
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((d) => {
        if (cancelled) return;
        setResult(d);
        setScoring(false);
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ picks: [], blocked: "greska", relax: null });
        setScoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [done, answers]);

  const restart = () => {
    setAnswers({});
    setStepIndex(0);
    setDone(false);
  };

  /* ---------------- Results ---------------- */

  /*
    Оценувањето сега оди преку мрежа, па има краток момент без резултат.
    Без ова, екранот би се вратил на прашањата за миг и би трепнал.
  */
  if (done && scoring) {
    return (
      <PageCont>
        <Navigation />

        <Shell>
          <Question>Ги мериме телевизорите...</Question>

          <Hint>Ги споредуваме сите модели со твоите одговори.</Hint>
        </Shell>
      </PageCont>
    );
  }

  if (done && result) {
    const labelFor = (key) => {
      const source = steps.find((s) => s.key === key);

      const answer = answers[key];

      if (!answer) {
        return null;
      }

      if (key === "brands") {
        return answer.includes(BRAND_ANY) || answer.length === 0
          ? "Сите брендови"
          : answer.join(", ");
      }

      /*
        Budget options carry a `value` object and are matched by its id;
        every other option is matched by its own id. Comparing both at once
        made two undefineds equal and always matched the first option.
      */
      const option = source.options.find((o) =>
        o.value ? o.value.id === answer?.id : o.id === answer
      );

      return option?.label || null;
    };

    return (
      <PageCont>
        <Navigation />

        <Shell>
          <BackHome to="/">← Назад на почетна</BackHome>

          <ResultsHead>
            <ResultsTitle>Еве што ти препорачуваме</ResultsTitle>

            <ResultsSub>
              Избрано од {result.consideredCount} модели што се вклопуваат во
              твојот буџет.
            </ResultsSub>
          </ResultsHead>

          {result.brandNote && (
            <Note>
              Ниеден модел од избраните брендови не влезе во првите три за
              твоите одговори. Подолу се моделите што најдобро одговараат.
            </Note>
          )}

          {result.picks.length === 0 && (
            <EmptyCard>
              <EmptyTitle>Нема модели со овие услови</EmptyTitle>

              <EmptyText>
                {result.relax?.constraint === "size" &&
                  `Со овој буџет нема модели во препорачаната големина. Најевтиниот што би се вклопил е ${result.relax.size} инчи за ${formatPrice(
                    result.relax.cheapest
                  )}. Пробај со помал екран или со поголем буџет.`}

                {result.relax?.constraint === "brands" &&
                  "Со избраните брендови нема ниту еден модел во базата. Пробај без преференца за бренд."}

                {result.relax?.constraint === "budget" &&
                  `Најевтиниот телевизор во базата чини ${formatPrice(
                    result.relax.cheapest
                  )}. Пробај со поголем буџет.`}

                {!result.relax &&
                  "Пробај да го зголемиш буџетот или да ја смениш големината."}
              </EmptyText>

              <PrimaryButton type="button" onClick={() => goTo(3)}>
                Смени буџет
              </PrimaryButton>
            </EmptyCard>
          )}

          {result.picks.map((pick) => {
            const kindLabel =
              pick.kind === "najdobar"
                ? "Најдобар избор за тебе"
                : pick.kind === "vrednost"
                ? "Најдобра вредност за парите"
                : "Ако сакаш да платиш повеќе";

            const specs = [
              pick.tv.size ? `${pick.tv.size}"` : null,
              technologyLabel(pick.tv.technology),
              pick.tv.resolution,
              pick.tv.refreshRate ? `${pick.tv.refreshRate}Hz` : null,
              pick.tv.os,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <PickCard key={pick.tv.id}>
                <PickKind $kind={pick.kind}>{kindLabel}</PickKind>

                <PickBody>
                  {pick.tv.image && (
                    <PickImage
                      src={pick.tv.image}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.visibility = "hidden";
                      }}
                    />
                  )}

                  <PickMain>
                    <PickName>
                      {pick.tv.brand} {pick.tv.model}
                    </PickName>

                    <PickSpecs>{specs || "Спецификациите не се целосни"}</PickSpecs>

                    <Reasons>
                      {pick.reasons.map((reason, index) => (
                        <Reason key={index}>{reason}</Reason>
                      ))}

                      {pick.warnings.map((warning, index) => (
                        <Warning key={`w${index}`}>{warning}</Warning>
                      ))}
                    </Reasons>

                    <Offers>
                      {pick.tv.offers.map((offer, index) => {
                        /*
                          Only call one offer cheapest when it genuinely is.
                          Two retailers often list the same model at the same
                          price, and tagging one of them would be a lie.
                        */
                        const cheapest =
                          index === 0 &&
                          pick.tv.offers.length > 1 &&
                          offer.price < pick.tv.offers[1].price;

                        const content = (
                          <>
                            <OfferStore>{offer.store}</OfferStore>

                            <OfferPrice>
                              {!offer.inStock && (
                                <OutOfStock>нема залиха</OutOfStock>
                              )}

                              {cheapest && <CheapestTag>најевтино</CheapestTag>}

                              {formatPrice(offer.price)}
                            </OfferPrice>
                          </>
                        );

                        return offer.url ? (
                          <OfferRow
                            key={offer.store}
                            href={offer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            $best={cheapest}
                          >
                            {content}
                          </OfferRow>
                        ) : (
                          <OfferRow key={offer.store} as="div" $best={cheapest}>
                            {content}
                          </OfferRow>
                        );
                      })}
                    </Offers>
                  </PickMain>
                </PickBody>
              </PickCard>
            );
          })}

          <Chips>
            {steps.map((item, index) => {
              const label = labelFor(item.key);

              if (!label) {
                return null;
              }

              return (
                <Chip key={item.key} type="button" onClick={() => goTo(index)}>
                  {label} ✎
                </Chip>
              );
            })}
          </Chips>

          <Controls>
            <PrimaryButton type="button" onClick={restart}>
              Почни одново
            </PrimaryButton>

            <GhostButton type="button" onClick={() => goTo(steps.length - 1)}>
              Назад на прашањата
            </GhostButton>
          </Controls>
        </Shell>
      </PageCont>
    );
  }

  /* ---------------- A question ---------------- */

  const percent = ((stepIndex + (done ? 1 : 0)) / steps.length) * 100;

  const multiAnswer = answers[step.key] || [];

  return (
    <PageCont>
      <Navigation />

      <Shell>
        <BackHome to="/">← Назад на почетна</BackHome>

        <ProgressCont>
          <ProgressTop>
            <StepCount>
              Прашање {stepIndex + 1} од {steps.length}
            </StepCount>
          </ProgressTop>

          <ProgressTrack>
            <ProgressFill $percent={percent} />
          </ProgressTrack>
        </ProgressCont>

        <SrOnly aria-live="polite">
          Прашање {stepIndex + 1} од {steps.length}: {step.question}
        </SrOnly>

        <Question>{step.question}</Question>

        <Hint>{step.hint}</Hint>

        <Options
          ref={optionsRef}
          role={step.multi ? "group" : "radiogroup"}
          aria-label={step.question}
          onKeyDown={handleOptionKeys}
          $wide={step.wide}
        >
          {step.options.map((option) => {
            const selected = isSelected(option);

            return (
              <Option
                key={option.id}
                type="button"
                role={step.multi ? "checkbox" : "radio"}
                aria-checked={selected}
                $selected={selected}
                onClick={() =>
                  step.multi ? toggleMulti(option) : answerSingle(option)
                }
              >
                {step.multi && <Check $on={selected}>{selected ? "✓" : ""}</Check>}

                <span>{option.label}</span>

                {option.note && (
                  <OptionNote $selected={selected}>{option.note}</OptionNote>
                )}
              </Option>
            );
          })}
        </Options>

        <Controls>
          {stepIndex > 0 && (
            <GhostButton type="button" onClick={() => goTo(stepIndex - 1)}>
              ← Назад
            </GhostButton>
          )}

          {step.multi && (
            <PrimaryButton
              type="button"
              onClick={() => setDone(true)}
              disabled={multiAnswer.length === 0}
            >
              Прикажи препораки
            </PrimaryButton>
          )}
        </Controls>
      </Shell>
    </PageCont>
  );
};

export default OdberiTv;
