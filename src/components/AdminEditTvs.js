import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { adminApi } from "../lib/adminApi";
import { SPECIAL_FEATURES } from "../lib/specialFeatures";

const PURPLE = "#242582";

const SearchRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
`;

const FilterToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 42px;
  box-sizing: border-box;
  border: 1px solid #dedee5;
  border-radius: 9px;
  background: white;
  color: #555;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
`;

const SearchInput = styled.input`
  flex: 1;
  height: 42px;
  padding: 0 14px;
  box-sizing: border-box;
  border: 1px solid #dedee5;
  border-radius: 9px;
  background: white;
  color: #333;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${PURPLE};
    box-shadow: 0 0 0 3px rgba(36, 37, 130, 0.08);
  }
`;

const ListRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 13px 16px;
  box-sizing: border-box;
  border: 1px solid #e8e8ef;
  border-radius: 10px;
  margin-bottom: 8px;
  background: white;
  cursor: pointer;
  text-align: left;

  &:hover {
    border-color: ${PURPLE};
    background: #f8f8fc;
  }
`;

const RowName = styled.span`
  color: #333;
  font-size: 14px;
  font-weight: 700;
`;

const RowSpecs = styled.span`
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

/* -------- форма за уредување -------- */

const BackLink = styled.button`
  display: inline-block;
  margin-bottom: 16px;
  border: none;
  background: none;
  padding: 0;
  color: ${PURPLE};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const EditHeader = styled.h2`
  margin: 0 0 20px;
  color: #333;
  font-size: 18px;
  font-weight: 700;
`;

const FieldSet = styled.fieldset`
  margin: 0 0 22px;
  padding: 0;
  border: none;
`;

const FieldSetTitle = styled.legend`
  margin-bottom: 10px;
  padding: 0;
  color: ${PURPLE};
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
`;

const FieldWrap = styled.div`
  display: flex;
  flex-direction: column;
`;

const FieldLabel = styled.label`
  margin-bottom: 6px;
  color: #555;
  font-size: 13px;
  font-weight: 600;
`;

const TextInput = styled.input`
  height: 40px;
  padding: 0 12px;
  box-sizing: border-box;
  border: 1px solid #dedee5;
  border-radius: 8px;
  background: #f8f8fa;
  color: #333;
  font-size: 14px;

  &:focus {
    outline: none;
    background: white;
    border-color: ${PURPLE};
    box-shadow: 0 0 0 3px rgba(36, 37, 130, 0.08);
  }
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  color: #333;
  font-size: 14px;
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: ${PURPLE};
  cursor: pointer;
`;

const FormActions = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 10px;
`;

const SaveButton = styled.button`
  height: 42px;
  padding: 0 22px;
  border: none;
  border-radius: 9px;
  background: ${PURPLE};
  color: white;
  font-size: 14px;
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

const SuccessMsg = styled.span`
  color: #1b7a4b;
  font-size: 13px;
  font-weight: 700;
`;

const ConfirmButton = styled.button`
  height: 42px;
  padding: 0 18px;
  border: 1px solid #1b7a4b;
  border-radius: 9px;
  background: white;
  color: #1b7a4b;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #e8f5ee;
  }

  &:disabled {
    border-color: #ccc;
    color: #ccc;
    cursor: default;
  }
`;

const ErrorMsg = styled.div`
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #fdecec;
  border: 1px solid #f3c6c6;
  color: #a4302f;
  font-size: 13px;
  font-weight: 600;
`;

/*
  Групите и типовите на полиња одговараат на EDITABLE_FIELDS во
  server/tvRows.js — ако таму се додаде ново поле, мора да се додаде и тука.
*/
const FIELD_GROUPS = [
  {
    title: "Основни",
    fields: [
      { key: "size", label: "Големина (инчи)", type: "number" },
      { key: "technology", label: "Технологија", type: "text" },
      { key: "resolution", label: "Резолуција", type: "text" },
      { key: "refreshRate", label: "Фреквенција (Hz)", type: "number" },
      { key: "year", label: "Година", type: "number" },
      { key: "os", label: "Оперативен систем", type: "text" },
    ],
  },
  {
    title: "HDR и слика",
    fields: [
      { key: "hdr", label: "HDR", type: "bool" },
      { key: "dolbyVision", label: "Dolby Vision", type: "bool" },
      { key: "hdrFormats", label: "HDR формати (одделени со запирка)", type: "list" },
      { key: "brightness", label: "Осветленост", type: "text" },
      { key: "pictureProcessor", label: "Процесор за слика", type: "text" },
    ],
  },
  {
    title: "Поврзување",
    fields: [
      { key: "hdmi", label: "HDMI приклучоци", type: "number" },
      { key: "usb", label: "USB приклучоци", type: "number" },
    ],
  },
  {
    title: "Звук",
    fields: [
      { key: "audioPower", label: "Моќност на звук (W)", type: "number" },
      { key: "audioChannels", label: "Канали", type: "text" },
      { key: "dolbyAtmos", label: "Dolby Atmos", type: "bool" },
    ],
  },
  {
    title: "Гејминг",
    fields: [
      { key: "vrr", label: "VRR", type: "bool" },
      { key: "allm", label: "ALLM", type: "bool" },
      { key: "freeSync", label: "FreeSync", type: "bool" },
      { key: "gSync", label: "G-Sync", type: "bool" },
    ],
  },
  {
    title: "Посебни карактеристики",
    fields: [
      { key: "specialFeatures", label: "Посебни карактеристики", type: "checklist" },
    ],
  },
  {
    title: "Останато",
    fields: [
      { key: "image", label: "Слика (URL или патека)", type: "text" },
      { key: "specsSource", label: "Извор на спецификациите", type: "text" },
    ],
  },
];

function toFormValue(field, value) {
  if (field.type === "list") return Array.isArray(value) ? value.join(", ") : "";
  if (field.type === "checklist") return Array.isArray(value) ? value : [];
  if (field.type === "number") return value === null || value === undefined ? "" : String(value);
  return value ?? "";
}

function fromFormValue(field, raw) {
  if (field.type === "bool") return raw === true;
  if (field.type === "checklist") return Array.isArray(raw) ? raw : [];
  if (field.type === "list") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (field.type === "number") {
    if (raw === "" || raw === null) return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }
  return raw.trim() === "" ? null : raw;
}

/*
  saveFn/extraActions ѝ дозволуваат на AdminPendingTvs.js да ја употребува
  истата форма (исти полиња, иста валидација на серверот преку
  EDITABLE_FIELDS) наместо да дуплира ~100 реда, само со друг crud-повик и
  копчиња Одобри/Одбиј под Зачувај.
*/
export const TvEditForm = ({
  tv,
  onSaved,
  onBack,
  onSessionExpired,
  saveFn = (id, patch) => adminApi.updateTv(id, patch),
  extraActions = null,
}) => {
  const [form, setForm] = useState(() => {
    const initial = {};
    for (const group of FIELD_GROUPS) {
      for (const field of group.fields) {
        initial[field.key] = toFormValue(field, tv[field.key]);
      }
    }
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSavedAt(null);
  };

  const buildPatch = () => {
    const patch = {};
    for (const group of FIELD_GROUPS) {
      for (const field of group.fields) {
        patch[field.key] = fromFormValue(field, form[field.key]);
      }
    }
    return patch;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    saveFn(tv.id, buildPatch())
      .then(() => {
        setSavedAt(Date.now());
        onSaved();
      })
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
        else setError(err.message);
      })
      .finally(() => setSaving(false));
  };

  /*
    Ѕвезди/заклучување: штом корисникот рачно провери телевизор, specsSource
    треба да биде пополнет, инаку апликациите за обогатување (apply*Specs.js)
    може подоцна да го „пронајдат" како непроверен и да му ги променат
    спецификациите. Копчето само го пополнува тоа поле со „рачно" и го
    зачувува тековниот формулар — не отвора ново уредување.
  */
  const isVerified = form.specsSource.trim() !== "";

  const handleConfirm = () => {
    setSaving(true);
    setError(null);

    const patch = buildPatch();
    patch.specsSource = "рачно";

    saveFn(tv.id, patch)
      .then(() => {
        setField("specsSource", "рачно");
        setSavedAt(Date.now());
        onSaved();
      })
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
        else setError(err.message);
      })
      .finally(() => setSaving(false));
  };

  return (
    <div>
      <BackLink type="button" onClick={onBack}>
        ← Назад кон листата
      </BackLink>

      <EditHeader>
        {tv.brand} {tv.model}
      </EditHeader>

      {error && <ErrorMsg role="alert">{error}</ErrorMsg>}

      <form onSubmit={handleSubmit}>
        {FIELD_GROUPS.map((group) => (
          <FieldSet key={group.title}>
            <FieldSetTitle>{group.title}</FieldSetTitle>

            <FieldsGrid>
              {group.fields.map((field) => (
                <FieldWrap key={field.key}>
                  {field.type === "bool" ? (
                    <CheckboxRow>
                      <Checkbox
                        type="checkbox"
                        checked={form[field.key] === true}
                        onChange={(event) => setField(field.key, event.target.checked)}
                      />
                      {field.label}
                    </CheckboxRow>
                  ) : field.type === "checklist" ? (
                    SPECIAL_FEATURES.map((feature) => (
                      <CheckboxRow key={feature.key}>
                        <Checkbox
                          type="checkbox"
                          checked={form[field.key].includes(feature.key)}
                          onChange={(event) => {
                            const current = form[field.key];
                            const next = event.target.checked
                              ? [...current, feature.key]
                              : current.filter((k) => k !== feature.key);
                            setField(field.key, next);
                          }}
                        />
                        {feature.label}
                      </CheckboxRow>
                    ))
                  ) : (
                    <>
                      <FieldLabel htmlFor={`f-${field.key}`}>{field.label}</FieldLabel>
                      <TextInput
                        id={`f-${field.key}`}
                        type={field.type === "number" ? "number" : "text"}
                        value={form[field.key]}
                        onChange={(event) => setField(field.key, event.target.value)}
                      />
                    </>
                  )}
                </FieldWrap>
              ))}
            </FieldsGrid>
          </FieldSet>
        ))}

        <FormActions>
          <SaveButton type="submit" disabled={saving}>
            {saving ? "Се зачувува..." : "Зачувај"}
          </SaveButton>

          <ConfirmButton type="button" disabled={saving || isVerified} onClick={handleConfirm}>
            {isVerified ? "✓ Потврдено" : "✓ Потврди проверка"}
          </ConfirmButton>

          {savedAt && <SuccessMsg>Зачувано.</SuccessMsg>}
        </FormActions>
      </form>

      {extraActions}
    </div>
  );
};

/* -------- листа + пребарување -------- */

const AdminEditTvs = ({ onSessionExpired }) => {
  const [search, setSearch] = useState("");
  const [onlyUnverified, setOnlyUnverified] = useState(false);
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ items: [], total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTv, setSelectedTv] = useState(null);

  const loadList = React.useCallback(() => {
    setLoading(true);
    const params = { search, page, limit: 20 };
    if (onlyUnverified) params.verified = "0";

    adminApi
      .listTvs(params)
      .then(setList)
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
      })
      .finally(() => setLoading(false));
  }, [search, page, onlyUnverified, onSessionExpired]);

  useEffect(() => {
    if (!selectedId) loadList();
  }, [loadList, selectedId]);

  const openTv = (id) => {
    adminApi
      .getTv(id)
      .then((tv) => {
        setSelectedTv(tv);
        setSelectedId(id);
      })
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
      });
  };

  const handleBack = () => {
    setSelectedId(null);
    setSelectedTv(null);
  };

  const handleSaved = () => {
    // По зачувување, го вчитува истиот запис одново за свежи вредности.
    openTv(selectedId);
  };

  if (selectedTv) {
    return (
      <TvEditForm
        tv={selectedTv}
        onSaved={handleSaved}
        onBack={handleBack}
        onSessionExpired={onSessionExpired}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.limit));

  return (
    <div>
      <SearchRow>
        <SearchInput
          type="text"
          placeholder="Пребарај бренд или модел..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <FilterToggle>
          <Checkbox
            type="checkbox"
            checked={onlyUnverified}
            onChange={(event) => {
              setOnlyUnverified(event.target.checked);
              setPage(1);
            }}
          />
          Само непроверени
        </FilterToggle>
      </SearchRow>

      {loading && <Empty>Се вчитува...</Empty>}

      {!loading && list.items.length === 0 && <Empty>Нема резултати.</Empty>}

      {!loading &&
        list.items.map((tv) => (
          <ListRow key={tv.id} type="button" onClick={() => openTv(tv.id)}>
            <span>
              <RowName>
                {tv.brand} {tv.model}
              </RowName>
              <RowSpecs>
                {tv.size ? `${tv.size}"` : "?"} · {tv.technology || "—"}
              </RowSpecs>
            </span>

            <Badge $ok={Boolean(tv.specsSource)}>
              {tv.specsSource ? "проверено" : "непроверено"}
            </Badge>
          </ListRow>
        ))}

      {!loading && totalPages > 1 && (
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

export default AdminEditTvs;
