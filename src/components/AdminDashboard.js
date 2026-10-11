import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { adminApi } from "../lib/adminApi";
import AdminEditTvs from "./AdminEditTvs";
import AdminHistory from "./AdminHistory";

const PURPLE = "#242582";

const Shell = styled.main`
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 36px 20px 80px;
  box-sizing: border-box;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  margin: 0;
  color: ${PURPLE};
  font-size: 24px;
  font-weight: 800;
`;

const WhoAndOut = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Who = styled.span`
  color: #777;
  font-size: 13px;
`;

const LogoutButton = styled.button`
  height: 36px;
  padding: 0 16px;
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

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid #e8e8ef;
  overflow-x: auto;
`;

const Tab = styled.button`
  padding: 10px 16px;
  border: none;
  border-bottom: 2px solid ${(props) => (props.$active ? PURPLE : "transparent")};
  background: transparent;
  color: ${(props) => (props.$active ? PURPLE : "#777")};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${PURPLE};
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
  margin-bottom: 28px;
`;

const StatCard = styled.div`
  padding: 20px;
  box-sizing: border-box;
  background: white;
  border: 1px solid #e8e8ef;
  border-radius: 14px;
`;

const StatNumber = styled.div`
  color: ${PURPLE};
  font-size: 28px;
  font-weight: 800;
`;

const StatLabel = styled.div`
  margin-top: 4px;
  color: #888;
  font-size: 12px;
  font-weight: 600;
`;

const RecentTitle = styled.h2`
  margin: 0 0 12px;
  color: #333;
  font-size: 16px;
  font-weight: 700;
`;

const RecentRow = styled.div`
  padding: 12px 14px;
  border: 1px solid #e8e8ef;
  border-radius: 10px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const RecentWho = styled.span`
  color: #888;
  font-size: 12px;
`;

const Empty = styled.div`
  padding: 30px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const ChangePwButton = styled.button`
  height: 36px;
  padding: 0 16px;
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

const PwForm = styled.form`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  padding: 16px;
  margin-bottom: 20px;
  background: white;
  border: 1px solid #e8e8ef;
  border-radius: 12px;
`;

const PwField = styled.div`
  display: flex;
  flex-direction: column;
`;

const PwLabel = styled.label`
  margin-bottom: 6px;
  color: #555;
  font-size: 12px;
  font-weight: 600;
`;

const PwInput = styled.input`
  height: 38px;
  padding: 0 12px;
  box-sizing: border-box;
  border: 1px solid #dedee5;
  border-radius: 8px;
  background: #f8f8fa;
  color: #333;
  font-size: 14px;
  min-width: 190px;

  &:focus {
    outline: none;
    background: white;
    border-color: ${PURPLE};
    box-shadow: 0 0 0 3px rgba(36, 37, 130, 0.08);
  }
`;

const PwSubmit = styled.button`
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

const PwMsg = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${(props) => (props.$ok ? "#1b7a4b" : "#a4302f")};
`;

const ChangePassword = ({ onDone, onSessionExpired }) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    setBusy(true);
    setMsg(null);

    adminApi
      .changePassword(current, next)
      .then(() => {
        setMsg({ ok: true, text: "Лозинката е сменета." });
        setCurrent("");
        setNext("");
      })
      .catch((err) => {
        if (err.status === 401 && err.message?.includes("не е точна")) {
          setMsg({ ok: false, text: err.message });
        } else if (err.status === 401) {
          onSessionExpired();
        } else {
          setMsg({ ok: false, text: err.message });
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <PwForm onSubmit={submit}>
      <PwField>
        <PwLabel htmlFor="pw-current">Тековна лозинка</PwLabel>
        <PwInput
          id="pw-current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />
      </PwField>

      <PwField>
        <PwLabel htmlFor="pw-next">Нова лозинка (барем 12 знаци)</PwLabel>
        <PwInput
          id="pw-next"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
        />
      </PwField>

      <PwSubmit type="submit" disabled={busy}>
        {busy ? "Се зачувува..." : "Смени"}
      </PwSubmit>

      {msg && <PwMsg $ok={msg.ok}>{msg.text}</PwMsg>}

      <ChangePwButton type="button" onClick={onDone}>
        Затвори
      </ChangePwButton>
    </PwForm>
  );
};

const TABS = [
  { id: "overview", label: "Контролна табла" },
  { id: "edit", label: "Уреди телевизори" },
  { id: "history", label: "Историја на промени" },
];

function formatDate(ms) {
  return new Date(ms).toLocaleString("mk-MK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AdminOverview = ({ onSessionExpired }) => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi
      .stats()
      .then(setStats)
      .catch((err) => {
        if (err.status === 401) onSessionExpired();
        else setError(err.message);
      });
  }, [onSessionExpired]);

  if (error) return <Empty>{error}</Empty>;
  if (!stats) return <Empty>Се вчитува...</Empty>;

  return (
    <>
      <StatsGrid>
        <StatCard>
          <StatNumber>{stats.totalTvs}</StatNumber>
          <StatLabel>телевизори вкупно</StatLabel>
        </StatCard>

        <StatCard>
          <StatNumber>{stats.verifiedTvs}</StatNumber>
          <StatLabel>со проверени спецификации</StatLabel>
        </StatCard>

        <StatCard>
          <StatNumber>{stats.brands}</StatNumber>
          <StatLabel>брендови</StatLabel>
        </StatCard>

        <StatCard>
          <StatNumber>{stats.missingBrightness}</StatNumber>
          <StatLabel>без податок за осветленост</StatLabel>
        </StatCard>

        <StatCard>
          <StatNumber>{stats.totalEdits}</StatNumber>
          <StatLabel>рачни измени вкупно</StatLabel>
        </StatCard>
      </StatsGrid>

      <RecentTitle>Последни измени</RecentTitle>

      {stats.recentEdits.length === 0 && <Empty>Сè уште нема рачни измени.</Empty>}

      {stats.recentEdits.map((edit) => (
        <RecentRow key={`${edit.tv_id}-${edit.changed_at}`}>
          <span>
            {edit.brand} {edit.model}
          </span>
          <RecentWho>
            {edit.changed_by} · {formatDate(edit.changed_at)}
          </RecentWho>
        </RecentRow>
      ))}
    </>
  );
};

/*
  Архитектурата е подготвена за повеќе секции (на пр. Новости) без веднаш да
  се градат: нов таб во TABS + нова гранка во содржината е доволно.
*/
const AdminDashboard = ({ username, onLoggedOut, onSessionExpired }) => {
  const [tab, setTab] = useState("overview");
  const [loggingOut, setLoggingOut] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    adminApi.logout().finally(() => {
      setLoggingOut(false);
      onLoggedOut();
    });
  };

  return (
    <Shell>
      <TopBar>
        <Title>Административен панел</Title>

        <WhoAndOut>
          <Who>{username}</Who>
          <ChangePwButton type="button" onClick={() => setShowPw((v) => !v)}>
            Смени лозинка
          </ChangePwButton>
          <LogoutButton type="button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Се одјавувам..." : "Одјави се"}
          </LogoutButton>
        </WhoAndOut>
      </TopBar>

      {showPw && (
        <ChangePassword onDone={() => setShowPw(false)} onSessionExpired={onSessionExpired} />
      )}

      <Tabs>
        {TABS.map((item) => (
          <Tab key={item.id} $active={tab === item.id} onClick={() => setTab(item.id)}>
            {item.label}
          </Tab>
        ))}
      </Tabs>

      {tab === "overview" && <AdminOverview onSessionExpired={onSessionExpired} />}
      {tab === "edit" && <AdminEditTvs onSessionExpired={onSessionExpired} />}
      {tab === "history" && <AdminHistory onSessionExpired={onSessionExpired} />}
    </Shell>
  );
};

export default AdminDashboard;
