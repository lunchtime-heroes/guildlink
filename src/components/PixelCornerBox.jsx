import React from "react";
import { C } from "../constants.js";

// ─── Pixel corner configuration ──────────────────────────────────────────────
// Three sizes matching the design system:
// lg — 5 steps, cards/panels/modals
// md — 3 steps, buttons/badges/tabs
// sm — 1 step, small indicators/avatar frames

const CONFIGS = {
  lg: { steps: 5, s: 2 },
  md: { steps: 3, s: 2 },
  sm: { steps: 1, s: 2 },
};

// Build CSS clip-path polygon for pixel-stepped corners
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
  const { steps, s } = CONFIGS[size] || CONFIGS.lg;
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
        inset: -1,
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
