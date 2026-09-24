import React, { useContext } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";

import Navigation from "./Navigation";
import { Context } from "./Context";
import InfoTooltip from "./InfoToolTip";

const Page = styled.div`
  min-height: 100vh;
  background-color: #f7f7f9;
`;

const Container = styled.div`
  width: 100%;
  max-width: 1200px;

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

const Card = styled.div`
  background: white;

  border: 1px solid #e3e3e3;
  border-radius: 16px;

  padding: 30px;

  box-sizing: border-box;

  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.04);
`;

const Top = styled.div`
  display: grid;

  grid-template-columns: 1.1fr 0.9fr;

  gap: 45px;

  align-items: center;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 25px;
  }
`;

const ImageCont = styled.div`
  width: 100%;
  height: 370px;

  display: flex;
  align-items: center;
  justify-content: center;

  background-color: #fafafa;

  border-radius: 12px;

  overflow: hidden;
`;

const TvImage = styled.img`
  width: 95%;
  height: 320px;

  object-fit: contain;
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
`;

const Brand = styled.div`
  font-size: 13px;

  color: #888;

  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 1px;

  margin-bottom: 7px;
`;

const Model = styled.h1`
  margin: 0;

  color: #242582;

  font-size: 36px;

  font-weight: 800;

  line-height: 1.15;

  @media (max-width: 600px) {
    font-size: 29px;
  }
`;

const Technology = styled.div`
  align-self: flex-start;

  margin-top: 15px;

  padding: 7px 14px;

  border-radius: 20px;

  background-color: #eeeaf2;

  color: #553d67;

  font-size: 13px;

  font-weight: 700;
`;

const QuickSpecs = styled.div`
  display: flex;

  flex-wrap: wrap;

  gap: 10px;

  margin-top: 20px;
`;

const QuickSpec = styled.div`
  padding: 8px 13px;

  background-color: #f4f4f6;

  border: 1px solid #e7e7ea;

  border-radius: 8px;

  color: #444;

  font-size: 13px;

  font-weight: 700;
`;

const CompareButton = styled.button`
  margin-top: 22px;

  align-self: flex-start;

  border: none;

  border-radius: 9px;

  padding: 11px 18px;

  background-color: #242582;

  color: white;

  font-size: 14px;

  font-weight: 700;

  cursor: pointer;

  transition: 0.2s;

  &:hover {
    background-color: #1c1d68;

    transform: translateY(-1px);
  }
`;

const Section = styled.div`
  margin-top: 30px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 15px;

  color: #242582;

  font-size: 21px;

  font-weight: 800;
`;

const Specifications = styled.div`
  display: grid;

  grid-template-columns: repeat(2, 1fr);

  gap: 12px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Spec = styled.div`
  background-color: #f7f7f7;

  border-radius: 10px;

  padding: 14px;

  display: flex;
  flex-direction: column;

  gap: 4px;
`;

const SpecLabel = styled.span`
  font-size: 12px;

  color: #888;

  font-weight: 600;

  display: flex;
  align-items: center;
`;

const SpecValue = styled.span`
  font-size: 16px;

  color: #333;

  font-weight: 700;
`;

const Divider = styled.div`
  height: 1px;

  background-color: #e8e8e8;

  margin: 35px 0;
`;

const Description = styled.p`
  margin: 0;

  color: #666;

  font-size: 15px;

  line-height: 1.7;
`;

const Empty = styled.div`
  background-color: white;

  border: 1px solid #e3e3e3;

  border-radius: 16px;

  padding: 30px;

  color: #666;

  text-align: center;
`;

const TvDetails = () => {
  const { brand, model } = useParams();

  const { allTvs, compareList, addToCompare, removeFromCompare } =
    useContext(Context);

  const navigate = useNavigate();

  const tv = allTvs.find(
    (item) =>
      item.brand.toLowerCase() === brand.toLowerCase() &&
      item.model.toLowerCase() === model.toLowerCase(),
  );

  if (!tv) {
    return (
      <Page>
        <Navigation />

        <Container>
          <Empty>
            <SectionTitle>Телевизорот не е пронајден</SectionTitle>

            <Description>
              Телевизорот што го барате не постои во листата.
            </Description>

            <BackButton onClick={() => navigate("/")}>
              ← Назад кон телевизори
            </BackButton>
          </Empty>
        </Container>
      </Page>
    );
  }

  const isCompared = compareList.some((item) => item.id === tv.id);

  const handleCompare = () => {
    if (isCompared) {
      removeFromCompare(tv.id);
    } else {
      addToCompare(tv);
    }
  };

  return (
    <Page>
      <Navigation />

      <Container>
        <BackButton onClick={() => navigate("/")}>
          ← Назад кон телевизори
        </BackButton>

        <Card>
          <Top>
            <ImageCont>
              <TvImage
                src="https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=700&q=80"
                alt={tv.model}
              />
            </ImageCont>

            <Info>
              <Brand>{tv.brand}</Brand>

              <Model>{tv.model}</Model>

              <Technology>{tv.technology}</Technology>

              <QuickSpecs>
                <QuickSpec>{tv.size}"</QuickSpec>

                <QuickSpec>{tv.resolution}</QuickSpec>

                <QuickSpec>{tv.refreshRate} Hz</QuickSpec>
              </QuickSpecs>

              <CompareButton onClick={handleCompare}>
                {isCompared ? "✓ Додадено во споредба" : "+ Спореди"}
              </CompareButton>
            </Info>
          </Top>

          <Divider />

          <Section>
            <SectionTitle>Основни спецификации</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>Големина</SpecLabel>
                <SpecValue>{tv.size}"</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Резолуција</SpecLabel>
                <SpecValue>{tv.resolution}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Технологија</SpecLabel>
                <SpecValue>{tv.technology}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Освежување</SpecLabel>
                <SpecValue>{tv.refreshRate} Hz</SpecValue>
              </Spec>
            </Specifications>
          </Section>

          <Section>
            <SectionTitle>Паметни функции и конекции</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>Година</SpecLabel>
                <SpecValue>{tv.year}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Оперативен систем</SpecLabel>
                <SpecValue>{tv.os}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>HDMI</SpecLabel>
                <SpecValue>{tv.hdmi}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>USB</SpecLabel>
                <SpecValue>{tv.usb}</SpecValue>
              </Spec>
            </Specifications>
          </Section>

          <Section>
            <SectionTitle>Слика</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>Процесор на слика</SpecLabel>
                <SpecValue>{tv.pictureProcessor}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>
                  HDR формати
                  <InfoTooltip text="HDR (High Dynamic Range) овозможува поголем опсег помеѓу најтемните и најсветлите делови на сликата, со подобар контраст и повеќе детали." />
                </SpecLabel>

                <SpecValue>{tv.hdrFormats}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Обработка на слика</SpecLabel>
                <SpecValue>{tv.brightness}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>
                  Dolby Vision
                  <InfoTooltip text="Напреден HDR формат кој користи динамични метаподатоци за оптимизирање на сликата сцена по сцена." />
                </SpecLabel>

                <SpecValue>{tv.dolbyVision ? "Да" : "Не"}</SpecValue>
              </Spec>
            </Specifications>
          </Section>

          <Section>
            <SectionTitle>Gaming</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>
                  VRR
                  <InfoTooltip text="Variable Refresh Rate. Ја усогласува стапката на освежување на телевизорот со бројот на слики во секунда од играта, со што се намалува кинењето на сликата." />
                </SpecLabel>

                <SpecValue>{tv.vrr ? "Да" : "Не"}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>
                  ALLM
                  <InfoTooltip text="Auto Low Latency Mode. Автоматски го активира режимот со мала латентност кога телевизорот препознава компатибилен gaming уред." />
                </SpecLabel>

                <SpecValue>{tv.allm ? "Да" : "Не"}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>
                  AMD FreeSync
                  <InfoTooltip text="Технологија од AMD која ја синхронизира стапката на освежување на телевизорот со графичкиот процесор за помазно играње." />
                </SpecLabel>

                <SpecValue>
                  {tv.freeSync === true ? "Да" : tv.freeSync || "Не"}
                </SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>
                  NVIDIA G-Sync
                  <InfoTooltip text="Технологија од NVIDIA која ја синхронизира графичката картичка со екранот за помазна слика и помалку кинење." />
                </SpecLabel>

                <SpecValue>{tv.gSync ? "Да" : "Не"}</SpecValue>
              </Spec>
            </Specifications>
          </Section>

          <Section>
            <SectionTitle>Звук</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>Аудио моќност</SpecLabel>
                <SpecValue>{tv.audioPower}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Аудио систем</SpecLabel>
                <SpecValue>{tv.audioChannels}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Dolby Atmos</SpecLabel>
                <SpecValue>{tv.dolbyAtmos ? "Да" : "Не"}</SpecValue>
              </Spec>
            </Specifications>
          </Section>

          <Divider />

          <Section>
            <SectionTitle>За телевизорот</SectionTitle>

            <Description>
              {tv.brand} {tv.model} е телевизор со {tv.technology} технологија,
              големина од {tv.size} инчи и {tv.resolution} резолуција. Панелот
              поддржува стапка на освежување до {tv.refreshRate} Hz, што
              овозможува мазна слика и подобро искуство при гледање филмови,
              спорт и играње игри.
            </Description>
          </Section>
        </Card>
      </Container>
    </Page>
  );
};

export default TvDetails;
