/*
  Изолиран worker процес за ML отстранување позадина.

  @imgly/background-removal-node носи своја сопствена sharp (native) верзија,
  различна од sharp-от што веќе го користи главниот скрипт. Двете native
  верзии во ИСТ Node процес предизвикуваат segmentation fault (GLib/GObject
  судир). Затоа ML повикот секогаш оди во свој посебен процес — комуницира
  само преку фајлови на дискот, никогаш преку споделена меморија/модули.
*/
const { removeBackground } = require("@imgly/background-removal-node");
const fs = require("fs");

(async () => {
  const [, , inputPath, outputPath, mime] = process.argv;
  const buf = fs.readFileSync(inputPath);
  const blob = new Blob([buf], { type: mime });
  const result = await removeBackground(blob);
  fs.writeFileSync(outputPath, Buffer.from(await result.arrayBuffer()));
})().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});
