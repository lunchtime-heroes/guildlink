// api/share-shelf.js

const satori = require("satori").default;
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const GOLD = "#fbae17";
const WHITE = "#e2e8f4";
const CARD_BG = "#162035";

async function imageToBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const mime = res.headers.get("content-type") || "image/jpeg";
    return "data:" + mime + ";base64," + buf.toString("base64");
  } catch {
    return null;
  }
}

function makeTile(game, rank, w, h, fontSize) {
  const cover = game.cover
    ? {
        type: "div",
        props: {
          style: {
            display: "flex",
            width: w,
            height: h,
            backgroundImage: "url(" + game.cover + ")",
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderRadius: "10px",
          },
          children: [],
        },
      }
    : {
        type: "div",
        props: {
          style: {
            display: "flex",
            width: w,
            height: h,
            borderRadius: "10px",
            backgroundColor: CARD_BG,
            alignItems: "center",
            justifyContent: "center",
            color: GOLD,
            fontSize: 24,
            fontWeight: 700,
          },
          children: "?",
        },
      };

  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" },
      children: [
        cover,
        {
          type: "div",
          props: {
            style: { display: "flex", color: GOLD, fontSize: fontSize || 20, fontWeight: 700 },
            children: "#" + rank,
          },
        },
      ],
    },
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const url = new URL(req.url, "https://guildlink.gg");

    let games = [];
    try { games = JSON.parse(url.searchParams.get("games") || "[]"); } catch {}

    const handle = url.searchParams.get("handle") || "";
    const top10 = games.slice(0, 10);

    const covers = await Promise.all(top10.map(g => g.cover_url ? imageToBase64(g.cover_url) : Promise.resolve(null)));
    const enriched = top10.map((g, i) => ({ ...g, cover: covers[i] }));

    const fontPath = path.join(process.cwd(), "public", "DMSans-Bold.ttf");
    const fontData = fs.readFileSync(fontPath);
    const bgPath = path.join(process.cwd(), "public", "top-10-share.png");
    const bgBase64 = fs.readFileSync(bgPath).toString("base64");
    const bgSrc = "data:image/png;base64," + bgBase64;

    // Exact measurements from background image analysis:
    // Content area: y=150 to y=1040 = 890px tall
    // Background is uniform — no built-in side padding
    // We use PAD=40 each side

    const PAD = 40;
    const GAP = 12;

    // Small tiles: exactly 150x200 per mockup spec
    const SW = 150;
    const SH = 200;
    const LABEL_H = 28; // rank label height + gap

    // Right column: 3 tiles + 2 gaps = 474px wide
    const rightColW = SW * 3 + GAP * 2; // 474px

    // Left col: fill remaining width
    const leftColW = 1080 - PAD * 2 - GAP - rightColW; // 1000 - 12 - 474 = 514px

    // #1 tile height: 2 tile units tall
    // One unit = SH + LABEL_H = 228px
    // Two units + one gap between = 228 + 12 + 228 = 468, minus the bottom label of the second unit
    // since #1 has its own label below: 2*SH + GAP = 412px
    const bigH = SH * 2 + GAP; // 412px — pure cover height matching 2 rows

    // Top spacer: content starts at y=150
    const TOP_SPACER = 150;

    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            width: 1080,
            height: 1080,
            backgroundImage: "url(" + bgSrc + ")",
            backgroundSize: "cover",
            backgroundPosition: "center",
          },
          children: [
            // Spacer — pushes content below title pill
            { type: "div", props: { style: { display: "flex", height: TOP_SPACER, width: 1080 }, children: [] } },

            // Main content row
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  flexDirection: "row",
                  paddingLeft: PAD + "px",
                  paddingRight: PAD + "px",
                  gap: GAP + "px",
                  alignItems: "flex-start",
                },
                children: [
                  // #1 — large left tile
                  makeTile(enriched[0], 1, leftColW, bigH, 28),

                  // #2–10 — 3x3 grid right
                  {
                    type: "div",
                    props: {
                      style: { display: "flex", flexDirection: "column", gap: GAP + "px" },
                      children: [
                        // Row: #2-4
                        {
                          type: "div",
                          props: {
                            style: { display: "flex", flexDirection: "row", gap: GAP + "px" },
                            children: [
                              makeTile(enriched[1], 2, SW, SH, 20),
                              makeTile(enriched[2], 3, SW, SH, 20),
                              makeTile(enriched[3], 4, SW, SH, 20),
                            ],
                          },
                        },
                        // Row: #5-7
                        {
                          type: "div",
                          props: {
                            style: { display: "flex", flexDirection: "row", gap: GAP + "px" },
                            children: [
                              makeTile(enriched[4], 5, SW, SH, 20),
                              makeTile(enriched[5], 6, SW, SH, 20),
                              makeTile(enriched[6], 7, SW, SH, 20),
                            ],
                          },
                        },
                        // Row: #8-10
                        {
                          type: "div",
                          props: {
                            style: { display: "flex", flexDirection: "row", gap: GAP + "px" },
                            children: [
                              makeTile(enriched[7], 8, SW, SH, 20),
                              makeTile(enriched[8], 9, SW, SH, 20),
                              makeTile(enriched[9], 10, SW, SH, 20),
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      { width: 1080, height: 1080, fonts: [{ name: "DM Sans", data: fontData, weight: 700 }] }
    );

    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.end(png);

  } catch (err) {
    console.error("share-shelf error:", err?.message || err);
    console.error("share-shelf stack:", err?.stack);
    res.status(500).json({ error: err?.message || String(err) });
  }
};
