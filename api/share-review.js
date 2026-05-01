// api/share-review.js — Generates a shareable PNG for a review

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
  const gameName = url.searchParams.get("game") || "";
  const rating = url.searchParams.get("rating") || "";
  const loved = url.searchParams.get("loved") || "";
  const didntLove = url.searchParams.get("didnt_love") || "";
  const handle = url.searchParams.get("handle") || "";
  const coverUrl = url.searchParams.get("cover") || "";

  const fontPath = path.join(process.cwd(), "public", "DMSans-Bold.ttf");
  const fontData = fs.readFileSync(fontPath);

  const bgPath = path.join(process.cwd(), "public", "share-bg.png");
  const bgBase64 = fs.readFileSync(bgPath).toString("base64");
  const bgSrc = `data:image/png;base64,${bgBase64}`;

  // Fetch cover image as base64 if present
  let coverSrc = "";
  if (coverUrl) {
    try {
      const coverRes = await fetch(coverUrl);
      const coverBuf = Buffer.from(await coverRes.arrayBuffer());
      coverSrc = `data:image/jpeg;base64,${coverBuf.toString("base64")}`;
    } catch {}
  }

  const svg = await satori(
    {
      type: "div",
      props: {
        style: { width: 1080, height: 1080, display: "flex", position: "relative", backgroundColor: BG, backgroundImage: `url(${bgSrc})`, backgroundSize: "cover" },
        children: [{
          type: "div",
          props: {
            style: { position: "absolute", top: 88, left: 88, width: 904, height: 904, backgroundColor: CARD_BG, borderRadius: 50, border: `5px solid ${GOLD}`, display: "flex", flexDirection: "column", padding: "55px 90px" },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center", gap: 40, marginBottom: 48 },
                  children: [
                    coverSrc ? { type: "img", props: { src: coverSrc, style: { width: 120, height: 160, borderRadius: 12, objectFit: "cover" } } } : { type: "div", props: { children: "" } },
                    {
                      type: "div",
                      props: {
                        style: { flex: 1, display: "flex", flexDirection: "column", gap: 16 },
                        children: [
                          { type: "div", props: { style: { color: WHITE, fontSize: 52, fontWeight: 700, lineHeight: 1.2 }, children: gameName } },
                          {
                            type: "div",
                            props: {
                              style: { display: "flex", width: "fit-content", background: GOLD + "22", border: `2px solid ${GOLD}55`, borderRadius: 12, padding: "8px 24px" },
                              children: { type: "div", props: { style: { color: GOLD, fontSize: 48, fontWeight: 700 }, children: `${rating}/10` } }
                            }
                          },
                        ]
                      }
                    }
                  ]
                }
              },
              { type: "div", props: { style: { height: 2, background: GOLD + "33", marginBottom: 48 }, children: "" } },
              loved ? {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 32 },
                  children: [
                    { type: "div", props: { style: { color: GREEN, fontSize: 40, lineHeight: 1, marginTop: 4 }, children: "✓" } },
                    { type: "div", props: { style: { color: WHITE, fontSize: 38, fontWeight: 700, lineHeight: 1.4, flex: 1 }, children: loved.length > 100 ? loved.slice(0, 100) + "…" : loved } },
                  ]
                }
              } : { type: "div", props: { children: "" } },
              didntLove ? {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 32 },
                  children: [
                    { type: "div", props: { style: { color: RED, fontSize: 40, lineHeight: 1, marginTop: 4 }, children: "✗" } },
                    { type: "div", props: { style: { color: WHITE + "cc", fontSize: 38, fontWeight: 700, lineHeight: 1.4, flex: 1 }, children: didntLove.length > 100 ? didntLove.slice(0, 100) + "…" : didntLove } },
                  ]
                }
              } : { type: "div", props: { children: "" } },
              { type: "div", props: { style: { flex: 1 }, children: "" } },
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 32 },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { width: 80, height: 80, borderRadius: 14, background: GOLD + "33", border: "2px solid " + GOLD, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 28, fontWeight: 700 },
                        children: handle ? handle.replace(/^@+/, "").slice(0, 2).toUpperCase() : "GL",
                      }
                    },
                    { type: "div", props: { style: { color: WHITE, fontSize: 30, fontWeight: 700 }, children: handle } },
                    { type: "div", props: { style: { color: GOLD, fontSize: 32, fontWeight: 700 }, children: "GuildLink.gg" } },
                  ]
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
