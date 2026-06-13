import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { PixelCornerBox } from "./PixelCornerBox.jsx";
import { PixelButton } from "./PixelButton.jsx";
import { GameTag } from "./GameTag.jsx";

function getBanner(type) {
  switch (type) {
    case "shelf_add":              return { label: "GuildLink Discovery", color: C.accent };
    case "chart_climber":          return { label: "Chart Climber", color: C.gold };
    case "platform_trending":      return { label: "Trending on GuildLink", color: C.accent };
    case "followed_shelf_add":     return { label: "Follower Update", color: C.teal };
    case "followed_now_playing":   return { label: "Follower Update", color: C.teal };
    case "followed_just_finished": return { label: "Follower Update", color: C.teal };
    case "followed_review":        return { label: "Follower Update", color: C.teal };
    default: return null;
  }
}

const SHELF_OPTIONS = [
  { status: "want_to_play", label: "Want to Play" },
  { status: "playing",      label: "Playing Now" },
  { status: "have_played",  label: "Have Played" },
  { status: "not_for_me",   label: "Not Interested" },
];

const textStyle = { fontSize: 12, color: C.textMuted, lineHeight: 1.4 };

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
      supabase.from("profiles").select("id, username, handle").eq("id", card.actor_user_id).single()
        .then(({ data }) => { if (data) setActor(data); });
    }
    if (!card.seen) {
      supabase.from("discovery_cards").update({ seen: true }).eq("id", card.id);
    }
  }, [card.id]);

  if (dismissed) return null;

  const isFollowCard = card.discovery_type.startsWith("followed_");
  const banner = getBanner(card.discovery_type);

  const navigateToGame = () => {
    if (!game) return;
    setCurrentGame(game.id);
    setActivePage("game");
    window.history.pushState({ page: "game", gameId: game.id }, "", "/game/" + game.id);
  };

  const navigateToActor = () => {
    if (!actor) return;
    setCurrentPlayer(actor.id);
    setActivePage("player");
    window.history.pushState({ page: "player", playerId: actor.id }, "", "/player/" + (actor.handle || actor.id).replace("@", ""));
  };

  const navigateToActorShelf = () => {
    if (!actor) return;
    setCurrentPlayer(actor.id);
    setActivePage("player");
    window.history.pushState({ page: "player", playerId: actor.id }, "", "/player/" + (actor.handle || actor.id).replace("@", ""));
    // Shelf tab will be default on player page
  };

  const handleShelfSelect = async (status) => {
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
    if (status === "not_for_me") { setDismissed(true); } else { setAddedToShelf(status); }
    setShelfOpen(false);
  };

  // ── GIC badge — gold, clickable to actor's shelf ──────────────────────────
  const GICBadge = () => {
    if (!card.overlap_count || card.overlap_count <= 0) return null;
    return (
      <GameTag
        label={card.overlap_count + " GIC"}
        variant="gold"
        size="sm"
        onClick={navigateToActorShelf}
      />
    );
  };

  // ── Card body by type ─────────────────────────────────────────────────────
  const renderBody = () => {

    // GuildLink Discovery
    if (card.discovery_type === "shelf_add") {
      return (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.5px" }}>Discovery</span>
            <GICBadge />
          </div>
          <div style={textStyle}>You might like</div>
          {game && (
            <div style={{ width: "100%", display: "flex", justifyContent: "center", overflow: "hidden" }}>
              <GameTag label={game.name} onClick={navigateToGame} size="md" style={{ maxWidth: "100%" }} />
            </div>
          )}
          <div style={textStyle}>based on shelf overlap</div>
        </>
      );
    }

    // Chart Climber
    if (card.discovery_type === "chart_climber") {
      const isNew = !card.chart_movement || card.chart_movement >= 5;
      return (
        <>
          {game && (
            <div style={{ width: "100%", display: "flex", justifyContent: "center", overflow: "hidden" }}>
              <GameTag label={game.name} onClick={navigateToGame} size="md" style={{ maxWidth: "100%" }} />
            </div>
          )}
          <div style={textStyle}>
            {isNew ? "jumped into the top 10" : "moved up to #" + (card.chart_movement || "") + " on The Charts"}
          </div>
        </>
      );
    }

    // Trending
    if (card.discovery_type === "platform_trending") {
      return (
        <>
          {game && (
            <div style={{ width: "100%", display: "flex", justifyContent: "center", overflow: "hidden" }}>
              <GameTag label={game.name} onClick={navigateToGame} size="md" style={{ maxWidth: "100%" }} />
            </div>
          )}
          <div style={textStyle}>{card.actor_count + " players added this week"}</div>
        </>
      );
    }

    // Follower Update
    if (isFollowCard) {
      const actorName = actor ? (actor.handle || ("@" + actor.username)) : "Someone you follow";
      const action =
        card.discovery_type === "followed_review"         ? "reviewed" :
        card.discovery_type === "followed_now_playing"    ? "started playing" :
        card.discovery_type === "followed_just_finished"  ? "just finished" :
        card.shelf_status === "want_to_play"              ? "wants to play" :
        card.shelf_status === "playing"                   ? "started playing" :
        "added";

      const postfix =
        card.discovery_type === "followed_review"         ? "" :
        card.discovery_type === "followed_now_playing"    ? "" :
        card.discovery_type === "followed_just_finished"  ? "" :
        "to their shelf";

      return (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
            <span
              onClick={navigateToActor}
              style={{ fontSize: 12, fontWeight: 700, color: C.text, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              {actorName}
            </span>
            <GICBadge />
          </div>
          <div style={textStyle}>{action}</div>
          {game && (
            <div style={{ width: "100%", display: "flex", justifyContent: "center", overflow: "hidden" }}>
              <GameTag label={game.name} onClick={navigateToGame} size="md" style={{ maxWidth: "100%" }} />
            </div>
          )}
          {postfix ? <div style={textStyle}>{postfix}</div> : null}
        </>
      );
    }

    return null;
  };

  // ── CTA ───────────────────────────────────────────────────────────────────
  const renderCTA = () => {
    if (card.discovery_type === "chart_climber") {
      return (
        <PixelButton fullWidth size="sm"
          bgStyle={"color-mix(in srgb, " + C.gold + " 10%, " + C.bg + ")"}
          borderColor={C.goldBorder} color={C.gold}
          onClick={() => { setActivePage("games"); window.history.pushState({ page: "games" }, "", "/games"); }}>
          {"View The Charts →"}
        </PixelButton>
      );
    }
    if (card.discovery_type === "followed_review") {
      return (
        <PixelButton fullWidth size="sm"
          bgStyle={"color-mix(in srgb, " + C.accent + " 10%, " + C.bg + ")"}
          borderColor={C.accentDim} color={C.accentSoft}
          onClick={() => { if (setGameDefaultTab) setGameDefaultTab("reviews"); navigateToGame(); }}>
          {"Read their review →"}
        </PixelButton>
      );
    }
    if (!addedToShelf && !dismissed) {
      return (
        <div style={{ width: "100%", padding: "1px 0" }}>
          <PixelButton fullWidth size="xs" bg={C.surface} borderColor={C.goldBorder} color={C.gold}
            style={{ justifyContent: "center" }}
            onClick={() => isGuest ? onSignIn?.("Sign in to add games to your shelf.") : setShelfOpen(true)}>
            {"+ Add to Shelf"}
          </PixelButton>
        </div>
      );
    }
    if (addedToShelf) {
      return <span style={{ color: C.green, fontSize: 10, fontWeight: 600 }}>✓ Added</span>;
    }
    return null;
  };

  return (
    <PixelCornerBox size="lg" borderColor={C.border} bg={C.surface}>
      {/* Shelf overlay */}
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
          padding: "16px", gap: 8,
        }}>
          {game && <div style={{ color: C.text, fontWeight: 700, fontSize: 13, textAlign: "center", marginBottom: 8 }}>{game.name}</div>}
          {SHELF_OPTIONS.map(opt => {
            const optColor = opt.status === "playing" ? C.green : opt.status === "want_to_play" ? C.accent : opt.status === "have_played" ? C.gold : C.red;
            return (
              <PixelButton key={opt.status} fullWidth size="sm"
                bgStyle={"color-mix(in srgb, " + optColor + " 12%, " + C.bg + ")"}
                borderColor={optColor} color={optColor}
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

      {/* Game art */}
      <div style={{ padding: "8% 8% 0", cursor: "pointer" }} onClick={navigateToGame}>
        <div style={{ width: "100%", aspectRatio: "3/4", background: "#0a0f1a", overflow: "hidden" }}>
          {game?.cover_url
            ? <img src={game.cover_url} alt={game?.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎮</div>
          }
        </div>
      </div>

      {/* Content zone */}
      <div style={{ padding: "8px 12px 12px", display: "flex", flexDirection: "column", gap: 5, alignItems: "center", textAlign: "center" }}>
        {/* Banner */}
        {banner && (
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: banner.color }}>
            {banner.label}
          </div>
        )}
        {renderBody()}
        {renderCTA()}
      </div>
    </PixelCornerBox>
  );
}

export { DiscoveryCardVertical };
