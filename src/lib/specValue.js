/*
 * Formatting of specification values for display.
 *
 * The data pipeline fills unknown specs with placeholders instead of leaving
 * them out: 0 for counts (hdmi, usb, audioPower), "—" for text fields
 * (brightness, pictureProcessor) and [] for hdrFormats. Printed as they are,
 * those look like real answers - "0 HDMI" reads as a TV without HDMI ports.
 * So they are shown as "Нема податок" instead.
 *
 * Booleans are left alone: we cannot tell a verified "no" from a default one,
 * and showing "Нема податок" for every TV without VRR would be worse.
 */

export const UNKNOWN = "Нема податок";

export function isUnknown(value) {
  if (value === null || value === undefined || value === "") return true;
  if (value === "—" || value === "-") return true;
  if (Array.isArray(value)) return value.length === 0;

  // No TV has 0 HDMI ports or 0 W of audio - that is a placeholder.
  return value === 0;
}

export function formatSpec(value, unit) {
  if (isUnknown(value)) return UNKNOWN;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Да" : "Не";

  return unit ? `${value} ${unit}` : value;
}
