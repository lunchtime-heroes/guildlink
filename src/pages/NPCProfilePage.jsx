import React, { useState, useEffect } from "react";
import { C, NPCS } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo } from "../utils.js";
import { FeedPostCard } from "../components/FeedPostCard.jsx";
import { NPCBadge } from "../components/FoundingBadge.jsx";

function NPCProfilePage({ npcId, setActivePage, setCurrentNPC, setCurrentGame, setCurrentPlayer, isMobile, currentUser, onQuestTrigger }) {
  const [activeTab, setActiveTab] = useState("posts");
  const [followed, setFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [liveNPC, setLiveNPC] = useState(null);
  const [npcPosts, setNpcPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNPCData();
    const checkFollow = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !npcId) return;
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("followed_npc_id", npcId).maybeSingle();
      setFollowed(!!data);
    };
    checkFollow();
  }, [npcId]);

  const toggleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setFollowLoading(true);
    if (followed) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_npc_id", npcId);
      setFollowed(false);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_npc_id: npcId });
      setFollowed(true);
      await supabase.rpc("increment_quest_progress", { p_user_id: user.id, p_trigger: "npc_followed" });
      onQuestTrigger?.();
    }
    setFollowLoading(false);
  };

  const loadNPCData = async () => {
    setLoading(true);
    const isUUID = npcId && npcId.includes("-");
    let npcData = null;

    if (isUUID) {
      const { data } = await supabase.from("npcs").select("*").eq("id", npcId).single();
      npcData = data;
    } else {
      const hardcoded = NPCS[npcId];
      if (hardcoded) {
        const { data } = await supabase.from("npcs").select("*").eq("handle", hardcoded.handle).maybeSingle();
        npcData = data;
        if (!npcData) {
          npcData = {
            id: null, name: hardcoded.name, handle: hardcoded.handle,
            avatar_initials: hardcoded.avatar, bio: hardcoded.bio, lore: hardcoded.lore,
            role: hardcoded.role, location: hardcoded.location, universe: hardcoded.universe,
            universe_icon: hardcoded.universeIcon, status: hardcoded.status,
            years_of_service: hardcoded.yearsOfService, connections: hardcoded.connections,
            followers: hardcoded.followers, games: hardcoded.games, stats: hardcoded.stats,
          };
        }
      }
    }

    if (npcData) {
      setLiveNPC(npcData);
      if (npcData.id) {
        const { data: posts } = await supabase
          .from("posts")
          .select("*")
          .eq("npc_id", npcData.id)
          .order("created_at", { ascending: false });
        if (posts) setNpcPosts(posts);
      }
    }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.textMuted, fontSize: 14 }}>Loading…</div>
    </div>
  );

  if (!liveNPC) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.textMuted, fontSize: 14 }}>Character not found.</div>
    </div>
  );

  const displayNPC = liveNPC;

  const tabs = [
    { id: "posts", label: "📝 Posts" },
    { id: "stats", label: "📊 Stats" },
    { id: "lore", label: "📖 Lore" },
  ];

  return (
    <div style={{ paddingTop: isMobile ? 52 : 60 }}>

      <div style={{
        background: "linear-gradient(135deg, #1a1200 0%, #2d2000 40%, #1a1200 100%)",
        borderBottom: "1px solid " + C.goldBorder,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, " + C.gold + "08 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 50%, rgba(245,158,11,0.08) 0%, transparent 60%)" }} />

        <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "24px 16px 20px" : "36px 24px 28px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 14 : 20, flexWrap: isMobile ? "wrap" : "nowrap" }}>

            <div style={{
              width: isMobile ? 64 : 88, height: isMobile ? 64 : 88, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #3d2e00, #7a5c00)",
              border: "3px solid " + C.gold + "66",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: isMobile ? 22 : 32, fontWeight: 800, color: C.gold, letterSpacing: "-1px",
              boxShadow: "0 0 32px " + C.gold + "22",
            }}>{displayNPC.avatar_initials || "?"}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <h1 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? 20 : 26, color: C.gold, letterSpacing: "-0.5px" }}>{displayNPC.name}</h1>
                <NPCBadge />
                {displayNPC.universe && (
                  <span style={{ background: C.gold + "18", color: C.gold, border: "1px solid " + C.goldBor