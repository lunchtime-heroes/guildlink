import React from "react";
import { C } from "../constants.js";
import { buildClip, CONFIGS } from "./PixelCornerBox.jsx";

// ─── GameTag ──────────────────────────────────────────────────────────────────
// Pixel-cornered chip for game labels. Used on posts, composer, discovery cards,
// search results — anywhere a game name appears as a tag.
//
// Usage:
//   <GameTag label="Fortnite" />
//   <GameTag label="Hades" onClick={() => goToGame(id)} />
//   <GameTag label="Elden Ring" onRemove={() => removeTag(id)} />
//   <GameTag label="World of Warcraft" variant="gold" />
//
// Props:
//   label       — text to display (required)
//   onClick     — makes the tag clickable (navigates to game, opens picker, etc.)
//   onRemove    — shows an ✕ button and calls this when clicked
//   variant     — "accent" (default, blue) | "gold" | "muted"
//   size        — "sm" (default) | "md"
//   style       — extra styles on the outer wrapper

const CLIP_SM = "polygon(" + buildClip(CONFIGS.sm.steps, CONFIGS.sm.s) + ")";
const CLIP_MD = "polygon(" + buildClip(CONFIGS.md.steps, CONFIGS.md.s) + ")";
const CLIP_LG = "polygon(" + buildClip(CONFIGS.lg.steps, CONFIGS.lg.s) + ")";

function GameTag({ label, onClick, onRemove, variant = "accent", size = "md", style = {} }) {
  const clip = size === "lg" ? CLIP_LG : size === "sm" ? CLIP_SM : CLIP_MD;

  // Resolve colors by variant
  let bg, border, color;
  if (variant === "gold") {
    bg = C.goldGlow;
    border = C.goldBorder;
    color = C.gold;
  } else if (variant === "muted") {
    bg = C.surfaceRaised;
    border = C.border;
    color = C.textMuted;
  } else {
    // accent (default)
    bg = C.accentGlow;
    border = C.accentDim;
    color = C.accentSoft;
  }

  const padding = size === "lg" ? "4px 12px" : size === "md" ? "3px 10px" : "1px 6px";
  const fontSize = size === "lg" ? 13 : size === "md" ? 12 : 10;

  const handleClick = onClick ? (e) => { e.stopPropagation(); onClick(e); } : undefined;
  const handleRemove = onRemove ? (e) => { e.stopPropagation(); onRemove(e); } : undefined;

  const borderInset = size === "sm" ? 0 : -1;

  return (
    <div style={{ position: "relative", display: "inline-flex", minWidth: 0, flexShrink: 0, alignSelf: "flex-start", ...style }}>
      {/* Border layer */}
      <div style={{
        position: "absolute",
        inset: borderInset,
        background: border,
        clipPath: clip,
        pointerEvents: "none",
        zIndex: 0,
      }} />
      {/* Tag body */}
      <div
        onClick={handleClick}
        style={{
          position: "relative",
          background: bg,
          clipPath: clip,
          color,
          padding,
          fontSize,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
          cursor: onClick ? "pointer" : "default",
          zIndex: 1,
          lineHeight: 1.4,
        }}
      >
        {label}
        {onRemove && (
          <span
            onClick={handleRemove}
            style={{
              marginLeft: 2,
              opacity: 0.7,
              fontSize: fontSize - 1,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >✕</span>
        )}
      </div>
    </div>
  );
}

export { GameTag };
export default GameTag;
