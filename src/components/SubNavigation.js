import React, { useContext, useState } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Context } from "./Context";

const SubNav = styled.div`
  width: 100%;

  position: sticky;
  top: 0;

  z-index: 9999;

  background: rgba(255, 255, 255, 0.96);

  border-bottom: 1px solid #e8e8ec;

  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);

  backdrop-filter: blur(10px);

  box-sizing: border-box;
`;

const SubNavInner = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 9px 20px;
  display: flex;

  /* Два намерни реда наместо еден што се прелива:
     ред 1 = пребарување + големина, ред 2 = брендови по цела ширина. */
  flex-direction: column;
  align-items: stretch;
  gap: 8px;

  box-sizing: border-box;

  overflow-x: hidden;
  overflow-y: hidden;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Row = styled.div`
  display: flex;

  align-items: center;

  gap: 6px;

  min-width: 0;
`;

const BrandRow = styled(Row)`
  /* Брендовите добиваат цела ширина, затоа 8-те главни + копчето
     за ширење удобно седат на еден ред. */
  flex-wrap: wrap;

  row-gap: 7px;
`;

const SearchBox = styled.div`
  position: relative;

  width: 300px;
  min-width: 180px;

  flex-shrink: 1;

  margin-right: 2px;
`;

const SearchIcon = styled.div`
  position: absolute;

  left: 12px;
  top: 50%;

  transform: translateY(-50%);

  color: #999;

  font-size: 13px;

  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;

  height: 38px;

  padding: 0 12px 0 35px;

  box-sizing: border-box;

  border: 1px solid #dedee5;

  border-radius: 9px;

  outline: none;

  background: #f8f8fa;

  color: #333;

  font-size: 13px;

  transition: 0.2s;

  &::placeholder {
    color: #999;
  }

  &:focus {
    background: white;

    border-color: #242582;

    box-shadow: 0 0 0 3px rgba(36, 37, 130, 0.08);
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 28px;

  margin: 0 5px;

  background: #e5e5e8;

  flex-shrink: 0;
`;

const FilterGroup = styled.div`
  display: flex;

  align-items: center;

  gap: 6px;

  /* Групата не се сече на половина: етикетата и нејзините копчиња
     секогаш остануваат заедно на истиот ред. */
  flex-wrap: ${(props) => (props.$wrap ? "wrap" : "nowrap")};

  row-gap: 8px;

  flex-shrink: 0;
`;

const FilterLabel = styled.span`
  color: #999;

  font-size: 11px;

  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 0.6px;

  margin-right: 2px;

  white-space: nowrap;
`;

const FilterButton = styled.button`
  height: 36px;

  padding: 0 13px;

  border-radius: 8px;

  border: 1px solid ${(props) => (props.active ? "#242582" : "#dedee5")};

  background: ${(props) => (props.active ? "#242582" : "white")};

  color: ${(props) => (props.active ? "white" : "#555")};

  cursor: pointer;

  font-size: 12px;

  font-weight: 700;

  white-space: nowrap;

  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    border-color: #242582;

    color: ${(props) => (props.active ? "white" : "#242582")};
  }
`;

const MoreButton = styled.button`
  height: 36px;

  padding: 0 13px;

  border: 1px dashed #c9c9d4;

  border-radius: 8px;

  background: white;

  color: #242582;

  cursor: pointer;

  font-size: 12px;

  font-weight: 700;

  white-space: nowrap;

  transition: 0.2s;

  &:hover {
    border-color: #242582;

    background: #f6f6fb;
  }
`;

const ClearButton = styled.button`
  height: 36px;

  /* Го полни празното место десно наместо да виси до филтрите. */
  margin-left: auto;

  padding: 0 13px;
  border: none;
  border-radius: 8px;
  background: #f1f1f4;
  color: #777;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  transition: 0.2s;

  &:hover {
    background: #eeeaf2;
    color: #242582;
  }
`;

// Сите брендови што постојат во masterTvs.json, подредени по број на телевизори.
// ВАЖНО: ако скриптите за скрапирање најдат нов бренд, додај го тука рачно —
// инаку нема да се појави во филтрите (проверка: scripts/listBrands.js).
const PRIMARY_BRANDS = [
  "Samsung",
  "Philips",
  "LG",
  "TCL",
  "Hisense",
  "Sony",
  "JVC",
  "Fuego",
];

const MORE_BRANDS = [
  "Xiaomi",
  "Haier",
  "ST",
  "Beko",
  "Neo",
  "Tesla",
  "Vivax",
  "Aiwa",
  "Favorit",
  "Telefunken",
  "Thomson",
  "Bautech",
  "Metz",
];

const SIZES = [43, 55, 65, 85];

const SubNavigation = () => {
  const {
    searchTerm,
    setSearchTerm,
    brandFilter,
    setBrandFilter,
    sizeFilter,
    setSizeFilter,
    technologyFilter,
    setTechnologyFilter,
    refreshRateFilter,
    setRefreshRateFilter,
  } = useContext(Context);

  const [showAllBrands, setShowAllBrands] = useState(false);

  const isBrandActive = (brand) =>
    brandFilter.toLowerCase() === brand.toLowerCase();

  const handleBrand = (brand) => {
  if (brandFilter.toLowerCase() === brand.toLowerCase()) {
    setBrandFilter("");
  } else {
    setBrandFilter(brand);
  }
};

  const handleSize = (size) => {
    if (sizeFilter === size) {
      setSizeFilter("");
    } else {
      setSizeFilter(size);
    }
  };
  const hasFilters =
    searchTerm ||
    brandFilter ||
    sizeFilter ||
    technologyFilter ||
    refreshRateFilter;

  const clearFilters = () => {
    setSearchTerm("");
    setBrandFilter("");
    setSizeFilter("");
    setTechnologyFilter("");
    setRefreshRateFilter("");
  };

  return (
    <SubNav>
      <SubNavInner>
        <Row>
          <SearchBox>
            <SearchIcon>
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </SearchIcon>

            <SearchInput
              type="text"
              placeholder="Пребарај бренд или модел..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBox>

          <FilterGroup>
            <Divider />

            <FilterLabel>Големина</FilterLabel>

            {SIZES.map((size) => (
              <FilterButton
                key={size}
                active={sizeFilter === size}
                onClick={() => handleSize(size)}
              >
                {size}"
              </FilterButton>
            ))}
          </FilterGroup>

          {hasFilters && (
            <ClearButton onClick={clearFilters}>Исчисти филтри</ClearButton>
          )}
        </Row>

        <BrandRow>
          <FilterLabel>Бренд</FilterLabel>

          {PRIMARY_BRANDS.map((brand) => (
            <FilterButton
              key={brand}
              active={isBrandActive(brand)}
              onClick={() => handleBrand(brand)}
            >
              {brand}
            </FilterButton>
          ))}

          {showAllBrands &&
            MORE_BRANDS.map((brand) => (
              <FilterButton
                key={brand}
                active={isBrandActive(brand)}
                onClick={() => handleBrand(brand)}
              >
                {brand}
              </FilterButton>
            ))}

          <MoreButton
            type="button"
            aria-expanded={showAllBrands}
            onClick={() => setShowAllBrands(!showAllBrands)}
          >
            {showAllBrands
              ? "− Помалку"
              : `+ Сите брендови (${MORE_BRANDS.length})`}
          </MoreButton>
        </BrandRow>
      </SubNavInner>
    </SubNav>
  );
};

export default SubNavigation;
