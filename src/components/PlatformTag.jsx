// src/components/PlatformTag.jsx
//
// Shows which platform(s) a game is on. Deliberately NOT a link to a
// platform page — GuildLink discovers games, not platforms; a platform has
// no draw on its own. This is why the single-platform state is visually
// inert (no pointer cursor, no hover) while the multi-platform state
// ("See Platforms") carries a small, honest signal that it opens something.
// Making both states look identical would train people to expect every tag
// here to be clickable, which most of them aren't.
//
// `platforms` is the raw comma-separated string straight from games.platforms
// (e.g. "Xbox Series X/S, PS4, PC, iOS") — confirmed Sept 2026 as clean,
// consistently-named, no duplicate spellings across the ~90 distinct values
// in use. Parsing here, not at the query layer, so this stays a pure
// presentation component.

import React, { useState } from "react";
import { C } from "../constants.js";

const TEAL = "#0d9488";

function parsePlatforms(platforms) {
  if (!platforms) return [];
  return platforms.split(",").map(p => p.trim()).filter(Boolean);
}

export function PlatformTag({ platforms, style = {} }) {
  const [open, setOpen] = useState(false);
  const list = parsePlatforms(platforms);
  if (list.length === 0) return null;

  if (list.length === 1) {
    return (
      <span style={{
        display: "inline-block", fontSize: 10, fontWeight: 700, color: TEAL,
        background: TEAL + "1a", border: "1px solid " + TEAL + "55",
        borderRadius: 4, padding: "2px 6px", lineHeight: 1.4, ...style,
      }}>
        {list[0]}
      </span>
    );
  }

  return (
    <>
      <span
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: TEAL,
          background: TEAL + "1a", border: "1px solid " + TEAL + "55",
          borderRadius: 4, padding: "2px 6px", lineHeight: 1.4, cursor: "pointer", ...style,
        }}
      >
        See Platforms <span style={{ fontSize: 9 }}>▾</span>
      </span>
      {open && (
        <div
          onClick={e => { e.stopPropagation(); setOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: 20, minWidth: 240, maxWidth: 320 }}
          >
            <div style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Available On</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {list.map(p => (
                <div key={p} style={{ color: C.text, fontSize: 13, padding: "4px 0", borderBottom: "1px solid " + C.border }}>
                  {p}
                </div>
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ marginTop: 14, width: "100%", background: "transparent", border: "1px solid " + C.border, borderRadius: 6, color: C.textDim, fontSize: 12, padding: "6px 0", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
