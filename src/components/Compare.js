import React, { useContext } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

import Navigation from "./Navigation";
import { Context } from "./Context";

const Page = styled.div`
  min-height: 100vh;
  background-color: #f7f7f9;
`;

const Container = styled.div`
  width: 100%;
  max-width: 1250px;
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

const Title = styled.h1`
  margin: 0 0 25px;
  color: #242582;
  font-size: 30px;
  font-weight: 800;
`;

const Empty = styled.div`
  background: white;
  border: 1px solid #e3e3e3;
  border-radius: 16px;
  padding: 40px 25px;
  text-align: center;
`;

const EmptyTitle = styled.h2`
  margin: 0 0 10px;
  color: #242582;
  font-size: 22px;
`;

const EmptyText = styled.p`
  margin: 0;
  color: #777;
  font-size: 15px;
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  background: white;
  border: 1px solid #e3e3e3;
  border-radius: 16px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.04);
`;

const Table = styled.table`
  width: 100%;
  min-width: 850px;
  border-collapse: collapse;
`;

const HeaderRow = styled.tr`
  border-bottom: 1px solid #e5e5e5;
`;

const HeaderCell = styled.th`
  padding: 25px 20px;
  text-align: center;
  min-width: 210px;
  vertical-align: top;

  &:first-child {
    min-width: 180px;
    text-align: left;
    background-color: #fafafa;
  }
`;

const TvImage = styled.img`
  width: 150px;
  height: 100px;
  object-fit: contain;
  margin-bottom: 10px;
`;

const Brand = styled.div`
  color: #888;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
`;

const Model = styled.div`
  margin-top: 4px;
  color: #242582;
  font-size: 18px;
  font-weight: 800;
`;

const Technology = styled.div`
  display: inline-block;
  margin-top: 8px;
  padding: 5px 10px;
  background-color: #eeeaf2;
  border-radius: 15px;
  color: #553d67;
  font-size: 11px;
  font-weight: 700;
`;

const RemoveButton = styled.button`
  display: block;
  margin: 12px auto 0;
  padding: 7px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  color: #777;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background: #f5eeee;
    color: #c0392b;
    border-color: #e0bebe;
  }
`;

const CategoryRow = styled.tr`
  background-color: #f0eef4;
`;

const CategoryCell = styled.td`
  padding: 13px 20px;
  color: #242582;
  font-size: 14px;
  font-weight: 800;
  text-align: left;
`;

const SpecRow = styled.tr`
  border-bottom: 1px solid #eeeeee;

  &:last-child {
    border-bottom: none;
  }
`;

const LabelCell = styled.td`
  padding: 14px 20px;
  background-color: #fafafa;
  color: #777;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
`;

const ValueCell = styled.td`
  padding: 14px 20px;
  color: #333;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
`;

const Compare = () => {
  const { compareList, removeFromCompare } = useContext(Context);
  const navigate = useNavigate();

  const image =
    "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=500&q=80";

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "Нема податок";
    }

    if (typeof value === "boolean") {
      return value ? "✓ Да" : "— Не";
    }

    return value;
  };

  if (compareList.length === 0) {
    return (
      <Page>
        <Navigation />

        <Container>
          <BackButton onClick={() => navigate("/")}>
            ← Назад кон телевизори
          </BackButton>

          <Empty>
            <EmptyTitle>Нема избрани телевизори</EmptyTitle>

            <EmptyText>
              Додадете телевизори во споредбата за да ги споредите.
            </EmptyText>
          </Empty>
        </Container>
      </Page>
    );
  }

  const rows = [
    {
      category: "Основни спецификации",
      specs: [
        ["Големина", (tv) => `${tv.size}"`],
        ["Резолуција", (tv) => tv.resolution],
        ["Технологија", (tv) => tv.technology],
        ["Освежување", (tv) => `${tv.refreshRate} Hz`],
        ["Година", (tv) => tv.year],
      ],
    },

    {
      category: "Паметни функции и конекции",
      specs: [
        ["Оперативен систем", (tv) => tv.os],
        ["HDMI", (tv) => tv.hdmi],
        ["USB", (tv) => tv.usb],
      ],
    },

    {
      category: "Слика",
      specs: [
        ["Процесор на слика", (tv) => tv.pictureProcessor],
        ["HDR формати", (tv) => tv.hdrFormats],
        ["Обработка на слика", (tv) => tv.brightness],
        ["Dolby Vision", (tv) => tv.dolbyVision],
      ],
    },

    {
      category: "Gaming",
      specs: [
        ["VRR", (tv) => tv.vrr],
        ["ALLM", (tv) => tv.allm],
        ["AMD FreeSync", (tv) => tv.freeSync],
        ["NVIDIA G-Sync", (tv) => tv.gSync],
      ],
    },

    {
      category: "Звук",
      specs: [
        ["Аудио моќност", (tv) => tv.audioPower],
        ["Аудио систем", (tv) => tv.audioChannels],
        ["Dolby Atmos", (tv) => tv.dolbyAtmos],
      ],
    },
  ];

  return (
    <Page>
      <Navigation />

      <Container>
        <BackButton onClick={() => navigate("/")}>
          ← Назад кон телевизори
        </BackButton>

        <Title>Споредба на телевизори</Title>

        <TableWrapper>
          <Table>
            <thead>
              <HeaderRow>
                <HeaderCell>Спецификација</HeaderCell>

                {compareList.map((tv) => (
                  <HeaderCell key={tv.id}>
                    <TvImage src={image} alt={tv.model} />

                    <Brand>{tv.brand}</Brand>

                    <Model>{tv.model}</Model>

                    <Technology>{tv.technology}</Technology>

                    <RemoveButton onClick={() => removeFromCompare(tv.id)}>
                      × Отстрани
                    </RemoveButton>
                  </HeaderCell>
                ))}
              </HeaderRow>
            </thead>

            <tbody>
              {rows.map((section) => (
                <React.Fragment key={section.category}>
                  <CategoryRow>
                    <CategoryCell colSpan={compareList.length + 1}>
                      {section.category}
                    </CategoryCell>
                  </CategoryRow>

                  {section.specs.map(([label, getValue]) => (
                    <SpecRow key={label}>
                      <LabelCell>{label}</LabelCell>

                      {compareList.map((tv) => (
                        <ValueCell key={tv.id}>
                          {formatValue(getValue(tv))}
                        </ValueCell>
                      ))}
                    </SpecRow>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      </Container>
    </Page>
  );
};

export default Compare;
