import React, { useContext } from "react";
import styled from "styled-components";

import Navigation from "./Navigation";
import Banner from "./Banner";
import SubNavigation from "./SubNavigation";
import TileCont from "./TileCont";
import QuickCategories from "./QuickCategories";
import CompareBar from "./CompareBar";
import { Context } from "./Context";

const HomeCont = styled.div`
  min-height: 100vh;

  background-color: #f7f7f9;
`;

const ContentHeader = styled.div`
  width: 100%;
  max-width: 1200px;

  margin: 0 auto;

  padding: 38px 20px 5px;

  box-sizing: border-box;

  display: flex;
  align-items: flex-end;
  justify-content: space-between;

  gap: 30px;

  @media (max-width: 600px) {
    align-items: flex-start;
    flex-direction: column;

    padding-top: 30px;
  }
`;

const TitleCont = styled.div`
  display: flex;
  flex-direction: column;

  gap: 6px;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;

  gap: 12px;
`;

const Title = styled.h1`
  margin: 0;

  color: #242582;

  font-size: 28px;

  font-weight: 800;

  line-height: 1.2;
`;

const Count = styled.span`
  display: inline-flex;

  align-items: center;
  justify-content: center;

  min-width: 28px;
  height: 28px;

  padding: 0 8px;

  box-sizing: border-box;

  border-radius: 7px;

  background: #eeeaf2;

  color: #553d67;

  font-size: 12px;

  font-weight: 800;
`;

const Subtitle = styled.p`
  margin: 0;

  color: #888;

  font-size: 14px;

  line-height: 1.5;
`;

const SortBox = styled.div`
  display: flex;

  align-items: center;

  gap: 9px;

  flex-shrink: 0;

  @media (max-width: 600px) {
    width: 100%;
  }
`;

const SortLabel = styled.span`
  color: #888;

  font-size: 12px;

  font-weight: 600;

  white-space: nowrap;
`;

const SortSelect = styled.select`
  height: 38px;

  padding: 0 32px 0 12px;

  border: 1px solid #dedee5;

  border-radius: 8px;

  outline: none;

  background: white;

  color: #444;

  cursor: pointer;

  font-size: 12px;

  font-weight: 600;

  @media (max-width: 600px) {
    flex: 1;
  }
`;

const MoreCont = styled.div`
  display: flex;

  justify-content: center;

  padding: 0 20px 40px;
`;

const MoreButton = styled.button`
  border: 1px solid #242582;

  background: white;

  color: #242582;

  padding: 11px 24px;

  border-radius: 8px;

  cursor: pointer;

  font-size: 14px;

  font-weight: 700;

  transition: 0.2s;

  &:hover {
    background: #242582;

    color: white;
  }
`;

const Home = () => {
  const { list, setItemsPerPage, itemsPerPage, sortBy, setSortBy, hasMore } =
    useContext(Context);

  return (
    <HomeCont>
      <Navigation />

      <Banner />

      <SubNavigation />

      <ContentHeader>
        <TitleCont>
          <TitleRow>
            <Title>Телевизори</Title>

            <Count>{list.length}</Count>
          </TitleRow>

          <Subtitle>Пронајди го моделот што најмногу ти одговара</Subtitle>
        </TitleCont>

        <SortBox>
          <SortLabel>Сортирај:</SortLabel>

          <SortSelect
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Најнови</option>
            <option value="oldest">Најстари</option>
            <option value="size-small">Најмали</option>
            <option value="size-large">Најголеми</option>
          </SortSelect>
        </SortBox>
      </ContentHeader>
      <QuickCategories />
      <TileCont />

      {hasMore && (
        <MoreCont>
          <MoreButton
            onClick={() => {
              setItemsPerPage(itemsPerPage + 6);
            }}
          >
            Прикажи повеќе
          </MoreButton>
        </MoreCont>
      )}

      <CompareBar />
    </HomeCont>
  );
};

export default Home;
