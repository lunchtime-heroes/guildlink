// src/components/ShelfStatusMenu.jsx
//
// Extracted from GamesPage.jsx during the search-centralization migration —
// was a one-off inline block there. Pulled out so any other surface that
// needs a direct "add this to my shelf" action (not just tagging/navigating)
// gets the real, correct logic for free, rather than a fifth hand-rolled
// copy of a status-menu-plus-upsert appearing somewhere down the line.
//
// Live statuses (confirmed directly against production data, Sept 2026):
// want_to_play, playing, have_played, not_for_me. wiki-database-schema.md
// only documented the first three as of that same date — worth fixing there
// too, not just here.

import React from "react";
import supabase from "../supabase.js";
import { PixelButton } from "./PixelButton.jsx";
import { C } from "../constants.js";
import { logChartEvent } from "../utils.js";

export const STATUS_OPTIONS = [
  { id: "want_to_play", label: "Want to Play", color: "accent" },
  { id: "playing", label: "Playing Now", color: "green" },
  { id: "have_played", label: "Have Played", color: "gold" },
  { id: "not_for_me", label: "Not Interested", color: "red" },
];

// Derived lookups for callers that just need "what color/label goes with
// this status" without re-declaring the same four entries themselves —
// e.g. the discovery card's shelf-status button. Colors are exported as
// C[...] keys resolved here (not raw hex) so they stay theme-aware.
export const STATUS_LABEL_BY_ID = Object.fromEntries(STATUS_OPTIONS.map(o => [o.id, o.label]));
export const STATUS_COLOR_KEY_BY_ID = Object.fromEntries(STATUS_OPTIONS.map(o => [o.id, o.color]));

const CHART_EVENT_MAP = { playing: "shelf_playing", want_to_play: "shelf_want", have_played: "shelf_played" };

/**
 * @param {object} game - the game being added/changed (needs at least .id, .name)
 * @param {string} [currentStatus] - the game's existing status, if any (e.g. userShelf.get(game.id)) —
 *   shown as a checkmark next to the matching option so opening the menu doesn't lose that context
 * @param {string} [source] - which surface/context this add is coming from, for shelf_source_events
 *   attribution (e.g. "games_page_insight", "game_page_search"). Confirmed live values as of Sept 2026
 *   include add_game_page, games_page_insight, game_page_direct, game_page_search, onboarding, and the
 *   discovery_* family — see wiki-admin-processes.md. Mirrors mobile's add-game.tsx, which already writes
 *   this on every add; web had no equivalent write anywhere until this component. If source is omitted,
 *   no event is logged — callers that don't have a clear attribution should pass one explicitly rather
 *   than silently mislabeling an add, since a wrong source pollutes the weekly discovery pulse same as
 *   a missing one does.
 * @param {function} onStatusSet - called with (gameId, statusId) after a successful write, so the
 *   caller can update its own userShelf Map (e.g. via useUserShelf's setLocalStatus) without a refetch
 * @param {function} onClose - called when the menu should close (selection made, or Cancel clicked)
 * @param {function} onNotForMe - optional — called after a "not_for_me" selection, for callers that
 *   want to remove the game from a results list (GamesPage's discovery grid does this)
 */
export function ShelfStatusMenu({ game, currentStatus, source, onStatusSet, onClose, onNotForMe }) {
  const handleSelect = async (opt, e) => {
    e.stopPropagation();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("user_games").upsert(
      { user_id: authUser.id, game_id: game.id, status: opt.id, updated_at: new Date().toISOString() },
      { onConflict: "user_id,game_id" }
    );
    // Append-only event log — fires on every add/status-change action this
    // menu performs, regardless of whether the game was already on the
    // shelf. Never overwritten, never upserted — same convention as
    // add-game.tsx on mobile. Only fires when the caller supplied a real
    // source; see the source param note above for why that's deliberate.
    if (source) {
      supabase.from("shelf_source_events").insert({
        user_id: authUser.id, game_id: game.id, status: opt.id, source,
      }).then(() => {});
    }
    if (CHART_EVENT_MAP[opt.id]) logChartEvent(game.id, CHART_EVENT_MAP[opt.id], authUser.id);
    onStatusSet?.(game.id, opt.id);
    if (opt.id === "not_for_me") onNotForMe?.(game.id);
    onClose?.();
  };

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: C.bg, zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 12px", gap: 8 }}>
      <div style={{ color: C.text, fontWeight: 700, fontSize: 12, textAlign: "center", marginBottom: 4 }}>{game.name}</div>
      {STATUS_OPTIONS.map(opt => {
        const optColor = C[opt.color];
        const isCurrent = opt.id === currentStatus;
        return (
          <div key={opt.id} style={{ padding: "1px 0" }}>
            <PixelButton fullWidth size="xs" bg={C.surface} borderColor={optColor} color={optColor} style={{ justifyContent: "center", gap: 6 }}
              onClick={e => handleSelect(opt, e)}>
              {isCurrent && <span>✓</span>}
              {opt.label}
            </PixelButton>
          </div>
        );
      })}
      <button onClick={e => { e.stopPropagation(); onClose?.(); }}
        style={{ background: "transparent", border: "none", color: C.textDim, fontSize: 12, cursor: "pointer", marginTop: 4, textAlign: "center" }}>
        Cancel
      </button>
    </div>
  );
}
