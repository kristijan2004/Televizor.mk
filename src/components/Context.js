import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/*
  Телевизорите доаѓаат од API-то, не од masterTvs.json.

  Порано целата база (514 телевизори) влегуваше во JS bundle-от, па еден
  посетител ја симнуваше целата со првото отворање. Сега серверот враќа само
  онолку колку што се прикажува, и филтрирањето/сортирањето е во SQLite.

  Договорот со компонентите (имињата во Provider-от) намерно останува ист, за
  да не се менува ниту една друга компонента повеќе од потребното.
*/

export const Context = createContext();

// Во развој: localhost:3001. Во production: истиот домен, преку nginx.
const API = process.env.REACT_APP_API_URL || "/api";

export const ContextProvider = ({ children }) => {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState({ models: 0, brands: 0, stores: 0 });
  const [filterOptions, setFilterOptions] = useState({
    brands: [],
    sizes: [],
    technologies: [],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [technologyFilter, setTechnologyFilter] = useState("");
  const [refreshRateFilter, setRefreshRateFilter] = useState("");

  const [sortBy, setSortBy] = useState("newest");

  /*
    Порано „Прикажи повеќе" само го зголемуваше бројот на прикажани (сите беа
    веќе во меморија). Сега серверот враќа страница по страница и limit е
    ограничен на 48, па растечки limit би запрел на 48. Затоа: фиксна
    големина на страница и вистинско прелистување.
  */
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);

  const [compareList, setCompareList] = useState([]);

  // Опциите за филтрите и бројките за банерот — еднаш, не се менуваат.
  useEffect(() => {
    let cancelled = false;

    fetch(`${API}/filters`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((d) => {
        if (cancelled) return;
        setFilterOptions({
          brands: d.brands || [],
          sizes: d.sizes || [],
          technologies: d.technologies || [],
        });
        setStats({
          models: d.total || 0,
          brands: (d.brands || []).length,
          stores: (d.stores || []).length,
        });
      })
      .catch(() => {
        /* банерот само ќе покаже 0 — не е причина да падне страницата */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
    Секоја промена на филтер/сортирање/страница повлекува ново барање.
    `requestId` спречува побавен одговор од старо барање да го прегази
    поновиот резултат.
  */
  const requestId = useRef(0);

  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    brandFilter,
    sizeFilter,
    technologyFilter,
    refreshRateFilter,
    sortBy,
  ]);

  useEffect(() => {
    const id = ++requestId.current;

    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (brandFilter) params.set("brand", brandFilter);
    if (sizeFilter) params.set("size", String(sizeFilter));
    if (technologyFilter) params.set("technology", technologyFilter);
    if (refreshRateFilter) params.set("refreshRate", String(refreshRateFilter));
    params.set("sort", sortBy);
    params.set("limit", String(PAGE_SIZE));
    params.set("page", String(page));

    setLoading(true);

    fetch(`${API}/tvs?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((d) => {
        if (id !== requestId.current) return;
        setList((current) =>
          d.page > 1 ? [...current, ...(d.items || [])] : d.items || []
        );
        setTotal(d.total || 0);
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        if (id !== requestId.current) return;
        setError("Не успеавме да ги вчитаме телевизорите.");
        setLoading(false);
      });
  }, [
    searchTerm,
    brandFilter,
    sizeFilter,
    technologyFilter,
    refreshRateFilter,
    sortBy,
    page,
  ]);

  const hasMore = list.length < total;

  const loadMore = useCallback(() => {
    setPage((current) => current + 1);
  }, []);

  const addToCompare = useCallback(
    (tv) => {
      setCompareList((current) => {
        if (current.some((item) => item.id === tv.id)) return current;

        if (current.length >= 3) {
          alert("Можеш да споредиш најмногу 3 телевизори.");
          return current;
        }

        return [...current, tv];
      });
    },
    []
  );

  const removeFromCompare = useCallback((id) => {
    setCompareList((current) => current.filter((tv) => tv.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      list,
      total,
      loading,
      error,

      stats,
      filterOptions,

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

      itemsPerPage: PAGE_SIZE,
      hasMore,
      loadMore,

      compareList,
      addToCompare,
      removeFromCompare,
    }),
    [
      list, total, loading, error, stats, filterOptions,
      searchTerm, brandFilter, sizeFilter, technologyFilter, refreshRateFilter,
      sortBy, hasMore, loadMore, compareList,
      addToCompare, removeFromCompare,
    ]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};
