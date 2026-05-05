// api/share-shelf.js — Pixel-perfect absolute positioning via sharp compositing

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
  } catch { return null; }
}

async function resizeCover(buf, w, h) {
  try {
    return await sharp(buf)
      .resize(w, h, { fit: "cover", position: "center" })
      .png()
      .toBuffer();
  } catch { return null; }
}

async function placeholderTile(w, h) {
  return await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 22, g: 32, b: 53, alpha: 1 } }
  }).png().toBuffer();
}

async function textBuffer(text, fontSize, color, fontData) {
  const satori = require("satori").default;
  const svg = await satori(
    { type: "div", props: { style: { display: "flex", color, fontSize, fontWeight: 700, whiteSpace: "nowrap" }, children: text } },
    { width: 800, height: fontSize + 16, fonts: [{ name: "DM Sans", data: fontData, weight: 700 }] }
  );
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

    // ── Pixel-perfect layout constants ──────────────────────────────
    // All positions are absolute (left, top) on the 1080×1080 canvas

    // #1 tile
    const B_LEFT = 58;
    const B_TOP  = 165;
    const BW     = 390;
    const BH     = 470;

    // Small tiles
    const SW     = 150;
    const SH     = 200;
    const S_LEFT = 490;   // x start of right column
    const S_GAP  = 18;    // gap between small tiles horizontally

    // Row y positions (top of each cover image)
    const ROW1_Y = 165;
    const ROW2_Y = 403;   // ROW1_Y + SH + 38 (label area)
    const ROW3_Y = 641;   // ROW2_Y + SH + 38

    // Label font sizes
    const BIG_LABEL_FS  = 28;
    const SMALL_LABEL_FS = 22;
    const LABEL_GAP = 8; // gap between bottom of cover and label

    // Footer
    const FOOTER_Y = 1010;
    // ────────────────────────────────────────────────────────────────

    // Resize covers
    const bigCover = rawBuffers[0]
      ? await resizeCover(rawBuffers[0], BW, BH)
      : await placeholderTile(BW, BH);

    const smallCovers = await Promise.all(
      rawBuffers.slice(1).map(buf =>
        buf ? resizeCover(buf, SW, SH) : placeholderTile(SW, SH)
      )
    );

    // Build rank labels
    const bigLabel = await textBuffer("#1", BIG_LABEL_FS, GOLD_HEX, fontData);
    const smallLabels = await Promise.all(
      [2,3,4,5,6,7,8,9,10].map(n => textBuffer("#" + n, SMALL_LABEL_FS, GOLD_HEX, fontData))
    );

    // Two-color footer
    const satori = require("satori").default;
    const footerSvg = await satori(
      {
        type: "div",
        props: {
          style: { display: "flex", flexDirection: "row", alignItems: "center", gap: 8, whiteSpace: "nowrap" },
          children: [
            { type: "div", props: { style: { display: "flex", color: WHITE_HEX, fontSize: 32, fontWeight: 700 }, children: handle + " on " } },
            { type: "div", props: { style: { display: "flex", color: GOLD_HEX, fontSize: 32, fontWeight: 700 }, children: "GuildLink.gg" } },
          ],
        },
      },
      { width: 900, height: 50, fonts: [{ name: "DM Sans", data: fontData, weight: 700 }] }
    );
    const footerBuf = await sharp(Buffer.from(footerSvg)).trim().png().toBuffer();

    // Measure label widths for centering
    const bigLabelMeta    = await sharp(bigLabel).metadata();
    const smallLabelMetas = await Promise.all(smallLabels.map(l => sharp(l).metadata()));
    const footerMeta      = await sharp(footerBuf).metadata();

    // Build composites with absolute positions
    const composites = [];

    // Helper: center label under a tile
    const centerLabel = (tileLeft, tileWidth, labelWidth) =>
      tileLeft + Math.floor((tileWidth - labelWidth) / 2);

    // #1
    if (bigCover) composites.push({ input: bigCover, top: B_TOP, left: B_LEFT });
    composites.push({
      input: bigLabel,
      top: B_TOP + BH + LABEL_GAP,
      left: centerLabel(B_LEFT, BW, bigLabelMeta.width || 40),
    });

    // Small tiles — 3 columns, 3 rows
    const rowYs = [ROW1_Y, ROW2_Y, ROW3_Y];
    rowYs.forEach((rowY, rowIdx) => {
      [0, 1, 2].forEach((colIdx) => {
        const coverIdx = rowIdx * 3 + colIdx;
        const tileLeft = S_LEFT + colIdx * (SW + S_GAP);
        const cover = smallCovers[coverIdx];
        if (cover) composites.push({ input: cover, top: rowY, left: tileLeft });
        const labelW = smallLabelMetas[coverIdx]?.width || 30;
        composites.push({
          input: smallLabels[coverIdx],
          top: rowY + SH + LABEL_GAP,
          left: centerLabel(tileLeft, SW, labelW),
        });
      });
    });

    // Footer — centered horizontally
    const footerX = Math.floor((1080 - (footerMeta.width || 500)) / 2);
    composites.push({ input: footerBuf, top: FOOTER_Y, left: footerX });

    const png = await sharp(bgPath)
      .composite(composites.filter(c => c.input != null))
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
