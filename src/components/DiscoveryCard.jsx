import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo } from "../utils.js";
import { Avatar } from "./Avatar.jsx";

// ─── Copy generation ───────────────────────────────────────────────────────
function getCardCopy(card, actorName, gameName) {
  const n = card.overlap_count;
  const overlap = n ? n + " games in common" : null;

  switch (card.discovery_type) {
    case "shelf_add":
      if (card.actor_count > 1) {
        return {
          headline: card.actor_count + " players with similar libraries added " + gameName,
          sub: "Their shelves overlap with yours.",
          cta_ask: "Ask about it",
          cta_shelf: true,
        };
      }
      return {
        headline: actorName + " added " + gameName + " to their shelf",
        sub: overlap ? actorName + " has " + overlap + " with you." : null,
        cta_ask: "Ask " + actorName + " about it",
        cta_shelf: true,
      };

    case "now_playing":
      if (card.actor_count > 1) {
        return {
          headline: card.actor_count + " players with similar libraries just started playing " + gameName,
          sub: "It's already on your Want to Play list.",
          cta_ask: "Ask how they're enjoying it",
          cta_shelf: false,
        };
      }
      return {
        headline: actorName + " just started playing " + gameName,
        sub: overlap ? actorName + " has " + overlap + " with you — and it's on your Want to Play list." : "It's on your Want to Play list.",
        cta_ask: "Ask how they're enjoying it",
        cta_shelf: false,
      };

    case "just_finished":
      if (card.actor_count > 1) {
        return {
          headline: card.actor_count + " players with similar libraries just finished " + gameName,
          sub: "You're currently playing it.",
          cta_ask: "Ask what they thought",
          cta_shelf: false,
        };
      }
      return {
        headline: actorName + " just finished " + gameName,
        sub: overlap ? actorName + " has " + overlap + " with you. You're currently playing it." : "You're currently playing it.",
        cta_ask: "Ask what they thought",
        cta_shelf: false,
      };

    case "review_positive":
      if (card.actor_count > 1) {
        return {
          headline: card.actor_count + " players with similar libraries loved " + gameName,
          sub: "It's already on your shelf.",
          cta_ask: "See their reviews",
          cta_shelf: false,
        };
      }
      return {
        headline: actorName + " loved " + gameName,
        sub: overlap ? actorName + " has " + overlap + " with you. See what they thought." : "See what they thought.",
        cta_ask: "See the review",
        cta_shelf: false,
      };

    case "review_negative":
      if (card.actor_count > 1) {
        return {
          headline: card.actor_count + " players with similar libraries didn't enjoy " + gameName,
          sub: "It's on your Want to Play list.",
          cta_ask: "See their reviews",
          cta_shelf: false,
        };
      }
      return {
        headline: actorName + " didn't enjoy " + gameName,
        sub: overlap ? actorName + " has " + overlap + " with you. It's on your Want to Play list." : "It's on your Want to Play list.",
        cta_ask: "See the review",
        cta_shelf: false,
      };

    case "new_similarity_match":
      return {
        headline: actorName + " has " + (n || "several") + " games in common with you",
        sub: "You might want to follow them.",
        cta_ask: null,
        cta_shelf: false,
        cta_follow: true,
      };

    case "chart_climber":
      return {
        headline: gameName + " is climbing The Charts this week",
        sub: card.chart_movement ? "Up " + card.chart_movement + " positions." : "It's on your shelf.",
        cta_ask: null,
        cta_shelf: false,
      };

    default:
      return { headline: gameName, sub: null, cta_ask: null, cta_shelf: false };
  }
}

// ─── Discovery type label ───────────────────────────────────────────────────
function getTypeLabel(discovery_type) {
  switch (discovery_type) {
    case "shelf_add": return { label: "New Discovery", color: C.accentSoft };
    case "now_playing": return { label: "Now Playing", color: C.green };
    case "just_finished": return { label: "Just Finished", color: C.teal };
    case "review_positive": return { label: "Loved It", color: C.gold };
    case "review_negative": return { label: "Skip Signal", color: C.red };
    case "new_similarity_match": return { label: "Similar Taste", color: C.accent };
    case "chart_climber": return { label: "Chart Climber", color: C.gold };
    default: return { label: "Discovery", color: C.accentSoft };
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
  const [addedToShelf, setAddedToShelf] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [markedNotForMe, setMarkedNotForMe] = useState(false);
  const commentInputRef = React.useRef(null);

  useEffect(() => {
    // Load actor profile
    if (card.actor_user_id) {
      supabase.from("profiles")
        .select("id, username, handle, avatar_initials, is_founding, active_ring, avatar_config")
        .eq("id", card.actor_user_id)
        .single()
        .then(({ data }) => { if (data) setActor(data); });
    }
    // Load game
    if (card.game_id) {
      supabase.from("games")
        .select("id, name, cover_url, genre")
        .eq("id", card.game_id)
        .single()
        .then(({ data }) => { if (data) setGame(data); });
    }
    // Mark as seen
    if (!card.seen) {
      supabase.from("discovery_cards")
        .update({ seen: true })
        .eq("id", card.id);
    }
  }, [card.id]);

  const actorName = actor?.username || (card.actor_count > 1 ? card.actor_count + " players" : "A player");
  const gameName = game?.name || "a game";
  const copy = getCardCopy(card, actorName, gameName);
  const typeLabel = getTypeLabel(card.discovery_type);

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
    setAddedToShelf(true);
  };

  const markNotForMe = async () => {
    if (isGuest) { onSignIn?.("Sign in to manage your shelf."); return; }
    if (!game) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await supabase.from("user_games").upsert(
      { user_id: authUser.id, game_id: game.id, status: "not_for_me" },
      { onConflict: "user_id,game_id" }
    );
    setMarkedNotForMe(true);
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

  if (markedNotForMe) return null;

  return (
    <div style={{
      background: C.surface,
      border: "1px solid " + C.border,
      borderRadius: 14,
      marginBottom: 12,
      overflow: "hidden",
    }}>
      {/* Card body */}
      <div style={{ display: "flex", gap: 0 }}>

        {/* Game art column */}
        {game?.cover_url && (
          <div
            onClick={() => { setCurrentGame(game.id); setActivePage("game"); window.history.pushState({ page: "game", gameId: game.id }, "", "/game/" + game.id); }}
            style={{ width: 72, flexShrink: 0, cursor: "pointer", overflow: "hidden" }}>
            <img src={game.cover_url} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 100 }} />
          </div>
        )}

        {/* Content column */}
        <div style={{ flex: 1, padding: "14px 16px", minWidth: 0 }}>

          {/* Header row — type label + system mark */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {/* GuildLink system mark */}
              <div style={{ width: 18, height: 18, borderRadius: 4, background: C.accentGlow, border: "1px solid " + C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: C.accentSoft }}>G</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.5px" }}>GuildLink</span>
            </div>
            <span style={{ color: C.border, fontSize: 10 }}>·</span>
            <span style={{
              background: typeLabel.color + "18",
              border: "1px solid " + typeLabel.color + "44",
              borderRadius: 5,
              padding: "1px 7px",
              fontSize: 10,
              fontWeight: 700,
              color: typeLabel.color,
            }}>{typeLabel.label}</span>
            {card.overlap_count && card.actor_count === 1 && card.actor_is_public && (
              <>
                <span style={{ color: C.border, fontSize: 10 }}>·</span>
                <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{card.overlap_count} games in common</span>
              </>
            )}
          </div>

          {/* Headline */}
          <div style={{ fontWeight: 700, color: C.text, fontSize: 14, lineHeight: 1.4, marginBottom: 4 }}>
            {copy.headline}
          </div>

          {/* Sub */}
          {copy.sub && (
            <div style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
              {copy.sub}
            </div>
          )}

          {/* Actor avatar row — only for single named actor */}
          {actor && card.actor_is_public && card.actor_count === 1 && (
            <div
              onClick={() => { setCurrentPlayer(actor.id); setActivePage("player"); window.history.pushState({ page: "player", playerId: actor.id }, "", "/player/" + (actor.handle || actor.id).replace("@", "")); }}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              <Avatar initials={actor.avatar_initials || "?"} size={24} founding={actor.is_founding} ring={actor.active_ring} avatarConfig={actor.avatar_config} />
              <span style={{ color: C.accentSoft, fontSize: 12, fontWeight: 600 }}>{actor.username}</span>
              <span style={{ color: C.textDim, fontSize: 11 }}>{actor.handle}</span>
            </div>
          )}

          {/* Action row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>

            {/* Ask / conversation starter */}
            {copy.cta_ask && (
              <button onClick={startConversation}
                style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 7, padding: "5px 12px", color: C.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {copy.cta_ask} →
              </button>
            )}

            {/* Add to shelf */}
            {copy.cta_shelf && !addedToShelf && game && (
              <div style={{ display: "flex", gap: 4 }}>
                {[
                  { status: "want_to_play", label: "Want to Play" },
                  { status: "playing", label: "Playing" },
                  { status: "have_played", label: "Played" },
                ].map(({ status, label }) => (
                  <button key={status} onClick={() => addToShelf(status)}
                    style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 7, padding: "5px 10px", color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {addedToShelf && (
              <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>✓ Added to shelf</span>
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

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Not for me */}
            {game && (
              <button onClick={markNotForMe}
                style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: "4px 2px" }}>
                Not for me
              </button>
            )}

            {/* Like */}
            <button onClick={toggleLike}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: liked ? "#ef4444" : C.textDim, fontSize: 13, padding: 0 }}>
              <span style={{ fontSize: 14 }}>{liked ? "❤️" : "🤍"}</span>
              <span style={{ fontSize: 12 }}>{likes || 0}</span>
            </button>

            {/* Comment */}
            <button onClick={toggleComments}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: C.textDim, fontSize: 13, padding: 0 }}>
              <span style={{ fontSize: 14 }}>💬</span>
              <span style={{ fontSize: 12 }}>{card.comment_count || 0}</span>
            </button>

          </div>
        </div>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ borderTop: "1px solid " + C.border, padding: "12px 16px" }}>
          {(comments || []).map((comment, i) => {
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

          {/* Comment composer */}
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
