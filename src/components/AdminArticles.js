import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { adminApi } from "../lib/adminApi";

const PURPLE = "#242582";

const SectionFilter = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
`;

const FilterButton = styled.button`
  height: 38px;
  padding: 0 16px;
  border: 1px solid ${(props) => (props.$active ? PURPLE : "#dedee5")};
  border-radius: 9px;
  background: ${(props) => (props.$active ? PURPLE : "white")};
  color: ${(props) => (props.$active ? "white" : "#555")};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: ${PURPLE};
  }
`;

const Row = styled.div`
  padding: 13px 16px;
  border: 1px solid #e8e8ef;
  border-radius: 10px;
  margin-bottom: 8px;
  background: white;
`;

const RowTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const RowTitle = styled.span`
  color: #333;
  font-size: 14px;
  font-weight: 700;
`;

const RowMeta = styled.span`
  display: block;
  margin-top: 2px;
  color: #888;
  font-size: 12px;
  font-weight: 500;
`;

const Badge = styled.span`
  padding: 3px 9px;
  border-radius: 999px;
  background: ${(props) => (props.$ok ? "#e8f5ee" : "#fdf3e5")};
  color: ${(props) => (props.$ok ? "#1b7a4b" : "#9a5b00")};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
`;

const EditButton = styled.button`
  height: 34px;
  padding: 0 14px;
  border: 1px solid #dedee5;
  border-radius: 8px;
  background: white;
  color: #555;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: ${PURPLE};
    color: ${PURPLE};
  }
`;

const EditForm = styled.form`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e8e8ef;
`;

const FieldWrap = styled.div`
  display: flex;
  flex-direction: column;
`;

const FieldLabel = styled.label`
  margin-bottom: 6px;
  color: #555;
  font-size: 12px;
  font-weight: 600;
`;

const TextInput = styled.input`
  height: 38px;
  padding: 0 12px;
  box-sizing: border-box;
  border: 1px solid #dedee5;
  border-radius: 8px;
  background: #f8f8fa;
  color: #333;
  font-size: 14px;
  min-width: 170px;

  &:focus {
    outline: none;
    background: white;
    border-color: ${PURPLE};
    box-shadow: 0 0 0 3px rgba(36, 37, 130, 0.08);
  }
`;

const SaveButton = styled.button`
  height: 38px;
  padding: 0 18px;
  border: none;
  border-radius: 8px;
  background: ${PURPLE};
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #1b1c68;
  }

  &:disabled {
    background: #a9a9c8;
    cursor: default;
  }
`;

const CancelButton = styled.button`
  height: 38px;
  padding: 0 14px;
  border: 1px solid #dedee5;
  border-radius: 8px;
  background: white;
  color: #555;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`;

const SuccessMsg = styled.span`
  color: #1b7a4b;
  font-size: 13px;
  font-weight: 700;
`;

const ErrorMsg = styled.div`
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #fdecec;
  border: 1px solid #f3c6c6;
  color: #a4302f;
  font-size: 13px;
  font-weight: 600;
`;

const Empty = styled.div`
  padding: 30px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const SECTION_LABEL = { novosti: "Новости", edu: "Еду" };

function formatWhen(article) {
  const stamp = article.publishAt || article.date;
  if (!stamp) return "—";

  const local = stamp.includes(":") ? stamp.replace(" ", "T") : `${stamp}T00:00`;
  const time = new Date(local);

  if (Number.isNaN(time.getTime())) return stamp;

  return time.toLocaleString("mk-MK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EditRow = ({ article, onSaved, onCancel, onSessionExpired }) => {
  const [date, setDate] = useState(article.date);
  const [publishAt, setPublishAt] = useState(article.publishAt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    adminApi.articles
      .updateSchedule(article.section, article.slug, { date, publishAt })
      .then((updated) => onSaved(updated))
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
        else setError(err.message);
      })
      .finally(() => setSaving(false));
  };

  return (
    <EditForm onSubmit={submit}>
      <FieldWrap>
        <FieldLabel htmlFor={`date-${article.section}-${article.slug}`}>Датум</FieldLabel>
        <TextInput
          id={`date-${article.section}-${article.slug}`}
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </FieldWrap>

      <FieldWrap>
        <FieldLabel htmlFor={`publishAt-${article.section}-${article.slug}`}>
          Време на објава (опционално, ГГГГ-ММ-ДД ЧЧ:МИ)
        </FieldLabel>
        <TextInput
          id={`publishAt-${article.section}-${article.slug}`}
          type="text"
          placeholder="2026-11-10 09:00"
          value={publishAt}
          onChange={(event) => setPublishAt(event.target.value)}
        />
      </FieldWrap>

      <SaveButton type="submit" disabled={saving}>
        {saving ? "Се зачувува..." : "Зачувај"}
      </SaveButton>

      <CancelButton type="button" onClick={onCancel} disabled={saving}>
        Откажи
      </CancelButton>

      {error && <ErrorMsg role="alert">{error}</ErrorMsg>}
    </EditForm>
  );
};

const AdminArticles = ({ onSessionExpired }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [section, setSection] = useState("all");
  const [editingKey, setEditingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);

  const load = React.useCallback(() => {
    setLoading(true);
    adminApi.articles
      .list()
      .then((data) => setItems(data.items || []))
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [onSessionExpired]);

  useEffect(() => {
    load();
  }, [load]);

  const keyFor = (a) => `${a.section}/${a.slug}`;

  const handleSaved = (updated) => {
    setItems((current) =>
      current.map((a) => (keyFor(a) === keyFor(updated) ? { ...a, ...updated } : a))
    );
    setEditingKey(null);
    setSavedKey(keyFor(updated));
    setTimeout(() => setSavedKey(null), 2500);
  };

  const visible = items.filter((a) => section === "all" || a.section === section);

  if (error) return <Empty>{error}</Empty>;
  if (loading) return <Empty>Се вчитува...</Empty>;

  return (
    <div>
      <SectionFilter>
        <FilterButton type="button" $active={section === "all"} onClick={() => setSection("all")}>
          Сите
        </FilterButton>
        <FilterButton
          type="button"
          $active={section === "novosti"}
          onClick={() => setSection("novosti")}
        >
          Новости
        </FilterButton>
        <FilterButton type="button" $active={section === "edu"} onClick={() => setSection("edu")}>
          Еду
        </FilterButton>
      </SectionFilter>

      {visible.length === 0 && <Empty>Нема статии.</Empty>}

      {visible.map((article) => {
        const key = keyFor(article);
        const editing = editingKey === key;

        return (
          <Row key={key}>
            <RowTop>
              <span>
                <RowTitle>{article.title}</RowTitle>
                <RowMeta>
                  {SECTION_LABEL[article.section] || article.section} · {formatWhen(article)}
                </RowMeta>
              </span>

              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {savedKey === key && <SuccessMsg>Зачувано.</SuccessMsg>}

                <Badge $ok={article.status === "live"}>
                  {article.status === "live" ? "живо" : "закажано"}
                </Badge>

                {!editing && (
                  <EditButton type="button" onClick={() => setEditingKey(key)}>
                    Измени датум
                  </EditButton>
                )}
              </span>
            </RowTop>

            {editing && (
              <EditRow
                article={article}
                onSaved={handleSaved}
                onCancel={() => setEditingKey(null)}
                onSessionExpired={onSessionExpired}
              />
            )}
          </Row>
        );
      })}
    </div>
  );
};

export default AdminArticles;
