import React from "react";
import { C } from "../constants.js";
import { buildClip, CONFIGS } from "./PixelCornerBox.jsx";

// ─── PixelTabBar ──────────────────────────────────────────────────────────────
// Pixel-cornered tab strip. Outer container has pixel corners; active tab has
// a filled pixel-corner inset. Inactive tabs are plain text.
//
// Usage:
//   <PixelTabBar
//     tabs={[
//       { id: "forYou", label: "For You" },
//       { id: "following", label: "Following" },
//     ]}
//     active="forYou"
//     onChange={(id) => setFeedTab(id)}
//   />
//
//   // With counts:
//   <PixelTabBar
//     tabs={[
//       { id: "playing", label: "Playing", count: 12 },
//       { id: "played",  label: "Played",  count: 40 },
//     ]}
//     active="playing"
//     onChange={setTab}
//   />
//
// Props:
//   tabs      — array of { id, label, count? }
//   active    — id of the active tab
//   onChange  — called with tab id when a tab is clicked
//   size      — "md" (default) | "sm" — controls corner size
//   style     — extra styles on the outer container

// Precompute clips — safe as module-level consts (no C dependency)
const CLIP_MD = "polygon(" + buildClip(CONFIGS.md.steps, CONFIGS.md.s) + ")";
const CLIP_SM = "polygon(" + buildClip(CONFIGS.sm.steps, CONFIGS.sm.s) + ")";
const CLIP_LG = "polygon(" + buildClip(CONFIGS.lg.steps, CONFIGS.lg.s) + ")";

function PixelTabBar({ tabs, active, onChange, size = "md", style = {} }) {
  const clip = size === "lg" ? CLIP_LG : size === "sm" ? CLIP_SM : CLIP_MD;

  return (
    // Outer container — pixel corners, subtle border
    <div style={{ position: "relative", display: "flex", minWidth: 0, ...style }}>
      {/* Outer border layer */}
      <div style={{
        position: "absolute",
        inset: -1,
        background: C.border,
        clipPath: clip,
        pointerEvents: "none",
        zIndex: 0,
      }} />
      {/* Outer body */}
      <div style={{
        position: "relative",
        background: C.surface,
        clipPath: clip,
        display: "flex",
        width: "100%",
        zIndex: 1,
        padding: 4,
        gap: 2,
        boxSizing: "border-box",
      }}>
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={isActive}
              clip={clip}
              onClick={() => onChange(tab.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function TabItem({ tab, isActive, clip, onClick }) {
  const [hovered, setHovered] = React.useState(false);

  const label = tab.count !== undefined
    ? tab.label + " (" + tab.count + ")"
    : tab.label;

  if (isActive) {
    return (
      // Active tab — filled PixelCornerBox style inset
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        {/* Active border layer */}
        <div style={{
          position: "absolute",
          inset: -1,
          background: C.accentDim,
          clipPath: clip,
          pointerEvents: "none",
          zIndex: 0,
        }} />
        <div style={{
          position: "relative",
          background: C.accentGlow,
          clipPath: clip,
          color: C.accent,
          textAlign: "center",
          padding: "7px 12px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "default",
          zIndex: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {label}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: 0,
        textAlign: "center",
        padding: "7px 12px",
        fontSize: 13,
        fontWeight: 600,
        color: hovered ? C.textMuted : C.textDim,
        cursor: "pointer",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        transition: "color 0.1s",
      }}
    >
      {label}
    </div>
  );
}

export { PixelTabBar };
export default PixelTabBar;
