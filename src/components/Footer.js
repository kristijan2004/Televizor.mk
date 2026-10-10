import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

/*
  Сајтот немаше подножје воопшто, па немаше ни каде да стојат условите за
  користење. Намерно е тенко: линкови и една линија, без да се натрупува.
*/
const FooterCont = styled.footer`
  width: 100%;
  margin-top: 60px;
  padding: 28px 20px 34px;
  box-sizing: border-box;
  background: #242582;
`;

const Inner = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const Brand = styled.div`
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`;

const Note = styled.div`
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
`;

const Links = styled.nav`
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
`;

const FooterLink = styled(Link)`
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  text-decoration: none;

  &:hover {
    color: #ffffff;
    text-decoration: underline;
  }
`;

const Footer = () => (
  <FooterCont>
    <Inner>
      <div>
        <Brand>Display.mk</Brand>
        <Note>Споредба на телевизори во Северна Македонија</Note>
      </div>

      <Links>
        <FooterLink to="/novosti">Новости</FooterLink>
        <FooterLink to="/odberi-tv">Одбери ТВ</FooterLink>
        <FooterLink to="/uslovi">Услови за користење</FooterLink>
      </Links>
    </Inner>
  </FooterCont>
);

export default Footer;
