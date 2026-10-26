import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { Link } from "react-router-dom";

import Navigation from "./Navigation";
import { Context } from "./Context";
import { usePageMeta } from "../lib/usePageMeta";
import { tvPath } from "../lib/tvPath";
import { formatPrice, technologyLabel } from "../lib/tvSpecs";
import {
  DISTANCE_OPTIONS,
  LIGHT_OPTIONS,
  PRIORITY_OPTIONS,
  SIZE_OPTIONS,
  USE_OPTIONS,
} from "../lib/recommend";

import sceneDo2 from "../assets/odberi-distance/do-2.png";
import scene2_25 from "../assets/odberi-distance/2-2.5.png";
import scene25_3 from "../assets/odberi-distance/2.5-3.png";
import scene3_35 from "../assets/odberi-distance/3-3.5.png";
import sceneNad35 from "../assets/odberi-distance/nad-3.5.png";

import size32 from "../assets/odberi-size/32.png";
import size43 from "../assets/odberi-size/43.png";
import size50 from "../assets/odberi-size/50.png";
import size55 from "../assets/odberi-size/55.png";
import size65 from "../assets/odberi-size/65.png";
import size75 from "../assets/odberi-size/75.png";
import size85 from "../assets/odberi-size/85.png";
import size98 from "../assets/odberi-size/98.png";
import size100 from "../assets/odberi-size/100.png";

import sceneSvetla from "../assets/odberi-light/svetla.png";
import sceneUmerena from "../assets/odberi-light/umerena.png";
import sceneTemna from "../assets/odberi-light/temna.png";

import sceneFilmovi from "../assets/odberi-use/filmovi.jpg";
import sceneSport from "../assets/odberi-use/sport.jpg";
import sceneGejming from "../assets/odberi-use/gejmin.jpg";
import sceneMeshano from "../assets/odberi-use/meshano.jpg";

import logoSamsung from "../assets/brand-logos/samsung.png";
import logoLg from "../assets/brand-logos/lg.png";
import logoSony from "../assets/brand-logos/sony.png";
import logoPhilips from "../assets/brand-logos/philips.png";
import logoHisense from "../assets/brand-logos/hisense.png";
import logoTcl from "../assets/brand-logos/tcl.png";
import logoJvc from "../assets/brand-logos/jvc.png";
import logoFuego from "../assets/brand-logos/fuego.png";
import logoXiaomi from "../assets/brand-logos/xiaomi.png";
import logoHaier from "../assets/brand-logos/haier.png";
import logoBeko from "../assets/brand-logos/beko.png";
import logoTesla from "../assets/brand-logos/tesla.png";
import logoVivax from "../assets/brand-logos/vivax.png";
import logoAiwa from "../assets/brand-logos/aiwa.png";
import logoFavorit from "../assets/brand-logos/favorit.png";
import logoSt from "../assets/brand-logos/st.png";

const LIGHT_SCENES = {
  svetla: sceneSvetla,
  umerena: sceneUmerena,
  temna: sceneTemna,
};

const DISTANCE_SCENES = {
  "do-2": sceneDo2,
  "2-2.5": scene2_25,
  "2.5-3": scene25_3,
  "3-3.5": scene3_35,
  "nad-3.5": sceneNad35,
};

const SIZE_SCENES = {
  "32": size32,
  "43": size43,
  "50": size50,
  "55": size55,
  "65": size65,
  "75": size75,
  "85": size85,
  "98": size98,
  "100": size100,
};

const USE_SCENES = {
  filmovi: sceneFilmovi,
  sport: sceneSport,
  gejming: sceneGejming,
  meshano: sceneMeshano,
};

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

/*
  Рачно нацртани SVG икони (без нова зависност). currentColor значи секоја
  автоматски ја презема белата/темната боја на копчето кога е избрано.
*/
const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const IconSun = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.2M12 19.3v2.2M4.2 12H2M22 12h-2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
  </svg>
);

const IconCloudSun = () => (
  <svg {...svgProps}>
    <path d="M7.5 9.5a3.5 3.5 0 0 1 6.6-1.6" />
    <path d="M5 19a3.6 3.6 0 0 1 .6-7.1 4.6 4.6 0 0 1 8.9-.9A3.8 3.8 0 0 1 14 19H5Z" />
    <path d="M18 3v1.6M21.4 6.6 20.2 7.8M22.5 10.5h-1.6" />
  </svg>
);

const IconMoon = () => (
  <svg {...svgProps}>
    <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a7 7 0 0 0 10.2 10.2Z" />
  </svg>
);

const IconFilm = () => (
  <svg {...svgProps}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <path d="M3 9h18M3 15h18M8.5 4.5 7 9M16 4.5l-1.5 4.5" />
  </svg>
);

const IconTrophy = () => (
  <svg {...svgProps}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4" />
    <path d="M12 13v3M9 20h6M10 20v-2.2a2 2 0 0 1 4 0V20" />
  </svg>
);

const IconGamepad = () => (
  <svg {...svgProps}>
    <path d="M7 8.5h10a4.5 4.5 0 0 1 4.3 5.8l-.5 1.5a2.6 2.6 0 0 1-4.6.8L15 14.8a2 2 0 0 0-1.6-.8h-2.8a2 2 0 0 0-1.6.8l-1.2 1.8a2.6 2.6 0 0 1-4.6-.8l-.5-1.5A4.5 4.5 0 0 1 7 8.5Z" />
    <path d="M7.8 11v2.6M6.5 12.3h2.6" />
    <circle cx="15.2" cy="11" r="0.6" fill="currentColor" />
    <circle cx="17.2" cy="13" r="0.6" fill="currentColor" />
  </svg>
);

const IconTv = () => (
  <svg {...svgProps}>
    <rect x="3" y="5.5" width="18" height="12" rx="2" />
    <path d="M9 21h6M12 17.5V21" />
  </svg>
);

const IconEye = () => (
  <svg {...svgProps}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.7" />
  </svg>
);

const IconExpand = () => (
  <svg {...svgProps}>
    <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" />
  </svg>
);

const IconGrid = () => (
  <svg {...svgProps}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.3" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.3" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.3" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.3" />
  </svg>
);

const IconZap = () => (
  <svg {...svgProps}>
    <path d="M12.5 2.5 4 14h6.5L11 21.5 20 10h-6.5L12.5 2.5Z" />
  </svg>
);

const IconShuffle = () => (
  <svg {...svgProps}>
    <path d="M3 6h3.5L15 17.5H21M3 18h3.5L10 13M16 6h5M16 6l2.5-2.5M16 6l2.5 2.5M21 18l-2.5-2.5M21 18l-2.5 2.5" />
  </svg>
);

const IconClock = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </svg>
);

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

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

/*
  key={stepIndex} на местото каде се користи ова ја тера React да го
  замонтира повторно при секоја промена на прашањето, па анимацијата секогаш
  поминува одново — без тоа, истиот <div> само би си ги менувал децата.
*/
const StepFade = styled.div`
  animation: ${fadeInUp} 0.28s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
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

/* ---------- Landing / hero ---------- */

const Hero = styled.div`
  display: flex;
  flex-direction: column;

  align-items: flex-start;

  padding: 56px 0 24px;

  max-width: 560px;

  @media (max-width: 600px) {
    padding: 28px 0 12px;
  }
`;

const HeroEyebrow = styled.span`
  display: inline-block;

  margin-bottom: 14px;

  padding: 6px 14px;

  border-radius: 999px;

  background-color: #eeeaf2;

  color: #553d67;

  font-size: 12px;

  font-weight: 800;

  letter-spacing: 0.06em;
`;

const HeroTitle = styled.h1`
  margin: 0 0 16px;

  color: ${PURPLE};

  font-size: 40px;

  font-weight: 800;

  line-height: 1.15;

  @media (max-width: 600px) {
    font-size: 30px;
  }
`;

const HeroText = styled.p`
  margin: 0 0 28px;

  color: #4a4a5e;

  font-size: 17px;

  line-height: 1.65;
`;

const HeroNote = styled.p`
  margin: 14px 0 0;

  color: #8a8aa3;

  font-size: 13px;
`;

/*
  One column on a phone, two where there is room. Options are deliberately tall
  so they stay easy to hit with a thumb.
*/
const SceneLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (min-width: 680px) {
    flex-direction: row;
    align-items: flex-start;
    gap: 24px;
  }
`;

const SceneTextCol = styled.div`
  flex: 1;
  min-width: 0;
`;

const SceneBox = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: ${(props) => (props.$portrait ? "3 / 5" : "1376 / 768")};
  max-height: 260px;
  border-radius: 14px;
  overflow: hidden;
  background: #eae7df;
  flex-shrink: 0;

  @media (min-width: 680px) {
    width: ${(props) => (props.$portrait ? "195px" : "300px")};
  }
`;

const SceneImg = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: ${(props) => (props.$portrait ? "cover" : "contain")};
  opacity: ${(props) => (props.$active ? 1 : 0)};
  transition: opacity 0.35s ease;
`;

const BudgetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`;

const BudgetField = styled.label`
  flex: 1;
  min-width: 140px;

  display: flex;
  flex-direction: column;
  gap: 8px;

  font-size: 13px;
  font-weight: 700;
  color: #666;
`;

const BudgetInputWrap = styled.div`
  position: relative;

  display: flex;
  align-items: center;
`;

const BudgetInput = styled.input`
  width: 100%;

  height: 56px;

  padding: 0 60px 0 18px;

  font-family: inherit;
  font-size: 18px;
  font-weight: 700;
  color: #2a2a3c;

  background-color: #ffffff;

  border: 2px solid #e2e2ec;
  border-radius: 14px;

  box-sizing: border-box;

  transition: border-color 0.15s;

  ${focusRing}

  &:hover {
    border-color: ${PURPLE};
  }

  &::placeholder {
    color: #b7b6c6;
    font-weight: 600;
  }

  /* Отстранува стрелки за број — нема потреба на вредности од илјадници денари. */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type="number"] {
    -moz-appearance: textfield;
  }
`;

const BudgetSuffix = styled.span`
  position: absolute;
  right: 18px;

  font-size: 14px;
  font-weight: 700;
  color: #9a99ab;

  pointer-events: none;
`;

const BudgetNote = styled.p`
  margin: 14px 0 0;

  font-size: 13px;
  color: #8c8b9c;
`;

const Options = styled.div`
  display: grid;

  grid-template-columns: ${(props) => (props.$compact ? "repeat(3, 1fr)" : "1fr")};

  gap: ${(props) => (props.$compact ? "8px" : "12px")};

  @media (min-width: 620px) {
    grid-template-columns: ${(props) =>
      props.$compact ? "repeat(5, 1fr)" : props.$wide ? "1fr" : "1fr 1fr"};
  }
`;

const pop = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.035); }
  100% { transform: scale(1); }
`;

const Option = styled.button`
  width: 100%;

  min-height: ${(props) => (props.$compact ? "48px" : "64px")};

  padding: ${(props) => (props.$compact ? "10px 8px" : "18px 20px")};

  display: flex;
  align-items: ${(props) => (props.$rich ? "flex-start" : "center")};
  justify-content: ${(props) => (props.$compact ? "center" : "flex-start")};

  gap: 14px;

  text-align: ${(props) => (props.$compact ? "center" : "left")};

  color: ${(props) => (props.$selected ? "#ffffff" : "#2a2a3c")};

  background-color: ${(props) => (props.$selected ? PURPLE : "#ffffff")};

  font-family: inherit;

  font-size: ${(props) => (props.$compact ? "15px" : "16px")};

  font-weight: 600;

  line-height: 1.4;

  border: 2px solid ${(props) => (props.$selected ? PURPLE : "#e2e2ec")};
  border-radius: 14px;

  cursor: pointer;

  transition: border-color 0.15s, background-color 0.15s, transform 0.08s;

  ${(props) => props.$selected && css`animation: ${pop} 0.22s ease;`}

  ${focusRing}

  &:hover {
    border-color: ${PURPLE};
  }

  &:active {
    transform: scale(0.99);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;

    &:active {
      transform: none;
    }
  }
`;

/* Икона во круг пред насловот — само за прашањата со icon. */
const OptionIcon = styled.span`
  flex-shrink: 0;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 40px;
  height: 40px;

  border-radius: 11px;

  background-color: ${(props) => (props.$selected ? "rgba(255,255,255,0.18)" : "#f1f0f8")};

  color: inherit;

  svg {
    width: 22px;
    height: 22px;
  }
`;

const OptionLogo = styled.img`
  width: 30px;
  height: 30px;
  object-fit: contain;
`;

const OptionLogoBox = styled(OptionIcon)`
  width: 48px;
  height: 48px;
`;

const OptionBody = styled.span`
  display: flex;
  flex-direction: column;

  gap: 4px;

  min-width: 0;
`;

const OptionBlurb = styled.span`
  font-size: 13px;

  font-weight: 500;

  line-height: 1.45;

  color: ${(props) => (props.$selected ? "rgba(255,255,255,0.82)" : "#73738c")};
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
      : props.$kind === "stretch"
      ? "#0f6fb5"
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

const Advantage = styled.div`
  margin-top: 10px;

  color: #1b7a4b;

  font-size: 14px;
  font-weight: 700;
`;

const Tradeoff = styled.div`
  margin-top: 4px;

  color: #9a5b00;

  font-size: 14px;
  font-weight: 600;
`;

const CardLinks = styled.div`
  margin-top: 14px;

  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const CardLink = styled(Link)`
  padding: 8px 14px;

  color: ${PURPLE};

  font-size: 13px;
  font-weight: 700;

  text-decoration: none;

  border: 1px solid #dedee5;
  border-radius: 8px;

  &:hover {
    border-color: ${PURPLE};
    background: #f6f6fb;
  }
`;

const CompareButton = styled.button`
  padding: 8px 14px;

  border: 1px solid #dedee5;
  border-radius: 8px;

  background: white;
  color: #555;

  font-size: 13px;
  font-weight: 700;

  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${PURPLE};
    color: ${PURPLE};
  }

  &:disabled {
    background: #f1f1f4;
    color: #999;
    cursor: default;
  }
`;

const MoreCont = styled.div`
  margin-top: 30px;
  padding-top: 24px;

  border-top: 1px solid #e8e8ef;
`;

const MoreHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  margin-bottom: 16px;
`;

const MoreTitle = styled.h2`
  margin: 0;

  color: #333;

  font-size: 17px;
  font-weight: 700;
`;

const SortSelect = styled.select`
  height: 36px;
  padding: 0 10px;

  border: 1px solid #dedee5;
  border-radius: 8px;

  background: white;
  color: #555;

  font-size: 13px;
  font-weight: 600;
`;

const MoreRow = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  padding: 12px 14px;

  border: 1px solid #e8e8ef;
  border-radius: 10px;

  margin-bottom: 8px;

  text-decoration: none;

  &:hover {
    border-color: ${PURPLE};
    background: #f8f8fc;
  }
`;

const MoreName = styled.span`
  color: #333;
  font-size: 14px;
  font-weight: 700;
`;

const MoreSpecs = styled.span`
  display: block;
  margin-top: 2px;
  color: #888;
  font-size: 12px;
  font-weight: 500;
`;

const MorePrice = styled.span`
  color: ${PURPLE};
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
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

const StretchHead = styled.div`
  margin: 28px 0 14px;

  h2 {
    margin: 0 0 4px;

    color: #2a2a3c;

    font-size: 19px;
    font-weight: 800;
  }

  p {
    margin: 0;

    color: #6a6a7c;

    font-size: 14px;
    line-height: 1.5;
  }
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

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
`;

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
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

const BRAND_LOGOS = {
  SAMSUNG: logoSamsung,
  LG: logoLg,
  SONY: logoSony,
  PHILIPS: logoPhilips,
  HISENSE: logoHisense,
  TCL: logoTcl,
  JVC: logoJvc,
  FUEGO: logoFuego,
  XIAOMI: logoXiaomi,
  HAIER: logoHaier,
  BEKO: logoBeko,
  TESLA: logoTesla,
  VIVAX: logoVivax,
  AIWA: logoAiwa,
  FAVORIT: logoFavorit,
  ST: logoSt,
};

/*
  Ги спојува {id,label} опциите (од recommend.js — податок, не UI) со
  икона/опис за секоја, без да се дуплира листата. recommend.js останува
  единствен извор за id/label; иконите се чисто визуелни и живеат тука.
*/
function USE_META_MAP(baseOptions, metaById) {
  return baseOptions.map((o) => ({ id: o.id, label: o.label, ...metaById[o.id] }));
}

function buildSteps(brandOptions) {
  return [
    {
      key: "distance",
      question: "Колку си оддалечен од телевизорот?",
      hint: "Измери го растојанието од гарнитурата за седење до ѕидот каде што ќе стои телевизорот. Ова е најважниот податок за одредување на големината.",
      options: DISTANCE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    },
    {
      key: "preferredSize",
      question: "Имаш ли конкретна големина на ум?",
      hint: 'Ако немаш одредена големина, избери „Нема преференца" — ќе предложиме според растојанието од претходното прашање.',
      options: [
        ...SIZE_OPTIONS.map((size) => ({ id: String(size), label: `${size}"`, value: size })),
        { id: "any", label: "Нема преференца", value: null },
      ],
    },
    {
      key: "light",
      question: "Колку светлина има во собата попладне?",
      hint: "Во светла соба подобро се снаоѓаат панели со висока светлина. Во темна доаѓа до израз контрастот.",
      options: USE_META_MAP(LIGHT_OPTIONS, {
        svetla: {
          icon: <IconSun />,
          blurb: "Подобро се снаоѓаат панели со висока осветленост.",
        },
        umerena: {
          icon: <IconCloudSun />,
          blurb: "Балансирана поставка — повеќето панели работат добро.",
        },
        temna: {
          icon: <IconMoon />,
          blurb: "Контрастот доаѓа до израз — OLED/Mini LED се најсилни тука.",
        },
      }),
    },
    {
      key: "use",
      question: "Што гледаш најмногу?",
      hint: "Избери го најчестото — секоја опција бара нешто различно од телевизорот.",
      options: USE_META_MAP(USE_OPTIONS, {
        filmovi: {
          icon: <IconFilm />,
          blurb: "Длабоко црно и силен контраст — OLED/Mini LED се најсилни тука.",
        },
        sport: {
          icon: <IconTrophy />,
          blurb: "Брза, јасна слика без замаглување при трчање и брзи акции.",
        },
        gejming: {
          icon: <IconGamepad />,
          blurb: "Висок Hz, VRR и ALLM — мазна игра без кинење и доцнење.",
        },
        meshano: {
          icon: <IconTv />,
          blurb: "Балансиран избор што добро се снаоѓа насекаде, без да се специјализира.",
        },
      }),
    },
    {
      key: "budget",
      question: "Колку сакаш да потрошиш?",
      hint: "Внеси опсег во денари. Остави „до” празно ако нема горна граница.",
      budgetInput: true,
      options: [],
      wide: true,
    },
    {
      key: "priority",
      question: "Што ти е најважно?",
      hint: "Ако мораш да избереш едно нешто за кое вреди да се плати повеќе.",
      options: USE_META_MAP(PRIORITY_OPTIONS, {
        slika: { icon: <IconEye /> },
        golemina: { icon: <IconExpand /> },
        gejming: { icon: <IconGamepad /> },
        smart: { icon: <IconGrid /> },
      }),
    },
    /*
      Прашање само за оние што играат. Се прикажува условно (види подолу):
      нема смисла да го прашуваш за VRR некој што гледа само серии.

      Намерно се вели „добро е да има", не „мора": 120Hz + VRR + ALLM
      оставаат 113 телевизори, а со среден буџет само 18. Задолжително
      барање би враќало празно.
    */
    {
      key: "gamingWishes",
      question: "Што ти е важно за гејминг?",
      hint: "Ова се желби, не услови. Ако нешто недостасува кај препорачаниот, ќе ти кажеме.",
      multi: true,
      onlyIf: (a) => a.use === "gejming" || a.priority === "gejming",
      options: [
        {
          id: "hz120",
          label: "120Hz или повеќе",
          icon: <IconZap />,
          blurb: "помазна слика во брзи игри",
        },
        {
          id: "vrr",
          label: "VRR",
          icon: <IconShuffle />,
          blurb: "спречува кинење на сликата",
        },
        {
          id: "allm",
          label: "ALLM",
          icon: <IconClock />,
          blurb: "автоматски режим со мало доцнење",
        },
        { id: "none", label: "Ништо од ова не ми е важно", exclusive: true },
      ],
    },
    {
      key: "brands",
      question: "Преферираш ли некој одреден бренд?",
      hint: "Можеш да избереш повеќе. Ова е желба, не филтер — ако друг бренд е значително подобар избор, сепак ќе ти го прикажеме.",
      multi: true,
      options: [
        { id: BRAND_ANY, label: "Не, немам преференца", exclusive: true },
        ...brandOptions.map((b) => ({
          id: b.brand,
          label: b.brand,
          note: `${b.count} модели`,
          logo: BRAND_LOGOS[b.brand],
        })),
      ],
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

const OdberiTv = () => {
  const { compareList, addToCompare } = useContext(Context);

  const [quizOptions, setQuizOptions] = useState({ brands: [], budgets: [] });

  usePageMeta({
    title: "Одбери ТВ — препорака за твојата соба | Display.mk",
    description:
      "Одговори на шест прашања и добиј три телевизори што одговараат на твојата соба, навики и буџет.",
    path: "/odberi-tv",
  });


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

  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);

  /*
    Чекорите зависат и од одговорите: прашањето за гејминг се појавува само
    ако корисникот игра. Затоа `answers` е во зависностите.
  */
  const steps = useMemo(
    () =>
      buildSteps(quizOptions.brands).filter(
        (item) => !item.onlyIf || item.onlyIf(answers)
      ),
    [quizOptions, answers]
  );


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

  /*
    Заедничко за сите начини да се помине напред: одговор, скип или
    "прикажи препораки" на повеќекратен избор. Порано тоа копче секогаш
    викаше setDone(true), па истото прашање (гејминг желби) кога не е
    последен чекор, прескокнуваше сè по себе — вклучително прашањето за
    бренд. Сега секое „напред" поминува низ исто место.
  */
  const advance = () => {
    if (isLast) {
      setDone(true);
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  const answerSingle = (option) => {
    // "value" in option, not option.value || — a deliberate `value: null`
    // ("Нема преференца") must stay null, not fall back to the option's id.
    const value = "value" in option ? option.value : option.id;

    setAnswers((previous) => ({ ...previous, [step.key]: value }));
  };

  // Буџетот сега е слободен опсег, не избор меѓу подготвени опции — „до"
  // празно значи без горна граница (исто како претходната опција „Без
  // ограничување"), „од" празно значи 0.
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const updateBudget = (rawMin, rawMax) => {
    setBudgetMin(rawMin);
    setBudgetMax(rawMax);

    const min = rawMin === "" ? 0 : Math.max(0, Number(rawMin) || 0);
    const max = rawMax === "" ? Infinity : Math.max(0, Number(rawMax) || 0);

    setAnswers((previous) => ({ ...previous, budget: { id: "custom", min, max } }));
  };

  const toggleMulti = (option) => {
    setAnswers((previous) => {
      const current = previous[step.key] || [];

      // An "exclusive" option ("no preference" / "none of these") can't sit
      // alongside real choices — picking one clears the other kind.
      const exclusiveIds = step.options.filter((o) => o.exclusive).map((o) => o.id);

      if (option.exclusive) {
        return { ...previous, [step.key]: [option.id] };
      }

      const without = current.filter((id) => !exclusiveIds.includes(id));

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

    if (!("value" in option)) {
      return answer === option.id;
    }

    /*
      Буџетот носи обект { id, min, max } — се споредува по id. Големината
      носи гол број (или null за „Нема преференца") — директна споредба.
      `typeof null === "object"` е вистина во JS, затоа прво се проверува
      дека option.value е truthy пред да се третира како обект.
    */
    if (option.value && typeof option.value === "object") {
      return answer?.id === option.value.id;
    }

    return answer === option.value;
  };

  const [result, setResult] = useState(null);
  const [scoring, setScoring] = useState(false);

  // „Прикажи повеќе" и сортирањето се праќаат до серверот; тој веќе ја има
  // рангираната листа, па нема потреба да се пресметува повторно овде.
  const [extra, setExtra] = useState(0);
  const [sort, setSort] = useState("match");

  useEffect(() => {
    if (!done) {
      setResult(null);
      return undefined;
    }

    let cancelled = false;
    setScoring(true);

    // Повеќекратниот избор чува листа од id-а; серверот чека знаменца.
    const wishes = Array.isArray(answers.gamingWishes) ? answers.gamingWishes : [];

    fetch(`${API}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distance: answers.distance,
        preferredSize: answers.preferredSize || null,
        light: answers.light,
        use: answers.use,
        budget: answers.budget,
        priority: answers.priority,
        brands: answers.brands || [],
        gamingWishes: {
          hz120: wishes.includes("hz120"),
          vrr: wishes.includes("vrr"),
          allm: wishes.includes("allm"),
        },
        extra,
        sort,
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
  }, [done, answers, extra, sort]);

  const restart = () => {
    setAnswers({});
    setStepIndex(0);
    setDone(false);
    setExtra(0);
    setSort("match");
  };

  /* ---------------- Landing ---------------- */

  if (!started) {
    return (
      <PageCont>
        <Navigation />

        <Shell>
          <Hero>
            <HeroEyebrow>ОДБЕРИ ТВ</HeroEyebrow>

            <HeroTitle>Најди го телевизорот за тебе.</HeroTitle>

            <HeroText>
              Одговори на неколку кратки прашања за твојата соба, навики и
              буџет — ќе ти препорачаме до три телевизори од нашата база, со
              објаснување зошто токму тие ти одговараат.
            </HeroText>

            <PrimaryButton type="button" onClick={() => setStarted(true)}>
              Започни →
            </PrimaryButton>

            <HeroNote>Трае околу минута</HeroNote>
          </Hero>
        </Shell>
      </PageCont>
    );
  }

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
        Будget options carry a `value` object matched by id; size options
        carry a plain number (or null) matched directly; everything else has
        no `value` and is matched by its own id. See isSelected() above for
        why `option.value &&` must guard the object check (typeof null is
        "object" in JS).
      */
      const option = source.options.find((o) => {
        if (!("value" in o)) return o.id === answer;
        if (o.value && typeof o.value === "object") return o.value.id === answer?.id;
        return o.value === answer;
      });

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

          {result.sizeNote && (
            <Note>
              Со избраниот буџет нема телевизор близу {result.sizeNote}" —
              подолу е најдобриот избор во твојот буџет, не твојата барана
              големина. Зголеми го буџетот за да видиш модели близу{" "}
              {result.sizeNote}".
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
                : "Алтернатива";

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
                      alt={`${pick.tv.brand} ${pick.tv.model}`}
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

                    {/* Предноста и компромисот се пресметани во однос на
                        препорачаниот, не од готов текст. */}
                    {pick.advantage && <Advantage>+ {pick.advantage}</Advantage>}

                    {pick.tradeoff && <Tradeoff>− {pick.tradeoff}</Tradeoff>}

                    <CardLinks>
                      <CardLink to={tvPath(pick.tv)}>
                        Сите спецификации →
                      </CardLink>

                      <CompareButton
                        type="button"
                        onClick={() => addToCompare(pick.tv)}
                        disabled={compareList.some((item) => item.id === pick.tv.id)}
                      >
                        {compareList.some((item) => item.id === pick.tv.id)
                          ? "Во споредбата"
                          : "Додај во споредба"}
                      </CompareButton>
                    </CardLinks>

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

          {result.stretch && (
            <>
              <StretchHead>
                <h2>Со малку повеќе пари...</h2>

                <p>
                  За {formatPrice(result.stretch.extraCost)} повеќе (
                  {result.stretch.extraPercent}% над буџетот) добиваш нешто
                  забележливо подобро.
                </p>
              </StretchHead>

              <PickCard>
                <PickKind $kind="stretch">
                  За {formatPrice(result.stretch.extraCost)} повеќе
                </PickKind>

                <PickBody>
                  {result.stretch.tv.image && (
                    <PickImage
                      src={result.stretch.tv.image}
                      alt={`${result.stretch.tv.brand} ${result.stretch.tv.model}`}
                      onError={(event) => {
                        event.currentTarget.style.visibility = "hidden";
                      }}
                    />
                  )}

                  <PickMain>
                    <PickName>
                      {result.stretch.tv.brand} {result.stretch.tv.model}
                    </PickName>

                    <PickSpecs>
                      {[
                        result.stretch.tv.size ? `${result.stretch.tv.size}"` : null,
                        technologyLabel(result.stretch.tv.technology),
                        result.stretch.tv.resolution,
                        result.stretch.tv.refreshRate
                          ? `${result.stretch.tv.refreshRate}Hz`
                          : null,
                        result.stretch.tv.os,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Спецификациите не се целосни"}
                    </PickSpecs>

                    {/* Истата именувана предност што ја користи и третата
                        картичка (advantageOver) — вреди да се плати повеќе
                        само ако може конкретно да се каже зошто. */}
                    <Advantage>+ {result.stretch.advantage}</Advantage>

                    <CardLinks>
                      <CardLink to={tvPath(result.stretch.tv)}>
                        Сите спецификации →
                      </CardLink>

                      <CompareButton
                        type="button"
                        onClick={() => addToCompare(result.stretch.tv)}
                        disabled={compareList.some(
                          (item) => item.id === result.stretch.tv.id
                        )}
                      >
                        {compareList.some((item) => item.id === result.stretch.tv.id)
                          ? "Во споредбата"
                          : "Додај во споредба"}
                      </CompareButton>
                    </CardLinks>

                    <Offers>
                      {result.stretch.tv.offers.map((offer, index) => {
                        const cheapest =
                          index === 0 &&
                          result.stretch.tv.offers.length > 1 &&
                          offer.price < result.stretch.tv.offers[1].price;

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
            </>
          )}

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

          {/*
            Повеќе резултати: истата рангирана листа, само подлабоко. Се
            вчитува од серверот зашто каталогот не е кај корисникот.
          */}
          {result.picks.length > 0 && result.moreAvailable > 0 && (
            <MoreCont>
              <MoreHeader>
                <MoreTitle>
                  Други телевизори што ти одговараат ({result.moreAvailable})
                </MoreTitle>

                {extra > 0 && (
                  <SortSelect
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    aria-label="Подреди"
                  >
                    <option value="match">Според соодветност</option>
                    <option value="cena">Според цена</option>
                    <option value="golemina">Според големина</option>
                  </SortSelect>
                )}
              </MoreHeader>

              {result.more.map((item) => (
                <MoreRow key={item.tv.id} to={tvPath(item.tv)}>
                  <span>
                    <MoreName>
                      {item.tv.brand} {item.tv.model}
                    </MoreName>
                    <MoreSpecs>
                      {[
                        item.tv.size ? `${item.tv.size}"` : null,
                        technologyLabel(item.tv.technology),
                        item.tv.refreshRate ? `${item.tv.refreshRate}Hz` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </MoreSpecs>
                  </span>

                  <MorePrice>{formatPrice(item.tv.price)}</MorePrice>
                </MoreRow>
              ))}

              {extra < result.moreAvailable && (
                <PrimaryButton
                  type="button"
                  onClick={() => setExtra((current) => current + 8)}
                >
                  {extra === 0 ? "Прикажи повеќе телевизори" : "Уште повеќе"}
                </PrimaryButton>
              )}
            </MoreCont>
          )}
        </Shell>
      </PageCont>
    );
  }

  /* ---------------- A question ---------------- */

  const percent = ((stepIndex + (done ? 1 : 0)) / steps.length) * 100;

  const multiAnswer = answers[step.key] || [];

  const activeDistanceId =
    step.key === "distance" ? answers.distance || null : null;

  const activeSizeId =
    step.key === "preferredSize" && SIZE_SCENES[String(answers.preferredSize)]
      ? String(answers.preferredSize)
      : null;

  const activeLightId =
    step.key === "light" && LIGHT_SCENES[answers.light]
      ? answers.light
      : null;

  const activeUseId =
    step.key === "use" && USE_SCENES[answers.use] ? answers.use : null;

  return (
    <PageCont>
      <Navigation />

      <Shell>
        <TopBar>
          <BackHome to="/">← Назад на почетна</BackHome>

          <TopBarActions>
            {stepIndex > 0 && (
              <GhostButton type="button" onClick={() => goTo(stepIndex - 1)}>
                ← Назад
              </GhostButton>
            )}

            <PrimaryButton
              type="button"
              onClick={advance}
              disabled={
                step.budgetInput
                  ? false
                  : step.multi
                    ? multiAnswer.length === 0
                    : answers[step.key] === undefined
              }
            >
              {isLast ? "Прикажи препораки" : "Продолжи"}
            </PrimaryButton>
          </TopBarActions>
        </TopBar>

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

        <StepFade key={step.key}>
        {((step.key === "distance" && activeDistanceId) || (step.key === "preferredSize" && activeSizeId) || (step.key === "light" && activeLightId) || (step.key === "use" && activeUseId)) ? (
          <>
            <SceneLayout>
              {step.key === "distance" && (
                <SceneBox>
                  {Object.entries(DISTANCE_SCENES).map(([id, src]) => (
                    <SceneImg key={id} src={src} alt="" $active={id === activeDistanceId} />
                  ))}
                </SceneBox>
              )}

              {step.key === "preferredSize" && (
                <SceneBox>
                  {Object.entries(SIZE_SCENES).map(([id, src]) => (
                    <SceneImg key={id} src={src} alt="" $active={id === activeSizeId} />
                  ))}
                </SceneBox>
              )}

              {step.key === "light" && (
                <SceneBox $portrait>
                  {Object.entries(LIGHT_SCENES).map(([id, src]) => (
                    <SceneImg key={id} src={src} alt="" $active={id === activeLightId} $portrait />
                  ))}
                </SceneBox>
              )}

              {step.key === "use" && (
                <SceneBox>
                  {Object.entries(USE_SCENES).map(([id, src]) => (
                    <SceneImg key={id} src={src} alt="" $active={id === activeUseId} />
                  ))}
                </SceneBox>
              )}

              <SceneTextCol>
                <Question>{step.question}</Question>

                <Hint>{step.hint}</Hint>
              </SceneTextCol>
            </SceneLayout>

            <Options
              ref={optionsRef}
              role={step.multi ? "group" : "radiogroup"}
              aria-label={step.question}
              onKeyDown={handleOptionKeys}
              $wide={step.wide}
              $compact={step.key === "preferredSize"}
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
                    $rich={Boolean(option.icon)}
                    $compact={step.key === "preferredSize"}
                    onClick={() =>
                      step.multi ? toggleMulti(option) : answerSingle(option)
                    }
                  >
                    {step.multi && <Check $on={selected}>{selected ? "✓" : ""}</Check>}

                    {option.icon && (
                      <OptionIcon $selected={selected}>{option.icon}</OptionIcon>
                    )}

                    {option.icon ? (
                      <OptionBody>
                        <span>{option.label}</span>

                        {option.blurb && (
                          <OptionBlurb $selected={selected}>{option.blurb}</OptionBlurb>
                        )}
                      </OptionBody>
                    ) : (
                      <span>{option.label}</span>
                    )}

                    {option.note && (
                      <OptionNote $selected={selected}>{option.note}</OptionNote>
                    )}
                  </Option>
                );
              })}
            </Options>
          </>
        ) : step.budgetInput ? (
          <>
            <Question>{step.question}</Question>

            <Hint>{step.hint}</Hint>

            <BudgetRow>
              <BudgetField>
                Од
                <BudgetInputWrap>
                  <BudgetInput
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={budgetMin}
                    onChange={(event) => updateBudget(event.target.value, budgetMax)}
                  />
                  <BudgetSuffix>ден.</BudgetSuffix>
                </BudgetInputWrap>
              </BudgetField>

              <BudgetField>
                До
                <BudgetInputWrap>
                  <BudgetInput
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1000"
                    placeholder="без ограничување"
                    value={budgetMax}
                    onChange={(event) => updateBudget(budgetMin, event.target.value)}
                  />
                  <BudgetSuffix>ден.</BudgetSuffix>
                </BudgetInputWrap>
              </BudgetField>
            </BudgetRow>

            <BudgetNote>
              Остави „до" празно ако немаш горна граница — ќе земеме телевизори од секоја цена.
            </BudgetNote>
          </>
        ) : (
          <>
            <Question>{step.question}</Question>

            <Hint>{step.hint}</Hint>

            <Options
              ref={optionsRef}
              role={step.multi ? "group" : "radiogroup"}
              aria-label={step.question}
              onKeyDown={handleOptionKeys}
              $wide={step.wide}
              $compact={step.key === "preferredSize"}
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
                    $rich={Boolean(option.icon)}
                    $compact={step.key === "preferredSize"}
                    onClick={() =>
                      step.multi ? toggleMulti(option) : answerSingle(option)
                    }
                  >
                    {step.multi && <Check $on={selected}>{selected ? "✓" : ""}</Check>}

                    {option.icon && (
                      <OptionIcon $selected={selected}>{option.icon}</OptionIcon>
                    )}

                    {option.logo && (
                      <OptionLogoBox $selected={selected}>
                        <OptionLogo src={option.logo} alt="" />
                      </OptionLogoBox>
                    )}

                    {option.icon ? (
                      <OptionBody>
                        <span>{option.label}</span>

                        {option.blurb && (
                          <OptionBlurb $selected={selected}>{option.blurb}</OptionBlurb>
                        )}
                      </OptionBody>
                    ) : (
                      <span>{option.label}</span>
                    )}

                    {option.note && (
                      <OptionNote $selected={selected}>{option.note}</OptionNote>
                    )}
                  </Option>
                );
              })}
            </Options>
          </>
        )}
        </StepFade>
      </Shell>
    </PageCont>
  );
};

export default OdberiTv;
