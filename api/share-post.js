// api/share-post.js — Generates a shareable PNG image for a post
// Uses @vercel/og with Satori

import { ImageResponse } from "@vercel/og";
import { readFileSync } from "fs";
import { join } from "path";

export const config = { runtime: "edge" };

// Load background image as base64
const bgBase64 = Buffer.from(
  readFileSync(join(process.cwd(), "public", "share-bg.png"))
).toString("base64");
const bgDataUrl = `data:image/png;base64,${bgBase64}`;

// Colors from SVG
const GOLD = "#fbae17";
const WHITE = "#e2e8f4";
const CARD_BG = "#162035";
const BG = "#0d1424";

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const content = searchParams.get("content") || "";
  const handle = searchParams.get("handle") || "";
  const gameTag = searchParams.get("game") || "";
  const avatarUrl = searchParams.get("avatar") || "";

  // Truncate long content
  const maxChars = 240;
  const displayContent = content.length > maxChars
    ? content.slice(0, maxChars).trimEnd() + "…"
    : content;

  // Load Playfair Display Bold from Google Fonts
  const fontRes = await fetch(
    "https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtY.woff"
  );
  const fontData = await fontRes.arrayBuffer();

  return new ImageResponse(
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        position: "relative",
        backgroundColor: BG,
      }}
    >
      {/* Background pattern */}
      <img
        src={bgDataUrl}
        style={{ position: "absolute", inset: 0, width: 1080, height: 1080, objectFit: "cover" }}
      />

      {/* Card */}
      <div
        style={{
          position: "absolute",
          top: 88,
          left: 88,
          width: 904,
          height: 904,
          backgroundColor: CARD_BG,
          borderRadius: 50,
          border: `5px solid ${GOLD}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 90px",
        }}
      >
        {/* Game tag if present */}
        {gameTag ? (
          <div style={{ display: "flex", marginBottom: 24 }}>
            <div style={{
              background: GOLD + "22",
              border: `1px solid ${GOLD}55`,
              borderRadius: 20,
              padding: "6px 18px",
              color: GOLD,
              fontSize: 28,
              fontFamily: "Playfair",
              fontWeight: 700,
            }}>
              {gameTag}
            </div>
          </div>
        ) : <div />}

        {/* Post content */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
        }}>
          <div style={{
            color: WHITE,
            fontSize: displayContent.length > 120 ? 52 : 64,
            fontFamily: "Playfair",
            fontWeight: 700,
            lineHeight: 1.35,
          }}>
            {displayContent}
          </div>
        </div>

        {/* Avatar + handle */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 48 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              style={{ width: 72, height: 72, borderRadius: 12, border: `2px solid ${GOLD}` }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: 12,
              background: GOLD + "33", border: `2px solid ${GOLD}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: GOLD, fontSize: 28, fontFamily: "Playfair", fontWeight: 700,
            }}>
              {handle ? handle.slice(1, 3).toUpperCase() : "GL"}
            </div>
          )}
          <div style={{ color: WHITE, fontSize: 32, fontFamily: "Playfair", fontWeight: 700 }}>
            {handle}
          </div>
        </div>

        {/* GuildLink branding */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 48,
          gap: 8,
        }}>
          <div style={{ color: GOLD, fontSize: 36, fontFamily: "Playfair", fontWeight: 700 }}>
            GuildLink.gg
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1080,
      height: 1080,
      fonts: [{ name: "Playfair", data: fontData, weight: 700 }],
    }
  );
}
