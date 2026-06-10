import React, { useState, useEffect, useRef } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";

// ─── Pixel corner card wrapper ───────────────────────────────────────────────
// Renders children inside a card with pixel-stepped corners
// matching the SVG design: 5 filled pixel squares per corner stepping diagonally
function PixelCard({ children, borderColor, style = {} }) {
  const s = 4; // pixel square size in px — matches visual weight at card scale
  // CSS clip-path polygon for 5-step pixel corners
  // Going clockwise from top-left
  const clip = [
    `${s*5}px 0px`,
    `calc(100% - ${s*5}px) 0px`,          // top edge
    `calc(100% - ${s*4}px) 0px`,
    `calc(100% - ${s*4}px) ${s}px`,
    `calc(100% - ${s*3}px) ${s}px`,
    `calc(100% - ${s*3}px) ${s*2}px`,
    `calc(100% - ${s*2}px) ${s*2}px`,
    `calc(100% - ${s*2}px) ${s*3}px`,
    `calc(100% - ${s}px) ${s*3}px`,
    `calc(100% - ${s}px) ${s*4}px`,
    `100% ${s*4}px`,
    `100% calc(100% - ${s*4}px)`,          // right edge
    `100% calc(100% - ${s*4}px)`,
    `calc(100% - ${s}px) calc(100% - ${s*4}px)`,
    `calc(100% - ${s}px) calc(100% - ${s*3}px)`,
    `calc(100% - ${s*2}px) calc(100% - ${s*3}px)`,
    `calc(100% - ${s*2}px) calc(100% - ${s*2}px)`,
    `calc(100% - ${s*3}px) calc(100% - ${s*2}px)`,
    `calc(100% - ${s*3}px) calc(100% - ${s}px)`,
    `calc(100% - ${s*4}px) calc(100% - ${s}px)`,
    `calc(100% - ${s*4}px) 100%`,
    `calc(100% - ${s*5}px) 100%`,
    `${s*5}px 100%`,                        // bottom edge
    `${s*4}px 100%`,
    `${s*4}px calc(100% - ${s}px)`,
    `${s*3}px calc(100% - ${s}px)`,
    `${s*3}px calc(100% - ${s*2}px)`,
    `${s*2}px calc(100% - ${s*2}px)`,
    `${s*2}px calc(100% - ${s*3}px)`,
    `${s}px calc(100% - ${s*3}px)`,
    `${s}px calc(100% - ${s*4}px)`,
    `0px calc(100% - ${s*4}px)`,
    `0px ${s*4}px`,                         // left edge
    `${s}px ${s*4}px`,
    `${s}px ${s*3}px`,
    `${s*2}px ${s*3}px`,
    `${s*2}px ${s*2}px`,
    `${s*3}px ${s*2}px`,
    `${s*3}px ${s}px`,
    `${s*4}px ${s}px`,
    `${s*4}px 0px`,
  ].join(", ");

  return (
    <div style={{
      position: "relative",
      background: C.surface,
      clipPath: "polygon(" + clip + ")",
      border: "none",
      ...style,
    }}>
      {/* Pixel corner border overlay — drawn as filled squares matching SVG */}
      <PixelCorners color={borderColor || C.border} s={s} />
      {children}
    </div>
  );
}

// Draws the 5 pixel squares at each corner as absolutely positioned divs
function PixelCorners({ color, s }) {
  const sqL = (left, top, key) => (
    <div key={key} style={{ position: "absolute", width: s, height: s, background: color, left, top, zIndex: 3, pointerEvents: "none" }} />
  );
  const sqR = (right, top, key) => (
    <div key={key} style={{ position: "absolute", width: s, height: s, background: color, right, top, zIndex: 3, pointerEvents: "none" }} />
  );
  const sqLB = (left, bottom, key) => (
    <div key={key} style={{ position: "absolute", width: s, height: s, background: color, left, bottom, zIndex: 3, pointerEvents: "none" }} />
  );
  const sqRB = (right, bottom, key) => (
    <div key={key} style={{ position: "absolute", width: s, height: s, background: color, right, bottom, zIndex: 3, pointerEvents: "none" }} />
  );

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
      {/* Top-left — steps diagonally from (s*4, 0) toward (0, s*4) */}
      {sqL(s*4, 0, "tl1")}{sqL(s*3, s, "tl2")}{sqL(s*2, s*2, "tl3")}{sqL(s, s*3, "tl4")}{sqL(0, s*4, "tl5")}
      {/* Top-right */}
      {sqR(s*4, 0, "tr1")}{sqR(s*3, s, "tr2")}{sqR(s*2, s*2, "tr3")}{sqR(s, s*3, "tr4")}{sqR(0, s*4, "tr5")}
      {/* Bottom-left */}
      {sqLB(s*4, 0, "bl1")}{sqLB(s*3, s, "bl2")}{sqLB(s*2, s*2, "bl3")}{sqLB(s, s*3, "bl4")}{sqLB(0, s*4, "bl5")}
      {/* Bottom-right */}
      {sqRB(s*4, 0, "br1")}{sqRB(s*3, s, "br2")}{sqRB(s*2, s*2, "br3")}{sqRB(s, s*3, "br4")}{sqRB(0, s*4, "br5")}
    </div>
  );
}

// ─── Copy generation ──────────────────────────────────────────────────────────
function getCardCopy(card, actorName) {
  switch (card.discovery_type) {
    case "shelf_add":
      return { phrase: card.actor_count + " players with similar libraries have:" };
    case "now_playing":
      return { phrase: card.actor_count > 1 ? card.actor_count + " players started playing:" : actorName + " just started playing:" };
    case "just_finished":
      return { phrase: card.actor_count > 1 ? card.actor_count + " players finished:" : actorName + " just finished:" };
    case "review_positive":
      return { phrase: card.actor_count > 1 ? card.actor_count + " players loved:" : actorName + " loved:" };
    case "review_negative":
      return { phrase: card.actor_count > 1 ? card.actor_count + " players gave a low score to:" : actorName + " gave a low score to:", isNegative: true };
    case "thumbs_down":
      return { phrase: actorName + " passed on:", isNegative: true };
    case "chart_climber":
      return { phrase: card.chart_movement >= 2 ? "jumped " + card.chart_movement + " spots into the top 10:" : "moved up " + (card.chart_movement || 1) + " spot on The Charts:", isChart: true };
    case "multi_review_prompt":
      return { phrase: card.actor_count + " players reviewed:", isReview: true };
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

// ─── Main component ───────────────────────────────────────────────────────────
function DiscoveryCardVertical({ card, currentUser, setActivePage, setCurrentGame, setCurrentPlayer, isMobile, isGuest, onSignIn, setGameDefaultTab }) {
  const [game, setGame] = useState(null);
  const [actor, setActor] = useState(null);
  const [addedToShelf, setAddedToShelf] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);

  useEffect(() => {
    if (card.game_id) {
      supabase.from("games").select("id, name, cover_url").eq("id", card.game_id).single()
        .then(({ data }) => { if (data) setGame(data); });
    }
    if (card.actor_user_id) {
      supabase.from("profiles").select("id, username").eq("id", card.actor_user_id).single()
        .then(({ data }) => { if (data) setActor(data); });
    }
    if (!card.seen) {
      supabase.from("discovery_cards").update({ seen: true }).eq("id", card.id);
    }
  }, [card.id]);

  const actorName = actor?.username || (card.actor_count > 1 ? card.actor_count + " players" : "A player");
  const copy = getCardCopy(card, actorName);
  const typeLabel = getTypeLabel(card.discovery_type);

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
      supabase.from("user_games").upsert({ user_id: authUser.id, game_id: game.id, status }, { onConflict: "user_id,game_id" }),
      supabase.from("discovery_cards").update({ seen: true }).eq("id", card.id),
    ]);
    setAddedToShelf(status);
    setShelfOpen(false);
  };

  const markNotInterested = async () => {
    if (isGuest) { onSignIn?.(); return; }
    if (!game) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await Promise.all([
      supabase.from("user_games").upsert({ user_id: authUser.id, game_id: game.id, status: "not_for_me" }, { onConflict: "user_id,game_id" }),
      supabase.from("discovery_cards").update({ seen: true }).eq("id", card.id),
    ]);
    setDismissed(true);
  };

  const borderColor = copy.isNegative ? C.red : C.border;

  return (
    <PixelCard borderColor={borderColor}>
      {/* Game art with padding — sits inside the card */}
      <div style={{ padding: "10px 10px 0", cursor: "pointer" }} onClick={navigateToGame}>
        <div style={{ width: "100%", aspectRatio: "3/4", background: "#0a0f1a", overflow: "hidden" }}>
          {game?.cover_url
            ? <img src={game.cover_url} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🎮</div>
          }
        </div>
      </div>

      {/* Content zone */}
      <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", textAlign: "center" }}>

        {/* Type label */}
        {typeLabel && (
          <span style={{
            background: typeLabel.color + "18",
            border: "1px solid " + typeLabel.color + "44",
            borderRadius: C.radius.badge,
            padding: "1px 6px",
            fontSize: 9, fontWeight: 700, color: typeLabel.color,
            textTransform: "uppercase", letterSpacing: "0.4px",
          }}>{typeLabel.label}</span>
        )}

        {/* Discovery phrase */}
        {copy.phrase && (
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
            {copy.phrase}
          </div>
        )}

        {/* Game tag — centered, auto width */}
        {game && (
          <span onClick={e => { e.stopPropagation(); navigateToGame(); }}
            style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: C.radius.badge, padding: "2px 10px", fontSize: 11, color: C.accentSoft, fontWeight: 700, cursor: "pointer", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {game.name}
          </span>
        )}

        {/* Action */}
        {!addedToShelf && !dismissed && (
          <div style={{ width: "100%", position: "relative" }}>
            {/* Add to Shelf button */}
            <button onClick={() => setShelfOpen(o => !o)}
              style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: C.radius.button, padding: "5px 8px", color: C.textMuted, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              + Add to Shelf
            </button>

            {/* Dropdown shelf options */}
            {shelfOpen && (
              <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: C.radius.card, overflow: "hidden", zIndex: 20 }}>
                {[
                  { status: "want_to_play", label: "Want to Play" },
                  { status: "playing", label: "Playing Now" },
                  { status: "have_played", label: "Have Played" },
                  { status: "not_for_me", label: "Not Interested" },
                ].map(({ status, label }, i, arr) => (
                  <button key={status}
                    onClick={() => status === "not_for_me" ? markNotInterested() : addToShelf(status)}
                    style={{ width: "100%", background: "none", border: "none", borderBottom: i < arr.length - 1 ? "1px solid " + C.border : "none", padding: "8px 12px", color: status === "not_for_me" ? C.textDim : C.text, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceRaised}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {addedToShelf && (
          <span style={{ color: C.green, fontSize: 10, fontWeight: 600 }}>✓ Added</span>
        )}

        {copy.isChart && (
          <button onClick={() => { setActivePage("games"); window.history.pushState({ page: "games" }, "", "/games"); }}
            style={{ width: "100%", background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: C.radius.button, padding: "5px 8px", color: C.accentSoft, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            See The Charts →
          </button>
        )}

        {copy.isReview && (
          <button onClick={() => { if (setGameDefaultTab) setGameDefaultTab("reviews"); navigateToGame(); }}
            style={{ width: "100%", background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: C.radius.button, padding: "5px 8px", color: C.accentSoft, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            Write a Review →
          </button>
        )}

      </div>
    </PixelCard>
  );
}

export { DiscoveryCardVertical };
