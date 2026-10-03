import React from "react";
import styled from "styled-components";

import Navigation from "./Navigation";

const PageCont = styled.div`
  min-height: 100vh;

  background-color: #f7f7f9;
`;

const Inner = styled.main`
  width: 100%;
  max-width: 1200px;

  margin: 0 auto;

  padding: 60px 20px 80px;

  box-sizing: border-box;
`;

const Card = styled.section`
  padding: 50px 45px;

  box-sizing: border-box;

  background: white;

  border: 1px solid #e8e8ef;

  border-radius: 16px;

  @media (max-width: 700px) {
    padding: 35px 25px;
  }
`;

const SmallTitle = styled.div`
  margin-bottom: 10px;

  color: #8585a3;

  font-size: 11px;
  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 1.3px;
`;

const Title = styled.h1`
  margin: 0;

  color: #242582;

  font-size: 28px;

  font-weight: 800;

  line-height: 1.2;
`;

const Text = styled.p`
  margin: 16px 0 0;

  max-width: 520px;

  color: #6b6b85;

  font-size: 15px;

  line-height: 1.6;
`;

const PlaceholderPage = ({ eyebrow, title, text }) => {
  return (
    <PageCont>
      <Navigation />

      <Inner>
        <Card>
          <SmallTitle>{eyebrow}</SmallTitle>

          <Title>{title}</Title>

          <Text>{text}</Text>
        </Card>
      </Inner>
    </PageCont>
  );
};

export default PlaceholderPage;
