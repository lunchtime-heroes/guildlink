import React from "react";
import { PixelCornerBox, CONFIGS, buildClip } from "./PixelCornerBox.jsx";

// ─── PixelButton ──────────────────────────────────────────────────────────────
// A native button wrapped in pixel corners.
//
// Props:
//   size      — "xs" (compact) | "sm" (default) | "md" (CTA)
//   fullWidth — stretches button to fill container
//   bg        — background color (default: C.accent)
//   bgStyle   — CSS background value (overrides bg, use for gradients)
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
  const { steps, s } = CONFIGS.md;
  const clip = "polygon(" + buildClip(steps, s) + ")";

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
    bgColor = bgColor || "#0ea5e9";
    bc = bc || bgColor;
  }

  // xs — compact sidebar/card buttons
  // sm — standard action buttons
  // md — CTA buttons
  const paddingMap = { xs: "4px 10px", sm: "6px 14px", md: "9px 20px" };
  const fontSizeMap = { xs: 11, sm: 12, md: 13 };
  const padding = paddingMap[size] || paddingMap.sm;
  const fontSize = fontSizeMap[size] || fontSizeMap.sm;

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
          justifyContent: fullWidth ? "center" : undefined,
          flex: fullWidth ? 1 : undefined,
          gap: 6,
          whiteSpace: "nowrap",
          zIndex: 1,
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
