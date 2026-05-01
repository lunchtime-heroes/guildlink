// api/share-charts.js — Generates a shareable PNG for the weekly top 10 charts

import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const BG_URL = "https://guildlink.gg/share-bg.png";
const GOLD = "#fbae17";
const WHITE = "#e2e8f4";
const CARD_BG = "#162035";
const BG = "#0d1424";
const ROW_BG = "#0d1424";
const GREEN = "#10b981";
const RED = "#ef4444";

export default async function handler(req) {
  const { searchParams } = new URL(req.url);

  let games = [];
  try { games = JSON.parse(searchParams.get("games") || "[]"); } catch {}

  const dateStr = searchParams.get("date") || new Date().toLocaleDateString("en-US", {
    month: "numeric", day: "numeric", year: "2-digit",
  });

  const fontRes = await fetch(
    "https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtY.woff"
  );
  const fontData = await fontRes.arrayBuffer();

  return new ImageResponse(
    <div style={{ width: 1080, height: 1080, display: "flex", position: "relative", backgroundColor: BG }}>
      <img src={BG_URL} style={{ position: "absolute", inset: 0, width: 1080, height: 1080, objectFit: "cover" }} />
      <div style={{
        position: "absolute", top: 60, left: 70, width: 940, height: 960,
        backgroundColor: CARD_BG, borderRadius: 50, border: "5px solid " + GOLD,
        display: "flex", flexDirection: "column", padding: "50px 60px",
      }}>
        <div style={{
          color: GOLD, fontSize: 58, fontFamily: "Playfair", fontWeight: 700,
          textAlign: "center", marginBottom: 32,
        }}>
          The Charts | {dateStr}
        </div>

        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          background: ROW_BG, borderRadius: 16, overflow: "hidden",
          border: "1px solid " + GOLD + "33",
        }}>
          {games.slice(0, 10).map((g, i) => {
            const isTop3 = i < 3;
            const changeColor = g.change > 0 ? GREEN : g.change < 0 ? RED : WHITE + "55";
            const changeText = g.change > 0 ? "+" + g.change : g.change < 0 ? String(g.change) : "—";
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center",
                padding: "0 32px", height: 72,
                borderBottom: i < 9 ? "1px solid " + GOLD + "22" : "none",
                background: i % 2 === 0 ? "transparent" : CARD_BG + "88",
              }}>
                <div style={{
                  width: 48, flexShrink: 0,
                  color: isTop3 ? GOLD : WHITE + "55",
                  fontSize: isTop3 ? 32 : 26,
                  fontFamily: "Playfair", fontWeight: 700,
                }}>
                  {i + 1}
                </div>
                <div style={{
                  flex: 1, color: WHITE, fontSize: 28,
                  fontFamily: "Playfair", fontWeight: 700,
                  overflow: "hidden", whiteSpace: "nowrap",
                }}>
                  {g.name}
                </div>
                <div style={{
                  color: changeColor, fontSize: 24,
                  fontFamily: "Playfair", fontWeight: 700,
                  width: 60, textAlign: "right",
                }}>
                  {changeText}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
          <div style={{ color: GOLD, fontSize: 36, fontFamily: "Playfair", fontWeight: 700 }}>
            GuildLink.gg
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1080, height: 1080,
      fonts: [{ name: "Playfair", data: fontData, weight: 700 }],
    }
  );
}
