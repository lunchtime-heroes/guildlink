import React from "react";
import { PixelCornerBox, CONFIGS, buildClip } from "./PixelCornerBox.jsx";

// ─── PixelButton ──────────────────────────────────────────────────────────────
// A native button wrapped in pixel corners.
//
// Usage:
//   <PixelButton onClick={fn} bg={C.accent} color="#000">Join Free</PixelButton>
//   <PixelButton size="sm" variant="ghost" onClick={fn}>Cancel</PixelButton>
//
// Props:
//   size      — "xs" (compact) | "sm" (default) | "md" (CTA)
//   fullWidth — stretches button to fill container
//   bg        — background color (default: C.accent)
//   color     — text color (default: "#fff")
//   borderColor — border/corner color (default: same as bg, or C.border for ghost)
//   variant   — "solid" (default) | "ghost" | "outline"
//   onClick   — click handler
//   disabled  — disabled state
//   style     — extra styles on the inner button
//   children  — button label

function PixelButton({
  children,
  size = "md",
  bg,
  bgStyle,
  color = "#fff",
  borderColor,
  variant = "solid",
  onClick,
  disabled,
  fullWidth = false,
  style = {},
  type = "button",
}) {
  const cornerSize = size === "xs" ? "sm" : size === "sm" ? "md" : "lg";
  const { steps, s } = CONFIGS[cornerSize] || CONFIGS.md;
  const clip = "polygon(" + buildClip(steps, s) + ")";

  // Resolve colors by variant
  let bgColor = bgStyle || bg;
  let bc = borderColor;
  let textColor = color;

  if (variant === "ghost") {
    bgColor = bgColor || "transparent";
    bc = bc || "transparent";
  } else if (variant === "outline") {
    bgColor = bgColor || "transparent";
    bc = bc || borderColor;
    textColor = color;
  } else {
    // solid
    bgColor = bgColor || "#0ea5e9";
    bc = bc || bgColor;
  }

  // xs — compact sidebar/card buttons (Follow, Add to Shelf, See Full Charts)
  // sm — standard action buttons (Save, Cancel, inline actions)
  // md — CTA buttons (Join Free, Post, primary actions)
  const paddingMap = { xs: "3px 10px", sm: "6px 14px", md: "9px 20px" };
  const fontSizeMap = { xs: 11, sm: 12, md: 13 };
  const padding = paddingMap[size] || paddingMap.sm;
  const fontSize = fontSizeMap[size] || fontSizeMap.sm;

  // Build a slightly larger clip for the border layer by using steps+1 offset
  // Instead of absolute positioning, use a wrapper div with border color bg
  // and inner button with bg color - both clipped, no absolute positioning
  const borderClip = "polygon(" + buildClip(steps, s + 1) + ")";

  return (
    <div style={{
      display: fullWidth ? "flex" : "inline-flex",
      width: fullWidth ? "100%" : undefined,
      minWidth: 0,
      background: bc && bc !== "transparent" ? bc : undefined,
      clipPath: bc && bc !== "transparent" ? "polygon(" + clip + ")" : undefined,
      padding: bc && bc !== "transparent" ? 1 : 0,
      boxSizing: "border-box",
    }}>
      {/* Button body */}
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        style={{
          background: bgColor,
          clipPath: "polygon(" + clip + ")",
          color: textColor,
          border: "none",
          padding,
          fontSize,
          fontWeight: 700,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          fontFamily: "inherit",
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: fullWidth ? "center" : undefined,
          flex: fullWidth ? 1 : undefined,
          width: fullWidth ? "100%" : undefined,
          gap: 6,
          whiteSpace: "nowrap",
          ...style,
        }}
      >
        {children}
      </button>
    </div>
  );
}

export { PixelButton };
export default PixelButton;
