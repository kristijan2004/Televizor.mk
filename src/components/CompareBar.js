import React, { useContext } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { Context } from "./Context";

const Bar = styled.div`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);

  width: 90%;
  max-width: 1000px;

  background: rgba(36, 37, 130, 0.97);
  backdrop-filter: blur(10px);

  color: white;

  padding: 12px 15px;
  border-radius: 14px;

  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.28);

  display: flex;
  align-items: center;
  gap: 15px;

  z-index: 1000;
  box-sizing: border-box;
`;

const Selected = styled.div`
  flex: 1;

  display: flex;
  gap: 10px;

  min-width: 0;
`;

const Tv = styled.div`
  background: rgba(255, 255, 255, 0.1);

  border: 1px solid rgba(255, 255, 255, 0.12);

  border-radius: 9px;

  padding: 8px 10px;

  flex: 1;
  min-width: 0;

  transition: 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const Brand = styled.div`
  font-size: 10px;
  font-weight: 600;

  text-transform: uppercase;

  opacity: 0.6;

  margin-bottom: 2px;
`;

const Model = styled.div`
  display: flex;
  align-items: center;

  font-size: 13px;
  font-weight: 600;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Remove = styled.button`
  flex-shrink: 0;

  background: rgba(255, 255, 255, 0.1);

  border: none;
  border-radius: 50%;

  width: 20px;
  height: 20px;

  margin-left: 7px;

  display: flex;
  align-items: center;
  justify-content: center;

  color: white;

  cursor: pointer;

  font-size: 14px;
  line-height: 1;

  transition: 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

const CompareButton = styled.button`
  flex-shrink: 0;

  background-color: #99738e;
  color: white;

  border: none;
  border-radius: 8px;

  padding: 11px 18px;

  cursor: pointer;

  font-size: 13px;
  font-weight: 700;

  white-space: nowrap;

  transition: 0.2s;

  &:hover {
    background-color: #a68199;
    transform: translateY(-1px);
  }
`;

const CompareBar = () => {
  const { compareList, removeFromCompare } = useContext(Context);
  const navigate = useNavigate();

  if (compareList.length === 0) {
    return null;
  }

  return (
    <Bar>
      <Selected>
        {compareList.map((tv) => (
          <Tv key={tv.id}>
            <Brand>{tv.brand}</Brand>

            <Model>
              {tv.model}

              <Remove onClick={() => removeFromCompare(tv.id)} title="Отстрани">
                ×
              </Remove>
            </Model>
          </Tv>
        ))}
      </Selected>

      <CompareButton onClick={() => navigate("/compare")}>
        Спореди ({compareList.length})
      </CompareButton>
    </Bar>
  );
};

export default CompareBar;
