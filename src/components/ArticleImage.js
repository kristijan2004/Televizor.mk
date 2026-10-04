import React, { useEffect, useMemo, useState } from "react";

/*
  Слика за статија што сама ја бара вистинската датотека.

  An article picture that finds its own file.

  `scripts/buildNews.js` works out which image exists at build time, but it also
  writes a list of names worth trying. This component walks that list whenever a
  source fails to load, which means a picture dropped into
  `public/images/novosti/` shows up after a plain refresh — no rebuild, and no
  broken grey box if the name is slightly off (a `.webp` instead of a `.jpg`, or
  the doubled `.jpg.jpg` that Windows produces when extensions are hidden).

  The last candidate is always the placeholder, so the layout never collapses.
*/
const ArticleImage = ({ src, candidates, ...rest }) => {
  const sources = useMemo(() => {
    const list = [src, ...(candidates || [])].filter(Boolean);

    // De-duplicated, because build-time and runtime guesses usually overlap.
    return [...new Set(list)];
  }, [src, candidates]);

  const [index, setIndex] = useState(0);

  // A different article means starting the search over.
  useEffect(() => {
    setIndex(0);
  }, [sources]);

  const handleError = () => {
    setIndex((current) =>
      current + 1 < sources.length ? current + 1 : current
    );
  };

  if (sources.length === 0) {
    return null;
  }

  return <img {...rest} src={sources[index]} onError={handleError} />;
};

export default ArticleImage;
