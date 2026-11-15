import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";

import Navigation from "./Navigation";
import { usePageMeta } from "../lib/usePageMeta";
import { tvPath } from "../lib/tvPath";
import { displayBrand } from "../lib/brand";

const Page = styled.div`
  min-height: 100vh;
  background-color: #f7f7f9;
`;

const Container = styled.div`
  width: 100%;
  max-width: 1000px;

  margin: 0 auto;

  padding: 35px 20px 60px;

  box-sizing: border-box;
`;

const BackButton = styled.button`
  border: none;
  background: transparent;

  color: #553d67;

  font-size: 14px;
  font-weight: 700;

  cursor: pointer;

  padding: 0;

  margin-bottom: 20px;

  &:hover {
    color: #242582;
  }
`;

const Heading = styled.h1`
  margin: 0 0 4px;

  color: #242582;

  font-size: 26px;
  font-weight: 800;

  @media (max-width: 600px) {
    font-size: 21px;
  }
`;

const SubHeading = styled.p`
  margin: 0 0 20px;

  color: #777;

  font-size: 14px;
`;

const SceneSwitch = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  margin-bottom: 14px;
`;

const SceneLabel = styled.span`
  font-size: 12px;
  color: #888;
  margin-right: 2px;
`;

const SceneButton = styled.button`
  border: 1px solid ${(props) => (props.$active ? "#242582" : "#d8d8e2")};
  border-radius: 999px;

  padding: 6px 14px;

  background-color: ${(props) => (props.$active ? "#242582" : "white")};
  color: ${(props) => (props.$active ? "white" : "#555")};

  font-size: 12px;
  font-weight: 700;

  cursor: pointer;

  transition: 0.15s;
`;

const Room = styled.div`
  position: relative;

  width: 100%;
  aspect-ratio: 4 / 3;

  border-radius: 16px;
  overflow: hidden;

  border: 1px solid #e3e3e3;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.04);

  @media (min-width: 640px) {
    aspect-ratio: 16 / 9;
  }
`;

const RoomPhoto = styled.div`
  position: absolute;
  inset: 0;

  background-image: url("/images/livingroom/room.jpg");
  background-size: cover;
  background-position: 50% 28%;

  filter: ${(props) =>
    props.$dark
      ? "brightness(0.38) contrast(1.18) saturate(0.55) hue-rotate(-6deg)"
      : "none"};
  transition: filter 500ms ease;
`;

const RoomGrade = styled.div`
  position: absolute;
  inset: 0;

  background: ${(props) =>
    props.$dark
      ? "linear-gradient(180deg, rgba(10,14,22,0.25), rgba(6,8,14,0.5) 70%, rgba(4,5,9,0.65))"
      : "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.12) 70%, rgba(0,0,0,0.22))"};

  pointer-events: none;
`;

const TvStage = styled.div`
  position: absolute;
  left: 49%;
  bottom: 35%;
  transform: translateX(-50%);

  width: ${(props) => (props.$widthPx ? `${props.$widthPx}px` : `${props.$widthPctFallback}%`)};

  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transition: width 550ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 420ms ease, transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  ${(props) => !props.$visible && "transform: translateX(-50%) scale(0.9);"}
`;

const TvGlow = styled.div`
  position: absolute;
  left: 50%;
  top: 6%;
  width: 96%;
  height: 88%;
  transform: translateX(-50%);

  filter: blur(32px);
  opacity: ${(props) => (props.$dark ? 0.6 : 0.16)};
  z-index: 0;

  background: radial-gradient(circle, rgba(36, 37, 130, 0.55), transparent 70%);
  transition: opacity 400ms ease;
`;

const TvCompose = styled.div`
  position: relative;
  z-index: 1;

  filter: drop-shadow(0 2px 2px rgba(20, 14, 8, 0.35))
    drop-shadow(10px 22px 20px rgba(20, 14, 8, 0.38));
`;

const TvPhoto = styled.img`
  display: block;
  width: 100%;
  height: auto;
  background: none;
  border: none;
`;

const Caption = styled.p`
  position: absolute;
  bottom: 8px;
  right: 12px;

  margin: 0;

  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
`;

const InfoBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;

  margin-top: 16px;
`;

const InfoBadge = styled.span`
  padding: 7px 13px;

  background-color: #f4f4f6;
  border: 1px solid #e7e7ea;
  border-radius: 8px;

  color: #444;
  font-size: 13px;
  font-weight: 700;
`;

const Note = styled.p`
  margin: 16px 0 0;

  color: #999;
  font-size: 12px;
  line-height: 1.6;
`;

const Empty = styled.div`
  background-color: white;

  border: 1px solid #e3e3e3;
  border-radius: 16px;

  padding: 30px;

  color: #666;
  text-align: center;
`;

const Description = styled.p`
  margin: 0;
  color: #666;
  font-size: 15px;
`;

const API = process.env.REACT_APP_API_URL || "/api";

/*
  Физичка пресметка на ширината, преку 16:9 сооднос:
    width_inch = diagonal * (16 / sqrt(16² + 9²)) ≈ diagonal * 0.8716

  Собата (/images/livingroom/room.jpg) е калибрирана спрема комодата: таа
  зафаќа ~93% од ширината на кадарот, а претпоставуваме дека е ~220cm широка.
  55" телевизор (реална ширина ~123cm) би зафаќал ~52% од кадарот, 75" ≈ 70%.

  НАД 75" растот свесно се компресира (COMPRESSION_FACTOR), наместо да расте
  линеарно до 100"=114% / 115"=131% — токму тоа беше оригиналната поплака
  („100-инчен ТВ ја зазема скоро целата слика"). Без компресија, clamp-ување
  во фиксна „кутија" ги прави сите големини над таа граница ИДЕНТИЧНИ по
  изглед (55" = 100" на екран) штом двете ја надминуваат кутијата — токму тоа
  се случи претходно откако кутијата постепено се смалуваше. Со компресија,
  секоја наредна големина е СЕКОГАШ видливо поголема од претходната
  (монотоно), но растот над 75" е намерно бавен за да 100"/115" не ја
  доминираат целата слика.
*/
const TV_ASPECT_WIDTH_RATIO = 16 / Math.sqrt(16 * 16 + 9 * 9); // 0.8716
const CABINET_WIDTH_CM = 220;
const CABINET_FRACTION_OF_FRAME = 0.93;
const CM_PER_PERCENT = CABINET_WIDTH_CM / (CABINET_FRACTION_OF_FRAME * 100);
const COMPRESSION_THRESHOLD_INCHES = 75;
const COMPRESSION_FACTOR = 0.25; // инчи над прагот растат со 25% од нормалното темпо

function naturalWidthPercentForSize(size) {
  const diagonalInches = Number(size);
  if (!diagonalInches) return 60;

  const rawPctForInches = (inches) =>
    (inches * TV_ASPECT_WIDTH_RATIO * 2.54) / CM_PER_PERCENT;

  if (diagonalInches <= COMPRESSION_THRESHOLD_INCHES) {
    return Math.max(10, rawPctForInches(diagonalInches));
  }

  const pctAtThreshold = rawPctForInches(COMPRESSION_THRESHOLD_INCHES);
  const excessInches = diagonalInches - COMPRESSION_THRESHOLD_INCHES;
  const excessPct = rawPctForInches(excessInches) * COMPRESSION_FACTOR;
  return pctAtThreshold + excessPct;
}

/*
  Безбедносна граница ("кутија"), независна од позицијата на ТВ-то (bottom:
  35% погоре е чисто визуелно сидро). Со компресијата погоре, ширината реално
  никогаш не поминува ~98% ни за 115", па оваа кутија речиси никогаш не се
  активира — таа е резервна заштита за нетипични слики (пр. производ-фотки
  со необичен сооднос на страни), не примарниот механизам за ограничување.
*/
const MOUNT_BOX = { widthPct: 96, heightPct: 70 };

function computeFittedWidthPx(roomSize, naturalWidthPct, imgAspect) {
  if (!roomSize.width || !roomSize.height) return null;

  const desiredWidthPx = (naturalWidthPct / 100) * roomSize.width;
  const desiredHeightPx = desiredWidthPx / (imgAspect || 16 / 9);

  const boxWidthPx = roomSize.width * (MOUNT_BOX.widthPct / 100);
  const boxHeightPx = roomSize.height * (MOUNT_BOX.heightPct / 100);

  const scale = Math.min(1, boxWidthPx / desiredWidthPx, boxHeightPx / desiredHeightPx);
  return desiredWidthPx * scale;
}

const LivingRoomPreview = () => {
  const { brand, model } = useParams();
  const navigate = useNavigate();

  const [tv, setTv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const [visible, setVisible] = useState(false);
  const [imgSrc, setImgSrc] = useState(null);
  const [imgFellBack, setImgFellBack] = useState(false);

  const roomRef = useRef(null);
  const [roomSize, setRoomSize] = useState({ width: 0, height: 0 });
  const [imgAspect, setImgAspect] = useState(16 / 9);

  useEffect(() => {
    const el = roomRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setRoomSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`${API}/tvs/${encodeURIComponent(brand)}/${encodeURIComponent(model)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setTv(data && !data.error ? data : null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setTv(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [brand, model]);

  useEffect(() => {
    if (!tv) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [tv]);

  useEffect(() => {
    if (!tv) return;
    // reset to a plain 16:9 guess until the new image's onLoad reports its
    // real size — avoids briefly using the PREVIOUS tv's aspect ratio
    setImgAspect(16 / 9);
  }, [tv]);

  useEffect(() => {
    if (!tv) return;
    // Prefer the background-removed cutout; fall back to the original
    // (studio-background) photo if it was never generated for this TV
    // (see scripts/makeTransparentTvPngs.js — a handful of source photos
    // fail the flood fill or are missing on disk).
    setImgSrc(`/images/tvs-transparent/${tv.id}.webp`);
    setImgFellBack(false);
  }, [tv]);

  usePageMeta(
    tv
      ? {
          title: `${displayBrand(tv.brand)} ${tv.model} во дневна соба | Display.mk`,
          description: `Погледни како изгледа ${displayBrand(tv.brand)} ${tv.model} (${tv.size}") во дневна соба.`,
          path: `${tvPath(tv)}/soba`,
        }
      : { title: "Display.mk" }
  );

  if (loading) {
    return (
      <Page>
        <Navigation />
        <Container>
          <Empty>
            <Description>Се вчитува...</Description>
          </Empty>
        </Container>
      </Page>
    );
  }

  if (!tv) {
    return (
      <Page>
        <Navigation />
        <Container>
          <Empty>
            <Description>Телевизорот не е пронајден.</Description>
            <BackButton onClick={() => navigate("/")}>
              ← Назад кон телевизори
            </BackButton>
          </Empty>
        </Container>
      </Page>
    );
  }

  const naturalWidthPct = naturalWidthPercentForSize(tv.size);
  const widthPx = computeFittedWidthPx(roomSize, naturalWidthPct, imgAspect);

  return (
    <Page>
      <Navigation />

      <Container>
        <BackButton onClick={() => navigate(tvPath(tv))}>
          ← Назад кон спецификации
        </BackButton>

        <Heading>
          {displayBrand(tv.brand)} {tv.model} во дневна соба
        </Heading>
        <SubHeading>
          Визуелен впечаток за големината во простор — не е точна мерка.
        </SubHeading>

        <SceneSwitch>
          <SceneLabel>Простор:</SceneLabel>
          <SceneButton $active={!dark} onClick={() => setDark(false)}>
            Модерна светла соба
          </SceneButton>
          <SceneButton $active={dark} onClick={() => setDark(true)}>
            Темен амбиент
          </SceneButton>
        </SceneSwitch>

        <Room ref={roomRef}>
          <RoomPhoto $dark={dark} />
          <RoomGrade $dark={dark} />

          <TvStage
            $widthPx={widthPx}
            $widthPctFallback={Math.min(naturalWidthPct, MOUNT_BOX.widthPct)}
            $visible={visible}
          >
            <TvGlow $dark={dark} />
            <TvCompose>
              <TvPhoto
                src={imgSrc}
                alt={`${displayBrand(tv.brand)} ${tv.model}`}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.target;
                  if (naturalWidth && naturalHeight) {
                    setImgAspect(naturalWidth / naturalHeight);
                  }
                }}
                onError={() => {
                  if (!imgFellBack) {
                    setImgFellBack(true);
                    setImgSrc(tv.image);
                  }
                }}
              />
            </TvCompose>
          </TvStage>

          <Caption>Фото: Unsplash</Caption>
        </Room>

        <InfoBar>
          <InfoBadge>{tv.size}"</InfoBadge>
          <InfoBadge>{tv.resolution}</InfoBadge>
          {tv.technology && <InfoBadge>{tv.technology}</InfoBadge>}
        </InfoBar>

        <Note>
          Собата е илустративна позадина. Сликата на телевизорот е реалната
          фотографија од нашата база со автоматски отстранета позадина — кај
          поретки модели каде тоа не успеало, се гледа оригиналната слика.
        </Note>
      </Container>
    </Page>
  );
};

export default LivingRoomPreview;
