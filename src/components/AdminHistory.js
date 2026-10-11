import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { adminApi } from "../lib/adminApi";

const PURPLE = "#242582";

const Row = styled.div`
  padding: 14px 16px;
  border: 1px solid #e8e8ef;
  border-radius: 10px;
  margin-bottom: 10px;
`;

const RowTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
`;

const TvName = styled.span`
  color: #333;
  font-size: 14px;
  font-weight: 700;
`;

const Meta = styled.span`
  color: #888;
  font-size: 12px;
`;

const DiffList = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: #555;
  font-size: 13px;
  line-height: 1.6;
`;

const FieldName = styled.strong`
  color: ${PURPLE};
`;

const PagerRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 16px;
`;

const PagerButton = styled.button`
  height: 34px;
  padding: 0 14px;
  border: 1px solid #dedee5;
  border-radius: 8px;
  background: white;
  color: #555;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    color: #ccc;
    cursor: default;
  }

  &:hover:not(:disabled) {
    border-color: ${PURPLE};
    color: ${PURPLE};
  }
`;

const PagerLabel = styled.span`
  color: #888;
  font-size: 13px;
`;

const Empty = styled.div`
  padding: 30px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

function formatDate(ms) {
  return new Date(ms).toLocaleString("mk-MK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "(празно)";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "(празно)";
  if (typeof value === "boolean") return value ? "Да" : "Не";
  return String(value);
}

const AdminHistory = ({ onSessionExpired }) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, limit: 30 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .history({ page, limit: 30 })
      .then(setData)
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
      })
      .finally(() => setLoading(false));
  }, [page, onSessionExpired]);

  if (loading) return <Empty>Се вчитува...</Empty>;
  if (data.items.length === 0) return <Empty>Сè уште нема рачни измени.</Empty>;

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div>
      {data.items.map((entry) => (
        <Row key={entry.id}>
          <RowTop>
            <TvName>
              {entry.brand} {entry.model}
            </TvName>
            <Meta>
              {entry.changed_by} · {formatDate(entry.changed_at)}
            </Meta>
          </RowTop>

          <DiffList>
            {Object.entries(entry.diff).map(([field, { before, after }]) => (
              <li key={field}>
                <FieldName>{field}</FieldName>: {formatValue(before)} → {formatValue(after)}
              </li>
            ))}
          </DiffList>
        </Row>
      ))}

      {totalPages > 1 && (
        <PagerRow>
          <PagerButton
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Претходна
          </PagerButton>

          <PagerLabel>
            Страница {page} од {totalPages}
          </PagerLabel>

          <PagerButton
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Следна →
          </PagerButton>
        </PagerRow>
      )}
    </div>
  );
};

export default AdminHistory;
