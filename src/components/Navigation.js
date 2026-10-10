import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTv, faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useLocation, useNavigate, NavLink } from "react-router-dom";

export const TV_SECTION_ID = "odberi-tv";

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

  gap: 20px;

  box-sizing: border-box;

  @media (max-width: 420px) {
    padding: 0 12px;
    gap: 8px;
  }
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

  flex-shrink: 0;

  @media (max-width: 420px) {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

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

  white-space: nowrap;

  @media (max-width: 420px) {
    font-size: 18px;
  }
`;

const LogoSubtitle = styled.span`
  margin-top: 6px;

  color: rgba(255, 255, 255, 0.55);

  font-size: 9px;

  font-weight: 600;

  letter-spacing: 1.3px;

  white-space: nowrap;

  /* На мобилен „Одбери ТВ" го зазема местото и поднасловот се прелеваше
     во два реда. Логото само по себе е доволно на тесен екран. */
  @media (max-width: 760px) {
    display: none;
  }
`;

/* ---------- Navigation menu ---------- */

const Nav = styled.nav`
  display: flex;
  align-items: center;
`;

const NavList = styled.ul`
  display: flex;
  align-items: center;

  gap: 30px;

  margin: 0;
  padding: 0;

  list-style: none;

  @media (max-width: 900px) {
    gap: 18px;
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

const NavItem = styled.li`
  display: flex;
  align-items: center;
`;

/*
  Shared type treatment, lifted from LogoSubtitle so the menu reads as part of
  the same system: small, uppercase, widely tracked.
*/
const navItemType = `
  font-size: 11px;

  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 1.3px;

  white-space: nowrap;

  @media (max-width: 900px) {
    font-size: 10px;

    letter-spacing: 1px;
  }
`;

const focusRing = `
  &:focus-visible {
    outline: 2px solid #ffffff;

    outline-offset: 3px;
  }
`;

const TextLink = styled(NavLink)`
  ${navItemType}

  position: relative;

  padding: 6px 2px;

  color: rgba(255, 255, 255, 0.7);

  text-decoration: none;

  border-radius: 4px;

  transition: color 0.2s;

  ${focusRing}

  /* Underline grows from the centre on hover and stays put when active. */
  &::after {
    content: "";

    position: absolute;

    left: 0;
    right: 0;
    bottom: 0;

    height: 2px;

    background: #ffffff;

    border-radius: 2px;

    transform: scaleX(0);

    transition: transform 0.2s;
  }

  &:hover {
    color: #ffffff;
  }

  &:hover::after {
    transform: scaleX(1);
  }

  &.active {
    color: #ffffff;
  }

  &.active::after {
    transform: scaleX(1);
  }
`;

/* Одбери ТВ — the primary action. Outlined pill, filled once you are on it. */
const PillLink = styled(NavLink)`
  ${navItemType}

  display: inline-flex;
  align-items: center;

  padding: 9px 18px;

  color: #ffffff;

  text-decoration: none;

  background: rgba(255, 255, 255, 0.1);

  border: 1px solid rgba(255, 255, 255, 0.35);

  border-radius: 999px;

  transition: 0.2s;

  ${focusRing}

  &:hover {
    background: rgba(255, 255, 255, 0.18);

    border-color: rgba(255, 255, 255, 0.55);

    transform: translateY(-1px);
  }

  &.active {
    color: #242582;

    background: #ffffff;

    border-color: #ffffff;
  }
`;

const MenuToggle = styled.button`
  display: none;

  width: 42px;
  height: 42px;

  align-items: center;
  justify-content: center;

  padding: 0;

  color: #ffffff;

  font-size: 18px;

  background: rgba(255, 255, 255, 0.1);

  border: 1px solid rgba(255, 255, 255, 0.2);

  border-radius: 10px;

  cursor: pointer;

  transition: 0.2s;

  ${focusRing}

  &:hover {
    background: rgba(255, 255, 255, 0.18);
  }

  @media (max-width: 760px) {
    display: inline-flex;
  }
`;

/*
  „Одбери ТВ" на мобилен стои покрај копчето за мени, не внатре во него.
  Тоа е главната работа на сајтот — не смее да бара допир за да се најде.
*/
const MobileCta = styled(NavLink)`
  display: none;

  @media (max-width: 760px) {
    display: inline-flex;
    align-items: center;

    margin-right: 8px;
    padding: 8px 14px;

    color: #ffffff;

    font-size: 13px;
    font-weight: 700;

    text-decoration: none;
    white-space: nowrap;

    background: rgba(255, 255, 255, 0.14);

    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 999px;
  }

  @media (max-width: 360px) {
    padding: 8px 11px;
    font-size: 12px;
  }
`;

/*
  The mobile panel sits in the header's normal flow rather than floating over
  the page, so opening it pushes the hero down instead of covering it.
*/
const MobilePanel = styled.div`
  display: none;

  @media (max-width: 760px) {
    display: block;

    border-top: 1px solid rgba(255, 255, 255, 0.14);
  }
`;

const MobileList = styled.ul`
  width: 100%;
  max-width: 1200px;

  margin: 0 auto;

  padding: 10px 20px 18px;

  box-sizing: border-box;

  display: flex;
  flex-direction: column;

  align-items: flex-start;

  gap: 4px;

  list-style: none;
`;

const MobileItem = styled.li`
  width: 100%;

  /* Full-width tap targets inside the panel. */
  & > a {
    display: flex;

    width: 100%;

    padding: 13px 4px;

    justify-content: flex-start;
  }
`;

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  const toggleRef = useRef(null);

  // Close the panel whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Escape closes the panel and hands focus back to the toggle.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);

        toggleRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  // Same three items in both layouts; only the <li> wrapper differs.
  const renderItems = (Item) => (
    <>
      <Item>
        <TextLink to="/novosti" onClick={() => setMenuOpen(false)}>
          Новости
        </TextLink>
      </Item>

      <Item>
        <TextLink to="/edu" onClick={() => setMenuOpen(false)}>
          Еду
        </TextLink>
      </Item>

      <Item>
        <PillLink to="/odberi-tv" onClick={() => setMenuOpen(false)}>
          Одбери ТВ
        </PillLink>
      </Item>
    </>
  );

  return (
    <NavMain>
      <NavInner>
        <Logo onClick={() => navigate("/")}>
          <LogoIcon>
            <FontAwesomeIcon icon={faTv} />
          </LogoIcon>

          <LogoText>
            <LogoTitle>Display.mk</LogoTitle>

            <LogoSubtitle>СПОРЕДБА НА ТЕЛЕВИЗОРИ</LogoSubtitle>
          </LogoText>
        </Logo>

        <Nav aria-label="Главна навигација">
          <NavList>{renderItems(NavItem)}</NavList>

          <MobileCta to="/odberi-tv" onClick={() => setMenuOpen(false)}>
            Одбери ТВ
          </MobileCta>

          <MenuToggle
            ref={toggleRef}
            type="button"
            aria-label={menuOpen ? "Затвори мени" : "Отвори мени"}
            aria-expanded={menuOpen}
            aria-controls="main-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
          </MenuToggle>
        </Nav>
      </NavInner>

      {menuOpen && (
        <MobilePanel id="main-menu">
          <MobileList>{renderItems(MobileItem)}</MobileList>
        </MobilePanel>
      )}
    </NavMain>
  );
};

export default Navigation;
