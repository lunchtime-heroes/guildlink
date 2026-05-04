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

function makeTile(game, rank, size) {
  const isTop = rank === 1;
  const coverH = Math.round(size * 1.33);
  const badgeSize = isTop ? 34 : 26;
  const badgeFontSize = isTop ? 17 : 13;
  const nameFontSize = isTop ? 15 : 11;
  const safeName = truncate(game.name || "", isTop ? 24 : 14);

  const coverImg = game.cover
    ? { type: "div", props: { style: { width: size, height: coverH, backgroundImage: "url(" + game.cover + ")", backgroundSize: "cover", backgroundPosition: "center" } } }
    : { type: "div", props: { style: { width: size, height: coverH, background: CARD_BG, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 22, fontWeight: 700 }, children: "?" } };

  const badge = {
    type: "div",
    props: {
      style: {
        width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2,
        background: isTop ? GOLD : BG + "cc",
        border: isTop ? "none" : "1.5px solid " + GOLD + "99",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: isTop ? BG : GOLD,
        fontSize: badgeFontSize, fontWeight: 700,
      },
      children: String(rank),
    },
  };

  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: size },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex", flexDirection: "row", alignItems: "flex-start",
              border: isTop ? "2.5px solid " + GOLD : "1.5px solid " + DIM,
              borderRadius: 10, overflow: "hidden", width: size, height: coverH,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex", flexDirection: "column", alignItems: "flex-start",
                    justifyContent: "flex-start", padding: 5,
                    width: badgeSize + 10, height: coverH,
                    flexShrink: 0,
                  },
                  children: badge,
                },
              },
              {
                type: "div",
                props: {
                  style: { flex: 1, height: coverH, overflow: "hidden", marginLeft: 0 },
                  children: coverImg,
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { color: isTop ? WHITE : WHITE + "bb", fontSize: nameFontSize, fontWeight: 700, textAlign: "center", width: size },
            children: safeName,
          },
        },
      ],
    },
  };
}

function makeRow(items, startRank, tileSize, gap) {
  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap },
      children: items.map((g, i) => makeTile(g, startRank + i, tileSize)),
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

    const GAP = 10;
    const INNER_W = 880;
    const tile1 = 160;
    const tile3 = Math.floor((INNER_W - GAP * 2) / 3);

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
                backgroundColor: CARD_BG, borderRadius: 48, border: "5px solid " + GOLD,
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "32px 45px 24px", gap: 14,
              },
              children: [
                { type: "div", props: { style: { color: GOLD, fontSize: 38, fontWeight: 700, textAlign: "center" }, children: "My GuildLink Top 10" } },
                makeRow(enriched.slice(0, 1), 1, tile1, GAP),
                makeRow(enriched.slice(1, 4), 2, tile3, GAP),
                makeRow(enriched.slice(4, 7), 5, tile3, GAP),
                makeRow(enriched.slice(7, 10), 8, tile3, GAP),
                {
                  type: "div",
                  props: {
                    style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: "auto" },
                    children: [
                      { type: "div", props: { style: { color: WHITE + "77", fontSize: 18, fontWeight: 700 }, children: handle } },
                      { type: "div", props: { style: { color: GOLD, fontSize: 24, fontWeight: 700 }, children: "GuildLink.gg" } },
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
