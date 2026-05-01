// api/share-post.js — Generates a shareable PNG for a post
// Uses satori (SVG) + sharp (PNG) — Node.js CommonJS

const satori = require("satori").default;
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const GOLD = "#fbae17";
const WHITE = "#e2e8f4";
const CARD_BG = "#162035";
const BG = "#0d1424";

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const url = new URL(req.url, "https://guildlink.gg");
  const content = url.searchParams.get("content") || "";
  const handle = url.searchParams.get("handle") || "";
  const gameTag = url.searchParams.get("game") || "";
  const avatarUrl = url.searchParams.get("avatar") || "";

  const maxChars = 240;
  const displayContent = content.length > maxChars
    ? content.slice(0, maxChars).trimEnd() + "…"
    : content;

  // Load font
  const fontPath = path.join(process.cwd(), "public", "DMSans-Bold.ttf");
  const fontData = fs.readFileSync(fontPath);

  // Load background image as base64
  const bgPath = path.join(process.cwd(), "public", "share-bg.png");
  const bgBase64 = fs.readFileSync(bgPath).toString("base64");
  const bgSrc = `data:image/png;base64,${bgBase64}`;

  // Fetch avatar as base64 if present
  let avatarSrc = "";
  if (avatarUrl) {
    try {
      const avatarRes = await fetch(avatarUrl);
      const avatarBuf = Buffer.from(await avatarRes.arrayBuffer());
      avatarSrc = `data:image/png;base64,${avatarBuf.toString("base64")}`;
    } catch {}
  }

  // Font size: smaller and more adaptive
  const len = displayContent.length;
  const fontSize = len > 180 ? 36 : len > 120 ? 42 : len > 60 ? 48 : 54;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: 1080, height: 1080, display: "flex", position: "relative",
          backgroundColor: BG,
          backgroundImage: `url(${bgSrc})`,
          backgroundSize: "cover",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute", top: 88, left: 88, width: 904, height: 904,
                backgroundColor: CARD_BG, borderRadius: 50,
                border: `5px solid ${GOLD}`,
                display: "flex", flexDirection: "column",
                justifyContent: "space-between", padding: "80px 90px",
              },
              children: [
                gameTag ? {
                  type: "div",
                  props: {
                    style: { display: "flex" },
                    children: [{
                      type: "div",
                      props: {
                        style: { background: GOLD + "22", border: `1px solid ${GOLD}55`, borderRadius: 20, padding: "6px 18px", color: GOLD, fontSize: 28, fontWeight: 700 },
                        children: gameTag,
                      }
                    }]
                  }
                } : { type: "div", props: { children: "" } },
                {
                  type: "div",
                  props: {
                    style: { flex: 1, display: "flex", alignItems: "center" },
                    children: {
                      type: "div",
                      props: {
                        style: { color: WHITE, fontSize, fontWeight: 700, lineHeight: 1.35 },
                        children: displayContent,
                      }
                    }
                  }
                },
                {
                  type: "div",
                  props: {
                    style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 48 },
                    children: [
                      avatarSrc ? {
                        type: "img",
                        props: { src: avatarSrc, style: { width: 80, height: 80, borderRadius: 14, border: `2px solid ${GOLD}`, objectFit: "cover" } }
                      } : {
                        type: "div",
                        props: {
                          style: { width: 80, height: 80, borderRadius: 14, background: GOLD + "33", border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 28, fontWeight: 700 },
                          children: handle ? handle.replace("@", "").slice(0, 2).toUpperCase() : "GL",
                        }
                      },
                      { type: "div", props: { style: { color: WHITE, fontSize: 30, fontWeight: 700 }, children: handle } },
                    ]
                  }
                },
                {
                  type: "div",
                  props: {
                    style: { display: "flex", justifyContent: "center", marginTop: 40 },
                    children: { type: "div", props: { style: { color: GOLD, fontSize: 36, fontWeight: 700 }, children: "GuildLink.gg" } }
                  }
                },
              ]
            }
          }
        ]
      }
    },
    {
      width: 1080, height: 1080,
      fonts: [{ name: "DM Sans", data: fontData, weight: 700 }],
    }
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=60");
  res.end(png);
};
