import React, { createContext, useState } from "react";
import tvs from "../Data/tvs.js";

export const Context = createContext();

export const ContextProvider = ({ children }) => {
  const [list] = useState(tvs);

  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [technologyFilter, setTechnologyFilter] = useState("");
  const [refreshRateFilter, setRefreshRateFilter] = useState("");

  const [sortBy, setSortBy] = useState("newest");

  const [compareList, setCompareList] = useState([]);

  const [itemsPerPage, setItemsPerPage] = useState(6);

  let filteredList = list.filter((tv) => {
    const matchesSearch = tv.model
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesBrand = brandFilter === "" || tv.brand === brandFilter;

    const matchesSize = sizeFilter === "" || tv.size === sizeFilter;

    const matchesTechnology =
      technologyFilter === "" || tv.technology === technologyFilter;

    const matchesRefreshRate =
      refreshRateFilter === "" || tv.refreshRate >= refreshRateFilter;

    return (
      matchesSearch &&
      matchesBrand &&
      matchesSize &&
      matchesTechnology &&
      matchesRefreshRate
    );
  });

  filteredList = [...filteredList].sort((a, b) => {
    if (sortBy === "newest") {
      return b.year - a.year;
    }

    if (sortBy === "oldest") {
      return a.year - b.year;
    }

    if (sortBy === "size-small") {
      return a.size - b.size;
    }

    if (sortBy === "size-large") {
      return b.size - a.size;
    }

    return 0;
  });

  const visibleList = filteredList.slice(0, itemsPerPage);

  const hasMore = itemsPerPage < filteredList.length;

  const addToCompare = (tv) => {
    if (compareList.some((item) => item.id === tv.id)) {
      return;
    }

    if (compareList.length >= 3) {
      alert("Можеш да споредиш најмногу 3 телевизори.");
      return;
    }

    setCompareList([...compareList, tv]);
  };

  const removeFromCompare = (id) => {
    setCompareList(compareList.filter((tv) => tv.id !== id));
  };

  return (
    <Context.Provider
      value={{
        list: visibleList,
        allTvs: list,

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

        sortBy,
        setSortBy,

        itemsPerPage,
        setItemsPerPage,

        hasMore,

        compareList,
        addToCompare,
        removeFromCompare,
      }}
    >
      {children}
    </Context.Provider>
  );
};
