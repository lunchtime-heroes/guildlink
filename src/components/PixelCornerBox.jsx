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

// Build CSS clip-path polygon - verified correct, no duplicate points
function buildClip(steps, s) {
  const n = steps * s;
  const W = (v) => v === 0 ? "100%" : "calc(100% - " + v + "px)";
  const H = (v) => v === 0 ? "100%" : "calc(100% - " + v + "px)";
  const all = [];

  // Top edge
  all.push(n + "px 0px");
  all.push(W(n) + " 0px");

  // Top-right corner (step down into card)
  for (let i = 0; i < steps; i++) {
    all.push(W((steps - i) * s) + " " + (i * s) + "px");
    all.push(W((steps - i - 1) * s) + " " + (i * s) + "px");
    if (i < steps - 1) all.push(W((steps - i - 1) * s) + " " + ((i + 1) * s) + "px");
  }
  all.push("100% " + n + "px");

  // Right edge
  all.push("100% " + H(n));

  // Bottom-right corner (step left into card)
  for (let i = 0; i < steps; i++) {
    all.push(W(i * s) + " " + H((steps - i) * s));
    all.push(W(i * s) + " " + H((steps - i - 1) * s));
    if (i < steps - 1) all.push(W((i + 1) * s) + " " + H((steps - i - 1) * s));
  }
  all.push(W(n) + " 100%");

  // Bottom edge
  all.push(n + "px 100%");

  // Bottom-left corner (step up into card)
  for (let i = 0; i < steps; i++) {
    all.push((steps - i) * s + "px " + H(i * s));
    all.push((steps - i - 1) * s + "px " + H(i * s));
    if (i < steps - 1) all.push((steps - i - 1) * s + "px " + H((i + 1) * s));
  }
  all.push("0px " + H(n));

  // Left edge
  all.push("0px " + n + "px");

  // Top-left corner (step right into card)
  for (let i = 0; i < steps; i++) {
    all.push(i * s + "px " + (steps - i) * s + "px");
    all.push(i * s + "px " + (steps - i - 1) * s + "px");
    if (i < steps - 1) all.push((i + 1) * s + "px " + (steps - i - 1) * s + "px");
  }

  // Deduplicate consecutive identical points (transition between sections)
  const pts = all.filter((p, i) => i === 0 || p !== all[i - 1]);
  return all.join(", ");
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
