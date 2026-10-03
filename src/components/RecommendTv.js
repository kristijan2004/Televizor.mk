import React, { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import tvs from "../data/masterTvs.json";
import Navigation from "./Navigation";
import { useLanguage } from "../LanguageContext";

function getLowestPrice(stores) {
  if (!stores) return null;

  const prices = Object.values(stores)
    .filter(
      (store) => store?.inStock === true && typeof store.price === "number",
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

      ```
case "2–2.5 метри":
  return [50, 55, 65];

case "2.5–3 метри":
  return [55, 65, 75];

case "Над 3 метри":
  return [65, 75, 85, 98];

default:
  return [55, 65];
```;
  }
}

function getSizeScore(size, distance) {
  const recommended = getRecommendedSizes(distance);

  if (recommended.includes(size)) {
    return 20;
  }

  const closest = Math.min(
    ...recommended.map((value) => Math.abs(value - size)),
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

    ```
if (tv.pictureProcessor && tv.pictureProcessor !== "—") {
  score += 5;
}

if (tv.size >= 65) {
  score += 4;
}
```;
  }

  if (usage === "Филмови и серии") {
    score += getPictureScore(tv) * 0.7;

    ```
if (tv.dolbyVision === true) {
  score += 5;
}

if (tv.dolbyAtmos === true) {
  score += 3;
}
```;
  }

  if (usage === "ТВ канали") {
    if (tv.size >= 55) {
      score += 5;
    }

    ```
if (refreshRate >= 100) {
  score += 5;
}

if (tv.pictureProcessor && tv.pictureProcessor !== "—") {
  score += 3;
}
```;
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

    ```
score += (position / range) * 20;
score += getPictureScore(tv) * 0.5;
score += getGamingScore(tv, "Повремено играм") * 0.3;
```;
  }

  return score;
}

function getReasons(tv, answers, t) {
  const reasons = [];

  const recommendedSizes = getRecommendedSizes(answers.distance);

  if (recommendedSizes.includes(tv.size)) {
    reasons.push(t.sizeMatchesDistance.replace("{size}", `${tv.size}"`));
  }

  if (answers.usage === "Спорт" && Number(tv.refreshRate) >= 120) {
    reasons.push(t.refreshRateGreatForSports.replace("{rate}", tv.refreshRate));
  }

  if (
    answers.gaming !== "Не ми е важен" &&
    (tv.vrr === true || tv.allm === true)
  ) {
    reasons.push(t.gamingFeatures);
  }

  if (answers.priority === "Најдобра слика") {
    if (tv.technology && tv.technology !== "LED") {
      reasons.push(t.technologyReason.replace("{technology}", tv.technology));
    }

    ```
if (tv.dolbyVision === true) {
  reasons.push("Dolby Vision");
}

if (tv.hdr === true) {
  reasons.push("HDR");
}
```;
  }

  if (reasons.length === 0) {
    reasons.push(t.goodFit);
  }

  return reasons.slice(0, 3);
}

/* =========================
STYLES
========================= */

const Page = styled.div`
  min-height: 100vh;
  background: #f7f7f9;
`;

const Container = styled.main`
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 45px 20px 70px;
  box-sizing: border-box;
`;

const Intro = styled.div`
  text-align: center;
  margin-bottom: 30px;
`;

const MainTitle = styled.h1`
  margin: 0;
  color: #242582;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.5px;

  @media (max-width: 600px) {
    font-size: 28px;
  }
`;

const IntroText = styled.p`
  max-width: 650px;
  margin: 12px auto 0;
  color: #777;
  font-size: 15px;
  line-height: 1.6;
`;

const WizardCard = styled.div`
  background: white;
  border: 1px solid #e5e5e8;
  border-radius: 18px;
  padding: 32px;
  box-shadow: 0 8px 30px rgba(36, 37, 130, 0.06);

  @media (max-width: 600px) {
    padding: 22px 18px;
    border-radius: 14px;
  }
`;

const ProgressArea = styled.div`
  margin-bottom: 30px;
`;

const ProgressTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 9px;
`;

const ProgressLabel = styled.span`
  color: #777;
  font-size: 12px;
  font-weight: 700;
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 7px;
  background: #eeeef3;
  border-radius: 10px;
  overflow: hidden;
`;

const ProgressBar = styled.div`
  width: ${({ progress }) => `${progress}%`};
  height: 100%;
  background: #242582;
  border-radius: inherit;
  transition: width 0.3s ease;
`;

const QuestionTitle = styled.h2`
  margin: 0 0 22px;
  color: #242582;
  font-size: 24px;
  font-weight: 800;

  @media (max-width: 600px) {
    font-size: 21px;
  }
`;

const BudgetGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const BudgetField = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 7px;
  color: #555;
  font-size: 13px;
  font-weight: 700;
`;

const InputWrapper = styled.div`
  position: relative;
`;

const BudgetInput = styled.input`
  width: 100%;
  padding: 13px 50px 13px 14px;
  box-sizing: border-box;
  border: 1px solid #dcdce2;
  border-radius: 10px;
  outline: none;
  color: #333;
  font-size: 15px;
  font-weight: 600;
  transition: 0.2s;

  &:focus {
    border-color: #242582;
    box-shadow: 0 0 0 3px rgba(36, 37, 130, 0.08);
  }

  &::placeholder {
    color: #aaa;
  }
`;

const Currency = styled.span`
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  font-size: 12px;
  font-weight: 700;
`;

const Options = styled.div`
  display: grid;
  gap: 11px;
`;

const OptionButton = styled.button`
  width: 100%;
  padding: 16px 18px;
  border: 1px solid ${({ selected }) => (selected ? "#242582" : "#dedee3")};
  border-radius: 11px;
  background: ${({ selected }) => (selected ? "#f0efff" : "#fff")};
  color: ${({ selected }) => (selected ? "#242582" : "#444")};
  font-size: 14px;
  font-weight: ${({ selected }) => (selected ? "800" : "600")};
  text-align: left;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    border-color: #242582;
    background: #f8f7ff;
  }
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 30px;
`;

const Button = styled.button`
  padding: 12px 22px;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
`;

const BackButton = styled(Button)`
  border: 1px solid #dddde2;
  background: white;
  color: #666;

  &:hover:not(:disabled) {
    border-color: #bbb;
    color: #333;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const ContinueButton = styled(Button)`
  border: none;
  background: #242582;
  color: white;

  &:hover:not(:disabled) {
    background: #1d1e70;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const ResultsHeader = styled.div`
  margin-bottom: 25px;
`;

const ResultsTitle = styled.h2`
  margin: 0;
  color: #242582;
  font-size: 25px;
  font-weight: 800;
`;

const ResultsText = styled.p`
  margin: 8px 0 0;
  color: #777;
  font-size: 14px;
`;

const EmptyResults = styled.div`
  padding: 25px;
  border: 1px solid #e3e3e7;
  border-radius: 12px;
  background: #fafafa;
`;

const EmptyTitle = styled.h3`
  margin: 0 0 7px;
  color: #242582;
  font-size: 18px;
`;

const EmptyText = styled.p`
  margin: 0;
  color: #777;
  font-size: 14px;
  line-height: 1.5;
`;

const ResultsList = styled.div`
  display: grid;
  gap: 16px;
`;

const ResultCard = styled.article`
  padding: 20px;
  border: 1px solid #e2e2e6;
  border-radius: 14px;
  background: white;
  transition: 0.2s;

  &:hover {
    border-color: #cfcfe0;
    box-shadow: 0 6px 22px rgba(36, 37, 130, 0.06);
  }
`;

const ResultContent = styled.div`
  display: flex;
  gap: 22px;

  @media (max-width: 650px) {
    flex-direction: column;
  }
`;

const TvImage = styled.img`
  width: 180px;
  height: 130px;
  object-fit: contain;
  flex-shrink: 0;

  @media (max-width: 650px) {
    width: 100%;
    height: 160px;
  }
`;

const ResultInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TvName = styled.h3`
  margin: 0;
  color: #242582;
  font-size: 19px;
  font-weight: 800;
`;

const Specs = styled.p`
  margin: 8px 0 14px;
  color: #777;
  font-size: 13px;
  line-height: 1.5;
`;

const Price = styled.div`
  margin-bottom: 8px;
  color: #242582;
  font-size: 23px;
  font-weight: 800;
`;

const Stores = styled.p`
  margin: 0 0 13px;
  color: #777;
  font-size: 12px;
`;

const Reasons = styled.ul`
  margin: 0 0 17px;
  padding-left: 20px;
  color: #444;
  font-size: 13px;
  line-height: 1.6;

  li::marker {
    color: #242582;
  }
`;

const Score = styled.p`
  margin: 0 0 13px;
  color: #777;
  font-size: 12px;

  strong {
    color: #242582;
    font-size: 14px;
  }
`;

const DetailsLink = styled(Link)`
  display: inline-block;
  padding: 10px 15px;
  border-radius: 8px;
  background: #242582;
  color: white;
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
  transition: 0.2s;

  &:hover {
    background: #1d1e70;
  }
`;

const RestartButton = styled.button`
  margin-top: 25px;
  padding: 11px 18px;
  border: 1px solid #dddde2;
  border-radius: 9px;
  background: white;
  color: #666;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: #bbb;
    color: #333;
  }
`;

function RecommendTv() {
  const { t } = useLanguage();

  const [step, setStep] = useState(0);

  const [answers, setAnswers] = useState({
    minBudget: "",
    maxBudget: "",
    distance: "",
    usage: "",
    gaming: "",
    priority: "",
  });

  const [results, setResults] = useState([]);

  const steps = [
    {
      title: t.distanceQuestion,
      key: "distance",
      options: [
        {
          value: "До 2 метри",
          label: t.distanceUpTo2,
        },
        {
          value: "2–2.5 метри",
          label: t.distance2To25,
        },
        {
          value: "2.5–3 метри",
          label: t.distance25To3,
        },
        {
          value: "Над 3 метри",
          label: t.distanceOver3,
        },
      ],
    },
    {
      title: t.usageQuestion,
      key: "usage",
      options: [
        {
          value: "Филмови и серии",
          label: t.moviesAndSeries,
        },
        {
          value: "Спорт",
          label: t.sports,
        },
        {
          value: "ТВ канали",
          label: t.tvChannels,
        },
        {
          value: "Сè по малку",
          label: t.aBitOfEverything,
        },
      ],
    },
    {
      title: t.gamingQuestion,
      key: "gaming",
      options: [
        {
          value: "Не ми е важен",
          label: t.gamingNotImportant,
        },
        {
          value: "Повремено играм",
          label: t.gamingSometimes,
        },
        {
          value: "Gaming ми е многу важен",
          label: t.gamingVeryImportant,
        },
      ],
    },
    {
      title: t.priorityQuestion,
      key: "priority",
      options: [
        {
          value: "Најдобра слика",
          label: t.bestPicture,
        },
        {
          value: "Најдобар gaming",
          label: t.bestGaming,
        },
        {
          value: "Најголем екран",
          label: t.largestScreen,
        },
        {
          value: "Најдобар однос цена/квалитет",
          label: t.bestValue,
        },
      ],
    },
  ];

  const currentStep = steps[step - 1];

  const updateAnswer = (key, value) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const findRecommendations = () => {
    const minBudget = Number(answers.minBudget);
    const maxBudget = Number(answers.maxBudget);

    ```
const candidates = tvs
  .map((tv) => {
    const price = getLowestPrice(tv.stores);

    if (price === null) return null;

    if (price < minBudget || price > maxBudget) {
      return null;
    }

    let score = 0;

    score += getSizeScore(
      tv.size,
      answers.distance
    );

    score += getUsageScore(
      tv,
      answers.usage
    );

    score += getGamingScore(
      tv,
      answers.gaming
    );

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
      availableStores: getAvailableStores(
        tv.stores
      ),
      score: Math.round(score),
      reasons: getReasons(tv, answers, t)
    };
  })
  .filter(Boolean);

candidates.sort((a, b) => b.score - a.score);

setResults(candidates.slice(0, 5));
setStep(steps.length + 1);
```;
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
      priority: "",
    });

    ```
setResults([]);
setStep(0);
```;
  };

  const progress =
    step === 0 ? 20 : Math.min(((step + 1) / (steps.length + 1)) * 100, 100);

  return (
    <Page>
      {" "}
      <Navigation />
      ```
      <Container>
        {step <= steps.length && (
          <Intro>
            <MainTitle>{t.recommend}</MainTitle>

            <IntroText>{t.recommendDescription}</IntroText>
          </Intro>
        )}

        <WizardCard>
          {step <= steps.length && (
            <>
              <ProgressArea>
                <ProgressTop>
                  <ProgressLabel>
                    {step === 0 ? "1" : step + 1} / {steps.length + 1}
                  </ProgressLabel>

                  <ProgressLabel>{Math.round(progress)}%</ProgressLabel>
                </ProgressTop>

                <ProgressTrack>
                  <ProgressBar progress={progress} />
                </ProgressTrack>
              </ProgressArea>

              {step === 0 && (
                <div>
                  <QuestionTitle>{t.budgetQuestion}</QuestionTitle>

                  <BudgetGrid>
                    <BudgetField>
                      <Label>{t.from}</Label>

                      <InputWrapper>
                        <BudgetInput
                          type="number"
                          min="0"
                          placeholder="5000"
                          value={answers.minBudget}
                          onChange={(e) =>
                            updateAnswer("minBudget", e.target.value)
                          }
                        />

                        <Currency>{t.denars}</Currency>
                      </InputWrapper>
                    </BudgetField>

                    <BudgetField>
                      <Label>{t.to}</Label>

                      <InputWrapper>
                        <BudgetInput
                          type="number"
                          min="0"
                          placeholder="50000"
                          value={answers.maxBudget}
                          onChange={(e) =>
                            updateAnswer("maxBudget", e.target.value)
                          }
                        />

                        <Currency>{t.denars}</Currency>
                      </InputWrapper>
                    </BudgetField>
                  </BudgetGrid>
                </div>
              )}

              {step > 0 && step <= steps.length && currentStep && (
                <div>
                  <QuestionTitle>{currentStep.title}</QuestionTitle>

                  <Options>
                    {currentStep.options.map((option) => (
                      <OptionButton
                        key={option.value}
                        selected={answers[currentStep.key] === option.value}
                        onClick={() =>
                          updateAnswer(currentStep.key, option.value)
                        }
                      >
                        {option.label}
                      </OptionButton>
                    ))}
                  </Options>
                </div>
              )}

              <NavigationButtons>
                <BackButton onClick={back} disabled={step === 0}>
                  ← {t.back}
                </BackButton>

                <ContinueButton onClick={next} disabled={!canContinue}>
                  {step === steps.length ? t.findTv : t.continue}
                  {" →"}
                </ContinueButton>
              </NavigationButtons>
            </>
          )}

          {step === steps.length + 1 && (
            <>
              <ResultsHeader>
                <ResultsTitle>{t.recommendedTvs}</ResultsTitle>

                <ResultsText>
                  {t.foundModels.replace("{count}", results.length)}
                </ResultsText>
              </ResultsHeader>

              {results.length === 0 && (
                <EmptyResults>
                  <EmptyTitle>{t.noEnoughResults}</EmptyTitle>

                  <EmptyText>{t.tryWiderBudget}</EmptyText>
                </EmptyResults>
              )}

              {results.length > 0 && (
                <ResultsList>
                  {results.map((tv) => (
                    <ResultCard key={tv.id}>
                      <ResultContent>
                        {tv.image && (
                          <TvImage
                            src={tv.image}
                            alt={`${tv.brand} ${tv.model}`}
                          />
                        )}

                        <ResultInfo>
                          <TvName>
                            {tv.brand} {tv.model}
                          </TvName>

                          <Specs>
                            {tv.size}" · {tv.technology} · {tv.resolution} ·{" "}
                            {tv.refreshRate}Hz
                          </Specs>

                          <Price>
                            {tv.lowestPrice.toLocaleString("mk-MK")}{" "}
                            {t.denarsShort}
                          </Price>

                          <Stores>
                            {t.availableAt} {tv.availableStores.join(" · ")}
                          </Stores>

                          <Reasons>
                            {tv.reasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </Reasons>

                          <Score>
                            {t.score}: <strong>{tv.score}</strong>
                          </Score>

                          <DetailsLink
                            to={`/tv/${encodeURIComponent(
                              tv.brand,
                            )}/${encodeURIComponent(tv.model)}`}
                          >
                            {t.viewDetails} →
                          </DetailsLink>
                        </ResultInfo>
                      </ResultContent>
                    </ResultCard>
                  ))}
                </ResultsList>
              )}

              <RestartButton onClick={restart}>↻ {t.tryAgain}</RestartButton>
            </>
          )}
        </WizardCard>
      </Container>
    </Page>
  );
}

export default RecommendTv;
