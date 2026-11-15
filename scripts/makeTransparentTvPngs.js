const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");
const sharp = require("sharp");

const execFileAsync = promisify(execFile);
const ML_WORKER = path.join(__dirname, "_mlWorker.js");

/*
  Ги прави вистинските продукт-фотографии на телевизорите проѕирни, за да
  може "Погледни во соба" да ги прикаже без бело/сиво квадратче околу нив.

  ХИБРИДЕН пристап — два методи, автоматски избор на побезбедниот резултат:

  1. Геометриски flood fill од работ на сликата, со ЛОКАЛНА толеранција
     (секој пиксел се споредува со соседот од кој доаѓаме, не со фиксен
     "целен" color) — бришеме само позадински пиксели поврзани со работ.
     Поради самата геометрија (поврзаност со работ), НИКОГАШ не може да
     избрише реален дел од телевизорот — тоа е гаранција, не хеуристика.
     Послаба страна: порабиво/назабено сечење отколку вистински ML модел.

  2. ML сегментација (@imgly/background-removal-node, работи локално, без
     мрежа по првото симнување на моделот) — многу поглатки/чисти рабови на
     чисти студио-фотки, НО е генеричен "најважен субјект на сликата" модел,
     не знае дека телевизорот (рамката) е производот, не она што е ПРИКАЖАНО
     на екранот. На пример, ТВ со природна сцена/уметност на екранот (Frame
     TV, лајфстајл реклами) понекогаш целосно ја брише самата рамка на
     телевизорот, задржувајќи само парчиња од сликата на екранот — катастрофа,
     полошо од flood fill.

  Затоа: земаме го flood fill резултатот како „доверлива“ основа (никогаш не
  лаже за тоа ДАЛИ пиксел е дел од телевизорот), па го користиме ML резултатот
  САМО ако се согласува со flood fill над доволен процент од таа доверлива
  површина (ML_TRUST_OVERLAP) — инаку паѓаме назад на flood fill.

  Старите слики НЕ се допираат. Излезот оди во
  public/images/tvs-transparent/<tv.id>.webp (проѕирен WebP, не PNG — PNG со
  алфа на овие резолуции излегуваше стотици MB за целата база), именувано по
  id-то од masterTvs.json (единствен за секој телевизор), без разлика дали
  изворната слика е локален фајл или на надворешен CDN (Setec).

  Нема повторно преземање/обработка на слика која веќе има готов излез,
  освен со --force.
*/

const ROOT = path.join(__dirname, "..");
const MASTER_TVS = path.join(ROOT, "src/Data/masterTvs.json");
const OUT_DIR = path.join(ROOT, "public/images/tvs-transparent");
const CONCURRENCY = 4;
const FORCE = process.argv.includes("--force");
const NO_ML = process.argv.includes("--no-ml");
const FLOOD_THRESHOLD = 12;
const ML_TRUST_OVERLAP = 0.85;

function readMasterTvs() {
  const data = JSON.parse(fs.readFileSync(MASTER_TVS, "utf8"));
  return Array.isArray(data) ? data : data.tvs || Object.values(data)[0];
}

async function loadImageBuffer(tv) {
  if (/^https?:\/\//.test(tv.image)) {
    const res = await fetch(tv.image);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const localPath = path.join(ROOT, "public", tv.image.replace(/^\//, ""));
  return fs.readFileSync(localPath);
}

/**
 * Flood fill со локална толеранција. Враќа mask (Uint8Array, 1 = позадина)
 * во исти димензии како влезот — НЕ ја менува `data`.
 */
function floodFillBackgroundMask(data, width, height, channels, threshold) {
  const idxOf = (x, y) => (y * width + x) * channels;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let qHead = 0, qTail = 0;

  const colorDist = (idxA, idxB) => {
    const dr = data[idxA] - data[idxB];
    const dg = data[idxA + 1] - data[idxB + 1];
    const db = data[idxA + 2] - data[idxB + 2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  const seedBorder = (x, y) => {
    const p = y * width + x;
    if (visited[p]) return;
    visited[p] = 1;
    queue[qTail++] = p;
  };
  for (let x = 0; x < width; x++) { seedBorder(x, 0); seedBorder(x, height - 1); }
  for (let y = 0; y < height; y++) { seedBorder(0, y); seedBorder(width - 1, y); }

  const tryExpand = (fromIdx, x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    if (colorDist(fromIdx, idxOf(x, y)) >= threshold) return;
    visited[p] = 1;
    queue[qTail++] = p;
  };

  while (qHead < qTail) {
    const p = queue[qHead++];
    const x = p % width;
    const y = (p / width) | 0;
    const fromIdx = idxOf(x, y);
    tryExpand(fromIdx, x + 1, y);
    tryExpand(fromIdx, x - 1, y);
    tryExpand(fromIdx, x, y + 1);
    tryExpand(fromIdx, x, y - 1);
  }

  return visited;
}

const ML_MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/**
 * ML сегментација преку @imgly/background-removal-node, изолирана во свој
 * процес (видете коментар во _mlWorker.js — конфликт на native sharp верзии
 * инаку предизвикува segfault). Враќа opacity mask (Uint8Array, 1 = проѕирно
 * /позадина) во исти димензии како влезот, или null ако ML не успее или
 * излезе со поинакви димензии (не се verified пиксел-по-пиксел во тој
 * случај).
 */
async function mlBackgroundMask(inputBuffer, format, width, height) {
  const mime = ML_MIME[format];
  if (!mime) return null;

  const tmpId = crypto.randomUUID();
  const inPath = path.join(os.tmpdir(), `tv-ml-in-${tmpId}.${format}`);
  const outPath = path.join(os.tmpdir(), `tv-ml-out-${tmpId}.png`);

  try {
    fs.writeFileSync(inPath, inputBuffer);
    await execFileAsync(process.execPath, [ML_WORKER, inPath, outPath, mime], {
      timeout: 60000,
    });

    const { data: mlData, info } = await sharp(outPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (info.width !== width || info.height !== height) return null;

    const mask = new Uint8Array(width * height);
    for (let p = 0; p < width * height; p++) {
      mask[p] = mlData[p * info.channels + 3] < 128 ? 1 : 0;
    }
    return mask;
  } catch {
    return null;
  } finally {
    fs.rmSync(inPath, { force: true });
    fs.rmSync(outPath, { force: true });
  }
}

async function removeBackground(inputBuffer, { useML = true } = {}) {
  const meta = await sharp(inputBuffer).metadata();
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const floodMask = floodFillBackgroundMask(data, width, height, channels, FLOOD_THRESHOLD);

  let finalMask = floodMask;
  let usedML = false;

  if (useML) {
    const mlMask = await mlBackgroundMask(inputBuffer, meta.format, width, height);
    if (mlMask) {
      // "доверлива" површина = она што flood fill е сигурен дека Е телевизор
      let trustedOpaque = 0;
      let agreeingOpaque = 0;
      for (let p = 0; p < width * height; p++) {
        if (!floodMask[p]) {
          trustedOpaque++;
          if (!mlMask[p]) agreeingOpaque++;
        }
      }
      const overlap = trustedOpaque > 0 ? agreeingOpaque / trustedOpaque : 0;
      if (overlap >= ML_TRUST_OVERLAP) {
        finalMask = mlMask;
        usedML = true;
      }
    }
  }

  let erased = 0;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (finalMask[p]) {
        data[p * channels + 3] = 0;
        erased++;
      } else {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  /*
    Многу продукт-фотографии имаат огромна бела маргина горе/долу (бренд
    беџови, QR кодови, "iF Design Award" слики) кои остануваат дел од
    платното дури и откако позадината станува проѕирна. Ако не се исечат,
    "width:100%; height:auto" во компонентата ја зема пропорцијата на ЦЕЛОТО
    платно (со маргините), не на самиот телевизор — голем дел (па дури и
    целиот телевизор) завршува надвор од видливиот кадар. Затоа сечеме до
    вистинската содржина пред да зачуваме, со мала подлошка за сенка/рабови.
  */
  let cropBuf = sharp(data, { raw: { width, height, channels } });
  if (maxX >= minX && maxY >= minY) {
    const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.02);
    const left = Math.max(0, minX - pad);
    const top = Math.max(0, minY - pad);
    const cropW = Math.min(width - left, maxX - minX + 1 + pad * 2);
    const cropH = Math.min(height - top, maxY - minY + 1 + pad * 2);
    cropBuf = cropBuf.extract({ left, top, width: cropW, height: cropH });
  }

  // 1000px is comfortably more than this ever renders at (the room card
  // tops out well under that), and WebP-with-alpha at this size keeps each
  // file in the tens of KB instead of PNG's 100s of KB-to-MB.
  const buffer = await cropBuf
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  return {
    buffer,
    usedML,
    erasedFraction: erased / (width * height),
  };
}

async function processOne(tv, stats) {
  const outPath = path.join(OUT_DIR, `${tv.id}.webp`);
  if (!FORCE && fs.existsSync(outPath)) {
    stats.skipped++;
    return;
  }

  try {
    const inputBuffer = await loadImageBuffer(tv);
    const { buffer, usedML, erasedFraction } = await removeBackground(inputBuffer, {
      useML: !NO_ML,
    });

    // sanity check: if almost nothing got erased, the corner-sample probably
    // hit the TV itself (unusual crop) rather than background — flag it
    // instead of silently writing a non-transparent "transparent" PNG.
    if (erasedFraction < 0.03) {
      stats.suspicious.push(`${tv.id} (${tv.brand} ${tv.model}) — only ${(erasedFraction * 100).toFixed(1)}% erased`);
    }

    fs.writeFileSync(outPath, buffer);
    stats.done++;
    if (usedML) stats.usedML++;
  } catch (err) {
    stats.failed.push(`${tv.id} (${tv.brand} ${tv.model}): ${err.message}`);
  }
}

async function runPool(items, worker, concurrency) {
  let i = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let tvs = readMasterTvs().filter((t) => t.image);
  if (process.env.TEST_LIMIT) {
    tvs = tvs.slice(0, Number(process.env.TEST_LIMIT));
  }
  if (process.env.ONLY_ID) {
    tvs = tvs.filter((t) => t.id === process.env.ONLY_ID);
  }
  console.log(`${tvs.length} телевизори со слика. Излез: ${path.relative(ROOT, OUT_DIR)}${NO_ML ? " (--no-ml)" : ""}`);

  const stats = { done: 0, skipped: 0, usedML: 0, failed: [], suspicious: [] };
  let processed = 0;

  await runPool(
    tvs,
    async (tv) => {
      await processOne(tv, stats);
      processed++;
      if (processed % 20 === 0) console.log(`  ...${processed}/${tvs.length}`);
    },
    CONCURRENCY
  );

  console.log(`\nГотово: ${stats.done} направени (${stats.usedML} со ML, ${stats.done - stats.usedML} со flood fill), ${stats.skipped} прескокнати.`);

  if (stats.suspicious.length) {
    console.log(`\n${stats.suspicious.length} сомнителни (веројатно позадината не е чисто бела/црна, провери рачно):`);
    stats.suspicious.forEach((s) => console.log(`  - ${s}`));
  }

  if (stats.failed.length) {
    console.log(`\n${stats.failed.length} неуспешни:`);
    stats.failed.forEach((s) => console.log(`  - ${s}`));
  }
}

main();
