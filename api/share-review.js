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
  const bgSrc = "data:image/png;base64," + bgBase64;

  let coverSrc = "";
  if (coverUrl) {
    try {
      const coverRes = await fetch(coverUrl);
      const coverBuf = Buffer.from(await coverRes.arrayBuffer());
      coverSrc = "data:image/jpeg;base64," + coverBuf.toString("base64");
    } catch {}
  }

  const lovedText = loved.length > 90 ? loved.slice(0, 90) + "…" : loved;
  const didntLoveText = didntLove.length > 90 ? didntLove.slice(0, 90) + "…" : didntLove;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: { width: 1080, height: 1080, display: "flex", position: "relative", backgroundColor: BG, backgroundImage: "url(" + bgSrc + ")", backgroundSize: "cover" },
        children: [{
          type: "div",
          props: {
            style: { position: "absolute", top: 60, left: 60, width: 960, height: 960, backgroundColor: CARD_BG, borderRadius: 50, border: "5px solid " + GOLD, display: "flex", flexDirection: "column", padding: "55px 80px 50px" },
            children: [
              // Game header — cover + name + rating
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center", gap: 36, marginBottom: 36 },
                  children: [
                    coverSrc ? {
                      type: "img",
                      props: { src: coverSrc, style: { width: 110, height: 147, borderRadius: 10, objectFit: "cover", flexShrink: 0 } }
                    } : { type: "div", props: { style: { width: 110, height: 147, borderRadius: 10, background: GOLD + "22", flexShrink: 0 }, children: "" } },
                    {
                      type: "div",
                      props: {
                        style: { flex: 1, display: "flex", flexDirection: "column", gap: 14 },
                        children: [
                          { type: "div", props: { style: { color: WHITE, fontSize: 44, fontWeight: 700, lineHeight: 1.2 }, children: gameName } },
                          {
                            type: "div",
                            props: {
                              style: { display: "flex" },
                              children: {
                                type: "div",
                                props: {
                                  style: { background: GOLD + "22", border: "2px solid " + GOLD + "55", borderRadius: 10, padding: "6px 20px", display: "flex", alignItems: "center" },
                                  children: { type: "div", props: { style: { color: GOLD, fontSize: 40, fontWeight: 700 }, children: rating + "/10" } }
                                }
                              }
                            }
                          },
                        ]
                      }
                    }
                  ]
                }
              },
              // Divider
              { type: "div", props: { style: { height: 2, background: GOLD + "33", marginBottom: 32 }, children: "" } },
              // What I loved
              loved ? {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 },
                  children: [
                    { type: "div", props: { style: { color: GREEN, fontSize: 20, fontWeight: 800, letterSpacing: "0.05em" }, children: "WHAT I LOVED:" } },
                    { type: "div", props: { style: { color: WHITE, fontSize: 32, fontWeight: 700, lineHeight: 1.4, paddingLeft: 16 }, children: lovedText } },
                  ]
                }
              } : { type: "div", props: { children: "" } },
              // What I didn't love
              didntLove ? {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 },
                  children: [
                    { type: "div", props: { style: { color: RED, fontSize: 20, fontWeight: 800, letterSpacing: "0.05em" }, children: "WHAT I DIDN'T LOVE:" } },
                    { type: "div", props: { style: { color: WHITE + "cc", fontSize: 32, fontWeight: 700, lineHeight: 1.4, paddingLeft: 16 }, children: didntLoveText } },
                  ]
                }
              } : { type: "div", props: { children: "" } },
              // Spacer
              { type: "div", props: { style: { flex: 1 }, children: "" } },
              // Credit
              {
                type: "div",
                props: {
                  style: { display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 24 },
                  children: [
                    { type: "div", props: { style: { color: WHITE, fontSize: 32, fontWeight: 700 }, children: handle + " on" } },
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
