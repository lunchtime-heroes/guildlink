import React from "react";
import { C, PROFILE_RINGS, AVATAR_SKIN_TONES } from "../constants.js";

// ── Item color palette (used for all non-skin items) ──────────────────────────
export const ITEM_COLORS = {
  black: "#1a1a1a", white: "#f5f5f5", gray: "#888888",
  red: "#cc2200", orange: "#cc6600", yellow: "#ccaa00",
  green: "#1a6b3a", teal: "#0d9488", blue: "#1a4480",
  purple: "#5b2d8e", pink: "#aa2266", brown: "#6b3a2a",
};

export const AVATAR_BG_COLORS = {
  navy: "#0f1923", forest: "#0d2818", purple: "#1a0d2e",
  crimson: "#2e0d0d", slate: "#1a1f2e", gold: "#2e2000",
  teal: "#0d2e2e", charcoal: "#1a1a1a",
  gradBlue: ["#0f1923", "#1a3a5c"], gradPurple: ["#1a0d2e", "#3d1a6b"],
  gradGreen: ["#0d2818", "#1a5c38"], gradGold: ["#2e2000", "#6b4400"],
};

export const DEFAULT_AVATAR_CONFIG = {
  skin: "s1",
  build: "build1",
  hair: "short",
  hairColor: "darkbrown",
  eyeColor: "black",
  hat: "none",
  hatColor: "black",
  shirt: true,
  shirtColor: "blue",
  glasses: "none",
  glassesColor: "black",
  bg: "navy",
};

// ── SVG asset paths as inline rect arrays ────────────────────────────────────
// Each asset is defined as its rects with a fill placeholder "FILL"
// so we can swap color at render time.

const BUILD_1 = (color) => `
  <rect fill="${color}" x="64" y="64" width="128" height="80"/>
  <rect fill="${color}" x="80" y="144" width="96" height="16"/>
  <rect fill="${color}" x="112" y="160" width="32" height="16"/>
  <rect fill="${color}" x="80" y="48" width="96" height="16"/>
  <rect fill="${color}" x="192" y="224" width="32" height="16"/>
  <rect fill="${color}" x="32" y="224" width="32" height="16"/>
`;

const BUILD_2 = (color) => `
  <rect fill="${color}" x="64" y="80" width="128" height="64"/>
  <rect fill="${color}" x="80" y="144" width="96" height="16"/>
  <rect fill="${color}" x="80" y="64" width="96" height="16"/>
  <rect fill="${color}" x="112" y="160" width="32" height="16"/>
  <rect fill="${color}" x="96" y="48" width="64" height="16"/>
  <rect fill="${color}" x="192" y="224" width="32" height="16"/>
  <rect fill="${color}" x="32" y="224" width="32" height="16"/>
`;

const HAIR_SHORT = (color) => `
  <rect fill="${color}" x="176" y="64" width="16" height="16"/>
  <rect fill="${color}" x="64" y="64" width="16" height="16"/>
  <rect fill="${color}" x="48" y="64" width="16" height="48"/>
  <rect fill="${color}" x="192" y="64" width="16" height="48"/>
  <rect fill="${color}" x="64" y="48" width="128" height="16"/>
  <rect fill="${color}" x="80" y="32" width="96" height="16"/>
`;

const HAIR_MEDIUM = (color) => `
  <rect fill="${color}" x="208" y="80" width="16" height="16"/>
  <rect fill="${color}" x="32" y="80" width="16" height="16"/>
  <rect fill="${color}" x="64" y="64" width="128" height="16"/>
  <rect fill="${color}" x="48" y="64" width="16" height="48"/>
  <rect fill="${color}" x="192" y="64" width="16" height="48"/>
  <rect fill="${color}" x="64" y="48" width="128" height="16"/>
  <rect fill="${color}" x="80" y="32" width="96" height="16"/>
  <rect fill="${color}" x="112" y="16" width="32" height="16"/>
`;

const HAIR_LONG = (color) => `
  <rect fill="${color}" x="48" y="64" width="160" height="16"/>
  <rect fill="${color}" x="80" y="48" width="96" height="16"/>
  <rect fill="${color}" x="48" y="80" width="16" height="112"/>
  <rect fill="${color}" x="32" y="80" width="16" height="96"/>
  <rect fill="${color}" x="192" y="80" width="16" height="112"/>
  <rect fill="${color}" x="208" y="80" width="16" height="96"/>
`;

const HAT_BEANIE = (color) => `
  <rect fill="${color}" x="48" y="48" width="160" height="32"/>
  <rect fill="${color}" x="80" y="16" width="96" height="16"/>
  <rect fill="${color}" x="64" y="32" width="128" height="16"/>
`;

const HAT_MAGICIAN = (color) => `
  <rect fill="${color}" x="16" y="64" width="224" height="16"/>
  <rect fill="${color}" x="112" y="0" width="32" height="16"/>
  <rect fill="${color}" x="80" y="32" width="96" height="16"/>
  <rect fill="${color}" x="64" y="48" width="128" height="16"/>
  <rect fill="${color}" x="96" y="16" width="64" height="16"/>
`;

const EYES = (color) => `
  <rect fill="${color}" x="80" y="96" width="16" height="16"/>
  <rect fill="${color}" x="160" y="96" width="16" height="16"/>
`;

const GLASSES_STYLE = (color) => `
  <rect fill="${color}" x="96" y="96" width="16" height="16"/>
  <rect fill="${color}" x="128" y="96" width="16" height="16"/>
  <rect fill="${color}" x="64" y="96" width="16" height="16"/>
  <rect fill="${color}" x="160" y="80" width="16" height="16"/>
  <rect fill="${color}" x="96" y="80" width="16" height="16"/>
  <rect fill="${color}" x="112" y="96" width="16" height="16"/>
  <rect fill="${color}" x="80" y="80" width="16" height="16"/>
  <rect fill="${color}" x="64" y="80" width="16" height="16"/>
  <rect fill="${color}" x="160" y="112" width="16" height="16"/>
  <rect fill="${color}" x="176" y="96" width="16" height="16"/>
  <rect fill="${color}" x="176" y="80" width="16" height="16"/>
  <rect fill="${color}" x="176" y="112" width="16" height="16"/>
  <rect fill="${color}" x="144" y="96" width="16" height="16"/>
  <rect fill="${color}" x="144" y="80" width="16" height="16"/>
  <rect fill="${color}" x="144" y="112" width="16" height="16"/>
  <rect fill="${color}" x="96" y="112" width="16" height="16"/>
  <rect fill="${color}" x="80" y="112" width="16" height="16"/>
  <rect fill="${color}" x="64" y="112" width="16" height="16"/>
`;

const SHIRT_STYLE = (color) => `
  <rect fill="${color}" x="64" y="176" width="128" height="80"/>
  <rect fill="${color}" x="192" y="176" width="16" height="48"/>
  <rect fill="${color}" x="48" y="176" width="16" height="48"/>
  <rect fill="${color}" x="208" y="192" width="16" height="32"/>
  <rect fill="${color}" x="32" y="192" width="16" height="32"/>
`;

// ── Main render function ──────────────────────────────────────────────────────
function renderAvatarSVG(config = {}, size = 40) {
  const {
    skin: skinKey = "s1",
    build = "build1",
    hair = "short",
    hairColor: hairColorKey = "darkbrown",
    eyeColor: eyeColorKey = "black",
    hat = "none",
    hatColor: hatColorKey = "black",
    shirt = true,
    shirtColor: shirtColorKey = "blue",
    glasses = "none",
    glassesColor: glassesColorKey = "black",
    bg: bgKey = "navy",
  } = config;

  const skin = AVATAR_SKIN_TONES[skinKey] || AVATAR_SKIN_TONES.s1;
  const hairColor = ITEM_COLORS[hairColorKey] || "#3b1f0e";
  const eyeColor = ITEM_COLORS[eyeColorKey] || "#1a1a1a";
  const hatColor = ITEM_COLORS[hatColorKey] || "#1a1a1a";
  const shirtColor = ITEM_COLORS[shirtColorKey] || "#1a4480";
  const glassesColor = ITEM_COLORS[glassesColorKey] || "#1a1a1a";

  const bgDef = AVATAR_BG_COLORS[bgKey];
  const bgIsGrad = Array.isArray(bgDef);
  const bgId = "avbg" + bgKey + size;

  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">`;

  // Background
  if (bgIsGrad) {
    svg += `<defs><linearGradient id="${bgId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bgDef[0]}"/><stop offset="100%" stop-color="${bgDef[1]}"/></linearGradient></defs>`;
    svg += `<rect width="256" height="256" fill="url(#${bgId})"/>`;
  } else {
    svg += `<rect width="256" height="256" fill="${bgDef || "#0f1923"}"/>`;
  }

  // Layer 1: Build (body/skin)
  if (build === "build2") {
    svg += BUILD_2(skin.skin);
  } else {
    svg += BUILD_1(skin.skin);
  }

  // Layer 2: Shirt
  if (shirt) {
    svg += SHIRT_STYLE(shirtColor);
  }

  // Layer 3: Hair (behind hat)
  if (hair === "medium") svg += HAIR_MEDIUM(hairColor);
  else if (hair === "long") svg += HAIR_LONG(hairColor);
  else if (hair === "short") svg += HAIR_SHORT(hairColor);
  // "none" renders no hair

  // Layer 4: Hat (replaces hair top)
  if (hat === "beanie") svg += HAT_BEANIE(hatColor);
  else if (hat === "magician") svg += HAT_MAGICIAN(hatColor);

  // Layer 5: Eyes
  svg += EYES(eyeColor);

  // Layer 6: Glasses
  if (glasses === "glasses") svg += GLASSES_STYLE(glassesColor);

  svg += `</svg>`;
  return svg;
}

// ── AvatarPixel component ─────────────────────────────────────────────────────
function AvatarPixel({ config, size = 40, ring = null, founding = false, status = null }) {
  const svgStr = renderAvatarSVG(config, size);
  const ringData = ring ? PROFILE_RINGS.find(r => r.id === ring) : null;
  const showFoundingRing = founding && !ring;
  const ringColor = ringData?.color || (showFoundingRing ? "#f59e0b" : null);
  const ringGlow = ringData?.glow || (showFoundingRing ? "#f59e0b33" : null);
  const hasRing = ringColor && ringColor !== "transparent";
  const isDouble = ringData?.double || showFoundingRing;
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flexShrink: 0 }}>
      {hasRing && <div style={{ position: "absolute", inset: -3, borderRadius: "16%", border: "3px solid " + ringColor, boxShadow: "0 0 " + size * 0.3 + "px " + (ringGlow || ringColor + "44"), zIndex: 1, pointerEvents: "none" }} />}
      {hasRing && isDouble && <div style={{ position: "absolute", inset: -7, borderRadius: "16%", border: "2px solid " + ringColor + "88", zIndex: 1, pointerEvents: "none" }} />}
      <div style={{ width: size, height: size, borderRadius: "12%", overflow: "hidden", imageRendering: "pixelated", flexShrink: 0, display: "flex" }}
        dangerouslySetInnerHTML={{ __html: svgStr }} />
    </div>
  );
}

// ── Avatar component (initials fallback) ─────────────────────────────────────
function Avatar({ initials, size = 40, status, isNPC = false, ring = null, founding = false, avatarConfig = null }) {
  if (avatarConfig && !isNPC) {
    return <AvatarPixel config={avatarConfig} size={size} ring={ring} founding={founding} status={status} />;
  }
  const ringData = ring ? PROFILE_RINGS.find(r => r.id === ring) : null;
  const showFoundingRing = founding && !ring;
  const ringColor = ringData?.color || (showFoundingRing ? "#f59e0b" : null);
  const ringGlow = ringData?.glow || (showFoundingRing ? "#f59e0b33" : null);
  const hasRing = ringColor && ringColor !== "transparent";
  const isDouble = ringData?.double || showFoundingRing;
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flexShrink: 0 }}>
      {hasRing && (
        <div style={{ position: "absolute", inset: -3, borderRadius: "50%", border: "3px solid " + ringColor, boxShadow: "0 0 " + size * 0.3 + "px " + (ringGlow || ringColor + "44") + ", inset 0 0 " + size * 0.15 + "px " + (ringGlow || ringColor + "22"), zIndex: 1, pointerEvents: "none" }} />
      )}
      {hasRing && isDouble && (
        <div style={{ position: "absolute", inset: -7, borderRadius: "50%", border: "2px solid " + ringColor + "88", zIndex: 1, pointerEvents: "none" }} />
      )}
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: isNPC ? "linear-gradient(135deg, #3d2e00, #7a5c00)" : "linear-gradient(135deg, " + C.accent + "cc, " + C.accent + "55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35, fontWeight: 700, color: isNPC ? "#f59e0b" : "#fff",
        letterSpacing: "-0.5px", position: "relative", zIndex: 0, flexShrink: 0,
      }}>{initials}</div>
    </div>
  );
}

export { Avatar, AvatarPixel, renderAvatarSVG };
