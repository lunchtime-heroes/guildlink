import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { Avatar } from "./Avatar.jsx";

// ─── Pixel corner border overlay ────────────────────────────────────────────
// Draws a pixel-stepped border around the card using SVG
// Step size scales with card width for consistent feel
function PixelBorder({ width, height, color, strokeWidth = 1.5 }) {
  const s = 6; // pixel step size in px
  const o = strokeWidth / 2; // offset to keep stroke inside bounds

  // Build the pixel corner path — 5 steps per corner
  // Top-left corner (steps going right then down)
  const path = [
    `M ${o + s * 4} ${o}`,
    `L ${width - s * 4 - o} ${o}`,           // top edge
    // top-right corner
    `L ${width - s * 4 - o} ${o}`,
    `L ${width - s * 3 - o} ${o}`,
    `L ${width - s * 3 - o} ${s + o}`,
    `L ${width - s * 2 - o} ${s + o}`,
    `L ${width - s * 2 - o} ${s * 2 + o}`,
    `L ${width - s - o} ${s * 2 + o}`,
    `L ${width - s - o} ${s * 3 + o}`,
    `L ${width - o} ${s * 3 + o}`,
    `L ${width - o} ${s * 4 + o}`,
    `L ${width - o} ${height - s * 4 - o}`,   // right edge
    // bottom-right corner
    `L ${width - o} ${height - s * 3 - o}`,
    `L ${width - s - o} ${height - s * 3 - o}`,
    `L ${width - s - o} ${height - s * 2 - o}`,
    `L ${width - s * 2 - o} ${height - s * 2 - o}`,
    `L ${width - s * 2 - o} ${height - s - o}`,
    `L ${width - s * 3 - o} ${height - s - o}`,
    `L ${width - s * 3 - o} ${height - o}`,
    `L ${width - s * 4 - o} ${height - o}`,
    `L ${s * 4 + o} ${height - o}`,           // bottom edge
    // bottom-left corner
    `L ${s * 3 + o} ${height - o}`,
    `L ${s * 3 + o} ${height - s - o}`,
    `L ${s * 2 + o} ${height - s - o}`,
    `L ${s * 2 + o} ${height - s * 2 - o}`,
    `L ${s + o} ${height - s * 2 - o}`,
    `L ${s + o} ${height - s * 3 - o}`,
    `L ${o} ${height - s * 3 - o}`,
    `L ${o} ${height - s * 4 - o}`,
    `L ${o} ${s * 4 + o}`,                    // left edge
    // top-left corner
    `L ${o} ${s * 3 + o}`,
    `L ${s + o} ${s * 3 + o}`,
    `L ${s + o} ${s * 2 + o}`,
    `L ${s * 2 + o} ${s * 2 + o}`,
    `L ${s * 2 + o} ${s + o}`,
    `L ${s * 3 + o} ${s + o}`,
    `L ${s * 3 + o} ${o}`,
    `L ${s * 4 + o} ${o}`,
    "Z"
  ].join(" ");

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 2 }}
      xmlns="http://www.w3.org/2000/svg">
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
}

// ─── Copy generation ─────────────────────────────────────────────────────────
function getCardCopy(card, actorName) {
  switch (card.discovery_type) {
    case "shelf_add":
      return {
        phrase: card.actor_count + " players with similar libraries have:",
        cta_shelf: true,
      };
    case "now_playing":
      return {
        phrase: card.actor_count > 1
          ? card.actor_count + " players with similar libraries started playing:"
          : actorName + " just started playing:",
        cta_ask: "Ask how they're enjoying it",
      };
    case "just_finished":
      return {
        phrase: card.actor_count > 1
          ? card.actor_count + " players with similar libraries finished:"
          : actorName + " just finished:",
        cta_ask: "Ask what they thought",
      };
    case "review_positive":
      return {
        phrase: card.actor_count > 1
          ? card.actor_count + " players with similar libraries loved:"
          : actorName + " loved:",
        cta_ask: "See the review",
      };
    case "review_negative":
      return {
        phrase: card.actor_count > 1
          ? card.actor_count + " players gave a low score to:"
          : actorName + " gave a low score to:",
        cta_shelf: true,
        isNegative: true,
      };
    case "thumbs_down":
      return {
        phrase: actorName + " passed on:",
        cta_shelf: true,
        isNegative: true,
      };
    case "chart_climber":
      return {
        phrase: card.chart_movement >= 2
          ? "jumped " + card.chart_movement + " spots into the top 10:"
          : "moved up " + (card.chart_movement || 1) + " spot on The Charts:",
        cta_charts: true,
      };
    case "multi_review_prompt":
      return {
        phrase: card.actor_count + " players reviewed:",
        cta_review: true,
      };
    default:
      return { phrase: null };
  }
}

function getTypeLabel(discovery_type) {
  switch (discovery_type) {
    case "now_playing": return { label: "Now Playing", color: C.green };
    case "just_finished": return { label: "Just Finished", color: C.teal };
    case "review_positive": return { label: "Loved It", color: C.gold };
    case "review_negative": return { label: "Skip Signal", color: C.red };
    case "thumbs_down": return { label: "Skip Signal", color: C.red };
    case "chart_climber": return { label: "Chart Climber", color: C.gold };
    case "multi_review_prompt": return { label: "Write a Review", color: C.gold };
    default: return null;
  }
}

const SHELF_BUTTONS = [
  { status: "want_to_play", label: "Want to Play" },
  { status: "playing", label: "Playing Now" },
  { status: "have_played", label: "Have Played" },
];

// ─── Main component ──────────────────────────────────────────────────────────
function DiscoveryCardVertical({ card, currentUser, setActivePage, setCurrentGame, setCurrentPlayer, isMobile, isGuest, onSignIn, setGameDefaultTab }) {
  const [actor, setActor] = useState(null);
  const [game, setGame] = useState(null);
  const [addedToShelf, setAddedToShelf] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    if (card.actor_user_id) {
      supabase.from("profiles")
        .select("id, username, handle, avatar_initials, is_founding, active_ring, avatar_config")
        .eq("id", card.actor_user_id)
        .single()
        .then(({ data }) => { if (data) setActor(data); });
    }
    if (card.game_id) {
      supabase.from("games")
        .select("id, name, cover_url, genre")
        .eq("id", card.game_id)
        .single()
        .then(({ data }) => { if (data) setGame(data); });
    }
    if (!card.seen) {
      supabase.from("discovery_cards").update({ seen: true }).eq("id", card.id);
    }
  }, [card.id]);

  const actorName = actor?.username || (card.actor_count > 1 ? card.actor_count + " players" : "A player");
  const copy = getCardCopy(card, actorName);
  const typeLabel = getTypeLabel(card.discovery_type);
  const isNegative = copy.isNegative;

  if (dismissed) return null;

  const navigateToGame = () => {
    if (!game) return;
    setCurrentGame(game.id);
    setActivePage("game");
    window.history.pushState({ page: "game", gameId: game.id }, "", "/game/" + game.id);
  };

  const addToShelf = async (status) => {
    if (isGuest) { onSignIn?.("Sign in to add games to your shelf."); return; }
    if (!game) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await Promise.all([
      supabase.from("user_games").upsert(
        { user_id: authUser.id, game_id: game.id, status },
        { onConflict: "user_id,game_id" }
      ),
      supabase.from("discovery_cards").update({ seen: true }).eq("id", card.id),
    ]);
    setAddedToShelf(status);
  };

  const markNotInterested = async () => {
    if (isGuest) { onSignIn?.("Sign in to manage your shelf."); return; }
    if (!game) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await Promise.all([
      supabase.from("user_games").upsert(
        { user_id: authUser.id, game_id: game.id, status: "not_for_me" },
        { onConflict: "user_id,game_id" }
      ),
      supabase.from("discovery_cards").update({ seen: true }).eq("id", card.id),
    ]);
    setDismissed(true);
  };

  const borderColor = isNegative ? C.red + "88" : C.border;

  return (
    <div style={{
      position: "relative",
      background: C.surface,
      marginBottom: 0,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      cursor: "pointer",
    }}>
      {/* Pixel corner border overlay — sized to full card */}
      <PixelBorderWrapper borderColor={borderColor} />

      {/* Game art — full width, 3:4 aspect ratio */}
      <div
        onClick={navigateToGame}
        style={{ width: "100%", aspectRatio: "3/4", background: "#0a0f1a", flexShrink: 0, overflow: "hidden" }}>
        {game?.cover_url
          ? <img src={game.cover_url} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🎮</div>
        }
      </div>

      {/* Content zone */}
      <div style={{ padding: "10px 10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>

        {/* Type label */}
        {typeLabel && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            alignSelf: "flex-start",
          }}>
            <span style={{
              background: typeLabel.color + "18",
              border: "1px solid " + typeLabel.color + "44",
              borderRadius: C.radius.badge,
              padding: "1px 6px",
              fontSize: 9, fontWeight: 700, color: typeLabel.color,
              textTransform: "uppercase", letterSpacing: "0.4px",
            }}>{typeLabel.label}</span>
          </div>
        )}

        {/* Discovery phrase */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
          {copy.phrase}
        </div>

        {/* Game name tag */}
        {game && (
          <span
            onClick={e => { e.stopPropagation(); navigateToGame(); }}
            style={{
              display: "inline-block",
              background: C.accentGlow,
              border: "1px solid " + C.accentDim,
              borderRadius: C.radius.badge,
              padding: "2px 8px",
              fontSize: 11, color: C.accentSoft, fontWeight: 700,
              cursor: "pointer",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: "100%",
            }}>
            {game.name}
          </span>
        )}

        {/* Actor — single named actor only */}
        {actor && card.actor_is_public && card.actor_count === 1 && (
          <div
            onClick={() => { setCurrentPlayer(actor.id); setActivePage("player"); window.history.pushState({ page: "player", playerId: actor.id }, "", "/player/" + (actor.handle || actor.id).replace("@", "")); }}
            style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <Avatar initials={actor.avatar_initials || "?"} size={16} founding={actor.is_founding} ring={actor.active_ring} avatarConfig={actor.avatar_config} />
            <span style={{ color: C.accentSoft, fontSize: 10, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actor.username}</span>
          </div>
        )}

        {/* Action */}
        <div style={{ marginTop: 2 }}>
          {copy.cta_shelf && !addedToShelf && !dismissed && game && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {SHELF_BUTTONS.map(({ status, label }) => (
                  <button key={status} onClick={() => addToShelf(status)}
                    style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: C.radius.button, padding: "4px 4px", color: C.textMuted, fontSize: 9, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={markNotInterested}
                style={{ width: "100%", background: "transparent", border: "none", color: C.textDim, fontSize: 9, cursor: "pointer", padding: "2px 0", textAlign: "left" }}>
                Not Interested
              </button>
            </div>
          )}

          {addedToShelf && (
            <span style={{ color: C.green, fontSize: 10, fontWeight: 600 }}>✓ Added</span>
          )}

          {copy.cta_ask && (
            <button
              onClick={() => { if (isGuest) { onSignIn?.(); return; } navigateToGame(); }}
              style={{ width: "100%", background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: C.radius.button, padding: "5px 8px", color: C.accentSoft, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              {copy.cta_ask} →
            </button>
          )}

          {copy.cta_review && (
            <button
              onClick={() => { if (isGuest) { onSignIn?.(); return; } if (setGameDefaultTab) setGameDefaultTab("reviews"); navigateToGame(); }}
              style={{ width: "100%", background: C.goldDim || C.accentGlow, border: "1px solid " + C.gold + "44", borderRadius: C.radius.button, padding: "5px 8px", color: C.gold, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              Write a Review →
            </button>
          )}

          {copy.cta_charts && (
            <button
              onClick={() => { setActivePage("games"); window.history.pushState({ page: "games" }, "", "/games"); }}
              style={{ width: "100%", background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: C.radius.button, padding: "5px 8px", color: C.accentSoft, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              See The Charts →
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Pixel border wrapper — uses ResizeObserver to get actual card dimensions
function PixelBorderWrapper({ borderColor }) {
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const ref = React.useRef(null);

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      {dims.w > 0 && dims.h > 0 && (
        <PixelBorder width={dims.w} height={dims.h} color={borderColor} />
      )}
    </div>
  );
}

export { DiscoveryCardVertical };
