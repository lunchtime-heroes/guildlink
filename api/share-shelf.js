// api/share-shelf.js — Generates a shareable PNG of a user's top 10 shelf-ranked games

const satori = require("satori").default;
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const GOLD = "#fbae17";
const WHITE = "#e2e8f4";
const CARD_BG = "#162035";
const BG = "#0d1424";
const DIM = "#ffffff22";

// Fetch a remote image and return as base64 data URI
async function imageToBase64(url) {
  try {
    const https = require("https");
    const http = require("http");
    const client = url.startsWith("https") ? https : http;
    return await new Promise((resolve, reject) => {
      client.get(url, (res) => {
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const mime = res.headers["content-type"] || "image/jpeg";
          resolve("data:" + mime + ";base64," + buf.toString("base64"));
        });
        res.on("error", reject);
      }).on("error", reject);
    });
  } catch {
    return null;
  }
}

// Build a single cover tile with rank badge
function makeTile(game, rank, size) {
  const isTop = rank === 1;
  const badgeSize = isTop ? 36 : 28;
  const badgeFontSize = isTop ? 18 : 14;

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        flex: isTop ? "none" : 1,
        width: isTop ? size : undefined,
      },
      children: [
        // Cover art with rank badge
        {
          type: "div",
          props: {
            style: {
              position: "relative",
              width: size,
              height: Math.round(size * 1.33),
              borderRadius: 10,
              overflow: "hidden",
              border: isTop ? "3px solid " + GOLD : "2px solid " + DIM,
              flexShrink: 0,
            },
            children: [
              // Cover image or fallback
              game.cover
                ? {
                    type: "img",
                    props: {
                      src: game.cover,
                      style: { width: "100%", height: "100%", objectFit: "cover" },
                    },
                  }
                : {
                    type: "div",
                    props: {
                      style: {
                        width: "100%",
                        height: "100%",
                        background: CARD_BG,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: GOLD,
                        fontSize: 28,
                        fontWeight: 700,
                      },
                      children: "?",
                    },
                  },
              // Rank badge
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: 6,
                    left: 6,
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                    background: isTop ? GOLD : BG + "dd",
                    border: isTop ? "none" : "1px solid " + GOLD + "88",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isTop ? BG : GOLD,
                    fontSize: badgeFontSize,
                    fontWeight: 700,
                  },
                  children: String(rank),
                },
              },
            ],
          },
        },
        // Game name below tile
        {
          type: "div",
          props: {
            style: {
              color: isTop ? WHITE : WHITE + "bb",
              fontSize: isTop ? 18 : 13,
              fontWeight: 700,
              textAlign: "center",
              overflow: "hidden",
              whiteSpace: "nowrap",
              width: size,
            },
            children: game.name.length > (isTop ? 28 : 18)
              ? game.name.slice(0, isTop ? 28 : 18) + "…"
              : game.name,
          },
        },
      ],
    },
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const url = new URL(req.url, "https://guildlink.gg");

  let games = [];
  try { games = JSON.parse(url.searchParams.get("games") || "[]"); } catch {}

  const handle = url.searchParams.get("handle") || "";
  const top10 = games.slice(0, 10);

  // Fetch all cover images as base64 in parallel
  const covers = await Promise.all(
    top10.map(g => g.cover_url ? imageToBase64(g.cover_url) : Promise.resolve(null))
  );

  const enriched = top10.map((g, i) => ({ ...g, cover: covers[i] }));

  const fontPath = path.join(process.cwd(), "public", "DMSans-Bold.ttf");
  const fontData = fs.readFileSync(fontPath);

  const bgPath = path.join(process.cwd(), "public", "share-bg.png");
  const bgBase64 = fs.readFileSync(bgPath).toString("base64");
  const bgSrc = "data:image/png;base64," + bgBase64;

  // Layout constants
  const CARD_W = 970;
  const INNER_PAD = 32;
  const GAP = 12;

  // Row sizing
  // Row 1: 1 tile — large
  const tile1Size = 180;
  // Rows 2-4: 3 tiles each
  const tile3Size = Math.floor((CARD_W - INNER_PAD * 2 - GAP * 2) / 3);

  // Build rows
  const row1 = enriched.slice(0, 1);   // #1
  const row2 = enriched.slice(1, 4);   // #2–4
  const row3 = enriched.slice(4, 7);   // #5–7
  const row4 = enriched.slice(7, 10);  // #8–10

  const makeRow = (items, startRank, tileSize, centered) => ({
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "row",
        justifyContent: centered ? "center" : "space-between",
        alignItems: "flex-start",
        gap: GAP,
        width: "100%",
      },
      children: items.map((g, i) => makeTile(g, startRank + i, tileSize)),
    },
  });

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: 1080,
          height: 1080,
          display: "flex",
          position: "relative",
          backgroundColor: BG,
          backgroundImage: "url(" + bgSrc + ")",
          backgroundSize: "cover",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 40,
                left: 55,
                width: CARD_W,
                height: 1000,
                backgroundColor: CARD_BG,
                borderRadius: 48,
                border: "5px solid " + GOLD,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "36px " + INNER_PAD + "px 28px",
                gap: 20,
              },
              children: [
                // Header
                {
                  type: "div",
                  props: {
                    style: { color: GOLD, fontSize: 40, fontWeight: 700, textAlign: "center" },
                    children: "My GuildLink Top 10",
                  },
                },
                // Row 1 — #1 alone, centered
                makeRow(row1, 1, tile1Size, true),
                // Row 2 — #2–4
                makeRow(row2, 2, tile3Size, false),
                // Row 3 — #5–7
                makeRow(row3, 5, tile3Size, false),
                // Row 4 — #8–10
                makeRow(row4, 8, tile3Size, false),
                // Footer
                {
                  type: "div",
                  props: {
                    style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: "auto" },
                    children: [
                      { type: "div", props: { style: { color: WHITE + "88", fontSize: 20, fontWeight: 700 }, children: handle } },
                      { type: "div", props: { style: { color: GOLD, fontSize: 26, fontWeight: 700 }, children: "GuildLink.gg" } },
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
};
