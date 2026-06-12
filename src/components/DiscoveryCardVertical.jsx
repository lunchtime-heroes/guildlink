import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { PixelCornerBox } from "./PixelCornerBox.jsx";
import { PixelButton } from "./PixelButton.jsx";
import { GameTag } from "./GameTag.jsx";


// ─── Copy ────────────────────────────────────────────────────────────────────
function getPhrase(card, actorName) {
  switch (card.discovery_type) {
    case "shelf_add": return card.actor_count + " players with similar libraries have:";
    case "now_playing": return card.actor_count > 1 ? card.actor_count + " players started playing:" : actorName + " just started playing:";
    case "just_finished": return card.actor_count > 1 ? card.actor_count + " players finished:" : actorName + " just finished:";
    case "review_positive": return card.actor_count > 1 ? card.actor_count + " players loved:" : actorName + " loved:";
    case "review_negative": return card.actor_count > 1 ? card.actor_count + " players gave a low score to:" : actorName + " gave a low score to:";
    case "thumbs_down": return actorName + " passed on:";
    case "chart_climber": return card.chart_movement >= 2 ? "jumped " + card.chart_movement + " spots into the top 10:" : "moved up " + (card.chart_movement || 1) + " spot on The Charts:";
    case "multi_review_prompt": return card.actor_count + " players reviewed:";
    default: return null;
  }
}

function getTypeLabel(t) {
  switch (t) {
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

const SHELF_OPTIONS = [
  { status: "want_to_play", label: "Want to Play" },
  { status: "playing", label: "Playing Now" },
  { status: "have_played", label: "Have Played" },
  { status: "not_for_me", label: "Not Interested" },
];

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
  const phrase = getPhrase(card, actorName);
  const typeLabel = getTypeLabel(card.discovery_type);
  const isNegative = card.discovery_type === "review_negative" || card.discovery_type === "thumbs_down";

  if (dismissed) return null;

  const navigateToGame = () => {
    if (!game) return;
    setCurrentGame(game.id);
    setActivePage("game");
    window.history.pushState({ page: "game", gameId: game.id }, "", "/game/" + game.id);
  };

  const handleShelfSelect = async (status) => {
    if (isGuest) { onSignIn?.("Sign in to add games to your shelf."); return; }
    if (!game) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await Promise.all([
      supabase.from("user_games").upsert(
        { user_id: authUser.id, game_id: game.id, status: status === "not_for_me" ? "not_for_me" : status },
        { onConflict: "user_id,game_id" }
      ),
      supabase.from("discovery_cards").update({ seen: true }).eq("id", card.id),
    ]);
    if (status === "not_for_me") { setDismissed(true); } else { setAddedToShelf(status); }
    setShelfOpen(false);
  };

  const borderColor = isNegative ? C.red : C.border;
  // Art padding: ~8% of card width on left/right/top — matches SVG 25/302 ratio
  const artPad = "8%";

  return (
    <PixelCornerBox size="lg" borderColor={borderColor} bg={C.surface}>
      {/* Shelf overlay — full tile, appears on Add to Shelf click */}
      {shelfOpen && ReactDOM.createPortal(
        <div onClick={() => setShelfOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />,
        document.body
      )}
      {shelfOpen && (
        <div style={{
            position: "absolute", inset: 0, zIndex: 10,
            background: C.bg,
            display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "stretch",
            padding: "16px 16px",
            gap: 8,
          }}>
            {game && <div style={{ color: C.text, fontWeight: 700, fontSize: 13, textAlign: "center", marginBottom: 8 }}>{game.name}</div>}
            {SHELF_OPTIONS.map(opt => {
              const optColor = opt.status === "playing" ? C.green : opt.status === "want_to_play" ? C.accent : opt.status === "have_played" ? C.gold : C.red;
              const optBg = "color-mix(in srgb, " + optColor + " 12%, " + C.bg + ")";
              return (
                <PixelButton key={opt.status} fullWidth size="md"
                  bgStyle={optBg}
                  borderColor={optColor}
                  color={optColor}
                  onClick={() => handleShelfSelect(opt.status)}>
                  {opt.label}
                </PixelButton>
              );
            })}
            <button onClick={() => setShelfOpen(false)}
              style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", marginTop: 4, textAlign: "center" }}>
              Cancel
            </button>
          </div>
      )}

      {/* Game art with padding — aspect ratio maintained */}
      <div style={{ padding: artPad + " " + artPad + " 0", cursor: "pointer" }} onClick={navigateToGame}>
        <div style={{ width: "100%", aspectRatio: "3/4", background: "#0a0f1a", overflow: "hidden" }}>
          {game?.cover_url
            ? <img src={game.cover_url} alt={game?.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎮</div>
          }
        </div>
      </div>

      {/* Content zone */}
      <div style={{ padding: "8px 12px 12px", display: "flex", flexDirection: "column", gap: 5, alignItems: "center", textAlign: "center" }}>

        {typeLabel && (
          <GameTag label={typeLabel.label} variant="muted" style={{ alignSelf: "center" }} />
        )}

        {phrase && (
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
            {phrase}
          </div>
        )}

        {game && (
          <div style={{ width: "100%", display: "flex", justifyContent: "center", overflow: "hidden" }}>
            <GameTag label={game.name} onClick={() => { navigateToGame(); }} size="md" style={{ maxWidth: "100%" }} />
          </div>
        )}

        {/* Add to Shelf — gold button */}
        {!addedToShelf && !dismissed && (
          <div style={{ width: "100%", padding: "0 2px" }}>
            <PixelButton fullWidth size="md" bg={C.goldGlow} borderColor={C.goldBorder} color={C.gold} style={{ justifyContent: "center" }} onClick={() => isGuest ? onSignIn?.("Sign in to add games to your shelf.") : setShelfOpen(true)}>
              {"+ Add to Shelf"}
            </PixelButton>
          </div>
        )}

        {addedToShelf && (
          <span style={{ color: C.green, fontSize: 10, fontWeight: 600 }}>✓ Added</span>
        )}

        {card.discovery_type === "chart_climber" && (
          <PixelButton fullWidth size="md" bg={C.accentGlow} borderColor={C.accentDim} color={C.accentSoft} style={{ justifyContent: "center" }} onClick={() => { setActivePage("games"); window.history.pushState({ page: "games" }, "", "/games"); }}>
            {"See The Charts →"}
          </PixelButton>
        )}

        {card.discovery_type === "multi_review_prompt" && (
          <PixelButton fullWidth size="md" bg={C.accentGlow} borderColor={C.accentDim} color={C.accentSoft} style={{ justifyContent: "center" }} onClick={() => { if (setGameDefaultTab) setGameDefaultTab("reviews"); navigateToGame(); }}>
            {"Write a Review →"}
          </PixelButton>
        )}

      </div>
    </PixelCornerBox>
  );
}

export { DiscoveryCardVertical };
