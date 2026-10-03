
import React, { useContext } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { Context } from "./Context";

const Cont = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;

  padding: 40px 20px;

  box-sizing: border-box;
`;

const TilesCont = styled.div`
  width: 100%;
  max-width: 1200px;

  display: grid;
  grid-template-columns: repeat(3, 1fr);

  gap: 25px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Tile = styled.div`
  background: white;

  border: 1px solid #e6e6e6;
  border-radius: 16px;

  min-height: 470px;

  padding: 18px;

  box-sizing: border-box;

  display: flex;
  flex-direction: column;

  cursor: pointer;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    transform: translateY(-5px);

    box-shadow: 0 14px 32px rgba(36, 37, 130, 0.12);

    border-color: #d8d7ed;
  }
`;

const ImageCont = styled.div`
  position: relative;

  width: 100%;
  height: 220px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #fafafa;

  border-radius: 12px;

  margin-bottom: 20px;

  overflow: hidden;
`;

const TvImage = styled.img`
  width: 100%;
  height: 200px;

  object-fit: contain;

  display: block;

  transition: transform 0.25s ease;

  ${Tile}:hover & {
    transform: scale(1.03);
  }
`;

const Brand = styled.div`
  font-size: 11px;

  color: #888;

  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 1px;

  margin-bottom: 5px;
`;

const Title = styled.h2`
  font-size: 20px;

  margin: 0;

  color: #242582;

  font-weight: 800;

  line-height: 1.2;
`;

const Technology = styled.div`
  display: inline-flex;

  align-self: flex-start;

  margin-top: 10px;

  padding: 5px 11px;

  border-radius: 20px;

  background-color: #eeeaf2;

  color: #553d67;

  font-size: 11px;

  font-weight: 700;
`;

const Specifications = styled.div`
  display: grid;

  grid-template-columns: repeat(3, 1fr);

  gap: 8px;

  margin-top: 18px;
`;

const Spec = styled.div`
  background-color: #f7f7f9;

  border: 1px solid #eeeeee;

  border-radius: 9px;

  padding: 11px 5px;

  text-align: center;

  color: #444;

  font-size: 13px;

  font-weight: 700;
`;

const GamingInfo = styled.div`
  display: flex;

  align-items: center;

  gap: 8px;

  margin-top: 15px;

  padding-top: 13px;

  border-top: 1px solid #eeeeee;

  color: #666;

  font-size: 12px;

  font-weight: 600;
`;

const GamingItem = styled.span`
  display: inline-flex;

  align-items: center;

  gap: 4px;
`;

const GamingDot = styled.span`
  color: #242582;

  font-size: 13px;
`;

const Price = styled.div`
  margin-top: 16px;

  font-size: 22px;

  font-weight: 800;

  color: #242582;
`;
const Stores = styled.div`
  margin-top: 7px;
  color: #777;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
`;

const Bottom = styled.div`
  margin-top: auto;

  padding-top: 20px;
`;

const CompareButton = styled.button`
  width: 100%;

  border: none;

  padding: 12px;

  border-radius: 9px;

  background-color: #242582;

  color: white;

  cursor: pointer;

  font-size: 14px;

  font-weight: 700;

  transition:
    background-color 0.2s ease,
    transform 0.15s ease;

  &:hover {
    background-color: #1d1e6d;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const TileCont = () => {
  const { list, compareList, addToCompare, removeFromCompare } =
    useContext(Context);

  const navigate = useNavigate();

  const getLowestPrice = (stores) => {
    if (!stores) return null;

    const prices = Object.values(stores)
      .filter((store) => store?.inStock && typeof store.price === "number")
      .map((store) => store.price);

    if (prices.length === 0) return null;

    return Math.min(...prices);
  };

  return (
    <Cont>
      <TilesCont>
        {list.map((tv) => {
          const lowestPrice = getLowestPrice(tv.stores);
const availableStores = Object.entries(tv.stores || {})
  .filter(([_, store]) => store?.inStock === true)
  .map(([storeName]) => storeName);

const checkStockStores = Object.entries(tv.stores || {})
  .filter(([_, store]) => store?.inStock === null && store?.price)
  .map(([storeName]) => storeName);
          return (
            <Tile
              key={tv.id}
              onClick={() =>
                navigate(
                  `/tv/${tv.brand.toLowerCase()}/${tv.model.toLowerCase()}`,
                )
              }
            >
              <ImageCont>
                <TvImage
                  src={tv.image}
                  alt={`${tv.brand} ${tv.model}`}
                />
              </ImageCont>

              <Brand>{tv.brand}</Brand>

              <Title>{tv.model}</Title>

              <Technology>{tv.technology}</Technology>

              <Specifications>
                <Spec>{tv.size}"</Spec>
                <Spec>{tv.resolution}</Spec>
                <Spec>{tv.refreshRate} Hz</Spec>
              </Specifications>

              {/* <GamingInfo>
                {tv.vrr && (
                  <GamingItem>
                    <GamingDot>✓</GamingDot>
                    VRR
                  </GamingItem>
                )}

                {tv.allm && (
                  <GamingItem>
                    <GamingDot>✓</GamingDot>
                    ALLM
                  </GamingItem>
                )}
              </GamingInfo> */}

             {lowestPrice !== null && (
  <Price>
    {lowestPrice.toLocaleString("mk-MK")} ден.
  </Price>
)}
{availableStores.length > 0 && (
  <Stores>
    Достапно во: {availableStores.join(" · ")}
  </Stores>
)}

{checkStockStores.length > 0 && (
  <Stores>
    Провери залиха: {checkStockStores.join(" · ")}
  </Stores>
)}



              <Bottom>
                <CompareButton
                  onClick={(e) => {
                    e.stopPropagation();

                    if (compareList.some((item) => item.id === tv.id)) {
                      removeFromCompare(tv.id);
                    } else {
                      addToCompare(tv);
                    }
                  }}
                >
                  {compareList.some((item) => item.id === tv.id)
                    ? "✓ Додадено"
                    : "+ Спореди"}
                </CompareButton>
              </Bottom>
            </Tile>
          );
        })}
      </TilesCont>
    </Cont>
  );
};

export default TileCont;
