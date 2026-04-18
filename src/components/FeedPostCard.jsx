import React, { useState, useRef, useEffect, useCallback } from "react";
import { C, NPCS } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo, logChartEvent } from "../utils.js";
import { Avatar } from "./Avatar.jsx";
import { FoundingBadge, NPCBadge, Badge } from "./FoundingBadge.jsx";
import { ExitModal, LinkPreviewFetcher, LinkPreviewCard } from "./LinkPreview.jsx";

function renderPostContent(content, taggedUsers, setCurrentPlayer, setCurrentNPC, setActivePage) {
  if (!content) return null;
  if (!taggedUsers?.length) return <span>{content}</span>;

  const mentionMap = {};
  taggedUsers.forEach(u => {
    const byHandle = (u.handle || "").replace("@", "").toLowerCase();
    const byName = (u.name || "").replace(/\s+/g, "").toLowerCase();
    if (byHandle) mentionMap[byHandle] = u;
    if (byName && byName !== byHandle) mentionMap[byName] = u;
  });

  const parts = content.split(/(@\S+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const key = part.slice(1).toLowerCase();
          const tagged = mentionMap[key];
          if (tagged) {
            return (
              <span key={i}
                onClick={e => {
                  e.stopPropagation();
                  if (tagged.type === "npc") { setCurrentNPC(tagged.id); setActivePage("npc"); }
                  else { setCurrentPlayer(tagged.id); setActivePage("player"); }
                }}
                style={{ color: tagged.type === "npc" ? "#f59e0b" : "#38bdf8", fontWeight: 600, cursor: "pointer" }}>
                {part}
              </span>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function FeedPostCard({ post, onLike, setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, currentUser, isMobile, isGuest, onSignIn, onQuestTrigger, readOnly, onCommentReply, onExit }) {
  const [showComments, setShowComments] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [liveComments, setLiveComments] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const commentInputRef = useRef(null);
  const [commentLinkPreview, setCommentLinkPreview] = useState(null);
  const [commentLinkWarning, setCommentLinkWarning] = useState(null);
  const [commentLinkLoading, setCommentLinkLoading] = useState(false);
  let commentLinkDebounce = null;

  useEffect(() => {
    setLocalPost(prev => ({ ...prev, likes: post.likes }));
  }, [post.likes]);

  useEffect(() => {
    setLocalPost(prev => ({ ...prev, liked: post.liked || false }));
  }, [post.liked]);

  useEffect(() => {
    setLocalPost(post);
  }, [post.id]);

  useEffect(() => {
    if (replyTo) {
      commentInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      commentInputRef.current?.focus();
    }
  }, [replyTo]);

  const [taggedGameName, setTaggedGameName] = useState(null);

  useEffect(() => {
    const gameId = post.game_tag || post.gameId;
    if (!gameId) return;
    supabase.from("games").select("name").eq("id", gameId).single().then(({ data }) => {
      if (data) setTaggedGameName(data.name);
    });
  }, [post.game_tag, post.gameId]);

  const deletePost = async () => {
    if (!post.id || !post.id.includes('-')) return;
    if (!window.confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) { console.error("[deletePost] error:", error); return; }
    setLocalPost(p => ({ ...p, deleted: true }));
  };

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content || "");

  const saveEdit = async () => {
    if (!editText.trim()) return;
    const { error } = await supabase.from("posts").update({ content: editText.trim() }).eq("id", post.id);
    if (error) { console.error("[saveEdit] error:", error); return; }
    setLocalPost(p => ({ ...p, content: editText.trim() }));
    setEditing(false);
  };

  const deleteComment = async (commentId) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) { console.error("[deleteComment] error:", error); return; }
    setLiveComments(prev => (prev || []).filter(c => c.id !== commentId));
  };

  const toggleLike = async () => {
    if (isGuest) { onSignIn?.("Like posts and join the conversation."); return; }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const newLiked = !localPost.liked;
    setLocalPost(p => ({ ...p, liked: newLiked }));
    if (post.id && typeof post.id === 'string' && post.id.includes('-')) {
      if (newLiked) {
        await supabase.from("post_likes").upsert({ post_id: post.id, user_id: authUser.id });
        await supabase.rpc("increment_likes", { row_id: post.id });
      } else {
        await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", authUser.id);
        await supabase.rpc("decrement_likes", { row_id: post.id });
      }
      const { data: fresh } = await supabase.from("posts").select("likes").eq("id", post.id).single();
      if (fresh) setLocalPost(p => ({ ...p, likes: fresh.likes }));
      if (newLiked && post.user_id && post.user_id !== authUser.id) {
        supabase.rpc("increment_quest_progress", { p_user_id: post.user_id, p_trigger: "like_received" }).then(() => onQuestTrigger?.());
      }
    }
  };

  const [commentReactions, setCommentReactions] = useState({});

  const loadComments = async () => {
    if (!post.id || !post.id.includes('-')) return;
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    if (!error && data) {
      setLiveComments(data);
      const ids = data.map(c => c.id);
      if (ids.length > 0) {
        const { data: reactions } = await supabase
          .from("comment_reactions")
          .select("comment_id, user_id, emoji")
          .in("comment_id", ids);
        if (reactions) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const map = {};
          reactions.forEach(r => {
            if (!map[r.comment_id]) map[r.comment_id] = { count: 0, userReacted: false };
            map[r.comment_id].count++;
            if (authUser && r.user_id === authUser.id) map[r.comment_id].userReacted = true;
          });
          setCommentReactions(map);
        }
      }
    }
  };

  const toggleCommentReaction = async (commentId) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const current = commentReactions[commentId] || { count: 0, userReacted: false };
    if (current.userReacted) {
      await supabase.from("comment_reactions").delete()
        .eq("comment_id", commentId).eq("user_id", authUser.id).eq("emoji", "❤️");
      setCommentReactions(prev => ({ ...prev, [commentId]: { count: Math.max(0, (prev[commentId]?.count || 1) - 1), userReacted: false } }));
    } else {
      await supabase.from("comment_reactions").insert({ comment_id: commentId, user_id: authUser.id, emoji: "❤️" });
      setCommentReactions(prev => ({ ...prev, [commentId]: { count: (prev[commentId]?.count || 0) + 1, userReacted: true } }));
    }
  };

  useEffect(() => {
    if (post.id && post.id.includes('-')) loadComments();
  }, [post.id]);

  const toggleComments = () => {
    if (!showComments && liveComments === null) loadComments();
    setShowComments(s => !s);
  };

  const [commentMentionResults, setCommentMentionResults] = useState([]);
  const [commentMentionIndex, setCommentMentionIndex] = useState(0);
  const [commentTaggedUsers, setCommentTaggedUsers] = useState([]);
  const [commentTaggedGame, setCommentTaggedGame] = useState(null);
  const [commentTaggedGameName, setCommentTaggedGameName] = useState(null);

  const handleCommentTextChange = async (e) => {
    const val = e.target.value;
    setCommentText(val);
    const atMatch = val.match(/@([^@\s]*)$/);
    if (atMatch && atMatch[1].length >= 2) {
      const q = atMatch[1];
      const [playersRes, npcsRes, gamesRes] = await Promise.allSettled([
        supabase.from("profiles").select("id, username, handle, avatar_initials").or(`username.ilike.%${q}%,handle.ilike.%${q}%`).limit(3),
        supabase.from("npcs").select("id, name, handle, avatar_initials").or(`name.ilike.%${q}%,handle.ilike.%${q}%`).eq("is_active", true).limit(2),
        supabase.from("games").select("id, name").ilike("name", `%${q}%`).order("followers", { ascending: false }).limit(3),
      ]);
      const players = (playersRes.status === "fulfilled" ? (playersRes.value.data || []) : []).map(p => ({ ...p, _type: "player" }));
      const npcs = (npcsRes.status === "fulfilled" ? (npcsRes.value.data || []) : []).map(n => ({ ...n, _type: "npc" }));
      const games = (gamesRes.status === "fulfilled" ? (gamesRes.value.data || []) : []).map(g => ({ ...g, _type: "game", handle: g.name }));
      setCommentMentionResults([...players, ...npcs, ...games].slice(0, 7));
    } else {
      setCommentMentionResults([]);
    }
  };

  const selectCommentMention = (item) => {
    if (item._type === "game") {
      const newText = commentText.replace(/@([^@\s]*)$/, `@${item.name.replace(/\s+/g, "")} `);
      setCommentText(newText);
      setCommentTaggedGame(item.id);
      setCommentTaggedGameName(item.name);
      setCommentMentionResults([]);
      commentInputRef.current?.focus();
      return;
    }
    const handle = item._type === "npc"
      ? (item.handle?.replace("@", "") || item.name.replace(/\s+/g, ""))
      : (item.handle?.replace("@", "") || item.username);
    const newText = commentText.replace(/@([^@\s]*)$/, `@${handle} `);
    setCommentText(newText);
    setCommentTaggedUsers(prev => {
      if (prev.find(u => u.id === item.id)) return prev;
      return [...prev, { id: item.id, handle: item.handle || `@${handle}`, name: item.name || item.username, type: item._type === "npc" ? "npc" : "user" }];
    });
    setCommentMentionResults([]);
    commentInputRef.current?.focus();
  };

  const submitComment = async () => {
    if (isGuest) { onSignIn?.("Join the conversation and comment on posts."); return; }
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const commentUrls = commentText.match(/https?:\/\/[^\s<>"]+/gi);
    const { data, error } = await supabase.from("comments").insert({
      post_id: post.id,
      user_id: authUser.id,
      content: commentText.trim(),
      reply_to_comment_id: replyTo?.id || null,
      tagged_users: commentTaggedUsers.length > 0 ? commentTaggedUsers : [],
      link_url: commentLinkPreview?.url || commentUrls?.[0] || null,
      game_tag: commentTaggedGame || null,
    }).select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)").single();
    if (!error && data) {
      if (post.id && post.id.includes('-')) {
        await supabase.from("posts").update({ comment_count: (localPost.comment_count || 0) + (liveComments?.length || 0) + 1 }).eq("id", post.id);
        setLocalPost(p => ({ ...p, comment_count: (p.comment_count || 0) + 1 }));
      }
      const postGameId = post.game_tag || post.gameId;
      if (postGameId && postGameId.includes('-') && authUser) logChartEvent(postGameId, 'comment', authUser.id);
      if (commentTaggedGame && commentTaggedGame !== postGameId && authUser) {
        logChartEvent(commentTaggedGame, 'comment', authUser.id);
        if (postGameId && postGameId.includes('-')) {
          supabase.from("game_cooccurrences").insert({
            game_a_id: postGameId,
            game_b_id: commentTaggedGame,
            post_id: post.id,
            user_id: authUser.id,
          });
        }
      }
      if (localPost.user.isNPC) {
        await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "npc_replied" });
        onQuestTrigger?.();
      }
      if (!localPost.user.isNPC && post.user_id && post.user_id !== authUser.id) {
        await supabase.rpc("increment_quest_progress", { p_user_id: post.user_id, p_trigger: "comment_received" });
        onQuestTrigger?.();
      }
      setLiveComments(prev => [...(prev || []), data]);
      setCommentText("");
      setCommentTaggedUsers([]);
      setCommentTaggedGame(null);
      setCommentTaggedGameName(null);
      setReplyTo(null);
      setCommentLinkPreview(null);
      setCommentLinkWarning(null);
      setLocalPost(p => ({ ...p, commentList: [...p.commentList, data] }));
    }
    setSubmittingComment(false);
  };

  if (localPost.deleted) return null;
return (
    <div style={{
      background: C.surface,
      border: "1px solid " + (localPost.user.isNPC ? C.goldBorder : C.border),
      borderRadius: 14, marginBottom: 12, position: "relative",
      boxShadow: localPost.user.isNPC ? `0 0 0 1px ${C.goldGlow}` : "none",
      overflow: "hidden",
    }}>
      {/* Main post body */}
      <div style={{ display: "flex", gap: 0 }}>

        {/* Avatar column */}
        <div style={{ padding: "16px 0 16px 16px", flexShrink: 0, cursor: "pointer" }}
          onClick={() => {
            if (localPost.user.isNPC) {
              if (localPost.npc_id) { setCurrentNPC(localPost.npc_id); setActivePage("npc"); }
              else { const npc = Object.values(NPCS).find(n => n.handle === localPost.user.handle); if (npc) { setCurrentNPC(npc.id); setActivePage("npc"); } }
            } else if (localPost.user_id) { setCurrentPlayer(localPost.user_id); setActivePage("player"); }
          }}>
          <Avatar initials={localPost.user.avatar} size={64} status={localPost.user.status} isNPC={localPost.user.isNPC} founding={!localPost.user.isNPC && localPost.user.isFounding} ring={!localPost.user.isNPC ? localPost.user.activeRing : null} avatarConfig={localPost.user.avatarConfig} />
        </div>

        {/* Content column */}
        <div style={{ flex: 1, padding: "16px 16px 0 12px", minWidth: 0 }}>
          {/* Name + handle + timestamp row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14, cursor: "pointer", color: localPost.user.isNPC ? C.gold : C.text }}
              onClick={() => {
                if (localPost.user.isNPC) {
                  if (localPost.npc_id) { setCurrentNPC(localPost.npc_id); setActivePage("npc"); }
                  else { const npc = Object.values(NPCS).find(n => n.handle === localPost.user.handle); if (npc) { setCurrentNPC(npc.id); setActivePage("npc"); } }
                } else if (localPost.user_id) { setCurrentPlayer(localPost.user_id); setActivePage("player"); }
              }}
            >{localPost.user.name}</span>
            {localPost.user.isNPC && <NPCBadge />}
            <span style={{ color: C.textDim, fontSize: 12 }}>{localPost.user.handle}</span>
            <span style={{ color: C.textDim, fontSize: 12 }}>·</span>
            <span style={{ color: C.textDim, fontSize: 12 }}>{localPost.time}</span>
            {(localPost.game || localPost.game_tag) && (() => {
              const gameId = localPost.gameId || localPost.game_tag;
              const displayName = taggedGameName || localPost.game;
              if (!displayName && !gameId) return null;
              return (
                <span
                  onClick={e => { e.stopPropagation(); if (gameId) { setCurrentGame(gameId); setActivePage("game"); } }}
                  style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: C.accentSoft, fontWeight: 600, cursor: gameId ? "pointer" : "default" }}>
                  🎮 {displayName || "Game"}
                </span>
              );
            })()}
            {/* Post menu */}
            {currentUser && (localPost.user_id === currentUser.id || currentUser.is_admin) && (
              <div style={{ marginLeft: "auto", position: "relative" }}>
                <button onClick={() => setShowPostMenu(v => !v)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>⋯</button>
                {showPostMenu && (
                  <div style={{ position: "absolute", right: 0, top: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden", zIndex: 100, minWidth: 120, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                    {localPost.user_id === currentUser.id && (
                      <button onClick={() => { setEditing(true); setShowPostMenu(false); }} style={{ display: "block", width: "100%", background: "none", border: "none", padding: "10px 16px", color: C.text, fontSize: 13, cursor: "pointer", textAlign: "left" }}>Edit</button>
                    )}
                    <button onClick={() => { deletePost(); setShowPostMenu(false); }} style={{ display: "block", width: "100%", background: "none", border: "none", padding: "10px 16px", color: "#ef4444", fontSize: 13, cursor: "pointer", textAlign: "left" }}>Delete</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Post content */}
          {editing ? (
            <div style={{ marginBottom: 12 }}>
              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", resize: "none", minHeight: 72, boxSizing: "border-box", fontFamily: "inherit" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button onClick={saveEdit} style={{ background: C.accent, border: "none", borderRadius: 7, padding: "6px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditing(false)} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 7, padding: "6px 14px", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, margin: "0 0 12px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {renderPostContent(localPost.content, localPost.tagged_users, setCurrentPlayer, setCurrentNPC, setActivePage)}
            </p>
          )}

          {/* Link preview */}
          {localPost.link_url && onExit && (
            <div style={{ marginBottom: 12 }}>
              <LinkPreviewCard preview={{ url: localPost.link_url, title: localPost.link_title, description: localPost.link_description, image: localPost.link_image, domain: localPost.link_domain }} onExit={onExit} />
            </div>
          )}

          {/* Action row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 12 }}>
            <button onClick={toggleLike} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: localPost.liked ? "#ef4444" : C.textDim, fontSize: 13, padding: 0 }}>
              <span style={{ fontSize: 15 }}>{localPost.liked ? "❤️" : "🤍"}</span>
              <span>{localPost.likes || 0}</span>
            </button>
            <button onClick={toggleComments} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: C.textDim, fontSize: 13, padding: 0 }}>
              <span style={{ fontSize: 15 }}>💬</span>
              <span>{localPost.comment_count || 0}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ borderTop: "1px solid " + C.border, padding: "12px 16px" }}>
          {(liveComments || []).map(comment => {
            const isNPCComment = !!comment.npc_id;
            const author = comment.profiles;
            const authorName = author?.username || "Unknown";
            const authorHandle = author?.handle || "";
            const authorInitials = author?.avatar_initials || "?";
            const parentComment = comment.reply_to_comment_id
              ? (liveComments || []).find(c => c.id === comment.reply_to_comment_id)
              : null;
            const parentName = parentComment
              ? (parentComment.profiles?.username || "someone")
              : null;
            return (
              <div key={comment.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ flexShrink: 0, cursor: "pointer" }}
                  onClick={() => { if (comment.user_id) { setCurrentPlayer(comment.user_id); setActivePage("player"); } }}>
                  <Avatar initials={authorInitials} size={32} founding={author?.is_founding} ring={author?.active_ring} avatarConfig={author?.avatar_config} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: C.text, cursor: "pointer" }}
                      onClick={() => { if (comment.user_id) { setCurrentPlayer(comment.user_id); setActivePage("player"); } }}>
                      {authorName}
                    </span>
                    <span style={{ color: C.textDim, fontSize: 11 }}>{authorHandle}</span>
                    <span style={{ color: C.textDim, fontSize: 11 }}>· {timeAgo(comment.created_at)}</span>
                    {comment.game_tag && (
                      <span style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 5, padding: "1px 6px", fontSize: 10, color: C.accentSoft, fontWeight: 600 }}>🎮</span>
                    )}
                  </div>
                  {parentName && (
                    <div style={{ color: C.textDim, fontSize: 11, marginBottom: 3 }}>↩ replying to {parentName}</div>
                  )}
                  <p style={{ color: C.text, fontSize: 13, lineHeight: 1.55, margin: "0 0 6px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {renderPostContent(comment.content, comment.tagged_users, setCurrentPlayer, setCurrentNPC, setActivePage)}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={() => toggleCommentReaction(comment.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: commentReactions[comment.id]?.userReacted ? "#ef4444" : C.textDim, fontSize: 12, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      {commentReactions[comment.id]?.userReacted ? "❤️" : "🤍"} {commentReactions[comment.id]?.count || 0}
                    </button>
                    {!readOnly && currentUser && (
                      <button onClick={() => setReplyTo({ id: comment.id, name: authorName })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, fontSize: 12, padding: 0 }}>
                        Reply
                      </button>
                    )}
                    {currentUser && (comment.user_id === currentUser.id || currentUser.is_admin) && (
                      <button onClick={() => deleteComment(comment.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, fontSize: 12, padding: 0 }}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Comment composer */}
          {!readOnly && <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid " + C.border }}>
            {isGuest ? (
              <div onClick={() => onSignIn?.("Join the conversation and comment on posts.")}
                style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 14px", color: C.textDim, fontSize: 13, cursor: "pointer" }}>
                Sign in to join the conversation...
              </div>
            ) : currentUser ? (
              <div style={{ flex: 1 }}>
                {replyTo && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "5px 10px" }}>
                    <span style={{ color: C.accentSoft, fontSize: 12 }}>↩ Replying to <strong>{replyTo.name}</strong></span>
                    <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 14, cursor: "pointer", marginLeft: "auto", lineHeight: 1 }}>×</button>
                  </div>
                )}
                {commentTaggedGame && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 6, padding: "3px 8px", color: C.accentSoft, fontSize: 11, fontWeight: 700 }}>
                      🎮 {commentTaggedGameName}
                    </span>
                    <button onClick={() => { setCommentTaggedGame(null); setCommentTaggedGameName(null); }} style={{ background: "none", border: "none", color: C.textDim, fontSize: 13, cursor: "pointer", lineHeight: 1 }}>×</button>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, position: "relative" }}>
                  <Avatar initials={currentUser?.avatar || "GL"} size={32} founding={currentUser?.isFounding} ring={currentUser?.activeRing} avatarConfig={currentUser?.avatarConfig} />
                  <div style={{ flex: 1, position: "relative" }}>
                    <textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={e => {
                        handleCommentTextChange(e);
                        e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px";
                        const urls = e.target.value.match(/https?:\/\/[^\s<>"]+/gi);
                        const firstUrl = urls?.[0];
                        if (firstUrl) {
                          if (commentLinkDebounce) clearTimeout(commentLinkDebounce);
                          commentLinkDebounce = setTimeout(async () => {
                            setCommentLinkLoading(true);
                            try {
                              const res = await fetch("/api/link-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: firstUrl }) });
                              const data = await res.json();
                              if (!data.allowed) { setCommentLinkPreview(null); setCommentLinkWarning(data.domain || "this domain"); }
                              else { setCommentLinkPreview(data); setCommentLinkWarning(null); }
                            } catch { setCommentLinkPreview(null); }
                            setCommentLinkLoading(false);
                          }, 600);
                        } else { setCommentLinkPreview(null); setCommentLinkWarning(null); }
                      }}
                      onKeyDown={e => {
                        if (commentMentionResults.length > 0) {
                          if (e.key === "ArrowDown") { e.preventDefault(); setCommentMentionIndex(i => Math.min(i+1, commentMentionResults.length-1)); return; }
                          if (e.key === "ArrowUp") { e.preventDefault(); setCommentMentionIndex(i => Math.max(i-1, 0)); return; }
                          if (e.key === "Enter") { e.preventDefault(); selectCommentMention(commentMentionResults[commentMentionIndex]); return; }
                          if (e.key === "Escape") { setCommentMentionResults([]); return; }
                        }
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); }
                      }}
                      placeholder={replyTo ? `Reply to ${replyTo.name}…` : "Write a comment… (@ to mention a player or game)"}
                      rows={1}
                      style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", resize: "none", overflow: "hidden", lineHeight: 1.5, fontFamily: "inherit" }}
                    />
                    {commentMentionResults.length > 0 && (
                      <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden", zIndex: 200, boxShadow: "0 -4px 20px rgba(0,0,0,0.5)" }}>
                        {commentMentionResults.map((item, i) => (
                          <div key={item.id} onMouseDown={() => selectCommentMention(item)}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", background: i === commentMentionIndex ? C.surfaceHover : "transparent", borderBottom: i < commentMentionResults.length - 1 ? "1px solid " + C.border : "none" }}
                            onMouseEnter={() => setCommentMentionIndex(i)}>
                            <div style={{ width: 26, height: 26, borderRadius: item._type === "game" ? 6 : "50%", background: item._type === "npc" ? C.goldGlow : item._type === "game" ? C.accent + "22" : C.accent + "33", border: "1px solid " + (item._type === "npc" ? C.goldBorder : C.accentDim), display: "flex", alignItems: "center", justifyContent: "center", fontSize: item._type === "game" ? 12 : 10, fontWeight: 700, color: item._type === "npc" ? C.gold : C.accent, flexShrink: 0 }}>
                              {item._type === "game" ? "🎮" : (item.avatar_initials || (item.username || item.name || "?").slice(0,2)).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 12, color: item._type === "npc" ? C.gold : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name || item.username}</div>
                              <div style={{ color: C.textDim, fontSize: 10 }}>{item._type === "game" ? "Game" : item.handle}</div>
                            </div>
                            <span style={{ color: item._type === "npc" ? C.gold : item._type === "game" ? C.accentSoft : C.accent, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{item._type === "npc" ? "NPC" : item._type === "game" ? "Game" : "Player"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={submitComment} disabled={submittingComment || !commentText.trim()} style={{ background: commentText.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 14px", color: commentText.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, alignSelf: "flex-start" }}>
                    {submittingComment ? "…" : "Reply"}
                  </button>
                </div>
                {commentLinkWarning && (
                  <div style={{ marginTop: 6, background: "#ef444418", border: "1px solid #ef444444", borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>🚫</span>
                    <span style={{ color: "#ef4444", fontSize: 11 }}><strong>{commentLinkWarning}</strong> isn't on our allowed list.</span>
                  </div>
                )}
                {commentLinkLoading && <div style={{ marginTop: 6, color: C.textDim, fontSize: 11 }}>Fetching preview…</div>}
                {commentLinkPreview && !commentLinkLoading && onExit && (
                  <LinkPreviewCard preview={commentLinkPreview} onExit={onExit} />
                )}
              </div>
            ) : null}
          </div>}
        </div>
      )}
    </div>
  );
}

export { FeedPostCard, renderPostContent };
export default FeedPostCard;