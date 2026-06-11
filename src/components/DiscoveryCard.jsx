import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { Avatar } from "./Avatar.jsx";
import { PixelCornerBox } from "./PixelCornerBox.jsx";

function getCardCopy(card, actorName) {
  switch (card.discovery_type) {

    case "shelf_add":
      return {
        phrase: card.actor_count + " players with similar libraries have:",
        sub: "Not on your shelf yet.",
        cta_shelf: true,
      };

    case "now_playing":
      if (card.actor_count > 1) {
        return {
          phrase: card.actor_count + " players with similar libraries just started playing:",
          sub: "It's already on your Want to Play list.",
          cta_ask: "Ask how they're enjoying it",
        };
      }
      return {
        phrase: actorName + " just started playing:",
        sub: "It's on your Want to Play list.",
        cta_ask: "Ask how they're enjoying it",
      };

    case "just_finished":
      if (card.actor_count > 1) {
        return {
          phrase: card.actor_count + " players with similar libraries just finished:",
          sub: "You're currently playing it.",
          cta_ask: "Ask what they thought",
        };
      }
      return {
        phrase: actorName + " just finished:",
        sub: "You're currently playing it.",
        cta_ask: "Ask what they thought",
      };

    case "review_positive":
      if (card.actor_count > 1) {
        return {
          phrase: card.actor_count + " players with similar libraries loved:",
          sub: "It's already on your shelf.",
          cta_ask: "See their reviews",
        };
      }
      return {
        phrase: actorName + " loved:",
        sub: null,
        cta_ask: "See the review",
      };

    case "review_negative":
      if (card.actor_count > 1) {
        return {
          phrase: card.actor_count + " players with similar libraries gave a low score to:",
          sub: "Does this change your intent?",
          cta_ask: "See their reviews",
          cta_shelf: true,
          isNegative: true,
        };
      }
      return {
        phrase: actorName + " gave a low score to:",
        sub: "Does this change your intent?",
        cta_ask: "See the review",
        cta_shelf: true,
        isNegative: true,
      };

    case "thumbs_down":
      return {
        phrase: actorName + " passed on:",
        sub: "Does this change your intent?",
        cta_shelf: true,
        isNegative: true,
      };

    case "new_similarity_match":
      return {
        phrase: actorName + " has " + (card.overlap_count || "several") + " games in common with you",
        sub: "You might want to follow them.",
        cta_follow: true,
        no_game_tag: true,
      };

    case "chart_climber":
      return {
        phrase: "is climbing The Charts this week" + (card.chart_movement ? " — up " + card.chart_movement + " positions:" : ":"),
        sub: "It's on your shelf.",
        cta_charts: true,
      };

    case "multi_review_prompt":
      return {
        phrase: card.actor_count + " players reviewed:",
        sub: "You've played it — what did you think?",
        cta_review: true,
      };

    default:
      return { phrase: null, sub: null };
  }
}

function getTypeLabel(discovery_type) {
  switch (discovery_type) {
    case "shelf_add": return null;
    case "now_playing": return { label: "Now Playing", color: C.green };
    case "just_finished": return { label: "Just Finished", color: C.teal };
    case "review_positive": return { label: "Loved It", color: C.gold };
    case "review_negative": return { label: "Skip Signal", color: C.red };
    case "thumbs_down": return { label: "Skip Signal", color: C.red };
    case "new_similarity_match": return null;
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

function DiscoveryCard({ card, currentUser, setActivePage, setCurrentGame, setCurrentPlayer, isMobile, isGuest, onSignIn, setGameDefaultTab }) {
  const [actor, setActor] = useState(null);
  const [game, setGame] = useState(null);
  const [addedToShelf, setAddedToShelf] = useState(null);
  const [followed, setFollowed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

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
    if (card.actor_user_id && card.discovery_type === "new_similarity_match") {
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (!authUser) return;
        supabase.from("follows")
          .select("follower_id")
          .eq("follower_id", authUser.id)
          .eq("followed_user_id", card.actor_user_id)
          .maybeSingle()
          .then(({ data }) => { if (data) setFollowed(true); });
      });
    }
  }, [card.id]);

  const actorName = actor?.username || (card.actor_count > 1 ? card.actor_count + " players" : "A player");
  const copy = getCardCopy(card, actorName);
  const typeLabel = getTypeLabel(card.discovery_type);

  if (dismissed) return null;

  const isSimilarityCard = card.discovery_type === "new_similarity_match";
  if (isSimilarityCard && followed) return null;

  const isNegative = copy.isNegative;

  const navigateToGame = () => {
    if (!game) return;
    setCurrentGame(game.id);
    setActivePage("game");
    window.history.pushState({ page: "game", gameId: game.id }, "", "/game/" + game.id);
  };

  const navigateToReviews = () => {
    if (!game) return;
    if (setGameDefaultTab) setGameDefaultTab("reviews");
    setCurrentGame(game.id);
    setActivePage("game");
    window.history.pushState({ page: "game", gameId: game.id }, "", "/game/" + game.id);
  };

  const addToShelf = async (status) => {
    if (isGuest) { onSignIn?.("Sign in to add games to your shelf."); return; }
    if (!game) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await supabase.from("user_games").upsert(
      { user_id: authUser.id, game_id: game.id, status },
      { onConflict: "user_id,game_id" }
    );
    setAddedToShelf(status);
  };

  const markNotInterested = async () => {
    if (isGuest) { onSignIn?.("Sign in to manage your shelf."); return; }
    if (!game) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await supabase.from("user_games").upsert(
      { user_id: authUser.id, game_id: game.id, status: "not_for_me" },
      { onConflict: "user_id,game_id" }
    );
    setDismissed(true);
  };

  const followActor = async () => {
    if (isGuest) { onSignIn?.("Sign in to follow players."); return; }
    if (!actor) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await supabase.from("follows").insert({ follower_id: authUser.id, followed_user_id: actor.id });
    setFollowed(true);
  };

  const GameTag = game ? (
    <span
      onClick={e => { e.stopPropagation(); navigateToGame(); }}
      style={{ display: "inline-block", background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 3, padding: "2px 10px", fontSize: 13, color: C.accentSoft, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
      {game.name}
    </span>
  ) : null;

  return (
    <PixelCornerBox
      size="lg"
      borderColor={isNegative ? C.red : C.border}
      bg={C.surface}
      style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 0 }}>

        {/* Left column */}
        {isSimilarityCard ? (
          <div style={{ padding: "16px 0 16px 16px", flexShrink: 0, cursor: "pointer" }}
            onClick={() => { if (actor) { setCurrentPlayer(actor.id); setActivePage("player"); window.history.pushState({ page: "player", playerId: actor.id }, "", "/player/" + (actor.handle || actor.id).replace("@", "")); } }}>
            {actor ? (
              <Avatar initials={actor.avatar_initials || "?"} size={64} founding={actor.is_founding} ring={actor.active_ring} avatarConfig={actor.avatar_config} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👤</div>
            )}
          </div>
        ) : game?.cover_url ? (
          <div onClick={navigateToGame} style={{ width: 80, flexShrink: 0, cursor: "pointer", overflow: "hidden" }}>
            <img src={game.cover_url} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 120 }} />
          </div>
        ) : (
          <div style={{ width: 80, flexShrink: 0, background: C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
            <span style={{ fontSize: 28 }}>🎮</span>
          </div>
        )}

        {/* Content column */}
        <div style={{ flex: 1, padding: "16px 16px 0 12px", minWidth: 0 }}>

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.6px" }}>GuildLink Discovery</span>
            {typeLabel && (
              <>
                <span style={{ color: C.border, fontSize: 10 }}>·</span>
                <span style={{
                  background: typeLabel.color + "18",
                  border: "1px solid " + typeLabel.color + "44",
                  borderRadius: 3, padding: "1px 7px",
                  fontSize: 10, fontWeight: 700, color: typeLabel.color,
                }}>{typeLabel.label}</span>
              </>
            )}
            {card.overlap_count && card.actor_count === 1 && !isSimilarityCard ? (
              <>
                <span style={{ color: C.border, fontSize: 10 }}>·</span>
                <span style={{
                  background: C.accentGlow,
                  border: "1px solid " + C.accentDim,
                  borderRadius: 3, padding: "1px 7px",
                  fontSize: 10, fontWeight: 700, color: C.accentSoft,
                }}>{card.overlap_count} games in common</span>
              </>
            ) : null}
          </div>

          {/* Phrase */}
          <div style={{ marginBottom: copy.sub ? 4 : 10 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 14, lineHeight: 1.4 }}>
              {copy.phrase}
            </div>
            {!copy.no_game_tag && GameTag}
          </div>

          {/* Sub */}
          {copy.sub && (
            <div style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5, marginBottom: 10, marginTop: copy.no_game_tag ? 0 : 6 }}>
              {copy.sub}
            </div>
          )}

          {/* Actor row */}
          {actor && card.actor_is_public && card.actor_count === 1 && card.discovery_type !== "shelf_add" && !isSimilarityCard && (
            <div
              onClick={() => { setCurrentPlayer(actor.id); setActivePage("player"); window.history.pushState({ page: "player", playerId: actor.id }, "", "/player/" + (actor.handle || actor.id).replace("@", "")); }}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              <Avatar initials={actor.avatar_initials || "?"} size={22} founding={actor.is_founding} ring={actor.active_ring} avatarConfig={actor.avatar_config} />
              <span style={{ color: C.accentSoft, fontSize: 12, fontWeight: 600 }}>{actor.username}</span>
              <span style={{ color: C.textDim, fontSize: 11 }}>{actor.handle}</span>
            </div>
          )}

          {/* Action row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingBottom: 12 }}>

            {/* Ask CTA */}
            {copy.cta_ask && (
              <button
                onClick={() => {
                  if (isGuest) { onSignIn?.("Sign in to start a conversation."); return; }
                  navigateToReviews();
                }}
                style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 3, padding: "4px 12px", color: C.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {copy.cta_ask} →
              </button>
            )}

            {/* Write a review CTA */}
            {copy.cta_review && game && (
              <button
                onClick={() => {
                  if (isGuest) { onSignIn?.("Sign in to write a review."); return; }
                  navigateToReviews();
                }}
                style={{ background: C.goldDim || C.accentGlow, border: "1px solid " + C.gold + "44", borderRadius: 3, padding: "4px 12px", color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Write a Review →
              </button>
            )}

            {/* Shelf buttons */}
            {copy.cta_shelf && !addedToShelf && !dismissed && game && (
              <>
                {SHELF_BUTTONS.map(({ status, label }) => (
                  <button key={status} onClick={() => addToShelf(status)}
                    style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 3, padding: "4px 8px", color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
                <button onClick={markNotInterested}
                  style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 3, padding: "4px 8px", color: C.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  Not Interested
                </button>
              </>
            )}

            {addedToShelf && (
              <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>✓ Added to shelf</span>
            )}

            {/* Follow */}
            {copy.cta_follow && actor && !followed && (
              <button onClick={followActor}
                style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 3, padding: "5px 12px", color: C.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Follow {actor.username}
              </button>
            )}

            {followed && (
              <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>✓ Following</span>
            )}

            {/* Charts link */}
            {copy.cta_charts && game && (
              <button
                onClick={() => { setActivePage("games"); window.history.pushState({ page: "games" }, "", "/games"); }}
                style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 3, padding: "4px 12px", color: C.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                See on Charts →
              </button>
            )}

          </div>
        </div>
      </div>
    </PixelCornerBox>
  );
}

export { DiscoveryCard };
