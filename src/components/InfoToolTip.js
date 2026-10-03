import React, { useState } from "react";
import styled from "styled-components";

const Wrapper = styled.span`
  position: relative;

  display: inline-flex;
  align-items: center;

  margin-left: 6px;
`;

const Icon = styled.button`
  width: 17px;
  height: 17px;

  padding: 0;

  border: 1px solid #aaa;
  border-radius: 50%;

  background: white;
  color: #777;

  font-size: 11px;
  font-weight: 700;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: help;

  &:hover {
    border-color: #242582;
    color: #242582;
  }
`;

const Tooltip = styled.div`
  position: absolute;

  bottom: calc(100% + 10px);
  left: 50%;

  transform: translateX(-50%);

  width: 240px;

  padding: 12px 14px;

  background: #242582;
  color: white;

  border-radius: 9px;

  font-size: 12px;
  font-weight: 500;

  line-height: 1.5;

  text-align: left;

  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);

  z-index: 100;

  opacity: ${(props) => (props.show ? 1 : 0)};
  visibility: ${(props) => (props.show ? "visible" : "hidden")};

  transition: 0.15s;

  pointer-events: none;

  &::after {
    content: "";

    position: absolute;

    top: 100%;
    left: 50%;

    transform: translateX(-50%);

    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid #242582;
  }

  @media (max-width: 600px) {
    position: fixed;

    bottom: 20px;
    left: 20px;
    right: 20px;

    width: auto;

    transform: none;

    text-align: left;

    &::after {
      display: none;
    }
  }
`;

const InfoTooltip = ({ text }) => {
  const [show, setShow] = useState(false);

  return (
    <Wrapper>
      <Icon
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        aria-label="Повеќе информации"
      >
        i
      </Icon>

      <Tooltip show={show}>{text}</Tooltip>
    </Wrapper>
  );
};

export default InfoTooltip;
