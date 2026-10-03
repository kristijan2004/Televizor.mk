import React from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTv } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../LanguageContext";

const NavMain = styled.header`
  width: 100%;

  background: #242582;

  color: white;

  box-sizing: border-box;
`;

const NavInner = styled.div`
  width: 100%;
  max-width: 1200px;

  min-height: 76px;

  margin: 0 auto;
  padding: 0 20px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  box-sizing: border-box;
`;

const Logo = styled.button`
  display: flex;
  align-items: center;

  gap: 13px;

  padding: 0;

  border: none;
  background: transparent;

  color: white;

  cursor: pointer;
`;

const LogoIcon = styled.div`
  width: 44px;
  height: 44px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: rgba(255, 255, 255, 0.1);

  border: 1px solid rgba(255, 255, 255, 0.1);

  border-radius: 12px;

  font-size: 20px;

  transition: 0.2s;

  ${Logo}:hover & {
    background: rgba(255, 255, 255, 0.16);

    transform: translateY(-1px);
  }
`;

const LogoText = styled.div`
  display: flex;
  flex-direction: column;

  align-items: flex-start;

  line-height: 1;
`;

const LogoTitle = styled.span`
  font-size: 22px;

  font-weight: 800;

  letter-spacing: 0.2px;
`;

const LogoSubtitle = styled.span`
  margin-top: 6px;

  color: rgba(255, 255, 255, 0.55);

  font-size: 9px;

  font-weight: 600;

  letter-spacing: 1.3px;
`;

const LanguageSwitcher = styled.div`
  display: flex;
  align-items: center;

  gap: 4px;

  padding: 4px;

  background: rgba(255, 255, 255, 0.08);

  border: 1px solid rgba(255, 255, 255, 0.1);

  border-radius: 10px;
`;

const LanguageButton = styled.button`
  min-width: 38px;

  padding: 7px 8px;

  border: none;
  border-radius: 7px;

  background: ${({ active }) =>
    active ? "rgba(255, 255, 255, 0.18)" : "transparent"};

  color: ${({ active }) =>
    active ? "#ffffff" : "rgba(255, 255, 255, 0.6)"};

  font-size: 12px;
  font-weight: 800;

  cursor: pointer;

  transition: 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    color: white;
  }
`;

const Navigation = () => {
  const navigate = useNavigate();

  const { language, setLanguage, t } = useLanguage();

  return (
    <NavMain>
      <NavInner>
        <Logo onClick={() => navigate("/")}>
          <LogoIcon>
            <FontAwesomeIcon icon={faTv} />
          </LogoIcon>

          <LogoText>
            <LogoTitle>{t.logoTitle}</LogoTitle>

            <LogoSubtitle>{t.logoSubtitle}</LogoSubtitle>
          </LogoText>
        </Logo>

        <LanguageSwitcher aria-label="Language selection">
          <LanguageButton
            type="button"
            active={language === "EN"}
            onClick={() => setLanguage("EN")}
            aria-label="English"
          >
            EN
          </LanguageButton>

          <LanguageButton
            type="button"
            active={language === "MK"}
            onClick={() => setLanguage("MK")}
            aria-label="Македонски"
          >
            MK
          </LanguageButton>

          <LanguageButton
            type="button"
            active={language === "SQ"}
            onClick={() => setLanguage("SQ")}
            aria-label="Shqip"
          >
            SQ
          </LanguageButton>
        </LanguageSwitcher>
      </NavInner>
    </NavMain>
  );
};

export default Navigation;