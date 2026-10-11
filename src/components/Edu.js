import React from "react";

import ArticleListing from "./Novosti";
import edu from "../Data/edu";

/*
  Еду ја користи истата листа како Новости, само со свои статии и свој пат.
  Ништо не се преслојува тука намерно: изгледот мора да остане ист.

  Еду reuses the Новости listing with its own articles and its own base path.
  Nothing is restyled here on purpose — the two pages are meant to look the
  same.
*/
const Edu = () => {
  return (
    <ArticleListing
      articles={edu}
      basePath="/edu"
      title="Еду"
      subtitle="Објаснуваме како работат технологиите кај телевизорите и како да го избереш вистинскиот"
      emptyTitle="Сè уште нема статии"
      emptyText="Наскоро ќе објавиме нови објаснувања."
    />
  );
};

export default Edu;
