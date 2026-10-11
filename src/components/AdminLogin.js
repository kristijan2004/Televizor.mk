import React, { useState } from "react";
import styled from "styled-components";

import { adminApi } from "../lib/adminApi";

const PURPLE = "#242582";

const Wrap = styled.main`
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 70px 20px 90px;
  box-sizing: border-box;
`;

const Card = styled.form`
  padding: 40px 36px 36px;
  box-sizing: border-box;
  background: white;
  border: 1px solid #e8e8ef;
  border-radius: 16px;

  @media (max-width: 480px) {
    padding: 30px 22px;
  }
`;

const Title = styled.h1`
  margin: 0 0 6px;
  color: ${PURPLE};
  font-size: 24px;
  font-weight: 800;
`;

const Sub = styled.p`
  margin: 0 0 26px;
  color: #888;
  font-size: 13px;
`;

const Field = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  color: #555;
  font-size: 13px;
  font-weight: 700;
`;

const Input = styled.input`
  width: 100%;
  height: 42px;
  padding: 0 12px;
  box-sizing: border-box;
  border: 1px solid #dedee5;
  border-radius: 9px;
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

const SubmitButton = styled.button`
  width: 100%;
  height: 44px;
  margin-top: 6px;
  border: none;
  border-radius: 9px;
  background: ${PURPLE};
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;

  &:hover:not(:disabled) {
    background: #1b1c68;
  }

  &:disabled {
    background: #a9a9c8;
    cursor: default;
  }
`;

const ErrorBox = styled.div`
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #fdecec;
  border: 1px solid #f3c6c6;
  color: #a4302f;
  font-size: 13px;
  font-weight: 600;
`;

const AdminLogin = ({ onLoggedIn }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError("Внеси корисничко име и лозинка.");
      return;
    }

    setSubmitting(true);
    setError(null);

    adminApi
      .login(username.trim(), password)
      .then((data) => {
        onLoggedIn(data.username);
      })
      .catch((err) => {
        setError(
          err.status === 429
            ? "Премногу обиди. Почекај малку пред да пробаш повторно."
            : err.message || "Најавата не успеа."
        );
        setPassword("");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Wrap>
      <Card onSubmit={handleSubmit}>
        <Title>Најава на администратор</Title>
        <Sub>Пристапот до овој дел е ограничен.</Sub>

        {error && <ErrorBox role="alert">{error}</ErrorBox>}

        <Field>
          <Label htmlFor="admin-username">Корисничко име</Label>
          <Input
            id="admin-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={submitting}
          />
        </Field>

        <Field>
          <Label htmlFor="admin-password">Лозинка</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
          />
        </Field>

        <SubmitButton type="submit" disabled={submitting}>
          {submitting ? "Се најавувам..." : "Најави се"}
        </SubmitButton>
      </Card>
    </Wrap>
  );
};

export default AdminLogin;
