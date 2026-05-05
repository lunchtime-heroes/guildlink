// api/share-shelf.js — Uses sharp compositing for pixel-perfect layout

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const GOLD_HEX = "#fbae17";
const WHITE_HEX = "#e2e8f4";

async function fetchImageBuffer(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function resizeCover(buf, w, h) {
  try {
    return await sharp(buf)
      .resize(w, h, { fit: "cover", position: "center" })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

async function placeholderTile(w, h) {
  return await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 22, g: 32, b: 53, alpha: 1 } }
  }).png().toBuffer();
}

async function textBuffer(text, fontSize, color, fontData) {
  const satori = require("satori").default;
  const svg = await satori(
    {
      type: "div",
      props: {
        style: { display: "flex", color, fontSize, fontWeight: 700, whiteSpace: "nowrap" },
        children: text,
      },
    },
    {
      width: 600, height: fontSize + 16,
      fonts: [{ name: "DM Sans", data: fontData, weight: 700 }],
    }
  );
  // Trim transparent pixels so width reflects actual text width
  return await sharp(Buffer.from(svg)).trim().png().toBuffer();
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const url = new URL(req.url, "https://guildlink.gg");

    let games = [];
    try { games = JSON.parse(url.searchParams.get("games") || "[]"); } catch {}

    const handle = url.searchParams.get("handle") || "";
    const top10 = games.slice(0, 10);

    const rawBuffers = await Promise.all(
      top10.map(g => g.cover_url ? fetchImageBuffer(g.cover_url) : Promise.resolve(null))
    );

    const fontPath = path.join(process.cwd(), "public", "DMSans-Bold.ttf");
    const fontData = fs.readFileSync(fontPath);
    const bgPath = path.join(process.cwd(), "public", "top-10-share.png");

    // Layout
    const PAD = 58;
    const GAP = 18;
    const CONTENT_TOP = 165;
    const SW = 150;
    const SH = 200;
    const LABEL_FONT = 22;
    const LABEL_GAP = 8;
    const LABEL_H = LABEL_FONT + 4;
    const rightColW = SW * 3 + GAP * 2;
    const leftColW = 1080 - PAD * 2 - GAP - rightColW;
    const BW = leftColW;
    const BH = SH * 2 + GAP; // 412px — spans 2 rows
    const BIG_LABEL_FONT = 28;
    const rightX = PAD + leftColW + GAP;

    // Resize covers
    const bigCover = rawBuffers[0]
      ? await resizeCover(rawBuffers[0], BW, BH)
      : await placeholderTile(BW, BH);

    const smallCovers = await Promise.all(
      rawBuffers.slice(1).map(buf =>
        buf ? resizeCover(buf, SW, SH) : placeholderTile(SW, SH)
      )
    );

    // Build text buffers
    const bigLabel = await textBuffer("#1", BIG_LABEL_FONT, GOLD_HEX, fontData);
    const smallLabels = await Promise.all(
      [2,3,4,5,6,7,8,9,10].map(n => textBuffer("#" + n, LABEL_FONT, GOLD_HEX, fontData))
    );
    // Footer — two-color satori render matching share-post pattern
    const satori = require("satori").default;
    const footerSvg = await satori(
      {
        type: "div",
        props: {
          style: { display: "flex", flexDirection: "row", alignItems: "center", gap: 10, whiteSpace: "nowrap" },
          children: [
            { type: "div", props: { style: { display: "flex", color: WHITE_HEX, fontSize: 26, fontWeight: 700 }, children: handle + " on " } },
            { type: "div", props: { style: { display: "flex", color: GOLD_HEX, fontSize: 26, fontWeight: 700 }, children: "GuildLink.gg" } },
          ],
        },
      },
      { width: 800, height: 50, fonts: [{ name: "DM Sans", data: fontData, weight: 700 }] }
    );
    const footerBuf = await sharp(Buffer.from(footerSvg)).trim().png().toBuffer();

    // Measure all text widths for centering — all awaited before compositing
    const bigLabelMeta = await sharp(bigLabel).metadata();
    const smallLabelMetas = await Promise.all(smallLabels.map(l => sharp(l).metadata()));
    const footerMeta = await sharp(footerBuf).metadata();

    const bigLabelX = PAD + Math.floor((BW - (bigLabelMeta.width || 40)) / 2);
    const footerX = Math.floor((1080 - (footerMeta.width || 400)) / 2);

    // Build composites — fully synchronous, no async inside
    const composites = [];

    // #1
    composites.push({ input: bigCover, top: CONTENT_TOP, left: PAD });
    composites.push({ input: bigLabel, top: CONTENT_TOP + BH + LABEL_GAP, left: bigLabelX });

    // #2-10
    [[0,1,2],[3,4,5],[6,7,8]].forEach((row, rowIdx) => {
      const tileTop = CONTENT_TOP + rowIdx * (SH + LABEL_GAP + LABEL_H + GAP);
      row.forEach((coverIdx, colIdx) => {
        const tileLeft = rightX + colIdx * (SW + GAP);
        const labelW = smallLabelMetas[coverIdx].width || 30;
        const labelX = tileLeft + Math.floor((SW - labelW) / 2);
        composites.push({ input: smallCovers[coverIdx], top: tileTop, left: tileLeft });
        composites.push({ input: smallLabels[coverIdx], top: tileTop + SH + LABEL_GAP, left: labelX });
      });
    });

    // Footer
    composites.push({ input: footerBuf, top: 1010, left: footerX });

    const png = await sharp(bgPath)
      .composite(composites)
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.end(png);

  } catch (err) {
    console.error("share-shelf error:", err?.message || err);
    console.error("share-shelf stack:", err?.stack);
    res.status(500).json({ error: err?.message || String(err) });
  }
};
