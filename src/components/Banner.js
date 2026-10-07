import React, { useContext, useMemo } from "react";
import styled from "styled-components";
import { Context } from "./Context";

/*
  Тенка лента наместо голем хедер.

  Насловот на страницата („Телевизори 514") стои веднаш подолу, па баннерот
  намерно не ја повторува истата порака и не зазема половина екран — целта е
  посетителот да стигне до телевизорите без да скрола.
*/

const Band = styled.section`
  width: 100%;

  background: #242582;

  position: relative;

  overflow: hidden;
`;

const Inner = styled.div`
  width: 100%;
  max-width: 1200px;

  /* Висината е сметана според сликата: 400px широк телевизор е 376px
     висок (640x602), па лентата мора да е барем 416px за да не се сече. */
  min-height: 416px;

  margin: 0 auto;

  padding: 48px 20px;

  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  justify-content: center;

  position: relative;
  z-index: 2;

  @media (max-width: 860px) {
    min-height: 340px;
  }

  @media (max-width: 640px) {
    min-height: 190px;

    padding: 34px 20px;
  }
`;

const Title = styled.p`
  margin: 0;

  max-width: 560px;

  color: #ffffff;

  font-size: 34px;

  line-height: 1.18;

  font-weight: 700;

  letter-spacing: -0.4px;

  @media (max-width: 900px) {
    font-size: 27px;

    max-width: 380px;
  }

  @media (max-width: 700px) {
    font-size: 23px;

    max-width: none;
  }
`;

const Stats = styled.div`
  margin-top: 16px;

  display: flex;

  align-items: center;

  flex-wrap: wrap;

  gap: 8px;

  color: rgba(255, 255, 255, 0.62);

  font-size: 13px;

  font-weight: 600;
`;

const Dot = styled.span`
  opacity: 0.45;
`;

/*
  Телевизорот излегува под долниот раб на лентата — затоа Band има
  overflow: hidden. Сликата е исечена со мека ивица, па се слева во #242582.
*/
const Tv = styled.img`
  position: absolute;

  /* Се држи до десниот раб на содржината (1200px колоната), а не до
     работ на прозорецот — инаку на широк екран бега далеку од текстот. */
  right: 20px;

  /* bottom > 0: целиот телевизор е видлив, ништо не се сече. */
  bottom: 20px;

  width: 400px;

  z-index: 1;

  pointer-events: none;

  user-select: none;

  @media (max-width: 1100px) {
    width: 360px;
  }

  @media (max-width: 860px) {
    opacity: 0.45;

    right: -20px;

    width: 300px;
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const BannerComponent = () => {
  const { allTvs } = useContext(Context);

  const stats = useMemo(() => {
    const tvs = allTvs || [];

    const brands = new Set();
    const stores = new Set();

    for (const tv of tvs) {
      if (tv.brand) {
        brands.add(tv.brand);
      }

      for (const store of Object.keys(tv.stores || {})) {
        stores.add(store);
      }
    }

    return {
      models: tvs.length,
      brands: brands.size,
      stores: stores.size,
    };
  }, [allTvs]);

  return (
    <Band>
      <Inner>
        <Title>Пронајди го телевизорот што е совршен за тебе</Title>

        <Stats>
          <span>{stats.models} модели</span>
          <Dot>·</Dot>
          <span>{stats.brands} бренд</span>
          <Dot>·</Dot>
          <span>{stats.stores} трговци</span>
        </Stats>
        <Tv
          src={`${process.env.PUBLIC_URL}/images/bannerTv.webp`}
          alt=""
          aria-hidden="true"
          loading="eager"
          width="400"
        />
      </Inner>
    </Band>
  );
};

export default BannerComponent;
