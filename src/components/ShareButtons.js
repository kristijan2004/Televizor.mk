import React, { useState } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebookF, faInstagram } from "@fortawesome/free-brands-svg-icons";

// Props: { title: string, url?: string } — url defaults to window.location.href

const Row = styled.div`
  display: flex;
  align-items: center;

  gap: 10px;

  margin-top: 18px;
`;

const Label = styled.span`
  color: #999;

  font-size: 12px;

  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 0.6px;
`;

const ShareButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;

  width: 32px;
  height: 32px;

  border: 1px solid #e6e6e6;
  border-radius: 50%;

  background: white;

  color: #242582;

  font-size: 13px;

  cursor: pointer;

  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    background: #242582;

    color: white;

    border-color: #242582;
  }
`;

const Confirmation = styled.span`
  color: #242582;

  font-size: 12px;

  font-weight: 600;
`;

const copyToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

const ShareButtons = ({ title, url }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}&quote=${encodeURIComponent(title)}`;

  /*
    sharer.php only reliably shows the link-preview dialog (with `u` and
    `quote` attached) when opened as a popup window — a plain <a target="_blank">
    navigation makes logged-in accounts fall back to the blank "Create post"
    composer with no link attached.
  */
  const handleFacebookShare = (event) => {
    event.preventDefault();

    window.open(
      facebookHref,
      "facebook-share-dialog",
      "width=626,height=436,toolbar=0,menubar=0,location=0"
    );
  };

  /*
    Instagram has no web share-intent URL — unlike Facebook/X/WhatsApp, it does
    not support prefilling a post or story with an arbitrary link from a web
    page; there is no official `instagram.com/share?...` endpoint. The best we
    can do is copy the link and let the reader paste it into a Story/DM
    themselves. Don't "fix" this into a direct link later — it doesn't exist.
  */
  const handleInstagramShare = async (event) => {
    event.preventDefault();

    await copyToClipboard(shareUrl);

    setCopied(true);
    window.setTimeout(() => setCopied(false), 4000);

    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  return (
    <Row>
      <Label>Сподели</Label>

      <ShareButton
        href={facebookHref}
        onClick={handleFacebookShare}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Сподели „${title}" на Facebook`}
      >
        <FontAwesomeIcon icon={faFacebookF} />
      </ShareButton>

      <ShareButton
        href="https://www.instagram.com/"
        onClick={handleInstagramShare}
        aria-label={`Сподели „${title}" на Instagram`}
      >
        <FontAwesomeIcon icon={faInstagram} />
      </ShareButton>

      {copied && (
        <Confirmation role="status">
          Линкот е копиран — отвора се Instagram
        </Confirmation>
      )}
    </Row>
  );
};

export default ShareButtons;
