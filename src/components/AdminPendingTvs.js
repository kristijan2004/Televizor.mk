import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";

import { adminApi } from "../lib/adminApi";
import { TvEditForm } from "./AdminEditTvs";

const PURPLE = "#242582";

const Intro = styled.p`
  margin: 0 0 18px;
  color: #666;
  font-size: 13px;
  line-height: 1.5;
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

const RowMeta = styled.span`
  display: block;
  margin-top: 2px;
  color: #888;
  font-size: 12px;
  font-weight: 500;
`;

const Reasons = styled.span`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const ReasonBadge = styled.span`
  padding: 3px 9px;
  border-radius: 999px;
  background: #fdf3e5;
  color: #9a5b00;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
`;

const Empty = styled.div`
  padding: 30px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const ActionsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e8e8ef;
`;

const ApproveButton = styled.button`
  height: 42px;
  padding: 0 22px;
  border: none;
  border-radius: 9px;
  background: #1b7a4b;
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #15603b;
  }

  &:disabled {
    background: #a9c8b7;
    cursor: default;
  }
`;

const RejectButton = styled.button`
  height: 42px;
  padding: 0 22px;
  border: 1px solid #dedee5;
  border-radius: 9px;
  background: white;
  color: #a4302f;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: #a4302f;
  }

  &:disabled {
    color: #ccc;
    cursor: default;
  }
`;

const ActionError = styled.div`
  padding: 10px 14px;
  border-radius: 8px;
  background: #fdecec;
  border: 1px solid #f3c6c6;
  color: #a4302f;
  font-size: 13px;
  font-weight: 600;
`;

function formatDate(day) {
  if (!day) return "";
  try {
    return new Date(`${day}T00:00`).toLocaleDateString("mk-MK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return day;
  }
}

/*
  Истата форма како „Уреди телевизори" (TvEditForm), само со друг crud-повик
  (pendingTvs.json наместо SQLite) и со Одобри/Одбиј под Зачувај. Нема
  посебен прозорец за секое поле — целта е админот да го довери истиот
  запис пред да стигне до живиот сајт.
*/
const AdminPendingTvs = ({ onSessionExpired }) => {
  const [list, setList] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const loadList = useCallback(() => {
    setLoading(true);
    adminApi
      .listPendingTvs()
      .then(setList)
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
      })
      .finally(() => setLoading(false));
  }, [onSessionExpired]);

  useEffect(() => {
    if (!selectedId) loadList();
  }, [loadList, selectedId]);

  const openEntry = (id) => {
    setActionError(null);
    adminApi
      .getPendingTv(id)
      .then((entry) => {
        setSelectedEntry(entry);
        setSelectedId(id);
      })
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
      });
  };

  const handleBack = () => {
    setSelectedId(null);
    setSelectedEntry(null);
    setActionError(null);
  };

  const handleSaved = () => openEntry(selectedId);

  const handleApprove = () => {
    setBusy(true);
    setActionError(null);

    adminApi
      .approvePendingTv(selectedId)
      .then(() => handleBack())
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
        else setActionError(err.message);
      })
      .finally(() => setBusy(false));
  };

  const handleReject = () => {
    if (
      !window.confirm(
        "Отфрли го овој телевизор? Нема повторно да се предложи додека трговецот не промени нешто во огласот."
      )
    ) {
      return;
    }

    setBusy(true);
    setActionError(null);

    adminApi
      .rejectPendingTv(selectedId)
      .then(() => handleBack())
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
        else setActionError(err.message);
      })
      .finally(() => setBusy(false));
  };

  if (selectedEntry) {
    return (
      <TvEditForm
        tv={selectedEntry.tv}
        onSaved={handleSaved}
        onBack={handleBack}
        onSessionExpired={onSessionExpired}
        saveFn={(id, patch) => adminApi.updatePendingTv(id, patch)}
        extraActions={
          <ActionsRow>
            <ApproveButton type="button" onClick={handleApprove} disabled={busy}>
              {busy ? "Се зачувува..." : "Одобри и додади на сајтот"}
            </ApproveButton>

            <RejectButton type="button" onClick={handleReject} disabled={busy}>
              Одбиј
            </RejectButton>

            {actionError && <ActionError role="alert">{actionError}</ActionError>}
          </ActionsRow>
        }
      />
    );
  }

  return (
    <div>
      <Intro>
        Нови модели што ноќниот скрипт ги најде кај трговците, но им
        недостасува големина или слика — не одат на сајтот додека ти не ги
        провериш и одобриш.
      </Intro>

      {loading && <Empty>Се вчитува...</Empty>}

      {!loading && list.items.length === 0 && (
        <Empty>Нема телевизори на чекање — сите нови модели имаат целосна информација.</Empty>
      )}

      {!loading &&
        list.items.map((entry) => (
          <ListRow key={entry.tv.id} type="button" onClick={() => openEntry(entry.tv.id)}>
            <span>
              <RowName>
                {entry.tv.brand} {entry.tv.model}
              </RowName>
              <RowMeta>
                {entry.tv.size ? `${entry.tv.size}"` : "?"} ·{" "}
                {entry.tv.technology || "—"} · најдено {formatDate(entry.discoveredAt)}
              </RowMeta>
            </span>

            <Reasons>
              {entry.reasons.map((reason) => (
                <ReasonBadge key={reason}>{reason}</ReasonBadge>
              ))}
            </Reasons>
          </ListRow>
        ))}
    </div>
  );
};

export default AdminPendingTvs;
