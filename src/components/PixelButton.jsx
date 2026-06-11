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
//   size      — "md" (default) | "sm"
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
  color = "#fff",
  borderColor,
  variant = "solid",
  onClick,
  disabled,
  fullWidth = false,
  style = {},
  type = "button",
}) {
  const { steps, s } = CONFIGS[size] || CONFIGS.md;
  const clip = "polygon(" + buildClip(steps, s) + ")";

  // Resolve colors by variant
  let bgColor = bg;
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

  const padding = size === "sm" ? "4px 10px" : "7px 16px";
  const fontSize = size === "sm" ? 11 : 13;

  return (
    <div style={{ position: "relative", display: fullWidth ? "flex" : "inline-flex", width: fullWidth ? "100%" : undefined, minWidth: 0 }}>
      {/* Border layer */}
      {bc && bc !== "transparent" && (
        <div style={{
          position: "absolute",
          inset: -1,
          background: bc,
          clipPath: clip,
          pointerEvents: "none",
          zIndex: 0,
        }} />
      )}
      {/* Button body */}
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        style={{
          position: "relative",
          background: bgColor,
          clipPath: clip,
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
          gap: 6,
          whiteSpace: "nowrap",
          zIndex: 1,
          flex: fullWidth ? 1 : undefined,
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
