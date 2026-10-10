import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";

import Navigation from "./Navigation";
import { Context } from "./Context";
import InfoTooltip from "./InfoToolTip";
import { formatSpec } from "../lib/specValue";
import { usePageMeta } from "../lib/usePageMeta";

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

const API = process.env.REACT_APP_API_URL || "/api";

const TvDetails = () => {
  const { brand, model } = useParams();

  const { compareList, addToCompare, removeFromCompare } = useContext(Context);

  const navigate = useNavigate();

  /*
    Порано овој телевизор се бараше во целата листа во меморија. Сега се зема
    поединечно од API-то, па страницата не зависи од тоа дали целата база е
    вчитана.
  */
  const [tv, setTv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`${API}/tvs/${encodeURIComponent(brand)}/${encodeURIComponent(model)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setTv(data && !data.error ? data : null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setTv(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [brand, model]);

  /*
    Насловот и описот се градат од самиот телевизор. Со 530 вакви страници,
    ова е најголемата разлика за пребарување — дотогаш сите имаа ист наслов.
  */
  usePageMeta(
    tv
      ? {
          title: `${tv.brand} ${tv.model} — ${tv.size}" ${tv.technology || ""} | Display.mk`.replace(
            /\s+/g,
            " "
          ),
          description:
            `${tv.brand} ${tv.model}: ${tv.size} инчи, ${tv.technology || "телевизор"}` +
            `${tv.resolution ? ", " + tv.resolution : ""}` +
            `${tv.refreshRate ? ", " + tv.refreshRate + "Hz" : ""}` +
            `. Спецификации и каде е достапен во Македонија.`,
          path: `/tv/${encodeURIComponent(brand)}/${encodeURIComponent(model)}`,
        }
      : { title: "Display.mk" }
  );

  if (loading) {
    return (
      <Page>
        <Navigation />

        <Container>
          <Empty>
            <Description>Се вчитува...</Description>
          </Empty>
        </Container>
      </Page>
    );
  }

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
  src={tv.image}
  alt={`${tv.brand} ${tv.model}`}
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

         <Section>
  <SectionTitle>Каде го има?</SectionTitle>

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
  ? `https://www.neptun.mk/categories/${store.url.replace("https://www.neptun.mk/", "")}`
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
    ? "Достапно"
    : available === null
      ? "Провери залиха"
      : "Нема на залиха"}
</StoreStatus>

          {storeUrl && (
            <StoreButton
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Отвори
            </StoreButton>
          )}
        </StoreRow>
      );
    })}
  </StoresList>
</Section>

<Divider />

<Section>
  <SectionTitle>Основни спецификации</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>Големина</SpecLabel>
                <SpecValue>{tv.size ? `${tv.size}"` : formatSpec(null)}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Резолуција</SpecLabel>
                <SpecValue>{formatSpec(tv.resolution)}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Технологија</SpecLabel>
                <SpecValue>{formatSpec(tv.technology)}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Освежување</SpecLabel>
                <SpecValue>{formatSpec(tv.refreshRate, "Hz")}</SpecValue>
              </Spec>
            </Specifications>
          </Section>

          <Section>
            <SectionTitle>Паметни функции и конекции</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>Година</SpecLabel>
                <SpecValue>{formatSpec(tv.year)}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Оперативен систем</SpecLabel>
                <SpecValue>{formatSpec(tv.os)}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>HDMI</SpecLabel>
                <SpecValue>{formatSpec(tv.hdmi)}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>USB</SpecLabel>
                <SpecValue>{formatSpec(tv.usb)}</SpecValue>
              </Spec>
            </Specifications>
          </Section>

          <Section>
            <SectionTitle>Слика</SectionTitle>

            <Specifications>
              <Spec>
                <SpecLabel>Процесор на слика</SpecLabel>
                <SpecValue>{formatSpec(tv.pictureProcessor)}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>
                  HDR формати
                  <InfoTooltip text="HDR (High Dynamic Range) овозможува поголем опсег помеѓу најтемните и најсветлите делови на сликата, со подобар контраст и повеќе детали." />
                </SpecLabel>

                <SpecValue>{formatSpec(tv.hdrFormats)}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Осветленост</SpecLabel>
                <SpecValue>{formatSpec(tv.brightness)}</SpecValue>
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
                <SpecValue>{formatSpec(tv.audioPower, "W")}</SpecValue>
              </Spec>

              <Spec>
                <SpecLabel>Аудио систем</SpecLabel>
                <SpecValue>{formatSpec(tv.audioChannels)}</SpecValue>
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
