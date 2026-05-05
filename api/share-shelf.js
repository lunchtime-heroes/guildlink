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

// Single tile: cover art + rank label below
function makeTile(game, rank, w, h) {
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
            borderRadius: "12px",
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
            borderRadius: "12px",
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
      style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" },
      children: [
        cover,
        {
          type: "div",
          props: {
            style: { display: "flex", color: GOLD, fontSize: 22, fontWeight: 700 },
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

    // Sizing
    // Canvas: 1080x1080
    // Left column: #1 large tile
    // Right column: #2-4 stacked vertically
    // Row 2: #5-7
    // Row 3: #8-10

    const PAD = 48;
    const GAP = 14;
    const CONTENT_W = 1080 - PAD * 2; // 984px

    // Left col + right col layout for top section
    // Left: ~44% of content width
    const leftW = Math.floor(CONTENT_W * 0.44); // 433px
    const rightW = CONTENT_W - leftW - GAP;      // 537px
    // Right col has 3 tiles with 2 gaps
    const smallW = Math.floor((rightW - GAP * 2) / 3); // 170px
    // #1 height matches 3 small tiles stacked
    const smallH = 180;
    const bigH = smallH * 3 + GAP * 2; // 568px

    // Bottom rows: 3 tiles each across full width
    const rowW = Math.floor((CONTENT_W - GAP * 2) / 3); // 318px
    const rowH = 200;

    // Top section Y start (after title area)
    const TITLE_H = 100;
    const TOP_Y = PAD + TITLE_H + 20;

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
            // Top gold line
            { type: "div", props: { style: { display: "flex", width: 1080, height: 3, backgroundColor: GOLD, marginTop: 70 } } },

            // Title pill
            {
              type: "div",
              props: {
                style: { display: "flex", justifyContent: "center", marginTop: -24 },
                children: {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      border: "3px solid " + GOLD,
                      borderRadius: "16px",
                      padding: "10px 40px",
                      backgroundColor: "#0d1424",
                    },
                    children: {
                      type: "div",
                      props: {
                        style: { display: "flex", color: GOLD, fontSize: 40, fontWeight: 700, letterSpacing: "2px" },
                        children: "MY TOP 10",
                      },
                    },
                  },
                },
              },
            },

            // Main content area
            {
              type: "div",
              props: {
                style: { display: "flex", flexDirection: "column", padding: "24px " + PAD + "px 0", gap: GAP + "px", flex: 1 },
                children: [
                  // Top section: #1 left, #2-4 right
                  {
                    type: "div",
                    props: {
                      style: { display: "flex", flexDirection: "row", gap: GAP + "px", alignItems: "flex-start" },
                      children: [
                        // #1 — large left tile
                        makeTile(enriched[0], 1, leftW, bigH),
                        // #2–4 — stacked right column
                        {
                          type: "div",
                          props: {
                            style: { display: "flex", flexDirection: "column", gap: GAP + "px" },
                            children: [
                              {
                                type: "div",
                                props: {
                                  style: { display: "flex", flexDirection: "row", gap: GAP + "px" },
                                  children: [
                                    makeTile(enriched[1], 2, smallW, smallH),
                                    makeTile(enriched[2], 3, smallW, smallH),
                                    makeTile(enriched[3], 4, smallW, smallH),
                                  ],
                                },
                              },
                              {
                                type: "div",
                                props: {
                                  style: { display: "flex", flexDirection: "row", gap: GAP + "px" },
                                  children: [
                                    makeTile(enriched[4], 5, smallW, smallH),
                                    makeTile(enriched[5], 6, smallW, smallH),
                                    makeTile(enriched[6], 7, smallW, smallH),
                                  ],
                                },
                              },
                              {
                                type: "div",
                                props: {
                                  style: { display: "flex", flexDirection: "row", gap: GAP + "px" },
                                  children: [
                                    makeTile(enriched[7], 8, smallW, smallH),
                                    makeTile(enriched[8], 9, smallW, smallH),
                                    makeTile(enriched[9], 10, smallW, smallH),
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

            // Bottom gold line
            { type: "div", props: { style: { display: "flex", width: 1080, height: 3, backgroundColor: GOLD } } },

            // Footer
            {
              type: "div",
              props: {
                style: { display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", padding: "16px 0" },
                children: [
                  { type: "div", props: { style: { display: "flex", color: WHITE, fontSize: 28, fontWeight: 700 }, children: handle + " on " } },
                  { type: "div", props: { style: { display: "flex", color: GOLD, fontSize: 28, fontWeight: 700 }, children: "GuildLink.gg" } },
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
