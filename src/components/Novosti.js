import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

import ArticleImage from "./ArticleImage";
import Navigation from "./Navigation";
import { usePageMeta } from "../lib/usePageMeta";
import news from "../Data/news";
import {
  CategoryBadge,
  formatMkDate,
  formatReadTime,
  sortByNewest,
} from "./NewsShared";

const PageCont = styled.div`
  min-height: 100vh;

  background-color: #f7f7f9;
`;

const Section = styled.section`
  width: 100%;
  max-width: 1200px;

  margin: 0 auto;

  padding: 0 20px;

  box-sizing: border-box;
`;

const Header = styled(Section)`
  padding-top: 38px;
  padding-bottom: 5px;
`;

const Title = styled.h1`
  margin: 0;

  color: #242582;

  font-size: clamp(30px, 4vw, 44px);

  font-weight: 800;

  line-height: 1.1;

  letter-spacing: -0.8px;
`;

const Subtitle = styled.p`
  margin: 10px 0 0;

  color: #888;

  font-size: 14px;
`;

/* ---------- Лизгач / Slider ---------- */

const SliderSection = styled(Section)`
  padding-top: 28px;
`;

/*
  Ги држи стрелките врз лизгачот.

  Holds the arrows on top of the viewport.
*/
const SliderFrame = styled.div`
  position: relative;
`;

/*
  Padding-от е тука, не на рамката: `overflow: hidden` реже на padding-кутијата,
  па тоа е местото што ѝ оставa простор на картичката кога се подига при hover.

  The padding belongs here rather than on the frame: `overflow: hidden` clips at
  the padding box, so this padding is what leaves room for the card's hover lift
  and shadow instead of shearing them off.
*/
const SliderViewport = styled.div`
  overflow: hidden;

  padding: 6px 0 22px;
`;

const SliderTrack = styled.div`
  display: flex;

  /*
    Stretch значи сите слајдови добиваат висина од највисокиот,
    затоа страницата не скока кога насловите се со различна длабочина.

    Stretch means every slide is as tall as the tallest one, so the page does
    not jump when a shorter title slides in.
  */
  align-items: stretch;

  transform: translateX(${(props) => props.$offset}%);

  transition: ${(props) => (props.$animate ? "transform 0.5s ease" : "none")};
`;

const Slide = styled.div`
  flex: 0 0 100%;

  min-width: 0;

  display: flex;
`;

const FeaturedCard = styled(Link)`
  display: grid;
  grid-template-columns: 1.15fr 1fr;

  width: 100%;

  background: white;

  border: 1px solid #e6e6e6;
  border-radius: 16px;

  overflow: hidden;

  text-decoration: none;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    transform: translateY(-5px);

    box-shadow: 0 14px 32px rgba(36, 37, 130, 0.12);

    border-color: #d8d7ed;
  }

  &:focus-visible {
    outline: 2px solid #242582;

    outline-offset: 3px;
  }

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const FeaturedImage = styled(ArticleImage)`
  width: 100%;
  height: 100%;

  min-height: 320px;

  object-fit: cover;

  display: block;

  @media (max-width: 800px) {
    min-height: 220px;
  }
`;

const FeaturedBody = styled.div`
  padding: 34px 36px;

  display: flex;
  flex-direction: column;

  justify-content: center;

  gap: 14px;

  @media (max-width: 800px) {
    padding: 26px 24px;
  }
`;

const FeaturedTitle = styled.h2`
  margin: 0;

  color: #242582;

  font-size: 26px;

  font-weight: 800;

  line-height: 1.25;

  @media (max-width: 800px) {
    font-size: 21px;
  }
`;

const FeaturedExcerpt = styled.p`
  margin: 0;

  color: #666;

  font-size: 15px;

  line-height: 1.6;
`;

const Arrow = styled.button`
  position: absolute;
  top: 50%;

  ${(props) => (props.$side === "left" ? "left: 14px;" : "right: 14px;")}

  transform: translateY(-50%);

  z-index: 2;

  width: 44px;
  height: 44px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;

  border: 1px solid #ebebf2;
  border-radius: 50%;

  background: white;

  color: #242582;

  box-shadow: 0 4px 14px rgba(36, 37, 130, 0.18);

  cursor: pointer;

  font-size: 24px;

  font-weight: 700;

  line-height: 1;

  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: #242582;

    color: white;
  }

  &:focus-visible {
    outline: 2px solid #242582;

    outline-offset: 2px;
  }

  /*
    На телефон картичката е слика горе и текст долу, затоа стрелките стојат врз
    сликата — да не го покриваат насловот.

    On a phone the card stacks image over text, so the arrows sit over the
    image instead of at the middle of the card, where they would land on the
    title.
  */
  @media (max-width: 800px) {
    top: 110px;

    transform: none;

    width: 36px;
    height: 36px;

    font-size: 19px;

    ${(props) => (props.$side === "left" ? "left: 10px;" : "right: 10px;")}
  }
`;

const Dots = styled.div`
  display: flex;
  justify-content: center;

  gap: 9px;
`;

const Dot = styled.button`
  width: 9px;
  height: 9px;

  padding: 0;

  border: none;
  border-radius: 50%;

  background: ${(props) => (props.$active ? "#242582" : "#d2d2dc")};

  cursor: pointer;

  transition: background 0.2s ease;

  &:focus-visible {
    outline: 2px solid #242582;

    outline-offset: 3px;
  }
`;

/* ---------- Grid ---------- */

const GridSection = styled(Section)`
  padding-top: 34px;
  padding-bottom: 60px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);

  gap: 25px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.article`
  background: white;

  border: 1px solid #e6e6e6;
  border-radius: 16px;

  overflow: hidden;

  display: flex;
  flex-direction: column;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    transform: translateY(-5px);

    box-shadow: 0 14px 32px rgba(36, 37, 130, 0.12);

    border-color: #d8d7ed;
  }

  &:focus-within {
    border-color: #d8d7ed;
  }
`;

const CardLink = styled(Link)`
  display: flex;
  flex-direction: column;

  height: 100%;

  text-decoration: none;

  &:focus-visible {
    outline: 2px solid #242582;

    outline-offset: -2px;
  }
`;

const CardImage = styled(ArticleImage)`
  width: 100%;
  height: 180px;

  object-fit: cover;

  display: block;
`;

const CardBody = styled.div`
  padding: 18px;

  display: flex;
  flex-direction: column;

  flex: 1;

  gap: 10px;
`;

const CardTitle = styled.h3`
  margin: 0;

  color: #242582;

  font-size: 17px;

  font-weight: 800;

  line-height: 1.3;
`;

const CardExcerpt = styled.p`
  margin: 0;

  color: #666;

  font-size: 13px;

  line-height: 1.6;

  flex: 1;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;

  flex-wrap: wrap;

  gap: 8px;

  padding-top: 4px;

  border-top: 1px solid #f0f0f4;

  color: #999;

  font-size: 12px;
`;

const MetaDot = styled.span`
  color: #ccc;
`;

/* ---------- Show more ---------- */

const ShowMoreRow = styled.div`
  display: flex;
  justify-content: center;

  padding-top: 24px;
`;

const ShowMoreButton = styled.button`
  height: 44px;

  padding: 0 28px;

  border-radius: 8px;

  border: 1px solid #242582;

  background: white;

  color: #242582;

  cursor: pointer;

  font-size: 13px;

  font-weight: 700;

  white-space: nowrap;

  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: #242582;

    color: white;
  }

  &:focus-visible {
    outline: 2px solid #242582;

    outline-offset: 2px;
  }

  @media (max-width: 600px) {
    width: 100%;
  }
`;

/* ---------- Empty state ---------- */

const EmptyState = styled.div`
  padding: 50px 30px;

  background: white;

  border: 1px solid #e6e6e6;
  border-radius: 16px;

  text-align: center;
`;

const EmptyTitle = styled.p`
  margin: 0;

  font-family: 'Manrope', 'Open Sans', sans-serif;

  color: #242582;

  font-size: 16px;

  font-weight: 700;
`;

const EmptyText = styled.p`
  margin: 8px 0 0;

  color: #888;

  font-size: 14px;
`;

const PAGE_SIZE = 6;

/* Колку статии влегуваат во лизгачот — how many articles the slider holds. */
const SLIDER_SIZE = 5;

const AUTOPLAY_MS = 6000;

/* Под оваа далечина повлекувањето е допир, не лизгање. */
const SWIPE_THRESHOLD = 45;

/*
  Го следи системското „помалку движење“, и реагира ако читателот го смени
  додека страницата е отворена.

  Follows the system "reduce motion" setting, and reacts if the reader flips it
  while the page is open.
*/
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const matchReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia(REDUCED_MOTION_QUERY)
    : null;

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => matchReducedMotion()?.matches || false
  );

  useEffect(() => {
    const media = matchReducedMotion();

    if (!media) {
      return undefined;
    }

    const handleChange = (event) => setReduced(event.matches);

    // Safari before 14 only has the deprecated listener API.
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);

      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);

    return () => media.removeListener(handleChange);
  }, []);

  return reduced;
};

/*
  Листата на статии — истата за Новости и за Еду.

  The article listing, shared by Новости and Еду. The defaults below are the
  Новости page exactly as it was, so `<ArticleListing />` on its own still
  renders it; Еду passes its own articles, base path and wording. One component
  means the two pages cannot drift apart in looks.
*/
const ArticleListing = ({
  articles = news,
  basePath = "/novosti",
  title = "Новости",
  subtitle = "Вести, рецензии и совети од пазарот на телевизори во Македонија",
  emptyTitle = "Сè уште нема статии",
  emptyText = "Наскоро ќе објавиме нови статии.",
}) => {
  // Исто правило за наслов/опис/canonical како секаде, за да Google и
  // споделувањето ја гледаат оваа листа исто како секоја друга страница.
  usePageMeta({
    title: `${title} | Display.mk`,
    description: subtitle,
    path: basePath,
  });

  const [shownCount, setShownCount] = useState(PAGE_SIZE);

  const sorted = useMemo(() => sortByNewest(articles), [articles]);

  /*
    Лизгачот ги зема петте најнови статии. Знамето `featured` останува во
    податоците, но веќе не одлучува што стои горе.

    The slider takes the five newest articles. The `featured` flag stays in the
    data, it just no longer decides what sits at the top.
  */
  const slides = useMemo(() => sorted.slice(0, SLIDER_SIZE), [sorted]);

  /*
    Решетката ги покажува сите статии, и оние во лизгачот. Кој не сака да чека
    лизгачот да се заврти, сепак ги наоѓа долу.

    The grid lists every article, the slider ones included. Someone who does not
    want to wait for the slider to come round still finds them below.
  */
  const visible = useMemo(
    () => sorted.slice(0, shownCount),
    [sorted, shownCount]
  );

  const [index, setIndex] = useState(0);

  const [paused, setPaused] = useState(false);

  const reducedMotion = useReducedMotion();

  const touchStartX = useRef(null);

  const canSlide = slides.length > 1;

  const autoplay = canSlide && !reducedMotion && !paused;

  const goTo = useCallback(
    (next) => {
      const count = slides.length;

      if (count === 0) {
        return;
      }

      // Негативен индекс завршува на последната статија.
      setIndex(((next % count) + count) % count);
    },
    [slides.length]
  );

  // Ако бројот на статии се смени, индексот да не остане надвор од опсегот.
  useEffect(() => {
    setIndex((current) => (current < slides.length ? current : 0));
  }, [slides.length]);

  /*
    Таймерот зависи и од `index`, така што клик на стрелка или точка го враќа
    на нула — читателот добива цели шест секунди на новиот слајд.

    The timer depends on `index` too, so clicking an arrow or a dot restarts
    it: the reader gets the full six seconds on the slide they picked.
  */
  useEffect(() => {
    if (!autoplay) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => window.clearTimeout(timer);
  }, [autoplay, index, slides.length]);

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) {
      return;
    }

    const delta = event.changedTouches[0].clientX - touchStartX.current;

    touchStartX.current = null;

    if (!canSlide || Math.abs(delta) < SWIPE_THRESHOLD) {
      return;
    }

    goTo(delta < 0 ? index + 1 : index - 1);
  };

  return (
    <PageCont>
      <Navigation />

      <Header>
        <Title>{title}</Title>

        <Subtitle>{subtitle}</Subtitle>
      </Header>

      {slides.length > 0 && (
        <SliderSection>
          <SliderFrame
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            aria-roledescription={canSlide ? "карусел" : undefined}
            aria-label={canSlide ? "Најнови статии" : undefined}
          >
            <SliderViewport
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <SliderTrack $offset={-index * 100} $animate={!reducedMotion}>
                {slides.map((post, position) => {
                  const hidden = canSlide && position !== index;

                  return (
                    <Slide
                      key={`slide-${post.id}`}
                      role={canSlide ? "group" : undefined}
                      aria-roledescription={canSlide ? "статија" : undefined}
                      aria-label={
                        canSlide
                          ? `Статија ${position + 1} од ${slides.length}`
                          : undefined
                      }
                      aria-hidden={hidden || undefined}
                    >
                      <FeaturedCard
                        to={`${basePath}/${post.slug}`}
                        tabIndex={hidden ? -1 : undefined}
                      >
                        <FeaturedImage
                          src={post.image}
                          candidates={post.imageCandidates}
                          alt={post.imageCaption || post.title}
                        />

                        <FeaturedBody>
                          <CategoryBadge $category={post.category}>
                            {post.category}
                          </CategoryBadge>

                          <FeaturedTitle>{post.title}</FeaturedTitle>

                          <FeaturedExcerpt>{post.excerpt}</FeaturedExcerpt>

                          <CardMeta as="div">
                            <time dateTime={post.date}>
                              {formatMkDate(post.date)}
                            </time>

                            <MetaDot aria-hidden="true">•</MetaDot>

                            <span>{formatReadTime(post.readTime)}</span>
                          </CardMeta>
                        </FeaturedBody>
                      </FeaturedCard>
                    </Slide>
                  );
                })}
              </SliderTrack>
            </SliderViewport>

            {canSlide && (
              <>
                <Arrow
                  type="button"
                  $side="left"
                  aria-label="Претходна статија"
                  onClick={() => goTo(index - 1)}
                >
                  <span aria-hidden="true">‹</span>
                </Arrow>

                <Arrow
                  type="button"
                  $side="right"
                  aria-label="Следна статија"
                  onClick={() => goTo(index + 1)}
                >
                  <span aria-hidden="true">›</span>
                </Arrow>
              </>
            )}
          </SliderFrame>

          {canSlide && (
            <Dots>
              {slides.map((post, position) => (
                <Dot
                  key={`dot-${post.id}`}
                  type="button"
                  $active={position === index}
                  aria-label={`Статија ${position + 1} од ${slides.length}`}
                  aria-current={position === index}
                  onClick={() => goTo(position)}
                />
              ))}
            </Dots>
          )}
        </SliderSection>
      )}

      <GridSection>
        {sorted.length === 0 ? (
          <EmptyState>
            <EmptyTitle>{emptyTitle}</EmptyTitle>

            <EmptyText>{emptyText}</EmptyText>
          </EmptyState>
        ) : (
          <>
            <Grid>
              {visible.map((post) => (
                <Card key={`grid-${post.id}`}>
                  <CardLink to={`${basePath}/${post.slug}`}>
                    <CardImage
                      src={post.image}
                      candidates={post.imageCandidates}
                      alt={post.imageCaption || post.title}
                    />

                    <CardBody>
                      <CategoryBadge $category={post.category}>
                        {post.category}
                      </CategoryBadge>

                      <CardTitle>{post.title}</CardTitle>

                      <CardExcerpt>{post.excerpt}</CardExcerpt>

                      <CardMeta>
                        <time dateTime={post.date}>
                          {formatMkDate(post.date)}
                        </time>

                        <MetaDot aria-hidden="true">•</MetaDot>

                        <span>{formatReadTime(post.readTime)}</span>
                      </CardMeta>
                    </CardBody>
                  </CardLink>
                </Card>
              ))}
            </Grid>

            {sorted.length > visible.length && (
              <ShowMoreRow>
                <ShowMoreButton
                  type="button"
                  onClick={() => setShownCount((count) => count + PAGE_SIZE)}
                >
                  Прикажи повеќе
                </ShowMoreButton>
              </ShowMoreRow>
            )}
          </>
        )}
      </GridSection>
    </PageCont>
  );
};

export default ArticleListing;
