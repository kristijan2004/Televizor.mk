import React, { useContext } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";

import Navigation from "./Navigation";
import { Context } from "./Context";
import InfoTooltip from "./InfoToolTip";
import { useLanguage } from "../LanguageContext";

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
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  border-radius: 12px;
  overflow: hidden;
`;

const TvImage = styled.img`
  width: 100%;
  height: 360px;
  object-fit: contain;
  display: block;
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

const StoresList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const StoreRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 15px;
  padding: 15px 18px;
  background-color: #f7f7f9;
  border: 1px solid #e7e7ea;
  border-radius: 10px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr auto;
    gap: 8px;
  }
`;

const StoreName = styled.span`
  color: #333;
  font-size: 15px;
  font-weight: 800;
`;

const StorePrice = styled.span`
  color: #242582;
  font-size: 15px;
  font-weight: 800;
`;

const StoreStatus = styled.span`
  color: #2f7d32;
  font-size: 13px;
  font-weight: 700;
`;

const StoreButton = styled.a`
  padding: 8px 12px;
  border-radius: 8px;
  background-color: #242582;
  color: white;
  text-decoration: none;
  font-size: 12px;
  font-weight: 700;

  &:hover {
    background-color: #1c1d68;
  }
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

  const { t, language } = useLanguage();

  const navigate = useNavigate();

  const tv = allTvs.find(
    (item) =>
      item.brand.toLowerCase() === brand.toLowerCase() &&
      item.model.toLowerCase() === model.toLowerCase(),
  );

  const yesText = {
    MK: "Да",
    EN: "Yes",
    SQ: "Po",
  }[language];

  const noText = {
    MK: "Не",
    EN: "No",
    SQ: "Jo",
  }[language];

  const hdrTooltip = {
    MK: "HDR (High Dynamic Range) овозможува поголем опсег помеѓу најтемните и најсветлите делови на сликата, со подобар контраст и повеќе детали.",
    EN: "HDR (High Dynamic Range) provides a wider range between the darkest and brightest parts of the image, with better contrast and more detail.",
    SQ: "HDR (High Dynamic Range) ofron një gamë më të gjerë midis pjesëve më të errëta dhe më të ndritshme të imazhit, me kontrast më të mirë dhe më shumë detaje.",
  }[language];

  const dolbyVisionTooltip = {
    MK: "Напреден HDR формат кој користи динамични метаподатоци за оптимизирање на сликата сцена по сцена.",
    EN: "An advanced HDR format that uses dynamic metadata to optimize the picture scene by scene.",
    SQ: "Format i avancuar HDR që përdor metadata dinamike për të optimizuar imazhin skenë pas skene.",
  }[language];

  const vrrTooltip = {
    MK: "Variable Refresh Rate. Ја усогласува стапката на освежување на телевизорот со бројот на слики во секунда од играта, со што се намалува кинењето на сликата.",
    EN: "Variable Refresh Rate. Synchronizes the TV's refresh rate with the game's frame rate, reducing screen tearing.",
    SQ: "Variable Refresh Rate. Sinkronizon frekuencën e rifreskimit të televizorit me numrin e kornizave për sekondë të lojës, duke reduktuar çarjen e imazhit.",
  }[language];

  const allmTooltip = {
    MK: "Auto Low Latency Mode. Автоматски го активира режимот со мала латентност кога телевизорот препознава компатибилен gaming уред.",
    EN: "Auto Low Latency Mode. Automatically activates low-latency mode when the TV detects a compatible gaming device.",
    SQ: "Auto Low Latency Mode. Aktivizon automatikisht modalitetin me vonesë të ulët kur televizori njeh një pajisje të përputhshme për lojëra.",
  }[language];

  const freeSyncTooltip = {
    MK: "Технологија од AMD која ја синхронизира стапката на освежување на телевизорот со графичкиот процесор за помазно играње.",
    EN: "AMD technology that synchronizes the TV's refresh rate with the graphics processor for smoother gaming.",
    SQ: "Teknologji nga AMD që sinkronizon frekuencën e rifreskimit të televizorit me procesorin grafik për lojëra më të buta.",
  }[language];

  const gSyncTooltip = {
    MK: "Технологија од NVIDIA која ја синхронизира графичката картичка со екранот за помазна слика и помалку кинење.",
    EN: "NVIDIA technology that synchronizes the graphics card with the display for smoother visuals and less screen tearing.",
    SQ: "Teknologji nga NVIDIA që sinkronizon kartën grafike me ekranin për imazh më të butë dhe më pak çarje.",
  }[language];

  if (!tv) {
    return (
      <Page>
        <Navigation />

        <Container>
          <Empty>
            <SectionTitle>{t.tvNotFound}</SectionTitle>

            <Description>{t.tvNotFoundDescription}</Description>

            <BackButton onClick={() => navigate("/")}>
              ← {t.backToTvs}
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
        <BackButton onClick={() => navigate("/")}>← {t.backToTvs}</BackButton>

        <Card>
          <Top>
            <ImageCont>
              <TvImage src={tv.image} alt={`${tv.brand} ${tv.model}`} />
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
                {isCompared ? t.addedToCompare : `+ ${t.compare}`}
              </CompareButton>
            </Info>
          </Top>

          <Section>
            <SectionTitle>{t.whereAvailable}</SectionTitle>

            <StoresList>
              {Object.entries(tv.stores || {}).map(([storeName, store]) => {
                if (!store) return null;

                const price = store.price;
                const available = store.inStock;

                const storeUrl =
                  storeName === "Anhoch" && store.url
                    ? `https://www.anhoch.com/products/${store.url}`
                    : storeName === "Setec" && store.handle
                      ? `https://setec.mk/products/${store.handle}`
                      : storeName === "Neptun" && store.url
                        ? `https://www.neptun.mk/categories/${store.url.replace(
                            "https://www.neptun.mk/",
                            "",
                          )}`
                        : storeName === "DDStore" && store.url
                          ? store.url
                          : null;

                return (
                  <StoreRow key={storeName}>
                    <StoreName>{storeName}</StoreName>

                    <StorePrice>
                      {typeof price === "number"
                        ? `${price.toLocaleString("mk-MK")} ден.`
                        : "—"}
                    </StorePrice>

                    <StoreStatus>
                      {available === true
                        ? t.available
                        : available === null
                          ? t.checkStock
                          : t.outOfStock}
                    </StoreStatus>

                    {storeUrl && (
                      <StoreButton
                        href={storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t.open}
                      </StoreButton>
                    )}
                  </StoreRow>
                );
              })}
            </StoresList>
          </Section>

          <Divider />

          <Section>
            <SectionTitle>{t.basicSpecifications}</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>{t.size}</SpecLabel>
                <SpecValue>{tv.size}"</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>{t.resolution}</SpecLabel>
                <SpecValue>{tv.resolution}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>{t.technology}</SpecLabel>
                <SpecValue>{tv.technology}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>{t.refreshRate}</SpecLabel>
                <SpecValue>{tv.refreshRate} Hz</SpecValue>
              </Spec>
            </Specifications>
          </Section>

          <Section>
            <SectionTitle>{t.smartFunctions}</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>{t.year}</SpecLabel>
                <SpecValue>{tv.year}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>{t.operatingSystem}</SpecLabel>
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
            <SectionTitle>{t.picture}</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>{t.pictureProcessor}</SpecLabel>
                <SpecValue>{tv.pictureProcessor}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>
                  {t.hdrFormats}
                  <InfoTooltip text={hdrTooltip} />
                </SpecLabel>

                <SpecValue>{tv.hdrFormats}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>{t.brightness}</SpecLabel>
                <SpecValue>{tv.brightness}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>
                  Dolby Vision
                  <InfoTooltip text={dolbyVisionTooltip} />
                </SpecLabel>

                <SpecValue>{tv.dolbyVision ? yesText : noText}</SpecValue>
              </Spec>
            </Specifications>
          </Section>

          <Section>
            <SectionTitle>{t.gaming}</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>
                  VRR
                  <InfoTooltip text={vrrTooltip} />
                </SpecLabel>

                <SpecValue>{tv.vrr ? yesText : noText}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>
                  ALLM
                  <InfoTooltip text={allmTooltip} />
                </SpecLabel>

                <SpecValue>{tv.allm ? yesText : noText}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>
                  AMD FreeSync
                  <InfoTooltip text={freeSyncTooltip} />
                </SpecLabel>

                <SpecValue>
                  {tv.freeSync === true ? yesText : tv.freeSync || noText}
                </SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>
                  NVIDIA G-Sync
                  <InfoTooltip text={gSyncTooltip} />
                </SpecLabel>

                <SpecValue>{tv.gSync ? yesText : noText}</SpecValue>
              </Spec>
            </Specifications>
          </Section>

          <Section>
            <SectionTitle>{t.sound}</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>{t.audioPower}</SpecLabel>
                <SpecValue>{tv.audioPower}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>{t.audioSystem}</SpecLabel>
                <SpecValue>{tv.audioChannels}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Dolby Atmos</SpecLabel>
                <SpecValue>{tv.dolbyAtmos ? yesText : noText}</SpecValue>
              </Spec>
            </Specifications>
          </Section>

          <Divider />

          <Section>
            <SectionTitle>{t.aboutTv}</SectionTitle>

            <Description>
              {language === "MK" &&
                `${tv.brand} ${tv.model} е телевизор со ${tv.technology} технологија, големина од ${tv.size} инчи и ${tv.resolution} резолуција. Панелот поддржува стапка на освежување до ${tv.refreshRate} Hz, што овозможува мазна слика и подобро искуство при гледање филмови, спорт и играње игри.`}

              {language === "EN" &&
                `${tv.brand} ${tv.model} is a ${tv.technology} TV with a ${tv.size}-inch display and ${tv.resolution} resolution. The panel supports a refresh rate of up to ${tv.refreshRate} Hz, providing smooth visuals and a better experience when watching movies, sports and playing games.`}

              {language === "SQ" &&
                `${tv.brand} ${tv.model} është një televizor me teknologji ${tv.technology}, madhësi ${tv.size} inç dhe rezolucion ${tv.resolution}. Paneli mbështet frekuencë rifreskimi deri në ${tv.refreshRate} Hz, duke ofruar imazh të butë dhe përvojë më të mirë gjatë shikimit të filmave, sporteve dhe lojërave.`}
            </Description>
          </Section>
        </Card>
      </Container>
    </Page>
  );
};

export default TvDetails;
