import React from "react";
import { C } from "../constants.js";

// ─── Pixel corner configuration ──────────────────────────────────────────────
// Three sizes matching the design system:
// lg — 5 steps, cards/panels/modals
// md — 3 steps, buttons/badges/tabs
// sm — 1 step, small indicators/avatar frames
//
// Corner SVGs designed in Illustrator, rendered as inline SVG for performance.
// No clip-path, no calc() — just stroked polylines on each corner.

const CONFIGS = {
  lg: { steps: 5, s: 2 },
  md: { steps: 3, s: 2 },
  sm: { steps: 1, s: 2 },
};

// Kept for GameTag and PixelTabBar which still use buildClip
function buildClip(steps, s) {
  const pts = [];
  pts.push(`${s * steps}px 0px`);
  pts.push(`calc(100% - ${s * steps}px) 0px`);
  for (let i = 0; i < steps; i++) {
    pts.push(`calc(100% - ${s * (steps - i)}px) ${s * i}px`);
    pts.push(`calc(100% - ${s * (steps - i - 1)}px) ${s * i}px`);
    if (i < steps - 1) pts.push(`calc(100% - ${s * (steps - i - 1)}px) ${s * (i + 1)}px`);
  }
  pts.push(`100% ${s * steps}px`);
  pts.push(`100% calc(100% - ${s * steps}px)`);
  for (let i = 0; i < steps; i++) {
    pts.push(`calc(100% - ${s * i}px) calc(100% - ${s * (steps - i)}px)`);
    pts.push(`calc(100% - ${s * i}px) calc(100% - ${s * (steps - i - 1)}px)`);
    if (i < steps - 1) pts.push(`calc(100% - ${s * (i + 1)}px) calc(100% - ${s * (steps - i - 1)}px)`);
  }
  pts.push(`calc(100% - ${s * steps}px) 100%`);
  pts.push(`${s * steps}px 100%`);
  for (let i = 0; i < steps; i++) {
    pts.push(`${s * i}px calc(100% - ${s * (steps - i)}px)`);
    pts.push(`${s * i}px calc(100% - ${s * (steps - i - 1)}px)`);
    if (i < steps - 1) pts.push(`${s * (i + 1)}px calc(100% - ${s * (steps - i - 1)}px)`);
  }
  pts.push(`0px calc(100% - ${s * steps}px)`);
  pts.push(`0px ${s * steps}px`);
  for (let i = 0; i < steps; i++) {
    pts.push(`${s * i}px ${s * (steps - i)}px`);
    pts.push(`${s * i}px ${s * (steps - i - 1)}px`);
    if (i < steps - 1) pts.push(`${s * (i + 1)}px ${s * (steps - i - 1)}px`);
  }
  pts.push(`${s * steps}px 0px`);
  return pts.join(", ");
}

const CLIPS = {
  lg: "polygon(" + buildClip(CONFIGS.lg.steps, CONFIGS.lg.s) + ")",
  md: "polygon(" + buildClip(CONFIGS.md.steps, CONFIGS.md.s) + ")",
  sm: "polygon(" + buildClip(CONFIGS.sm.steps, CONFIGS.sm.s) + ")",
};

// ─── SVG corner definitions from Illustrator ─────────────────────────────────
// Each is a single polyline tracing one corner (top-left orientation).
// Rotated 90/180/270 for the other three corners.

const CORNER_DEFS = {
  lg: { viewBox: "0 0 92 92", points: "14 78 14 62 30 62 30 46 46 46 46 30 62 30 62 14 78 14", size: 92 },
  md: { viewBox: "0 0 76 76", points: "14 62 14 46 30 46 30 30 46 30 46 14 62 14", size: 76 },
  sm: { viewBox: "0 0 60 60", points: "14 46 14 30 30 30 30 14 46 14", size: 60 },
};

// ─── PixelCorners ─────────────────────────────────────────────────────────────
// Renders four SVG corners at each corner of the parent container.

function PixelCorners({ size, color, strokeWidth = 2 }) {
  const def = CORNER_DEFS[size] || CORNER_DEFS.lg;
  const px = def.size;

  const corner = (rotation, style) => (
    <svg
      viewBox={def.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        width: px,
        height: px,
        pointerEvents: "none",
        zIndex: 4,
        ...style,
      }}
    >
      <polyline
        points={def.points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeMiterlimit="10"
        transform={rotation ? "rotate(" + rotation + " " + (px / 2) + " " + (px / 2) + ")" : undefined}
      />
    </svg>
  );

  return (
    <>
      {corner(0,   { top: 0,    left: 0,    transform: "rotate(0deg)" })}
      {corner(90,  { top: 0,    right: 0,   transform: "rotate(90deg)" })}
      {corner(180, { bottom: 0, right: 0,   transform: "rotate(180deg)" })}
      {corner(270, { bottom: 0, left: 0,    transform: "rotate(270deg)" })}
    </>
  );
}

// ─── PixelCornerBox ───────────────────────────────────────────────────────────
// Usage:
//   <PixelCornerBox size="lg" borderColor={C.border} bg={C.surface}>
//     content
//   </PixelCornerBox>
//
// Props:
//   size        — "lg" | "md" | "sm" (default: "lg")
//   borderColor — corner stroke + border color (default: C.border)
//   bg          — solid background color (default: C.surface)
//   bgStyle     — full CSS background value, overrides bg (use for gradients, tints)
//   strokeWidth — corner line weight (default: 2)
//   style       — additional styles on the outer wrapper
//   className   — className on outer wrapper
//   onClick     — click handler

function PixelCornerBox({
  children,
  size = "lg",
  borderColor,
  bg,
  bgStyle,
  strokeWidth = 2,
  style = {},
  className,
  onClick,
}) {
  const bc = borderColor || C.border;
  const background = bgStyle || bg || C.surface;

  // Split style props: padding/flex go on inner body, everything else on outer
  const {
    padding, paddingTop, paddingRight, paddingBottom, paddingLeft,
    display, flexDirection, flexWrap, alignItems, justifyContent, gap,
    ...outerStyle
  } = style;
  const innerStyle = {
    padding, paddingTop, paddingRight, paddingBottom, paddingLeft,
    display, flexDirection, flexWrap, alignItems, justifyContent, gap,
  };
  Object.keys(innerStyle).forEach(k => innerStyle[k] === undefined && delete innerStyle[k]);

  return (
    <div style={{ position: "relative", minWidth: 0, ...outerStyle }} className={className} onClick={onClick}>
      {/* Background + border */}
      <div style={{
        position: "absolute",
        inset: 0,
        background,
        border: "1px solid " + bc,
        zIndex: 0,
      }} />
      {/* Content */}
      <div style={{
        position: "relative",
        zIndex: 1,
        height: "100%",
        boxSizing: "border-box",
        ...innerStyle,
      }}>
        {children}
      </div>
      {/* SVG pixel corners — rendered on top */}
      <PixelCorners size={size} color={bc} strokeWidth={strokeWidth} />
    </div>
  );
}

export { PixelCornerBox, buildClip, CONFIGS, CLIPS };
export default PixelCornerBox;
