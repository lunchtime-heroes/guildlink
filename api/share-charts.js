// api/share-charts.js — Generates a shareable PNG for the weekly top 10 charts

const satori = require("satori").default;
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const GOLD = "#fbae17";
const WHITE = "#e2e8f4";
const CARD_BG = "#162035";
const BG = "#0d1424";
const GREEN = "#10b981";
const RED = "#ef4444";

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const url = new URL(req.url, "https://guildlink.gg");

  let games = [];
  try { games = JSON.parse(url.searchParams.get("games") || "[]"); } catch {}

  const dateStr = url.searchParams.get("date") || new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
  const label = url.searchParams.get("label") || "The Charts";

  const fontPath = path.join(process.cwd(), "public", "DMSans-Bold.ttf");
  const fontData = fs.readFileSync(fontPath);

  const bgPath = path.join(process.cwd(), "public", "share-bg.png");
  const bgBase64 = fs.readFileSync(bgPath).toString("base64");
  const bgSrc = "data:image/png;base64," + bgBase64;

  const top10 = games.slice(0, 10);

  const rows = top10.map((g, i) => ({
    type: "div",
    props: {
      style: {
        display: "flex", alignItems: "center", padding: "0 28px", height: 64,
        borderBottom: i < top10.length - 1 ? "1px solid " + GOLD + "22" : "none",
        background: i % 2 === 0 ? "transparent" : CARD_BG + "88",
      },
      children: [
        { type: "div", props: { style: { width: 42, flexShrink: 0, color: i < 3 ? GOLD : WHITE + "55", fontSize: i < 3 ? 28 : 22, fontWeight: 700 }, children: String(i + 1) } },
        { type: "div", props: { style: { flex: 1, color: WHITE, fontSize: 24, fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap" }, children: g.name } },
        { type: "div", props: { style: { color: g.change > 0 ? GREEN : g.change < 0 ? RED : WHITE + "44", fontSize: 20, fontWeight: 700, width: 52, textAlign: "right" }, children: g.change > 0 ? "+" + g.change : g.change < 0 ? String(g.change) : "—" } },
      ]
    }
  }));

  const svg = await satori(
    {
      type: "div",
      props: {
        style: { width: 1080, height: 1080, display: "flex", position: "relative", backgroundColor: BG, backgroundImage: "url(" + bgSrc + ")", backgroundSize: "cover" },
        children: [{
          type: "div",
          props: {
            style: { position: "absolute", top: 55, left: 55, width: 970, height: 970, backgroundColor: CARD_BG, borderRadius: 48, border: "5px solid " + GOLD, display: "flex", flexDirection: "column", padding: "44px 56px" },
            children: [
              // Title — centered
              {
                type: "div",
                props: {
                  style: { display: "flex", justifyContent: "center", marginBottom: 28 },
                  children: {
                    type: "div",
                    props: {
                      style: { color: GOLD, fontSize: 46, fontWeight: 700, textAlign: "center" },
                      children: label + " | " + dateStr,
                    }
                  }
                }
              },
              // Rows
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", background: BG, borderRadius: 14, overflow: "hidden", border: "1px solid " + GOLD + "33" },
                  children: rows,
                }
              },
              // Branding
              {
                type: "div",
                props: {
                  style: { display: "flex", justifyContent: "center", marginTop: 24 },
                  children: { type: "div", props: { style: { color: GOLD, fontSize: 32, fontWeight: 700 }, children: "GuildLink.gg" } }
                }
              },
            ]
          }
        }]
      }
    },
    { width: 1080, height: 1080, fonts: [{ name: "DM Sans", data: fontData, weight: 700 }] }
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=60");
  res.end(png);
};
