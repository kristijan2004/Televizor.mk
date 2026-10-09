import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

import ArticleImage from "./ArticleImage";
import Navigation from "./Navigation";
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

/* ---------- Featured ---------- */

const FeaturedSection = styled(Section)`
  padding-top: 28px;
`;

const FeaturedCard = styled(Link)`
  display: grid;
  grid-template-columns: 1.15fr 1fr;

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

const FeaturedLabel = styled.div`
  color: #888;

  font-size: 11px;

  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 1px;
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

const Novosti = () => {
  const [shownCount, setShownCount] = useState(PAGE_SIZE);

  const sorted = useMemo(() => sortByNewest(news), []);

  // The newest post flagged as featured; falls back to the newest overall.
  const featured = useMemo(
    () => sorted.find((post) => post.featured) || sorted[0],
    [sorted]
  );

  const rest = useMemo(
    () => sorted.filter((post) => post.id !== featured?.id),
    [sorted, featured]
  );

  const visible = useMemo(() => rest.slice(0, shownCount), [rest, shownCount]);

  return (
    <PageCont>
      <Navigation />

      <Header>
        <Title>Новости</Title>

        <Subtitle>
          Вести, рецензии и совети од пазарот на телевизори во Македонија
        </Subtitle>
      </Header>

      {featured && (
        <FeaturedSection>
          <FeaturedCard to={`/novosti/${featured.slug}`}>
            <FeaturedImage
              src={featured.image}
              candidates={featured.imageCandidates}
              alt=""
            />

            <FeaturedBody>
              <FeaturedLabel>Издвоено</FeaturedLabel>

              <CategoryBadge $category={featured.category}>
                {featured.category}
              </CategoryBadge>

              <FeaturedTitle>{featured.title}</FeaturedTitle>

              <FeaturedExcerpt>{featured.excerpt}</FeaturedExcerpt>

              <CardMeta as="div">
                <time dateTime={featured.date}>
                  {formatMkDate(featured.date)}
                </time>

                <MetaDot aria-hidden="true">•</MetaDot>

                <span>{formatReadTime(featured.readTime)}</span>
              </CardMeta>
            </FeaturedBody>
          </FeaturedCard>
        </FeaturedSection>
      )}

      <GridSection>
        {rest.length === 0 ? (
          <EmptyState>
            <EmptyTitle>Сè уште нема други статии</EmptyTitle>

            <EmptyText>Наскоро ќе објавиме нови статии.</EmptyText>
          </EmptyState>
        ) : (
          <>
            <Grid>
              {visible.map((post) => (
                <Card key={post.id}>
                  <CardLink to={`/novosti/${post.slug}`}>
                    <CardImage
                      src={post.image}
                      candidates={post.imageCandidates}
                      alt=""
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

            {rest.length > visible.length && (
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

export default Novosti;
