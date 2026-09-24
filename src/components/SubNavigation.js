import React, { useContext } from "react";
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
  min-height: 64px;
  margin: 0 auto;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;

  overflow-x: hidden;
  overflow-y: hidden;

  @media (max-width: 1100px) {
    overflow-x: auto;
    overflow-y: hidden;
  }

  &::-webkit-scrollbar {
    display: none;
  }
`;

const SearchBox = styled.div`
  position: relative;

  width: 230px;
  min-width: 230px;

  margin-right: 8px;
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

const ClearButton = styled.button`
  height: 36px;
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

  const handleBrand = (brand) => {
    if (brandFilter === brand) {
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
        <SearchBox>
          <SearchIcon>
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </SearchIcon>

          <SearchInput
            type="text"
            placeholder="Пребарај телевизор..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchBox>

        <Divider />

        <FilterLabel>Бренд</FilterLabel>

        <FilterButton
          active={brandFilter === "Samsung"}
          onClick={() => handleBrand("Samsung")}
        >
          Samsung
        </FilterButton>

        <FilterButton
          active={brandFilter === "LG"}
          onClick={() => handleBrand("LG")}
        >
          LG
        </FilterButton>

        <FilterButton
          active={brandFilter === "Sony"}
          onClick={() => handleBrand("Sony")}
        >
          Sony
        </FilterButton>

        <FilterButton
          active={brandFilter === "TCL"}
          onClick={() => handleBrand("TCL")}
        >
          TCL
        </FilterButton>

        <FilterButton
          active={brandFilter === "Hisense"}
          onClick={() => handleBrand("Hisense")}
        >
          Hisense
        </FilterButton>

        <FilterButton
          active={brandFilter === "Philips"}
          onClick={() => handleBrand("Philips")}
        >
          Philips
        </FilterButton>

        <Divider />

        <FilterLabel>Големина</FilterLabel>

        <FilterButton active={sizeFilter === 43} onClick={() => handleSize(43)}>
          43"
        </FilterButton>

        <FilterButton active={sizeFilter === 55} onClick={() => handleSize(55)}>
          55"
        </FilterButton>

        <FilterButton active={sizeFilter === 65} onClick={() => handleSize(65)}>
          65"
        </FilterButton>

        <FilterButton active={sizeFilter === 85} onClick={() => handleSize(85)}>
          85"
        </FilterButton>
        {hasFilters && (
          <ClearButton onClick={clearFilters}>Исчисти филтри</ClearButton>
        )}
      </SubNavInner>
    </SubNav>
  );
};

export default SubNavigation;
