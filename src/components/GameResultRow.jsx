// src/components/GameResultRow.jsx
//
// One shared renderer for "a single game in a search result list," in the
// two layouts already used across the app: a compact inline row (typeahead
// dropdowns, @mention, tag-nudge) and a large card (grid/discovery browsing).
// Extracted after the same checkmark+cover+name+badge JSX was independently
// written four times across GamesPage.jsx and FeedPage.jsx during the
// search-centralization migration — this is the fix for that, the same way
// searchGamesCore fixed the same problem for the underlying data logic.
//
// This is presentation only. It does not know about shelves, statuses, or
// what "select" should do — callers pass shelfStatus (or null) and onSelect.
// This keeps it usable everywhere a game result needs to render, regardless
// of what clicking it actually triggers (tag a mention, navigate to a game
// page, open a shelf-status menu, etc).

import React from "react";
import { C } from "../constants.js";

/**
 * @param {object} game - the result object (from searchGamesCore's local/fromIGDB arrays)
 * @param {string|null} shelfStatus - userShelf.get(game.id) result, or null/undefined if not on shelf
 * @param {"compact"|"card"} variant - compact = small art + inline row (dropdowns); card = large art, name below (grid browsing)
 * @param {function} onSelect - called with the game object on click
 * @param {boolean} highlighted - for keyboard-navigable dropdowns (arrow key selection)
 * @param {function} onMouseEnter - optional, for syncing hover with keyboard index
 */
export function GameResultRow({ game, shelfStatus, variant = "compact", onSelect, useMouseDown = false, highlighted = false, onMouseEnter, style = {} }) {
  const onShelf = shelfStatus != null;
  const g = game;
  const interactionProp = useMouseDown ? { onMouseDown: () => onSelect?.(g) } : { onClick: () => onSelect?.(g) };

  if (variant === "card") {
    return (
      <div
        {...interactionProp}
        style={{ cursor: "pointer", ...style }}
      >
        <div style={{ width: "100%", height: 200, flexShrink: 0, background: "#0a0f1a" }}>
          {g.cover_url
            ? <img src={g.cover_url} alt={g.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            : <div style={{ width: "100%", height: "100%", background: C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🎮</div>
          }
        </div>
        <div style={{ padding: "10px 12px" }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 2, lineHeight: 1.3, display: "flex", alignItems: "center", gap: 5 }}>
            {onShelf && <span style={{ color: C.accent, flexShrink: 0 }}>✓</span>}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
          </div>
          {(g._stat || g.genre) && (
            <div style={{ color: C.textDim, fontSize: 10, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{g._stat || g.genre}</div>
          )}
        </div>
      </div>
    );
  }

  // compact — small art, inline row, used in every dropdown-style search
  return (
    <div
      {...interactionProp}
      onMouseEnter={onMouseEnter}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", cursor: "pointer", background: highlighted ? C.surfaceHover : "transparent", ...style }}
    >
      {g.cover_url
        ? <img src={g.cover_url} alt="" style={{ width: 32, height: 42, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
        : <div style={{ width: 32, height: 42, borderRadius: 4, background: C.surfaceRaised, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🎮</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          {onShelf && <span style={{ color: C.accent, flexShrink: 0 }}>✓</span>}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
        </div>
        {(g.platforms || g.genre) && <div style={{ color: C.textDim, fontSize: 10 }}>{g.platforms || g.genre}</div>}
      </div>
      {g._fromIGDB && <span style={{ color: C.teal, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>+ Add</span>}
    </div>
  );
}
