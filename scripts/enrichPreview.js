const fs = require("fs");

const masterPath = "src/data/masterTvs.json";
const outputPath = "src/data/enrichedPreview.json";

const master = JSON.parse(fs.readFileSync(masterPath, "utf8"));

const updates = {
  "lg-55c51la": {
    technology: "OLED",
    resolution: "4K",
    refreshRate: 120,
    year: 2025,
    os: "webOS 25",
    hdr: true,
    dolbyVision: true,
    hdmi: 4,
    usb: 3,
    vrr: true,
    allm: true,
    pictureProcessor: "α9 AI Processor 4K Gen8",
    hdrFormats: ["Dolby Vision", "HDR10", "HLG"],
    brightness: null,
    audioPower: 40,
    audioChannels: "2.2",
    dolbyAtmos: true,
    freeSync: true,
    gSync: true
  },

  "lg-55qned70a6a": {
    technology: "QNED",
    resolution: "4K",
    refreshRate: 60,
    year: 2025,
    os: "webOS 25",
    hdr: true,
    dolbyVision: false,
    hdmi: 3,
    usb: 1,
    vrr: true,
    allm: true,
    pictureProcessor: "α7 AI Processor 4K Gen8",
    hdrFormats: ["HDR10", "HLG"],
    brightness: null,
    audioPower: 20,
    audioChannels: "2.0",
    dolbyAtmos: false,
    freeSync: false,
    gSync: false
  },

  "lg-55qned80a3a": {
    technology: "QNED",
    resolution: "4K",
    refreshRate: 60,
    year: 2025,
    os: "webOS 25",
    hdr: true,
    dolbyVision: false,
    hdmi: 3,
    usb: 2,
    vrr: true,
    allm: true,
    pictureProcessor: "α7 AI Processor 4K Gen8",
    hdrFormats: ["HDR10", "HLG"],
    brightness: null,
    audioPower: 20,
    audioChannels: "2.0",
    dolbyAtmos: false,
    freeSync: false,
    gSync: false
  },

  "tcl-55c6k": {
    technology: "QD-Mini LED",
    resolution: "4K",
    refreshRate: 144,
    year: 2025,
    os: "Google TV",
    hdr: true,
    dolbyVision: true,
    hdmi: 4,
    usb: 2,
    vrr: true,
    allm: true,
    pictureProcessor: "AiPQ Pro",
    hdrFormats: ["Dolby Vision IQ", "HDR10+", "HDR10", "HLG"],
    brightness: "1000 nits",
    audioPower: 45,
    audioChannels: "2.1",
    dolbyAtmos: true,
    freeSync: true,
    gSync: false
  },

  "tcl-55p655": {
    technology: "LED",
    resolution: "4K",
    refreshRate: 60,
    year: 2024,
    os: "Google TV",
    hdr: true,
    dolbyVision: false,
    hdmi: 3,
    usb: 1,
    vrr: null,
    allm: true,
    pictureProcessor: "AiPQ",
    hdrFormats: ["HDR10"],
    brightness: null,
    audioPower: 20,
    audioChannels: "2.0",
    dolbyAtmos: false,
    freeSync: null,
    gSync: null
  }
};

const result = master
  .filter(tv => updates[tv.id])
  .map(tv => ({
    ...tv,
    ...updates[tv.id]
  }));

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log(`Готово: ${outputPath}`);
console.log(`Модели: ${result.length}`);
console.log("masterTvs.json НЕ Е ПРОМЕНЕТ.");
