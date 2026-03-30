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

  // Build lookup by handle (without @, lowercase) and by name (no spaces, lowercase)
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

  // Sync count from parent
  useEffect(() => {
    setLocalPost(prev => ({ ...prev, likes: post.likes }));
  }, [post.likes]);

  // Sync liked from parent on fresh data load (tab switches, reloads)
  useEffect(() => {
    setLocalPost(prev => ({ ...prev, liked: post.liked || false }));
  }, [post.liked]);

  // Full reset only when a genuinely different post loads into this slot
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
    // Look up from DB
    supabase.from("games").select("name").eq("id", gameId).single().then(({ data }) => {
      if (data) setTaggedGameName(data.name);
    });
  }, [post.game_tag, post.gameId]);

  const [tipped, setTipped] = useState(post.tipped || false);

  // Sync tipped from parent
  useEffect(() => {
    setTipped(post.tipped || false);
  }, [post.tipped]);

  // Sync tip_count from parent
  useEffect(() => {
    setLocalPost(prev => ({ ...prev, tip_count: post.tip_count || 0 }));
  }, [post.tip_count]);

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

  const [tipping, setTipping] = useState(false);

  const toggleTip = async () => {
    if (isGuest) { onSignIn?.("Sign in to mark helpful tips."); return; }
    if (!post.id || !post.id.includes('-') || !post.game_tag) return;
    if (tipping) return;
    setTipping(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setTipping(false); return; }
    // Check actual DB state to prevent double-counting
    const { data: existing } = await supabase.from("tip_votes")
      .select("id").eq("post_id", post.id).eq("user_id", authUser.id).maybeSingle();
    const alreadyTipped = !!existing;
    if (alreadyTipped) {
      setTipped(false);
      await supabase.from("tip_votes").delete().eq("post_id", post.id).eq("user_id", authUser.id);
      await supabase.rpc("decrement_tip", { row_id: post.id });
    } else {
      setTipped(true);
      await supabase.from("tip_votes").insert({ post_id: post.id, user_id: authUser.id });
      await supabase.rpc("increment_tip", { row_id: post.id });
    }
    const { data: fresh } = await supabase.from("posts").select("tip_count").eq("id", post.id).single();
    if (fresh) setLocalPost(p => ({ ...p, tip_count: fresh.tip_count || 0 }));
    setTipping(false);
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

  const [commentReactions, setCommentReactions] = useState({}); // commentId -> { count, userReacted }

  const loadComments = async () => {
    if (!post.id || !post.id.includes('-')) return;
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    if (error) console.error("[loadComments] error:", error);
    if (data) {
      const npcUUIDs = [...new Set(data.filter(c => c.npc_id && c.npc_id.includes('-')).map(c => c.npc_id))];
      let npcMap = {};
      if (npcUUIDs.length > 0) {
        const { data: npcRows } = await supabase.from("npcs").select("id, name, handle, avatar_initials").in("id", npcUUIDs);
        if (npcRows) npcRows.forEach(n => { npcMap[n.id] = n; });
      }

      // Extract all @handles from comment text and resolve them
      const allHandles = new Set();
      data.forEach(c => {
        const matches = (c.content || "").match(/@(\S+)/g) || [];
        matches.forEach(m => allHandles.add(m.slice(1).toLowerCase()));
      });
      let resolvedUsers = {};
      let resolvedNPCs = {};
      if (allHandles.size > 0) {
        const handleList = [...allHandles];
        const [profilesRes, npcsRes] = await Promise.allSettled([
          supabase.from("profiles").select("id, username, handle, avatar_initials").or(handleList.map(h => `handle.ilike.@${h}`).join(",")),
          supabase.from("npcs").select("id, name, handle, avatar_initials").or(handleList.map(h => `handle.ilike.@${h}`).join(",")),
        ]);
        (profilesRes.status === "fulfilled" ? profilesRes.value.data || [] : []).forEach(p => {
          resolvedUsers[p.handle.replace("@","").toLowerCase()] = { id: p.id, handle: p.handle, name: p.username, type: "user" };
        });
        (npcsRes.status === "fulfilled" ? npcsRes.value.data || [] : []).forEach(n => {
          resolvedNPCs[n.handle.replace("@","").toLowerCase()] = { id: n.id, handle: n.handle, name: n.name, type: "npc" };
        });
      }
      const allResolved = { ...resolvedUsers, ...resolvedNPCs };

      // Merge resolved users into each comment's tagged_users
      const enriched = data.map(c => {
        const npc = c.npc_id && c.npc_id.includes('-') ? { ...c, npcs: npcMap[c.npc_id] || null } : c;
        const existing = c.tagged_users || [];
        const existingHandles = new Set(existing.map(u => u.handle?.replace("@","").toLowerCase()));
        const matches = (c.content || "").match(/@(\S+)/g) || [];
        const extra = matches
          .map(m => allResolved[m.slice(1).toLowerCase()])
          .filter(u => u && !existingHandles.has(u.handle.replace("@","").toLowerCase()));
        return { ...npc, tagged_users: [...existing, ...extra] };
      });
      setLiveComments(enriched);

      // Load reaction counts for all comments
      if (data.length > 0) {
        const commentIds = data.map(c => c.id);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { data: reactions } = await supabase
          .from("comment_reactions")
          .select("comment_id, user_id")
          .in("comment_id", commentIds);
        if (reactions) {
          const reactionMap = {};
          reactions.forEach(r => {
            if (!reactionMap[r.comment_id]) reactionMap[r.comment_id] = { count: 0, userReacted: false };
            reactionMap[r.comment_id].count++;
            if (authUser && r.user_id === authUser.id) reactionMap[r.comment_id].userReacted = true;
          });
          setCommentReactions(reactionMap);
        }
      }
    }
  };

  const toggleReaction = async (commentId) => {
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

  // Silently pre-load comments in background — count will update, expand on click
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

  const handleCommentTextChange = async (e) => {
    const val = e.target.value;
    setCommentText(val);
    const atMatch = val.match(/@([^@\s]*)$/);
    if (atMatch && atMatch[1].length >= 2) {
      const q = atMatch[1];
      const [playersRes, npcsRes] = await Promise.allSettled([
        supabase.from("profiles").select("id, username, handle, avatar_initials").or(`username.ilike.%${q}%,handle.ilike.%${q}%`).limit(4),
        supabase.from("npcs").select("id, name, handle, avatar_initials").or(`name.ilike.%${q}%,handle.ilike.%${q}%`).eq("is_active", true).limit(3),
      ]);
      const players = (playersRes.status === "fulfilled" ? (playersRes.value.data || []) : []).map(p => ({ ...p, _type: "player" }));
      const npcs = (npcsRes.status === "fulfilled" ? (npcsRes.value.data || []) : []).map(n => ({ ...n, _type: "npc" }));
      setCommentMentionResults([...players, ...npcs].slice(0, 6));
    } else {
      setCommentMentionResults([]);
    }
  };

  const selectCommentMention = (item) => {
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
    }).select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)").single();
    if (!error && data) {
      if (post.id && post.id.includes('-')) {
        await supabase.from("posts").update({ comment_count: (localPost.comment_count || 0) + (liveComments?.length || 0) + 1 }).eq("id", post.id);
        setLocalPost(p => ({ ...p, comment_count: (p.comment_count || 0) + 1 }));
      }
      const gameId = post.game_tag || post.gameId;
      if (gameId && gameId.includes('-') && authUser) logChartEvent(gameId, 'comment', authUser.id);
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
              return displayName ? (
                <span onClick={() => { if (gameId) { setCurrentGame(gameId); setActivePage("game"); } }}
                  style={{ cursor: gameId ? "pointer" : "default" }}>
                  <Badge small color={C.accent}>{displayName}</Badge>
                </span>
              ) : null;
            })()}
          </div>

          {/* Post content */}
          {editing ? (
            <div style={{ marginBottom: 14 }}>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, lineHeight: 1.65, resize: "vertical", minHeight: 80, boxSizing: "border-box" }}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={saveEdit} style={{ background: C.accent, border: "none", borderRadius: 7, padding: "6px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save</button>
                <button onClick={() => { setEditing(false); setEditText(localPost.content); }} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 7, padding: "6px 14px", color: C.textDim, fontSize: 12, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.65, margin: "0 0 12px", textAlign: "left", whiteSpace: "pre-wrap" }}>{renderPostContent(localPost.link_url ? localPost.content.replace(localPost.link_url, "").trim() : localPost.content, localPost.tagged_users, setCurrentPlayer, setCurrentNPC, setActivePage)}</p>
          )}

          {/* Link preview */}
          {localPost.link_url && onExit && (
            <div style={{ marginBottom: 12 }}>
              <LinkPreviewFetcher url={localPost.link_url} onExit={onExit} />
            </div>
          )}
        </div>
      </div>

      {/* Action bar — full width, bottom of card */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid " + C.border, padding: "10px 16px", flexWrap: "nowrap" }}>
        <button onClick={toggleLike} style={{
          background: localPost.liked ? C.red + "18" : "transparent",
          border: "1px solid " + (localPost.liked ? C.red + "44" : C.border),
          borderRadius: 8, padding: "5px 12px", cursor: "pointer",
          color: localPost.liked ? C.red : C.textMuted, fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s", flexShrink: 0,
        }}>{localPost.liked ? "❤️" : "🤍"} <span>{localPost.likes}</span></button>

        <button onClick={toggleComments} style={{
          background: showComments ? C.accentGlow : "transparent",
          border: "1px solid " + (showComments ? C.accentDim : C.border),
          borderRadius: 8, padding: "5px 12px", cursor: "pointer",
          color: showComments ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
        }}>💬 <span>{liveComments !== null ? liveComments.length : (localPost.comment_count || localPost.comments || 0)}</span></button>

        {!isGuest && (
          <button onClick={() => {
            if (!showComments) {
              if (liveComments === null) loadComments();
              setShowComments(true);
            }
            setTimeout(() => commentInputRef.current?.focus(), 50);
          }} style={{
            background: "transparent", border: "1px solid " + C.border,
            borderRadius: 8, padding: "5px 12px", cursor: "pointer",
            color: C.textMuted, fontSize: 13, fontWeight: 600, flexShrink: 0,
          }}>↩ Reply</button>
        )}

        {(post.game_tag || localPost.game_tag) && !isGuest && (
          <button onClick={toggleTip} style={{
            background: tipped ? C.gold + "18" : "transparent",
            border: "1px solid " + (tipped ? C.gold + "44" : C.border),
            borderRadius: 8, padding: "5px 12px", cursor: "pointer",
            color: tipped ? C.gold : C.textMuted, fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
          }}>Helpful{localPost.tip_count > 0 ? " " + localPost.tip_count : ""}</button>
        )}

        {/* Three dots — right aligned */}
        {currentUser && (post.user_id === currentUser.id || currentUser.is_admin) && (
          <div style={{ marginLeft: "auto", position: "relative", flexShrink: 0 }}>
            <button onClick={() => setShowPostMenu(m => !m)} style={{
              background: "transparent", border: "1px solid " + C.border,
              borderRadius: 8, padding: "5px 10px", cursor: "pointer",
              color: C.textDim, fontSize: 16, lineHeight: 1,
            }}>•••</button>
            {showPostMenu && (
              <>
                <div onClick={() => setShowPostMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
                <div style={{ position: "absolute", right: 0, bottom: "calc(100% + 4px)", background: C.surface, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden", zIndex: 50, minWidth: 120, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                  {post.user_id === currentUser.id && (
                    <button onClick={() => { setEditing(e => !e); setShowPostMenu(false); }} style={{ display: "block", width: "100%", background: "none", border: "none", padding: "10px 16px", color: C.text, fontSize: 13, cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surfaceRaised}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      {editing ? "Cancel Edit" : "Edit"}
                    </button>
                  )}
                  <button onClick={() => { deletePost(); setShowPostMenu(false); }} style={{ display: "block", width: "100%", background: "none", border: "none", padding: "10px 16px", color: C.red, fontSize: 13, cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceRaised}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ background: C.surfaceHover, borderTop: "1px solid " + C.border, padding: "14px 20px" }}>
          {(liveComments || localPost.commentList).map((comment, i) => {
            const isNPC = !!comment.npc_id;
            const npcData = isNPC
              ? (comment.npcs || NPCS[comment.npc_id] || null)
              : null;
            const author = isNPC ? npcData : (comment.profiles || comment.user);
            const name = isNPC
              ? (npcData?.name || "NPC")
              : (comment.profiles?.username || comment.user?.name || "Gamer");
            const handle = isNPC
              ? (npcData?.handle || "")
              : (comment.profiles?.handle || comment.user?.handle || "");
            const avatar = isNPC
              ? (npcData?.avatar_initials || npcData?.avatar || "NPC")
              : (comment.profiles?.avatar_initials || comment.user?.avatar || "GL");
            const avatarConfig = !isNPC ? (comment.profiles?.avatar_config || comment.user?.avatarConfig || null) : null;
            const allComments = liveComments || localPost.commentList;
            // Find the comment being replied to
            const parentComment = comment.reply_to_comment_id
              ? allComments.find(c => c.id === comment.reply_to_comment_id)
              : null;
            const parentName = parentComment
              ? (parentComment.npcs?.name || NPCS[parentComment.npc_id]?.name || parentComment.profiles?.username || parentComment.user?.name || "someone")
              : null;
            const isMyComment = !isNPC && currentUser && comment.user_id === currentUser.id;
            return (
              <div key={comment.id} style={{ display: "flex", gap: 10, marginBottom: i < allComments.length - 1 ? 14 : 0 }}>
                <Avatar initials={avatar || "GL"} size={32} isNPC={isNPC} avatarConfig={avatarConfig} />
                <div style={{ flex: 1 }}>
                  <div style={{ background: C.surfaceRaised, border: "1px solid " + isNPC ? C.goldBorder : C.border, borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                      <span onClick={() => { if (!isNPC && comment.user_id) { setCurrentPlayer(comment.user_id); setActivePage("player"); } }} style={{ fontWeight: 700, fontSize: 13, color: isNPC ? C.gold : C.text, cursor: !isNPC && comment.user_id ? "pointer" : "default" }}>{name || "Gamer"}</span>
                      {isNPC && <NPCBadge />}
                      <span style={{ color: C.textDim, fontSize: 11 }}>{handle}</span>
                      <span style={{ color: C.textDim, fontSize: 11, marginLeft: "auto" }}>{timeAgo(comment.created_at) || comment.time}</span>
                    </div>
                    {parentName && (
                      <div style={{ color: C.textDim, fontSize: 11, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <span>↩</span>
                        <span style={{ color: C.accentSoft }}>@{parentName}</span>
                      </div>
                    )}
                    <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0, textAlign: "left", whiteSpace: "pre-wrap" }}>{renderPostContent(comment.content, comment.tagged_users?.length ? comment.tagged_users : localPost.tagged_users, setCurrentPlayer, setCurrentNPC, setActivePage)}</p>
                    {comment.link_url && onExit && <LinkPreviewFetcher url={comment.link_url} onExit={onExit} />}
                  </div>
                  {((!isGuest && currentUser) || (commentReactions[comment.id]?.count > 0)) && (
                    <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
                      <button onClick={() => currentUser && !isGuest && toggleReaction(comment.id)}
                        style={{
                          background: "none", border: "none", cursor: currentUser && !isGuest ? "pointer" : "default",
                          padding: "3px 6px 3px 2px", display: "flex", alignItems: "center", gap: 4,
                          color: commentReactions[comment.id]?.userReacted ? "#e85d75" : C.textDim,
                          fontSize: 12, borderRadius: 6,
                          transition: "transform 0.1s",
                        }}
                        onMouseEnter={e => { if (currentUser) e.currentTarget.style.transform = "scale(1.15)"; }}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                        <span style={{ fontSize: 14 }}>{commentReactions[comment.id]?.userReacted ? "❤️" : "🤍"}</span>
                        {commentReactions[comment.id]?.count > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{commentReactions[comment.id].count}</span>
                        )}
                      </button>
                      {!isGuest && currentUser && (
                        <>
                          <button onClick={() => {
                              if (readOnly && onCommentReply) {
                                onCommentReply({ id: comment.id, name, userId: comment.user_id });
                              } else {
                                setReplyTo({ id: comment.id, name });
                                setShowComments(true);
                              }
                            }}
                            style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: "4px 2px" }}>
                            ↩ Reply
                          </button>
                          {(comment.user_id === currentUser.id || currentUser.is_admin) && (
                            <button onClick={() => deleteComment(comment.id)}
                              style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: "4px 4px" }}>
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {/* Comment input */}
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
                <div style={{ display: "flex", gap: 10, position: "relative" }}>
                  <Avatar initials={currentUser?.avatar || "GL"} size={32} founding={currentUser?.isFounding} ring={currentUser?.activeRing} avatarConfig={currentUser?.avatarConfig} />
                  <div style={{ flex: 1, position: "relative" }}>
                    <textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={e => {
                        handleCommentTextChange(e);
                        e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px";
                        // URL detection
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
                      placeholder={replyTo ? `Reply to ${replyTo.name}…` : "Write a comment… (@ to mention)"}
                      rows={1}
                      style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", resize: "none", overflow: "hidden", lineHeight: 1.5, fontFamily: "inherit" }}
                    />
                    {commentMentionResults.length > 0 && (
                      <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden", zIndex: 200, boxShadow: "0 -4px 20px rgba(0,0,0,0.5)" }}>
                        {commentMentionResults.map((item, i) => (
                          <div key={item.id} onMouseDown={() => selectCommentMention(item)}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", background: i === commentMentionIndex ? C.surfaceHover : "transparent", borderBottom: i < commentMentionResults.length - 1 ? "1px solid " + C.border : "none" }}
                            onMouseEnter={() => setCommentMentionIndex(i)}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: item._type === "npc" ? C.goldGlow : C.accent + "33", border: "1px solid " + (item._type === "npc" ? C.goldBorder : C.accentDim), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: item._type === "npc" ? C.gold : C.accent, flexShrink: 0 }}>
                              {(item.avatar_initials || (item.username || item.name || "?").slice(0,2)).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 12, color: item._type === "npc" ? C.gold : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name || item.username}</div>
                              <div style={{ color: C.textDim, fontSize: 10 }}>{item.handle}</div>
                            </div>
                            <span style={{ color: item._type === "npc" ? C.gold : C.accent, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{item._type === "npc" ? "NPC" : "Player"}</span>
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
            ) : (
              <div style={{ color: C.textDim, fontSize: 13 }}>Sign in to comment</div>
            )}
          </div>}
        </div>
      )}
    </div>
  );
}

export { renderPostContent, FeedPostCard };
