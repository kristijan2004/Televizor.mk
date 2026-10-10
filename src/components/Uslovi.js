import React from "react";
import styled from "styled-components";

import Navigation from "./Navigation";
import { usePageMeta } from "../lib/usePageMeta";

const PageCont = styled.div`
  min-height: 100vh;
  background-color: #f7f7f9;
`;

const Inner = styled.main`
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 50px 20px 80px;
  box-sizing: border-box;
`;

const Card = styled.section`
  padding: 45px 45px 50px;
  box-sizing: border-box;
  background: white;
  border: 1px solid #e8e8ef;
  border-radius: 16px;

  @media (max-width: 700px) {
    padding: 30px 22px 35px;
  }
`;

const Title = styled.h1`
  margin: 0 0 6px;
  color: #242582;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.4px;

  @media (max-width: 700px) {
    font-size: 24px;
  }
`;

const Updated = styled.p`
  margin: 0 0 30px;
  color: #999;
  font-size: 13px;
`;

const Section = styled.h2`
  margin: 32px 0 10px;
  color: #333;
  font-size: 17px;
  font-weight: 700;
`;

const Text = styled.p`
  margin: 0 0 12px;
  color: #555;
  font-size: 15px;
  line-height: 1.65;
`;

const List = styled.ul`
  margin: 0 0 12px;
  padding-left: 20px;
  color: #555;
  font-size: 15px;
  line-height: 1.65;
`;

const Uslovi = () => {
  usePageMeta({
    title: "Услови за користење | Display.mk",
    description:
      "Услови за користење на Display.mk — точност на податоците и правила за автоматско преземање.",
    path: "/uslovi",
  });

  return (
    <PageCont>
    <Navigation />

    <Inner>
      <Card>
        <Title>Услови за користење</Title>
        <Updated>Последна измена: 10 октомври 2026</Updated>

        <Text>
          Display.mk е сајт за споредба на телевизори достапни кај трговци во
          Северна Македонија. Со користење на сајтот се согласуваш со условите
          подолу.
        </Text>

        <Section>Точност на податоците</Section>
        <Text>
          Спецификациите и цените се собираат автоматски од трговците и од
          официјални извори (EPREL, страниците на производителите). Се трудиме
          да бидат точни, но <strong>не гарантираме</strong> дека се целосни
          или ажурни.
        </Text>
        <List>
          <li>
            Цените се менуваат; секогаш провери кај трговецот пред да купиш.
          </li>
          <li>
            Кога некоја спецификација не ни е позната, пишува „Нема податок"
            наместо да погодуваме.
          </li>
          <li>
            Display.mk не продава телевизори и не е посредник во купувањето.
          </li>
        </List>

        <Section>Автоматско собирање од овој сајт</Section>
        <Text>
          Листата телевизори на овој сајт е составена со значителен труд:
          спојување на податоци од повеќе трговци, проверка со официјални
          извори и рачно чистење. Затоа:
        </Text>
        <List>
          <li>
            Не е дозволено автоматско преземање (scraping, ботови, скрипти) на
            содржината или на API-то без писмена согласност.
          </li>
          <li>
            Не е дозволено преземање на базата, во целост или делумно, за
            објавување на друго место.
          </li>
          <li>
            Нормалното користење со прелистувач е, се разбира, слободно.
          </li>
        </List>
        <Text>
          Барањата се ограничени по брзина. Сообраќај што личи на автоматско
          преземање може да биде блокиран.
        </Text>

        <Section>Линкови до трговци</Section>
        <Text>
          Сајтот содржи линкови до страниците на трговците. Немаме контрола врз
          нивната содржина, цени или услови и не одговараме за нив.
        </Text>

        <Section>Промени</Section>
        <Text>
          Условите може да се менуваат. Датумот горе покажува кога се сменети
          последен пат.
        </Text>

        <Section>Контакт</Section>
        <Text>
          За прашања, соработка или дозвола за користење на податоците, пиши ни
          преку страницата за контакт.
        </Text>
      </Card>
      </Inner>
    </PageCont>
  );
};

export default Uslovi;
