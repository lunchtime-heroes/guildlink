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

// Resize a cover image buffer to exact dimensions, cropping to fill
async function resizeCover(buf, w, h) {
  try {
    return await sharp(buf)
      .resize(w, h, { fit: "cover", position: "center" })
      .roundCorners(10)
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

// Create a placeholder tile for missing covers
async function placeholderTile(w, h) {
  return await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 22, g: 32, b: 53, alpha: 1 } }
  }).png().toBuffer();
}

// Render text as SVG then to buffer via sharp
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
      width: 300, height: fontSize + 10,
      fonts: [{ name: "DM Sans", data: fontData, weight: 700 }],
    }
  );
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const url = new URL(req.url, "https://guildlink.gg");

    let games = [];
    try { games = JSON.parse(url.searchParams.get("games") || "[]"); } catch {}

    const handle = url.searchParams.get("handle") || "";
    const top10 = games.slice(0, 10);

    // Fetch all cover images in parallel
    const rawBuffers = await Promise.all(
      top10.map(g => g.cover_url ? fetchImageBuffer(g.cover_url) : Promise.resolve(null))
    );

    const fontPath = path.join(process.cwd(), "public", "DMSans-Bold.ttf");
    const fontData = fs.readFileSync(fontPath);
    const bgPath = path.join(process.cwd(), "public", "top-10-share.png");

    // Layout constants — pixel perfect
    const PAD = 44;
    const GAP = 12;
    const CONTENT_TOP = 152; // measured from bg image analysis

    // Small tiles: 150x200
    const SW = 150;
    const SH = 200;
    const LABEL_FONT = 22;
    const LABEL_GAP = 8; // gap between cover and label
    const LABEL_H = LABEL_FONT + 4;

    // Unit height (tile + label + gap below)
    const UNIT_H = SH + LABEL_GAP + LABEL_H;

    // Right col: 3 tiles wide
    const rightColW = SW * 3 + GAP * 2; // 474px
    // Left col
    const leftColW = 1080 - PAD * 2 - GAP - rightColW; // 1080-88-12-474 = 506px
    // Big tile height = 2 units + 1 gap (covers 2 rows)
    const BW = leftColW;
    const BH = SH * 2 + GAP; // 412px
    const BIG_LABEL_FONT = 28;
    const BIG_LABEL_H = BIG_LABEL_FONT + 4;

    // Right col X start
    const rightX = PAD + leftColW + GAP;

    // Resize all covers
    const bigCover = rawBuffers[0]
      ? await resizeCover(rawBuffers[0], BW, BH)
      : await placeholderTile(BW, BH);

    const smallCovers = await Promise.all(
      rawBuffers.slice(1).map(buf =>
        buf ? resizeCover(buf, SW, SH) : placeholderTile(SW, SH)
      )
    );

    // Build rank labels
    const bigLabel = await textBuffer("#1", BIG_LABEL_FONT, GOLD_HEX, fontData);
    const smallLabels = await Promise.all(
      [2,3,4,5,6,7,8,9,10].map(n => textBuffer("#" + n, LABEL_FONT, GOLD_HEX, fontData))
    );

    // Footer text
    const footerBuf = await textBuffer(handle + " on GuildLink.gg", 28, WHITE_HEX, fontData);
    // Measure footer width to center it
    const footerMeta = await sharp(footerBuf).metadata();
    const footerX = Math.floor((1080 - (footerMeta.width || 400)) / 2);

    // Measure big label to center it under #1
    const bigLabelMeta = await sharp(bigLabel).metadata();
    const bigLabelX = PAD + Math.floor((BW - (bigLabelMeta.width || 40)) / 2);

    // Build composites
    const composites = [];

    // #1 cover
    composites.push({ input: bigCover, top: CONTENT_TOP, left: PAD });
    // #1 label
    composites.push({ input: bigLabel, top: CONTENT_TOP + BH + LABEL_GAP, left: bigLabelX });

    // #2-10 covers and labels
    const rows = [[0,1,2], [3,4,5], [6,7,8]]; // indices into smallCovers / smallLabels
    rows.forEach((row, rowIdx) => {
      const tileTop = CONTENT_TOP + rowIdx * (SH + LABEL_GAP + LABEL_H + GAP);
      row.forEach((coverIdx, colIdx) => {
        const tileLeft = rightX + colIdx * (SW + GAP);
        composites.push({ input: smallCovers[coverIdx], top: tileTop, left: tileLeft });

        // Center label under tile
        sharp(smallLabels[coverIdx]).metadata().then(meta => {
          const labelX = tileLeft + Math.floor((SW - (meta.width || 30)) / 2);
          composites.push({ input: smallLabels[coverIdx], top: tileTop + SH + LABEL_GAP, left: labelX });
        });
      });
    });

    // Footer — placed at y=1010
    composites.push({ input: footerBuf, top: 1010, left: footerX });

    // Wait a tick for the async label measurements to complete
    await new Promise(r => setTimeout(r, 50));

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
