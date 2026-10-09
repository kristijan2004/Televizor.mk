import styled from "styled-components";

// Постави на true за повторно да се прикажуваат категориите.
// Set to true to show category badges again.
export const SHOW_CATEGORY_BADGE = false;

/*
  Muted label colours per category. Deliberately low-saturation so the badges
  read as labels rather than as buttons sitting next to the filter pills.
*/
const CATEGORY_COLORS = {
  Новости: { background: "#eceefa", color: "#3b3f9e" },
  Рецензии: { background: "#eeeaf2", color: "#553d67" },
  Совети: { background: "#e7f1eb", color: "#2f6b4f" },
  Понуди: { background: "#fbeee8", color: "#8c4326" },
};

const FALLBACK_COLOR = { background: "#f1f1f4", color: "#555" };

export const getCategoryColor = (category) =>
  CATEGORY_COLORS[category] || FALLBACK_COLOR;

/*
  Badge shape follows the existing Technology chip in TileCont: pill radius,
  11px/700, soft tinted fill. Rendered as a <span>, never a control.
*/
export const CategoryBadge = styled.span`
  display: ${SHOW_CATEGORY_BADGE ? "inline-flex" : "none"};
  align-items: center;

  align-self: flex-start;

  padding: 5px 11px;

  border-radius: 20px;

  background: ${(props) => getCategoryColor(props.$category).background};

  color: ${(props) => getCategoryColor(props.$category).color};

  font-size: 11px;

  font-weight: 700;

  white-space: nowrap;
`;

const MONTHS_MK = [
  "јануари",
  "февруари",
  "март",
  "април",
  "мај",
  "јуни",
  "јули",
  "август",
  "септември",
  "октомври",
  "ноември",
  "декември",
];

/*
  "1 октомври 2026".

  Deliberately not Intl.DateTimeFormat("mk-MK"): plenty of browsers ship
  without Macedonian locale data and silently fall back to en-US, which gives
  "October 1, 2026" with no error. The month table is a few lines and always
  correct.

  The ISO string is split by hand rather than passed to new Date(), because
  "2026-10-01" parses as UTC midnight and would render as the previous day for
  anyone in a negative UTC offset.
*/
export const formatMkDate = (isoDate) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate).trim());

  if (!match) {
    return "";
  }

  const [, year, month, day] = match;

  const monthName = MONTHS_MK[Number(month) - 1];

  if (!monthName) {
    return "";
  }

  return `${Number(day)} ${monthName} ${year}`;
};

export const formatReadTime = (minutes) => `${minutes} мин. читање`;

/* Newest first. Returns a copy so callers never mutate the imported array. */
export const sortByNewest = (posts) =>
  [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
