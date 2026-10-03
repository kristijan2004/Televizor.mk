import React, { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext(null);

export const translations = {
  MK: {
    logoTitle: "Телевизор.mk",
    logoSubtitle: "СПОРЕДБА НА ТЕЛЕВИЗОРИ",

    allTvs: "Сите телевизори",
    addTv: "Додај ТВ",
    compare: "Спореди",
    recommend: "Помош да одберам ТВ",

    televisions: "Телевизори",
    homeSubtitle: "Пронајди го моделот што најмногу ти одговара",
    sort: "Сортирај:",
    newest: "Најнови",
    oldest: "Најстари",
    smallest: "Најмали",
    largest: "Најголеми",
    showMore: "Прикажи повеќе",

    bannerTitleLine1: "Пронајди го телевизорот",
    bannerTitleLine2: "што е совршен за тебе",
    bannerDescription:
      "Разгледај модели, спореди спецификации и пронајди телевизор според твоите потреби.",

    tvAlt: "Телевизор",
    searchPlaceholder: "Пребарај телевизор...",
    brand: "Бренд",
    size: "Големина",
    clearFilters: "Исчисти филтри",

    popularCategories: "Популарни категории",
    availableAt: "Достапно во:",
    checkStock: "Провери залиха:",
    added: "✓ Додадено",
    remove: "Отстрани",

    tvNotFound: "Телевизорот не е пронајден",
    tvNotFoundDescription: "Телевизорот што го барате не постои во листата.",
    backToTvs: "Назад кон телевизори",

    addedToCompare: "✓ Додадено во споредба",
    whereAvailable: "Каде го има?",
    available: "Достапно",
    outOfStock: "Нема на залиха",
    open: "Отвори",

    basicSpecifications: "Основни спецификации",
    resolution: "Резолуција",
    technology: "Технологија",
    refreshRate: "Освежување",

    smartFunctions: "Паметни функции и конекции",
    year: "Година",
    operatingSystem: "Оперативен систем",

    picture: "Слика",
    pictureProcessor: "Процесор на слика",
    hdrFormats: "HDR формати",
    brightness: "Обработка на слика",

    gaming: "Gaming",

    sound: "Звук",
    audioPower: "Аудио моќност",
    audioSystem: "Аудио систем",

    aboutTv: "За телевизорот",

    noData: "Нема податок",
    yes: "Да",
    no: "Не",
    noSelectedTvs: "Нема избрани телевизори",
    addTvsToCompare: "Додадете телевизори во споредбата за да ги споредите.",
    tvComparison: "Споредба на телевизори",
    specification: "Спецификација",

    recommendDescription:
      "Одговори на неколку прашања и ќе ти предложиме телевизори според твоите потреби.",
    budgetQuestion: "Кој е твојот буџет?",
    from: "Од",
    to: "До",
    denars: "ден.",
    denarsShort: "ден.",
    distanceQuestion: "Колку далеку седиш од телевизорот?",
    distanceUpTo2: "До 2 метри",
    distance2To25: "2–2.5 метри",
    distance25To3: "2.5–3 метри",
    distanceOver3: "Над 3 метри",
    usageQuestion: "Што гледаш најмногу?",
    moviesAndSeries: "Филмови и серии",
    sports: "Спорт",
    tvChannels: "ТВ канали",
    aBitOfEverything: "Сè по малку",
    gamingQuestion: "Колку ти е важен gaming?",
    gamingNotImportant: "Не ми е важен",
    gamingSometimes: "Повремено играм",
    gamingVeryImportant: "Gaming ми е многу важен",
    priorityQuestion: "Што ти е најважно при изборот?",
    bestPicture: "Најдобра слика",
    bestGaming: "Најдобар gaming",
    largestScreen: "Најголем екран",
    bestValue: "Најдобар однос цена/квалитет",
    recommendedTvs: "Телевизори што одговараат на твоите барања",
    foundModels: "Најдовме {count} модели во твојот буџет.",
    noEnoughResults: "Нема доволно резултати",
    tryWiderBudget:
      "Пробај со поширок буџет или со поголем опсег на растојание.",
    availableAt: "Достапно во:",
    score: "Резултат",
    viewDetails: "Види детали",
    tryAgain: "Пробај повторно",
    back: "Назад",
    continue: "Продолжи",
    findTv: "Најди ми ТВ",

    sizeMatchesDistance: "Големината од {size} одговара на растојанието",
    refreshRateGreatForSports: "{rate}Hz е одлично за спорт",
    gamingFeatures: "Има функции корисни за gaming",
    technologyReason: "{technology} технологија",
    goodFit: "Добро се вклопува во твоите барања",
  },

  EN: {
    logoTitle: "Televizor.mk",
    logoSubtitle: "TV COMPARISON",

    allTvs: "All TVs",
    addTv: "Add TV",
    compare: "Compare",
    recommend: "Help me choose a TV",

    televisions: "Televisions",
    homeSubtitle: "Find the model that suits you best",
    sort: "Sort:",
    newest: "Newest",
    oldest: "Oldest",
    smallest: "Smallest",
    largest: "Largest",
    showMore: "Show more",

    bannerTitleLine1: "Find the TV",
    bannerTitleLine2: "that's perfect for you",
    bannerDescription:
      "Browse models, compare specifications and find a TV that fits your needs.",

    tvAlt: "Television",
    searchPlaceholder: "Search televisions...",
    brand: "Brand",
    size: "Size",
    clearFilters: "Clear filters",

    popularCategories: "Popular categories",
    availableAt: "Available at:",
    checkStock: "Check stock:",
    added: "✓ Added",
    remove: "Remove",

    tvNotFound: "Television not found",
    tvNotFoundDescription:
      "The television you are looking for does not exist in the list.",
    backToTvs: "Back to televisions",

    addedToCompare: "✓ Added to comparison",
    whereAvailable: "Where is it available?",
    available: "Available",
    outOfStock: "Out of stock",
    open: "Open",

    basicSpecifications: "Basic specifications",
    resolution: "Resolution",
    technology: "Technology",
    refreshRate: "Refresh rate",

    smartFunctions: "Smart features & connections",
    year: "Year",
    operatingSystem: "Operating system",

    picture: "Picture",
    pictureProcessor: "Picture processor",
    hdrFormats: "HDR formats",
    brightness: "Picture processing",

    gaming: "Gaming",

    sound: "Sound",
    audioPower: "Audio power",
    audioSystem: "Audio system",

    aboutTv: "About the TV",

    noData: "No data",
    yes: "Yes",
    no: "No",
    noSelectedTvs: "No TVs selected",
    addTvsToCompare: "Add TVs to the comparison to compare them.",
    tvComparison: "TV comparison",
    specification: "Specification",

    recommendDescription:
      "Answer a few questions and we'll suggest TVs based on your needs.",
    budgetQuestion: "What is your budget?",
    from: "From",
    to: "To",
    denars: "den.",
    denarsShort: "den.",
    distanceQuestion: "How far do you sit from the TV?",
    distanceUpTo2: "Up to 2 meters",
    distance2To25: "2–2.5 meters",
    distance25To3: "2.5–3 meters",
    distanceOver3: "Over 3 meters",
    usageQuestion: "What do you watch most?",
    moviesAndSeries: "Movies and series",
    sports: "Sports",
    tvChannels: "TV channels",
    aBitOfEverything: "A bit of everything",
    gamingQuestion: "How important is gaming to you?",
    gamingNotImportant: "Not important",
    gamingSometimes: "I play occasionally",
    gamingVeryImportant: "Gaming is very important",
    priorityQuestion: "What matters most when choosing?",
    bestPicture: "Best picture",
    bestGaming: "Best gaming",
    largestScreen: "Largest screen",
    bestValue: "Best value for money",
    recommendedTvs: "TVs that match your requirements",
    foundModels: "We found {count} models within your budget.",
    noEnoughResults: "Not enough results",
    tryWiderBudget: "Try a wider budget or a larger distance range.",
    score: "Score",
    viewDetails: "View details",
    tryAgain: "Try again",
    back: "Back",
    continue: "Continue",
    findTv: "Find my TV",

    sizeMatchesDistance: "The {size} size matches your viewing distance",
    refreshRateGreatForSports: "{rate}Hz is great for sports",
    gamingFeatures: "Has useful gaming features",
    technologyReason: "{technology} technology",
    goodFit: "A good fit for your requirements",
  },

  SQ: {
    logoTitle: "Televizor.mk",
    logoSubtitle: "KRAHASIM TELEVIZORËSH",

    allTvs: "Të gjithë televizorët",
    addTv: "Shto TV",
    compare: "Krahaso",
    recommend: "Më ndihmo të zgjedh një TV",

    televisions: "Televizorë",
    homeSubtitle: "Gjej modelin që të përshtatet më së miri",
    sort: "Rendit:",
    newest: "Më të rinjtë",
    oldest: "Më të vjetrit",
    smallest: "Më të vegjlit",
    largest: "Më të mëdhenjtë",
    showMore: "Shfaq më shumë",

    bannerTitleLine1: "Gjej televizorin",
    bannerTitleLine2: "që është perfekt për ty",
    bannerDescription:
      "Shfleto modelet, krahaso specifikat dhe gjej televizorin që i përshtatet nevojave tua.",

    tvAlt: "Televizor",
    searchPlaceholder: "Kërko televizor...",
    brand: "Marka",
    size: "Madhësia",
    clearFilters: "Pastro filtrat",

    popularCategories: "Kategoritë e njohura",
    availableAt: "E disponueshme në:",
    checkStock: "Kontrollo stokun:",
    added: "✓ U shtua",
    remove: "Hiq",

    tvNotFound: "Televizori nuk u gjet",
    tvNotFoundDescription: "Televizori që po kërkoni nuk ekziston në listë.",
    backToTvs: "Kthehu te televizorët",

    addedToCompare: "✓ U shtua në krahasim",
    whereAvailable: "Ku është i disponueshëm?",
    available: "I disponueshëm",
    outOfStock: "Jashtë stokut",
    open: "Hap",

    basicSpecifications: "Specifikimet bazë",
    resolution: "Rezolucioni",
    technology: "Teknologjia",
    refreshRate: "Frekuenca e rifreskimit",

    smartFunctions: "Funksionet smart dhe lidhjet",
    year: "Viti",
    operatingSystem: "Sistemi operativ",

    picture: "Imazhi",
    pictureProcessor: "Procesori i imazhit",
    hdrFormats: "Formatet HDR",
    brightness: "Përpunimi i imazhit",

    gaming: "Gaming",

    sound: "Tingulli",
    audioPower: "Fuqia audio",
    audioSystem: "Sistemi audio",

    aboutTv: "Rreth televizorit",

    noData: "Nuk ka të dhëna",
    yes: "Po",
    no: "Jo",
    noSelectedTvs: "Nuk ka televizorë të zgjedhur",
    addTvsToCompare: "Shtoni televizorë në krahasim për t'i krahasuar.",
    tvComparison: "Krahasimi i televizorëve",
    specification: "Specifikimi",

    recommendDescription:
      "Përgjigju disa pyetjeve dhe do të të sugjerojmë televizorë sipas nevojave tua.",
    budgetQuestion: "Cili është buxheti yt?",
    from: "Nga",
    to: "Deri",
    denars: "den.",
    denarsShort: "den.",
    distanceQuestion: "Sa larg ulesh nga televizori?",
    distanceUpTo2: "Deri në 2 metra",
    distance2To25: "2–2.5 metra",
    distance25To3: "2.5–3 metra",
    distanceOver3: "Mbi 3 metra",
    usageQuestion: "Çfarë shikon më shumë?",
    moviesAndSeries: "Filma dhe seriale",
    sports: "Sport",
    tvChannels: "Kanale televizive",
    aBitOfEverything: "Pak nga të gjitha",
    gamingQuestion: "Sa i rëndësishëm është gaming për ty?",
    gamingNotImportant: "Nuk është i rëndësishëm",
    gamingSometimes: "Luaj herë pas here",
    gamingVeryImportant: "Gaming është shumë i rëndësishëm",
    priorityQuestion: "Çfarë është më e rëndësishme për ty?",
    bestPicture: "Pamja më e mirë",
    bestGaming: "Gaming më i mirë",
    largestScreen: "Ekrani më i madh",
    bestValue: "Raporti më i mirë çmim/cilësi",
    recommendedTvs: "Televizorë që përputhen me kërkesat tua",
    foundModels: "Gjetëm {count} modele brenda buxhetit tënd.",
    noEnoughResults: "Nuk ka rezultate të mjaftueshme",
    tryWiderBudget:
      "Provo me një buxhet më të gjerë ose me një interval më të madh distance.",
    score: "Rezultati",
    viewDetails: "Shiko detajet",
    tryAgain: "Provo përsëri",
    back: "Prapa",
    continue: "Vazhdo",
    findTv: "Gjej TV-në time",

    sizeMatchesDistance: "Madhësia {size} përputhet me distancën e shikimit",
    refreshRateGreatForSports: "{rate}Hz është shumë e mirë për sport",
    gamingFeatures: "Ka funksione të dobishme për gaming",
    technologyReason: "Teknologjia {technology}",
    goodFit: "Përputhet mirë me kërkesat tua",
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("siteLanguage") || "MK";
  });

  useEffect(() => {
    localStorage.setItem("siteLanguage", language);
  }, [language]);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
};
