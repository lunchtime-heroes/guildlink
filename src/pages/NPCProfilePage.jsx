import React, { useState, useEffect } from "react";
import { C, NPCS } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo } from "../utils.js";
import { Avatar } from "../components/Avatar.jsx";
import { Badge, NPCBadge } from "../components/FoundingBadge.jsx";
import { FeedPostCard } from "../components/FeedPostCard.jsx";

function NPCProfilePage({ npcId, setActivePage, setCurrentNPC, setCurrentGame, setCurrentPlayer, isMobile, currentUser, onQuestTrigger }) {
  const [npc, setNpc] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!npcId) return;
    setLoading(true);
    setPostsLoading(true);

    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const { data: npcData } = await supabase
        .from("npcs")
        .select("*")
        .eq("id", npcId)
        .maybeSingle();

      if (npcData) {
        setNpc(npcData);
        setFollowerCount(npcData.followers || 0);
      }
      setLoading(false);

      const { data: postsData } = await supabase
        .from("posts")
        .select("id, content, likes, created_at, game_tag, user_id, npc_id, tagged_users, link_url, comment_count")
        .eq("npc_id", npcId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (postsData) {
        const likedIds = new Set();
        if (authUser) {
          const { data: likedData } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", authUser.id)
            .in("post_id", postsData.map(p => p.id));
          if (likedData) likedData.forEach(l => likedIds.add(l.post_id));
        }
        setPosts(postsData.map(p => ({ ...p, liked: likedIds.has(p.id) })));
      }
      setPostsLoading(false);

      if (authUser) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", authUser.id)
          .eq("followed_npc_id", npcId)
          .maybeSingle();
        setIsFollowing(!!followData);
      }
    };

    load();
  }, [npcId]);

  const handleFollow = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    setFollowLoading(true);

    if (isFollowing) {
      await supabase.from("follows")
        .delete()
        .eq("follower_id", authUser.id)
        .eq("followed_npc_id", npcId);
      setIsFollowing(false);
      setFollowerCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from("follows").insert({
        follower_id: authUser.id,
        followed_npc_id: npcId,
      });
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);

      await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "follow_npc" });
      onQuestTrigger?.();
    }
    setFollowLoading(false);
  };

  const handleReply = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "reply_npc" });
    onQuestTrigger?.();
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "100px 20px", textAlign: "center", color: C.textMuted }}>
        Loading character…
      </div>
    );
  }

  if (!npc) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "100px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>👻</div>
        <div style={{ fontWeight: 700, color: C.text, fontSize: 18, marginBottom: 8 }}>Character not found</div>
        <div style={{ color: C.textMuted, fontSize: 14, marginBottom: 24 }}>This NPC may have wandered off.</div>
        <button onClick={() => setActivePage("feed")} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "10px 24px", color: C.accentText, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Back to Feed</button>
      </div>
    );
  }

  const npcConst = NPCS[npcId] || {};

  const postUser = {
    name: npc.name,
    handle: npc.handle,
    avatar: npc.avatar_initials || npcConst.avatar || "?",
    status: npc.status || "online",
    isNPC: true,
    isFounding: false,
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>

      {/* Profile header card */}
      <div style={{ background: C.surface, border: "1px solid " + C.goldBorder, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
        {/* Banner */}
        <div style={{
          height: 140,
          background: "linear-gradient(135deg, #1a1000 0%, " + C.gold + "44 50%, #0a0800 100%)",
          position: "relative",
        }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, " + C.gold + "08 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          <div style={{ position: "absolute", bottom: -36, left: 24 }}>
            <Avatar
              initials={npc.avatar_initials || npcConst.avatar || "?"}
              size={80}
              isNPC={true}
              status={npc.status || "online"}
            />
          </div>
        </div>

        {/* Info section */}
        <div style={{ padding: "48px 24px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <h1 style={{ margin: 0, fontWeight: 800, color: C.gold, fontSize: 20 }}>{npc.name}</h1>
                <NPCBadge />
              </div>
              <div style={{ color: C.textDim, fontSize: 13, marginBottom: 8 }}>{npc.handle}</div>
              {npc.role && (
                <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>{npc.role}</div>
              )}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {followerCount > 0 && (
                  <span style={{ color: C.textDim, fontSize: 12 }}>
                    👥 {followerCount >= 1000 ? (followerCount / 1000).toFixed(1) + "k" : followerCount} followers
                  </span>
                )}
                {npc.universe && (
                  <span style={{ color: C.textDim, fontSize: 12 }}>{npc.universe_icon || "⚔️"} {npc.universe}</span>
                )}
              </div>
            </div>

            {currentUser && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                style={{
                  background: isFollowing ? C.surfaceRaised : C.goldGlow,
                  border: "1px solid " + (isFollowing ? C.border : C.goldBorder),
                  borderRadius: 10,
                  padding: "9px 20px",
                  color: isFollowing ? C.textMuted : C.gold,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: followLoading ? "default" : "pointer",
                  opacity: followLoading ? 0.6 : 1,
                  transition: "all 0.15s",
                }}>
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>

          {/* Lore / bio */}
          {npc.lore && (
            <div style={{ marginTop: 16, background: C.goldGlow, border: "1px solid " + C.goldBorder, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ color: C.gold, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Lore</div>
              <p style={{ margin: 0, color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>{npc.lore}</p>
            </div>
          )}

          {/* Backstory */}
          {npc.backstory && (
            <div style={{ marginTop: 12, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Backstory</div>
              <p style={{ margin: 0, color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>{npc.backstory}</p>
            </div>
          )}
        </div>
      </div>

      {/* Posts */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: C.textDim, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
          Posts
        </div>

        {postsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.textDim, fontSize: 13 }}>Loading posts…</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14 }}>No posts from {npc.name} yet.</div>
          </div>
        ) : (
          posts.map(post => (
            <FeedPostCard
              key={post.id}
              post={{
                id: post.id,
                npc_id: post.npc_id,
                game_tag: post.game_tag,
                user_id: post.user_id,
                liked: post.liked || false,
                user: postUser,
                content: post.content,
                tagged_users: post.tagged_users || [],
                time: timeAgo(post.created_at),
                likes: post.likes || 0,
                comment_count: post.comment_count || 0,
                commentList: [],
                link_url: post.link_url || null,
              }}
              setActivePage={setActivePage}
              setCurrentGame={setCurrentGame}
              setCurrentNPC={setCurrentNPC}
              setCurrentPlayer={setCurrentPlayer}
              isMobile={isMobile}
              currentUser={currentUser}
              onReply={handleReply}
            />
          ))
        )}
      </div>

    </div>
  );
}

export default NPCProfilePage;
