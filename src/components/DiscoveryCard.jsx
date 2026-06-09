import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo } from "../utils.js";
import { Avatar } from "./Avatar.jsx";

// ─── Copy generation ───────────────────────────────────────────────────────
function getCardCopy(card, actorName) {
  switch (card.discovery_type) {

    case "shelf_add":
      return {
        phrase: card.actor_count + " players with similar libraries have:",
        sub: "Not on your shelf yet.",
        cta_ask: null,
        cta_shelf: true,
      };

    case "now_playing":
      if (card.actor_count > 1) {
        return {
          phrase: card.actor_count + " players with similar libraries just started playing:",
          sub: "It's already on your Want to Play list.",
          cta_ask: "Ask how they're enjoying it",
          cta_shelf: false,
        };
      }
      return {
        phrase: actorName + " just started playing:",
        sub: "It's on your Want to Play list.",
        cta_ask: "Ask how they're enjoying it",
        cta_shelf: false,
      };

    case "just_finished":
      if (card.actor_count > 1) {
        return {
          phrase: card.actor_count + " players with similar libraries just finished:",
          sub: "You're currently playing it.",
          cta_ask: "Ask what they thought",
          cta_shelf: false,
        };
      }
      return {
        phrase: actorName + " just finished:",
        sub: "You're currently playing it.",
        cta_ask: "Ask what they thought",
        cta_shelf: false,
      };

    case "review_positive":
      if (card.actor_count > 1) {
        return {
          phrase: card.actor_count + " players with similar libraries loved:",
          sub: "It's already on your shelf.",
          cta_ask: "See their reviews",
          cta_shelf: false,
        };
      }
      return {
        phrase: actorName + " loved:",
        sub: null,
        cta_ask: "See the review",
        cta_shelf: false,
      };

    case "review_negative":
      if (card.actor_count > 1) {
        return {
          phrase: card.actor_count + " players with similar libraries gave a low score to:",
          sub: "It's on your Want to Play list.",
          cta_ask: "See their reviews",
          cta_shelf: false,
          cta_negative: true,
        };
      }
      return {
        phrase: actorName + " gave a low score to:",
        sub: "It's on your Want to Play list.",
        cta_ask: "See the review",
        cta_shelf: false,
        cta_negative: true,
      };

    case "thumbs_down":
      return {
        phrase: actorName + " isn't interested in:",
        sub: "It's on your Want to Play list.",
        cta_ask: null,
        cta_shelf: false,
        cta_negative: true,
        cta_thumbs: true,
      };

    case "new_similarity_match":
      return {
        phrase: actorName + " has " + (card.overlap_count || "several") + " games in common with you",
        sub: "You might want to follow them.",
        cta_ask: null,
        cta_shelf: false,
        cta_follow: true,
        no_game_tag: true,
      };

    case "chart_climber":
      return {
        phrase: "is climbing The Charts this week" + (card.chart_movement ? " — up " + card.chart_movement + " positions:" : ":"),
        sub: "It's on your shelf.",
        cta_ask: null,
        cta_shelf: false,
        phrase_game_first: true,
      };

    default:
      return { phrase: null, sub: null, cta_ask: null, cta_shelf: false };
  }
}

// ─── Discovery type label ───────────────────────────────────────────────────
function getTypeLabel(discovery_type) {
  switch (discovery_type) {
    case "shelf_add": return null;
    case "now_playing": return { label: "Now Playing", color: C.green };
    case "just_finished": return { label: "Just Finished", color: C.teal };
    case "review_positive": return { label: "Loved It", color: C.gold };
    case "review_negative": return { label: "Skip Signal", color: C.red };
    case "thumbs_down": return { label: "Skip Signal", color: C.red };
    case "new_similarity_match": return { label: "Similar Taste", color: C.accent };
    case "chart_climber": return { label: "Chart Climber", color: C.gold };
    default: return null;
  }
}

// ─── Main component ─────────────────────────────────────────────────────────
function DiscoveryCard({ card, currentUser, setActivePage, setCurrentGame, setCurrentPlayer, isMobile, isGuest, onSignIn }) {
  const [actor, setActor] = useState(null);
  const [game, setGame] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(card.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addedToShelf, setAddedToShelf] = useState(null);
  const [followed, setFollowed] = useState(false);
  const [markedNotInterested, setMarkedNotInterested] = useState(false);
  const commentInputRef = React.useRef(null);

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
    // Check if already following actor
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
  const isNegative = card.discovery_type === "review_negative" || card.discovery_type === "thumbs_down";

  const toggleLike = async () => {
    if (isGuest) { onSignIn?.("Sign in to like discoveries."); return; }
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes(l => newLiked ? l + 1 : Math.max(0, l - 1));
    await supabase.from("discovery_cards")
      .update({ likes: newLiked ? likes + 1 : Math.max(0, likes - 1) })
      .eq("id", card.id);
  };

  const loadComments = async () => {
    const { data } = await supabase.from("comments")
      .select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
      .eq("post_id", card.id)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  };

  const toggleComments = () => {
    if (!showComments && comments === null) loadComments();
    setShowComments(s => !s);
  };

  const submitComment = async () => {
    if (isGuest) { onSignIn?.("Sign in to join the conversation."); return; }
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("comments").insert({
      post_id: card.id,
      user_id: authUser.id,
      content: commentText.trim(),
    }).select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)").single();
    if (!error && data) {
      setComments(prev => [...(prev || []), data]);
      setCommentText("");
      await supabase.from("discovery_cards")
        .update({ comment_count: (card.comment_count || 0) + 1 })
        .eq("id", card.id);
    }
    setSubmitting(false);
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
    setMarkedNotInterested(true);
  };

  const followActor = async () => {
    if (isGuest) { onSignIn?.("Sign in to follow players."); return; }
    if (!actor) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await supabase.from("follows").insert({ follower_id: authUser.id, followed_user_id: actor.id });
    setFollowed(true);
  };

  const startConversation = () => {
    if (isGuest) { onSignIn?.("Sign in to start a conversation."); return; }
    setShowComments(true);
    if (comments === null) loadComments();
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const navigateToGame = () => {
    if (!game) return;
    setCurrentGame(game.id);
    setActivePage("game");
    window.history.pushState({ page: "game", gameId: game.id }, "", "/game/" + game.id);
  };

  if (markedNotInterested) return null;
  if (isSimilarityCard && followed) return null;

  const isSimilarityCard = card.discovery_type === "new_similarity_match";

  // Game tag pill — clickable, matches post game tag style
  const GameTag = game ? (
    <span
      onClick={e => { e.stopPropagation(); navigateToGame(); }}
      style={{ display: "inline-block", background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 6, padding: "2px 10px", fontSize: 13, color: C.accentSoft, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
      {game.name}
    </span>
  ) : null;

  return (
    <div style={{
      background: C.surface,
      border: "1px solid " + (isNegative ? C.red + "33" : C.border),
      borderRadius: 14,
      marginBottom: 12,
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", gap: 0 }}>

        {/* Left column — actor avatar for similarity cards, game art for everything else */}
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
          <div onClick={navigateToGame} style={{ width: 92, flexShrink: 0, cursor: "pointer", overflow: "hidden" }}>
            <img src={game.cover_url} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 120 }} />
          </div>
        ) : (
          <div style={{ width: 92, flexShrink: 0, background: C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
            <span style={{ fontSize: 28 }}>🎮</span>
          </div>
        )}

        {/* Content column */}
        <div style={{ flex: 1, padding: "16px 16px 0 12px", minWidth: 0 }}>

          {/* Header row — GUILDLINK DISCOVERY only, no redundant badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.6px" }}>GuildLink Discovery</span>
            {typeLabel && !isSimilarityCard && (
              <>
                <span style={{ color: C.border, fontSize: 10 }}>·</span>
                <span style={{
                  background: typeLabel.color + "18",
                  border: "1px solid " + typeLabel.color + "44",
                  borderRadius: 5, padding: "1px 7px",
                  fontSize: 10, fontWeight: 700, color: typeLabel.color,
                }}>{typeLabel.label}</span>
              </>
            )}
            {/* Games in common badge — only on single-actor non-similarity cards */}
            {card.overlap_count && card.actor_count === 1 && !isSimilarityCard ? (
              <>
                <span style={{ color: C.border, fontSize: 10 }}>·</span>
                <span style={{
                  background: C.accentGlow,
                  border: "1px solid " + C.accentDim,
                  borderRadius: 5, padding: "1px 7px",
                  fontSize: 10, fontWeight: 700, color: C.accentSoft,
                }}>{card.overlap_count} games in common</span>
              </>
            ) : null}
          </div>

          {/* Phrase + game tag on its own line */}
          <div style={{ marginBottom: copy.sub ? 4 : 10 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 14, lineHeight: 1.4 }}>
              {copy.phrase}
            </div>
            {/* Game tag below phrase — matches post game tag pattern */}
            {!copy.no_game_tag && GameTag}
          </div>

          {/* Sub */}
          {copy.sub && (
            <div style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5, marginBottom: 10, marginTop: copy.no_game_tag ? 0 : 6 }}>
              {copy.sub}
            </div>
          )}

          {/* Actor avatar row — only for single named actor, not shelf_add, not similarity */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingBottom: 12 }}>

            {/* Like */}
            <button onClick={toggleLike}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: liked ? "#ef4444" : C.textDim, fontSize: 13, padding: 0 }}>
              <span style={{ fontSize: 15 }}>{liked ? "❤️" : "🤍"}</span>
              <span style={{ fontSize: 12 }}>{likes || 0}</span>
            </button>

            {/* Comment */}
            <button onClick={toggleComments}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: C.textDim, fontSize: 13, padding: 0 }}>
              <span style={{ fontSize: 15 }}>💬</span>
              <span style={{ fontSize: 12 }}>{card.comment_count || 0}</span>
            </button>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Ask / conversation starter */}
            {copy.cta_ask && (
              <button onClick={startConversation}
                style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 7, padding: "5px 12px", color: C.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {copy.cta_ask} →
              </button>
            )}

            {/* Shelf buttons — positive cards */}
            {copy.cta_shelf && !addedToShelf && !markedNotInterested && game && (
              <>
                {[
                  { status: "want_to_play", label: "Want to Play" },
                  { status: "playing", label: "Playing Now" },
                  { status: "have_played", label: "Have Played" },
                ].map(({ status, label }) => (
                  <button key={status} onClick={() => addToShelf(status)}
                    style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 7, padding: "4px 8px", color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
                <button onClick={markNotInterested}
                  style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 7, padding: "4px 8px", color: C.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  Not Interested
                </button>
              </>
            )}

            {addedToShelf && (
              <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>✓ Added to shelf</span>
            )}

            {/* Thumbs CTA for negative cards */}
            {copy.cta_thumbs && !addedToShelf && !markedNotInterested && game && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: C.textDim, fontSize: 12 }}>Still interested?</span>
                <button onClick={() => addToShelf("want_to_play")}
                  style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 7, padding: "5px 10px", fontSize: 14, cursor: "pointer" }}>👍</button>
                <button onClick={markNotInterested}
                  style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 7, padding: "5px 10px", fontSize: 14, cursor: "pointer" }}>👎</button>
              </div>
            )}

            {markedNotInterested && (
              <span style={{ color: C.textDim, fontSize: 12, fontWeight: 600 }}>Noted — won't show again</span>
            )}

            {/* Follow actor */}
            {copy.cta_follow && actor && !followed && (
              <button onClick={followActor}
                style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 7, padding: "5px 12px", color: C.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Follow {actor.username}
              </button>
            )}

            {followed && (
              <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>✓ Following</span>
            )}

          </div>
        </div>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ borderTop: "1px solid " + C.border, padding: "12px 16px" }}>
          {(comments || []).map((comment) => {
            const author = comment.profiles;
            return (
              <div key={comment.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flexShrink: 0, cursor: "pointer" }}
                  onClick={() => { setCurrentPlayer(comment.user_id); setActivePage("player"); }}>
                  <Avatar initials={(author?.avatar_initials || "?").slice(0, 2).toUpperCase()} size={28} founding={author?.is_founding} ring={author?.active_ring} avatarConfig={author?.avatar_config} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: C.text, cursor: "pointer" }}
                      onClick={() => { setCurrentPlayer(comment.user_id); setActivePage("player"); }}>
                      {author?.username || "Gamer"}
                    </span>
                    <span style={{ color: C.textDim, fontSize: 11 }}>{timeAgo(comment.created_at)}</span>
                  </div>
                  <p style={{ color: C.text, fontSize: 13, lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })}

          {!isGuest && currentUser ? (
            <div style={{ display: "flex", gap: 10, marginTop: 10, paddingTop: 10, borderTop: comments?.length ? "1px solid " + C.border : "none" }}>
              <Avatar initials={currentUser?.avatar || "GL"} size={28} founding={currentUser?.isFounding} ring={currentUser?.activeRing} avatarConfig={currentUser?.avatarConfig} />
              <div style={{ flex: 1, display: "flex", gap: 8 }}>
                <textarea
                  ref={commentInputRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                  placeholder="Add to the conversation…"
                  rows={1}
                  style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 12px", color: C.text, fontSize: 13, outline: "none", resize: "none", overflow: "hidden", lineHeight: 1.5, fontFamily: "inherit", boxSizing: "border-box" }}
                />
                <button onClick={submitComment} disabled={submitting || !commentText.trim()}
                  style={{ background: commentText.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 14px", color: commentText.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, alignSelf: "flex-start" }}>
                  {submitting ? "…" : "Reply"}
                </button>
              </div>
            </div>
          ) : isGuest ? (
            <div onClick={() => onSignIn?.("Sign in to join the conversation.")}
              style={{ marginTop: 10, paddingTop: 10, borderTop: comments?.length ? "1px solid " + C.border : "none", color: C.textDim, fontSize: 13, cursor: "pointer" }}>
              Sign in to join the conversation →
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export { DiscoveryCard };
