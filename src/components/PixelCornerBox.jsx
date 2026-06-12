import React from "react";
import { C } from "../constants.js";

// ─── Pixel corner configuration ──────────────────────────────────────────────
// lg — bold retro corners for cards/panels: 2 steps at 4px = 8px notch, 4px border unit
// md — fine corners for buttons/badges: 3 steps at 2px = 6px notch, 2px border unit  
// sm — minimal corners for small elements: 1 step at 2px = 2px notch, 2px border unit

const CONFIGS = {
  lg: { steps: 2, s: 4, inset: 2 },
  md: { steps: 3, s: 2, inset: 1 },
  sm: { steps: 1, s: 2, inset: 1 },
};

// Build CSS clip-path polygon for pixel-stepped corners
// Clockwise from top-left corner start point
function buildClip(steps, s) {
  const n = steps * s; // total corner notch size
  const pts = [];

  // Start top-left, move right along top edge
  pts.push(`${n}px 0px`);
  pts.push(`calc(100% - ${n}px) 0px`);

  // Top-right: step inward going down
  for (let i = 0; i < steps; i++) {
    pts.push(`calc(100% - ${(steps - i) * s}px) ${i * s}px`);
    pts.push(`calc(100% - ${(steps - i - 1) * s}px) ${i * s}px`);
  }
  pts.push(`100% ${n}px`);

  // Right edge down
  pts.push(`100% calc(100% - ${n}px)`);

  // Bottom-right: step inward going left
  for (let i = 0; i < steps; i++) {
    pts.push(`calc(100% - ${i * s}px) calc(100% - ${(steps - i) * s}px)`);
    pts.push(`calc(100% - ${i * s}px) calc(100% - ${(steps - i - 1) * s}px)`);
  }
  pts.push(`calc(100% - ${n}px) 100%`);

  // Bottom edge left
  pts.push(`${n}px 100%`);

  // Bottom-left: step inward going up (points must go right-then-up, not up-then-right)
  for (let i = 0; i < steps; i++) {
    pts.push(`${(i + 1) * s}px calc(100% - ${i * s}px)`);
    pts.push(`${i * s}px calc(100% - ${i * s}px)`);
  }
  pts.push(`0px calc(100% - ${n}px)`);

  // Left edge up
  pts.push(`0px ${n}px`);

  // Top-left: step inward going right
  for (let i = 0; i < steps; i++) {
    pts.push(`${i * s}px ${(steps - i) * s}px`);
    pts.push(`${i * s}px ${(steps - i - 1) * s}px`);
  }

  return pts.join(", ");
}

// Precomputed clip-paths — calculated once at module load, not on every render
const CLIPS = {
  lg: "polygon(" + buildClip(CONFIGS.lg.steps, CONFIGS.lg.s) + ")",
  md: "polygon(" + buildClip(CONFIGS.md.steps, CONFIGS.md.s) + ")",
  sm: "polygon(" + buildClip(CONFIGS.sm.steps, CONFIGS.sm.s) + ")",
};

// Render pixel squares at each corner
function PixelCorners({ steps, s, color }) {
  const squares = [];
  for (let i = 0; i < steps; i++) {
    const offset = s * (steps - 1 - i);
    const inset = s * i;
    squares.push({ l: inset, t: offset });
    squares.push({ r: inset, t: offset });
    squares.push({ l: inset, b: offset });
    squares.push({ r: inset, b: offset });
  }
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4, willChange: "transform" }}>
      {squares.map((sq, i) => (
        <div key={i} style={{
          position: "absolute",
          width: s, height: s,
          background: color,
          left: sq.l !== undefined ? sq.l : "auto",
          right: sq.r !== undefined ? sq.r : "auto",
          top: sq.t !== undefined ? sq.t : "auto",
          bottom: sq.b !== undefined ? sq.b : "auto",
        }} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function PixelCornerBox({
  children,
  size = "lg",
  borderColor,
  bg,
  bgStyle,
  style = {},
  className,
  onClick,
}) {
  const { steps, s, inset: borderInset } = CONFIGS[size] || CONFIGS.lg;
  const bc = borderColor || C.border;
  const background = bgStyle || bg || C.surface;
  const clip = CLIPS[size] || CLIPS.lg;

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
    <div style={{ position: "relative", minWidth: 0, willChange: "transform", ...outerStyle }} className={className} onClick={onClick}>
      {/* Border layer */}
      <div style={{
        position: "absolute",
        inset: -borderInset,
        background: bc,
        clipPath: clip,
        zIndex: 0,
        pointerEvents: "none",
        willChange: "transform",
      }} />
      {/* Card body */}
      <div style={{
        position: "relative",
        background,
        clipPath: clip,
        zIndex: 1,
        height: "100%",
        boxSizing: "border-box",
        willChange: "transform",
        ...innerStyle,
      }}>
        <PixelCorners steps={steps} s={s} color={bc} />
        {children}
      </div>
    </div>
  );
}

export { PixelCornerBox, buildClip, PixelCorners, CONFIGS, CLIPS };
export default PixelCornerBox;
