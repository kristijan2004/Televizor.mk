import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";

import Navigation from "./Navigation";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import { adminApi } from "../lib/adminApi";
import { usePageMeta } from "../lib/usePageMeta";

const PageCont = styled.div`
  min-height: 100vh;
  background-color: #f7f7f9;
`;

const Loading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #888;
  font-size: 14px;
`;

/*
  Коренот на /admin: прво прашува дали веќе постои важечка сесија (GET /me),
  па покажува најава или контролна табла. Автентикацијата е на серверот —
  оваа проверка само одлучува што да прикаже, не дава пристап сама по себе.
*/
const Admin = () => {
  usePageMeta({ title: "Административен панел | Display.mk", path: "/admin" });

  const [status, setStatus] = useState("loading"); // loading | guest | in
  const [username, setUsername] = useState(null);

  const checkSession = useCallback(() => {
    adminApi
      .me()
      .then((data) => {
        setUsername(data.username);
        setStatus("in");
      })
      .catch(() => setStatus("guest"));
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLoggedIn = (name) => {
    setUsername(name);
    setStatus("in");
  };

  const handleLoggedOut = () => {
    setUsername(null);
    setStatus("guest");
  };

  // Сесијата истече некаде среде работа — врати на најавата со порака.
  const handleSessionExpired = () => {
    setUsername(null);
    setStatus("guest");
  };

  return (
    <PageCont>
      <Navigation />

      {status === "loading" && <Loading>Се вчитува...</Loading>}

      {status === "guest" && <AdminLogin onLoggedIn={handleLoggedIn} />}

      {status === "in" && (
        <AdminDashboard
          username={username}
          onLoggedOut={handleLoggedOut}
          onSessionExpired={handleSessionExpired}
        />
      )}
    </PageCont>
  );
};

export default Admin;
