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

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function makeTile(game, rank, w, h) {
  const isTop = rank === 1;
  const badgeSize = isTop ? 32 : 24;
  const badgeFontSize = isTop ? 15 : 12;
  const nameFontSize = isTop ? 14 : 11;
  const safeName = truncate(game.name || "", isTop ? 22 : 13);

  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", width: w },
      children: [
        // Outer wrapper — position:relative + display:flex required for satori absolute children
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              position: "relative",
              width: w,
              height: h,
              borderRadius: "8px",
              overflow: "hidden",
              border: isTop ? "2px solid " + GOLD : "1.5px solid " + DIM,
            },
            children: [
              // Cover art fills entire tile
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    width: w,
                    height: h,
                    backgroundImage: game.cover ? "url(" + game.cover + ")" : "none",
                    backgroundColor: game.cover ? "transparent" : CARD_BG,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  },
                  children: game.cover ? [] : [
                    { type: "div", props: { style: { display: "flex", width: w, height: h, alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 20, fontWeight: 700 }, children: "?" } }
                  ],
                },
              },
              // Badge — absolutely positioned top-left
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    position: "absolute",
                    top: 5,
                    left: 5,
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: (badgeSize / 2) + "px",
                    background: isTop ? GOLD : "rgba(13,20,36,0.85)",
                    border: isTop ? "none" : "1.5px solid " + GOLD,
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
        // Name label
        {
          type: "div",
          props: {
            style: { display: "flex", color: isTop ? WHITE : WHITE + "cc", fontSize: nameFontSize, fontWeight: 700, textAlign: "center", width: w },
            children: safeName,
          },
        },
      ],
    },
  };
}

function makeRow(items, startRank, w, h, gap) {
  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: gap + "px" },
      children: items.map((g, i) => makeTile(g, startRank + i, w, h)),
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
    const bgPath = path.join(process.cwd(), "public", "share-bg.png");
    const bgBase64 = fs.readFileSync(bgPath).toString("base64");
    const bgSrc = "data:image/png;base64," + bgBase64;

    // Layout
    // Card: 970w x 1000h, padding 28px sides
    // Inner width: 970 - 56 = 914px
    const GAP = 8;
    const INNER_W = 914;

    // Row 1: 1 tile centered, larger
    const w1 = 180;
    const h1 = 240;

    // Rows 2-4: 3 tiles each
    const w3 = Math.floor((INNER_W - GAP * 2) / 3); // 299px
    const h3 = Math.floor(w3 * 1.1); // 329px — tall enough to look good

    // Name label height ~18px, gap 4px per tile
    // Total height budget: 28(top) + 38(title) + 10(gap) + (h1+18+4) + 10 + (h3+18+4)*3 + 20(footer) + 20(bottom)
    // = 28 + 38 + 10 + 262 + 10 + 351*3 + 20 + 20 = ~1441 — too tall
    // Need to shrink h3
    const h3Final = 200;
    const h1Final = 220;

    const svg = await satori(
      {
        type: "div",
        props: {
          style: { width: 1080, height: 1080, display: "flex", backgroundColor: BG, backgroundImage: "url(" + bgSrc + ")", backgroundSize: "cover" },
          children: [{
            type: "div",
            props: {
              style: {
                position: "absolute", top: 40, left: 55, width: 970, height: 1000,
                backgroundColor: CARD_BG, borderRadius: "48px", border: "5px solid " + GOLD,
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "24px 28px 16px", gap: "8px",
              },
              children: [
                // Title
                { type: "div", props: { style: { display: "flex", color: GOLD, fontSize: 36, fontWeight: 700, textAlign: "center" }, children: "My GuildLink Top 10" } },
                // Row 1 — #1
                makeRow(enriched.slice(0, 1), 1, w1, h1Final, GAP),
                // Row 2 — #2–4
                makeRow(enriched.slice(1, 4), 2, w3, h3Final, GAP),
                // Row 3 — #5–7
                makeRow(enriched.slice(4, 7), 5, w3, h3Final, GAP),
                // Row 4 — #8–10
                makeRow(enriched.slice(7, 10), 8, w3, h3Final, GAP),
                // Footer
                {
                  type: "div",
                  props: {
                    style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", marginTop: "auto" },
                    children: [
                      { type: "div", props: { style: { display: "flex", color: WHITE + "77", fontSize: 16, fontWeight: 700 }, children: handle } },
                      { type: "div", props: { style: { display: "flex", color: GOLD, fontSize: 22, fontWeight: 700 }, children: "GuildLink.gg" } },
                    ],
                  },
                },
              ],
            },
          }],
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
