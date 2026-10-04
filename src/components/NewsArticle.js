import React, { useEffect, useMemo } from "react";
import styled from "styled-components";
import { Link, useParams } from "react-router-dom";

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

const Article = styled.article`
  width: 100%;
  max-width: 1200px;

  margin: 0 auto;

  padding: 34px 20px 10px;

  box-sizing: border-box;
`;

const BackLink = styled(Link)`
  display: block;

  width: fit-content;

  margin-bottom: 22px;

  color: #888;

  font-size: 13px;

  font-weight: 700;

  text-decoration: none;

  &:hover {
    color: #242582;
  }

  &:focus-visible {
    outline: 2px solid #242582;

    outline-offset: 3px;
  }
`;

const Title = styled.h1`
  margin: 14px 0 0;

  /*
    Headline shares the body's reading measure so it never runs wider than the
    text beneath it on large screens.
  */
  max-width: 68ch;

  color: #242582;

  font-size: 34px;

  font-weight: 800;

  line-height: 1.2;

  @media (max-width: 700px) {
    font-size: 26px;
  }
`;

const Meta = styled.div`
  display: flex;
  align-items: center;

  flex-wrap: wrap;

  gap: 8px;

  margin-top: 14px;

  color: #999;

  font-size: 13px;
`;

const MetaDot = styled.span`
  color: #ccc;
`;

const Author = styled.span`
  color: #666;

  font-weight: 700;
`;

const HeroImage = styled(ArticleImage)`
  width: 100%;

  /*
    Shares the reading measure with the headline and the body text, and keeps
    its own proportions: cropping to a fixed banner shape used to blow small
    pictures up and cut the top and bottom off them.
  */
  max-width: 68ch;

  height: auto;

  /* A portrait picture is boxed rather than left to run down the page. */
  max-height: 520px;

  object-fit: contain;
  object-position: center;

  margin-top: 26px;

  display: block;

  background-color: #f0f0f4;

  border: 1px solid #e6e6e6;
  border-radius: 16px;
`;

const Body = styled.div`
  /*
    ~68 characters per line — inside the 65-75 range that keeps long-form text
    comfortable to read.
  */
  max-width: 68ch;

  margin-top: 30px;
`;

const Paragraph = styled.p`
  margin: 0 0 20px;

  color: #444;

  font-size: 16px;

  line-height: 1.75;
`;

const Subheading = styled.h2`
  margin: 32px 0 14px;

  color: #1b1b2f;

  font-size: ${(props) => (props.$level > 2 ? "18px" : "22px")};

  line-height: 1.35;
`;

const Quote = styled.blockquote`
  margin: 0 0 20px;
  padding: 2px 0 2px 18px;

  border-left: 3px solid #242582;

  color: #333;

  font-size: 17px;

  line-height: 1.7;
`;

const BodyList = styled.ul`
  margin: 0 0 20px;
  padding-left: 22px;

  color: #444;

  font-size: 16px;

  line-height: 1.75;

  li {
    margin-bottom: 8px;
  }
`;

const Divider = styled.hr`
  margin: 28px 0;

  border: none;
  border-top: 1px solid #e6e6e6;
`;

const InlineCode = styled.code`
  padding: 1px 5px;

  background-color: #f0f0f4;
  border-radius: 4px;

  font-size: 0.92em;
`;

const InlineLink = styled.a`
  color: #242582;

  text-decoration: underline;
`;

/*
  Inline runs come out of the markdown build step already parsed, so rendering
  is a straight mapping — no markdown parsing happens in the browser.
*/
const renderInline = (content) =>
  content.map((run, index) => {
    let node = run.text;

    if (run.code) {
      node = <InlineCode key={index}>{node}</InlineCode>;
    }

    if (run.bold) {
      node = <strong key={index}>{node}</strong>;
    }

    if (run.italic) {
      node = <em key={index}>{node}</em>;
    }

    if (run.href) {
      const external = /^https?:\/\//.test(run.href);

      return (
        <InlineLink
          key={index}
          href={run.href}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {node}
        </InlineLink>
      );
    }

    return <React.Fragment key={index}>{node}</React.Fragment>;
  });

const renderBlock = (block, index) => {
  switch (block.type) {
    case "heading":
      return (
        <Subheading key={index} as={`h${block.level}`} $level={block.level}>
          {renderInline(block.content)}
        </Subheading>
      );

    case "quote":
      return <Quote key={index}>{renderInline(block.content)}</Quote>;

    case "list":
      return (
        <BodyList key={index} as={block.ordered ? "ol" : "ul"}>
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </BodyList>
      );

    case "divider":
      return <Divider key={index} />;

    default:
      return <Paragraph key={index}>{renderInline(block.content)}</Paragraph>;
  }
};

/* ---------- Related ---------- */

const RelatedSection = styled.section`
  width: 100%;
  max-width: 1200px;

  margin: 0 auto;

  padding: 30px 20px 60px;

  box-sizing: border-box;
`;

const RelatedHeading = styled.h2`
  margin: 0 0 20px;

  color: #242582;

  font-size: 20px;

  font-weight: 800;
`;

const RelatedGrid = styled.div`
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

const RelatedCard = styled.article`
  background: white;

  border: 1px solid #e6e6e6;
  border-radius: 16px;

  overflow: hidden;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    transform: translateY(-5px);

    box-shadow: 0 14px 32px rgba(36, 37, 130, 0.12);

    border-color: #d8d7ed;
  }
`;

const RelatedLink = styled(Link)`
  display: flex;
  flex-direction: column;

  height: 100%;

  text-decoration: none;

  &:focus-visible {
    outline: 2px solid #242582;

    outline-offset: -2px;
  }
`;

const RelatedImage = styled(ArticleImage)`
  width: 100%;
  height: 150px;

  object-fit: cover;

  display: block;
`;

const RelatedBody = styled.div`
  padding: 16px 18px 18px;

  display: flex;
  flex-direction: column;

  gap: 9px;
`;

const RelatedTitle = styled.h3`
  margin: 0;

  color: #242582;

  font-size: 15px;

  font-weight: 800;

  line-height: 1.35;
`;

const RelatedMeta = styled.div`
  color: #999;

  font-size: 12px;
`;

/* ---------- Not found ---------- */

const NotFoundCont = styled.div`
  width: 100%;
  max-width: 1200px;

  margin: 0 auto;

  padding: 60px 20px 80px;

  box-sizing: border-box;
`;

const NotFoundCard = styled.div`
  padding: 50px 45px;

  background: white;

  border: 1px solid #e6e6e6;
  border-radius: 16px;

  text-align: center;
`;

const NotFoundTitle = styled.h1`
  margin: 0;

  color: #242582;

  font-size: 24px;

  font-weight: 800;
`;

const NotFoundText = styled.p`
  margin: 10px 0 24px;

  color: #888;

  font-size: 15px;

  line-height: 1.6;
`;

const BackButton = styled(Link)`
  display: inline-block;

  padding: 11px 24px;

  border: 1px solid #242582;
  border-radius: 8px;

  background: white;

  color: #242582;

  font-size: 14px;

  font-weight: 700;

  text-decoration: none;

  transition: 0.2s;

  &:hover {
    background: #242582;

    color: white;
  }

  &:focus-visible {
    outline: 2px solid #242582;

    outline-offset: 3px;
  }
`;

const NewsArticle = () => {
  const { slug } = useParams();

  const post = useMemo(() => news.find((item) => item.slug === slug), [slug]);

  // Moving between articles should start at the top, not mid-page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const related = useMemo(() => {
    if (!post) {
      return [];
    }

    return sortByNewest(
      news.filter(
        (item) => item.category === post.category && item.id !== post.id
      )
    ).slice(0, 3);
  }, [post]);

  if (!post) {
    return (
      <PageCont>
        <Navigation />

        <NotFoundCont>
          <NotFoundCard>
            <NotFoundTitle>Статијата не е пронајдена</NotFoundTitle>

            <NotFoundText>
              Статијата што ја барате не постои или е отстранета.
            </NotFoundText>

            <BackButton to="/novosti">Назад кон новости</BackButton>
          </NotFoundCard>
        </NotFoundCont>
      </PageCont>
    );
  }

  return (
    <PageCont>
      <Navigation />

      <Article>
        <BackLink to="/novosti">← Назад кон новости</BackLink>

        <CategoryBadge $category={post.category}>{post.category}</CategoryBadge>

        <Title>{post.title}</Title>

        <Meta>
          <Author>{post.author}</Author>

          <MetaDot aria-hidden="true">•</MetaDot>

          <time dateTime={post.date}>{formatMkDate(post.date)}</time>

          <MetaDot aria-hidden="true">•</MetaDot>

          <span>{formatReadTime(post.readTime)}</span>
        </Meta>

        <HeroImage
          src={post.image}
          candidates={post.imageCandidates}
          alt=""
        />

        <Body>
          {post.blocks
            ? post.blocks.map(renderBlock)
            : post.body.map((paragraph, index) => (
                <Paragraph key={index}>{paragraph}</Paragraph>
              ))}
        </Body>
      </Article>

      {related.length > 0 && (
        <RelatedSection>
          <RelatedHeading>Поврзани статии</RelatedHeading>

          <RelatedGrid>
            {related.map((item) => (
              <RelatedCard key={item.id}>
                <RelatedLink to={`/novosti/${item.slug}`}>
                  <RelatedImage
                    src={item.image}
                    candidates={item.imageCandidates}
                    alt=""
                  />

                  <RelatedBody>
                    <CategoryBadge $category={item.category}>
                      {item.category}
                    </CategoryBadge>

                    <RelatedTitle>{item.title}</RelatedTitle>

                    <RelatedMeta>
                      <time dateTime={item.date}>
                        {formatMkDate(item.date)}
                      </time>
                    </RelatedMeta>
                  </RelatedBody>
                </RelatedLink>
              </RelatedCard>
            ))}
          </RelatedGrid>
        </RelatedSection>
      )}
    </PageCont>
  );
};

export default NewsArticle;
