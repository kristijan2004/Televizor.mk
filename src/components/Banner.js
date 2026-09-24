import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const Banner = styled.section`
  width: 100%;
  padding: 45px 20px;

  box-sizing: border-box;

  background: linear-gradient(135deg, #242582 0%, #302f91 55%, #553d67 100%);

  overflow: hidden;
`;

const BannerInner = styled.div`
  width: 100%;
  max-width: 1200px;

  min-height: 280px;

  margin: 0 auto;

  padding: 40px 50px;

  box-sizing: border-box;

  display: flex;
  align-items: center;
  justify-content: space-between;

  position: relative;

  border-radius: 20px;

  background: rgba(255, 255, 255, 0.08);

  border: 1px solid rgba(255, 255, 255, 0.12);

  overflow: hidden;

  @media (max-width: 700px) {
    padding: 35px 25px;
  }
`;

const Content = styled.div`
  position: relative;
  z-index: 2;

  max-width: 600px;
`;

const SmallTitle = styled.div`
  margin-bottom: 10px;

  color: rgba(255, 255, 255, 0.7);

  font-size: 12px;
  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 1.5px;
`;

const Title = styled.h1`
  margin: 0;

  color: white;

  font-size: 38px;

  line-height: 1.12;

  font-weight: 800;

  letter-spacing: -0.5px;

  @media (max-width: 700px) {
    font-size: 30px;
  }
`;

const Description = styled.p`
  margin: 16px 0 25px;

  max-width: 500px;

  color: rgba(255, 255, 255, 0.75);

  font-size: 15px;

  line-height: 1.6;
`;

const Button = styled.button`
  border: none;

  padding: 12px 20px;

  border-radius: 9px;

  background: white;

  color: #242582;

  cursor: pointer;

  font-size: 14px;

  font-weight: 700;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);

    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }
`;

const TvWrapper = styled.div`
  position: absolute;

  right: 30px;

  bottom: -25px;

  width: 420px;

  z-index: 1;

  @media (max-width: 900px) {
    opacity: 0.3;
    right: -80px;
  }

  @media (max-width: 600px) {
    display: none;
  }
`;

const TvImage = styled.img`
  width: 100%;

  display: block;

  object-fit: contain;

  filter: drop-shadow(0 20px 25px rgba(0, 0, 0, 0.3));
`;

const BannerComponent = () => {
  const navigate = useNavigate();

  return (
    <Banner>
      <BannerInner>
        <Content>
          <SmallTitle>Телевизор.mk</SmallTitle>

          <Title>
            Пронајди го телевизорот
            <br />
            што е совршен за тебе
          </Title>

          <Description>
            Разгледај модели, спореди спецификации и пронајди телевизор според
            твоите потреби.
          </Description>
        </Content>

        <TvWrapper>
          <TvImage
            src="https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=90"
            alt="Телевизор"
          />
        </TvWrapper>
      </BannerInner>
    </Banner>
  );
};

export default BannerComponent;
