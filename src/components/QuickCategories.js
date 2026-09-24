import React, { useContext } from "react";
import styled from "styled-components";
import { Context } from "./Context";

const Cont = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 25px 20px 0;
  box-sizing: border-box;
`;

const Label = styled.div`
  margin-bottom: 12px;
  color: #888;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
`;

const Categories = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Category = styled.button`
  height: 40px;
  padding: 0 18px;
  border: 1px solid ${(props) => (props.active ? "#242582" : "#dedee5")};
  border-radius: 9px;
  background: ${(props) => (props.active ? "#242582" : "white")};
  color: ${(props) => (props.active ? "white" : "#555")};
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: 0.2s;

  &:hover {
    border-color: #242582;
    color: ${(props) => (props.active ? "white" : "#242582")};
  }
`;

const QuickCategories = () => {
  const {
    technologyFilter,
    setTechnologyFilter,
    refreshRateFilter,
    setRefreshRateFilter,
  } = useContext(Context);

  const handleTechnology = (technology) => {
    setRefreshRateFilter("");

    if (technologyFilter === technology) {
      setTechnologyFilter("");
    } else {
      setTechnologyFilter(technology);
    }
  };

  const handleRefreshRate = () => {
    setTechnologyFilter("");

    if (refreshRateFilter === 120) {
      setRefreshRateFilter("");
    } else {
      setRefreshRateFilter(120);
    }
  };

  return (
    <Cont>
      <Label>Популарни категории</Label>

      <Categories>
        <Category
          active={technologyFilter === "OLED"}
          onClick={() => handleTechnology("OLED")}
        >
          OLED
        </Category>

        <Category
          active={technologyFilter === "Mini LED"}
          onClick={() => handleTechnology("Mini LED")}
        >
          Mini LED
        </Category>

        <Category
          active={technologyFilter === "QLED"}
          onClick={() => handleTechnology("QLED")}
        >
          QLED
        </Category>

        <Category
          active={refreshRateFilter === 120}
          onClick={handleRefreshRate}
        >
          120 Hz+
        </Category>
      </Categories>
    </Cont>
  );
};

export default QuickCategories;
