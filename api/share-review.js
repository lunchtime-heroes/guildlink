// api/share-review.js — Generates a shareable PNG image for a review

import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const BG_URL = "https://guildlink.gg/share-bg.png";
const GOLD = "#fbae17";
const WHITE = "#e2e8f4";
const CARD_BG = "#162035";
const BG = "#0d1424";
const GREEN = "#10b981";
const RED = "#ef4444";

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const gameName = searchParams.get("game") || "";
  const rating = searchParams.get("rating") || "";
  const loved = searchParams.get("loved") || "";
  const didntLove = searchParams.get("didnt_love") || "";
  const handle = searchParams.get("handle") || "";
  const coverUrl = searchParams.get("cover") || "";

  const fontRes = await fetch(
    "https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtY.woff"
  );
  const fontData = await fontRes.arrayBuffer();

  return new ImageResponse(
    <div style={{ width: 1080, height: 1080, display: "flex", position: "relative", backgroundColor: BG }}>
      <img src={BG_URL} style={{ position: "absolute", inset: 0, width: 1080, height: 1080, objectFit: "cover" }} />
      <div style={{
        position: "absolute", top: 88, left: 88, width: 904, height: 904,
        backgroundColor: CARD_BG, borderRadius: 50, border: "5px solid " + GOLD,
        display: "flex", flexDirection: "column", padding: "70px 90px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40, marginBottom: 48 }}>
          {coverUrl ? (
            <img src={coverUrl} style={{ width: 120, height: 160, borderRadius: 12, objectFit: "cover" }} />
          ) : null}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ color: WHITE, fontSize: 52, fontFamily: "Playfair", fontWeight: 700, lineHeight: 1.2 }}>
              {gameName}
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              background: GOLD + "22", border: "2px solid " + GOLD + "55",
              borderRadius: 12, padding: "8px 24px", width: "fit-content",
            }}>
              <span style={{ color: GOLD, fontSize: 48, fontFamily: "Playfair", fontWeight: 700 }}>
                {rating}/10
              </span>
            </div>
          </div>
        </div>

        <div style={{ height: 2, background: GOLD + "33", marginBottom: 48 }} />

        {loved ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 32 }}>
            <div style={{ color: GREEN, fontSize: 40, lineHeight: 1, marginTop: 4 }}>✓</div>
            <div style={{ color: WHITE, fontSize: 38, fontFamily: "Playfair", fontWeight: 700, lineHeight: 1.4, flex: 1 }}>
              {loved.length > 100 ? loved.slice(0, 100) + "…" : loved}
            </div>
          </div>
        ) : null}

        {didntLove ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 32 }}>
            <div style={{ color: RED, fontSize: 40, lineHeight: 1, marginTop: 4 }}>✗</div>
            <div style={{ color: WHITE + "cc", fontSize: 38, fontFamily: "Playfair", fontWeight: 700, lineHeight: 1.4, flex: 1 }}>
              {didntLove.length > 100 ? didntLove.slice(0, 100) + "…" : didntLove}
            </div>
          </div>
        ) : null}

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ color: WHITE + "99", fontSize: 30, fontFamily: "Playfair", fontWeight: 700 }}>{handle}</div>
          <div style={{ color: GOLD, fontSize: 34, fontFamily: "Playfair", fontWeight: 700 }}>GuildLink.gg</div>
        </div>
      </div>
    </div>,
    {
      width: 1080, height: 1080,
      fonts: [{ name: "Playfair", data: fontData, weight: 700 }],
    }
  );
}
