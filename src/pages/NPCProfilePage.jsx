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
    { id: "posts", label: "Posts" },
    { id: "stats", label: "Stats" },
    { id: "lore", label: "Lore" },
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
                  <span style={{ background: C.gold + "18", color: C.gold, border: "1px solid " + C.goldBorder, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                    {displayNPC.universe_icon || "⚔️"} {displayNPC.universe}
                  </span>
                )}
              </div>
              <div style={{ color: C.gold + "99", fontSize: 12, marginBottom: 4 }}>{displayNPC.handle}</div>
              {displayNPC.role && <div style={{ color: C.gold + "77", fontSize: 12, marginBottom: isMobile ? 6 : 10 }}>{displayNPC.role}</div>}
              {!isMobile && displayNPC.location && (
                <div style={{ color: C.gold + "55", fontSize: 12, marginBottom: 14 }}>📍 {displayNPC.location}</div>
              )}
              {displayNPC.bio && (
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: "0 0 14px", lineHeight: 1.65 }}>{displayNPC.bio}</p>
              )}
              {currentUser && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={toggleFollow} disabled={followLoading} style={{ background: followed ? C.goldGlow : C.gold, border: "1px solid " + C.gold, borderRadius: 8, padding: "7px 18px", color: followed ? C.gold : "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {followLoading ? "..." : followed ? "✓ Following" : "+ Follow"}
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, flexShrink: 0, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-start", flexDirection: isMobile ? "row" : "column" }}>
              {[
                { label: "Followers", value: displayNPC.followers ? ((displayNPC.followers / 1000).toFixed(1) + "k") : "—", color: C.gold },
                { label: "Yrs Service", value: displayNPC.years_of_service || "—", color: "#e8d5a0" },
                { label: "Associates", value: displayNPC.connections || "—", color: C.textMuted },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid " + C.goldBorder, borderRadius: 10, padding: isMobile ? "8px 12px" : "12px 16px", textAlign: "center", flex: isMobile ? 1 : "none", minWidth: isMobile ? 0 : 90 }}>
                  <div style={{ fontWeight: 800, fontSize: isMobile ? 14 : 18, color: s.color }}>{s.value}</div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, borderBottom: "1px solid " + C.goldBorder, position: "sticky", top: isMobile ? 52 : 60, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px", display: "flex", gap: 2 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              background: "transparent", border: "none",
              borderBottom: activeTab === tab.id ? "2px solid " + C.gold : "2px solid transparent",
              padding: isMobile ? "12px 14px" : "14px 18px", cursor: "pointer",
              color: activeTab === tab.id ? C.gold : C.textMuted,
              fontSize: isMobile ? 12 : 13, fontWeight: activeTab === tab.id ? 700 : 500,
            }}>{tab.label}</button>
          ))}
          <button onClick={() => setActivePage(isMobile ? "npcs" : "feed")} style={{ marginLeft: "auto", background: "transparent", border: "none", color: C.textDim, fontSize: 12, cursor: "pointer", padding: "12px 0" }}>← Back</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "16px 16px 80px" : "24px" }}>

        {activeTab === "posts" && (
          <div>
            {npcPosts.map(post => (
              <FeedPostCard
                key={post.id}
                post={{
                  id: post.id,
                  npc_id: post.npc_id || displayNPC.id,
                  game_tag: post.game_tag,
                  user_id: post.user_id,
                  liked: post.liked || false,
                  user: {
                    name: displayNPC.name,
                    handle: displayNPC.handle,
                    avatar: displayNPC.avatar_initials || "?",
                    status: "online",
                    isNPC: true,
                    isFounding: false,
                  },
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
              />
            ))}
            {npcPosts.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🕯️</div>
                <div style={{ fontSize: 14 }}>No posts yet. They're thinking about it.</div>
              </div>
            )}
          </div>
        )}

        {activeTab === "stats" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: C.gold, fontSize: 18, marginBottom: 4 }}>In-Game Record</div>
              <div style={{ color: C.textDim, fontSize: 13 }}>Official statistics from {displayNPC.universe || "the archives"}. Verified by the guild.</div>
            </div>
            {(displayNPC.stats || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
                <div style={{ fontSize: 14 }}>No stats recorded yet.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14 }}>
                {(displayNPC.stats || []).map((stat, i) => (
                  <div key={i} style={{
                    background: C.surface, border: "1px solid " + C.goldBorder,
                    borderRadius: 14, padding: 20, position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: "radial-gradient(circle, " + C.gold + "08, transparent)" }} />
                    <div style={{ fontWeight: 900, fontSize: 28, color: C.gold, marginBottom: 6, letterSpacing: "-0.5px" }}>{stat.value}</div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 6 }}>{stat.label}</div>
                    {stat.note && <div style={{ color: C.textDim, fontSize: 12, fontStyle: "italic", lineHeight: 1.5 }}>{stat.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "lore" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 20 }}>
            <div>
              <div style={{ background: C.surface, border: "1px solid " + C.goldBorder, borderRadius: 14, padding: 28, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, color: C.gold, fontSize: 18, marginBottom: 4 }}>Origin</div>
                <div style={{ color: C.gold + "66", fontSize: 12, marginBottom: 16 }}>
                  From the official {displayNPC.universe || "GuildLink"} lore archives
                </div>
                <p style={{ color: C.text, fontSize: 15, lineHeight: 1.8, margin: 0 }}>
                  {displayNPC.lore || displayNPC.bio || "Lore coming soon."}
                </p>
              </div>
              {displayNPC.personality && (
                <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 24 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 10 }}>Personality</div>
                  <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{displayNPC.personality}</p>
                </div>
              )}
            </div>

            <div>
              {displayNPC.universe && (
                <div style={{ background: C.surface, border: "1px solid " + C.goldBorder, borderRadius: 14, padding: 20, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: C.gold, fontSize: 14, marginBottom: 14 }}>Universe</div>
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>{displayNPC.universe_icon || "⚔️"}</div>
                    <div style={{ fontWeight: 800, color: C.gold, fontSize: 16 }}>{displayNPC.universe}</div>
                    <div style={{ color: C.textDim, fontSize: 12, marginTop: 6 }}>A GuildLink original universe</div>
                  </div>
                  {displayNPC.location && (
                    <div style={{ borderTop: "1px solid " + C.goldBorder, paddingTop: 12, marginTop: 4, color: C.textMuted, fontSize: 12, textAlign: "center" }}>
                      📍 {displayNPC.location}
                    </div>
                  )}
                </div>
              )}

              {(displayNPC.games || []).length > 0 && (
                <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 12 }}>Favorite Genres</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(displayNPC.games || []).map((g, i) => (
                      <span key={i} style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 6, padding: "4px 10px", color: C.textMuted, fontSize: 12 }}>{g}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: C.goldGlow, border: "1px solid " + C.goldBorder, borderRadius: 14, padding: 20, textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: C.gold, fontSize: 14, marginBottom: 8 }}>Meet all characters</div>
                <div style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
                  Browse all GuildLink original characters and the worlds they come from.
                </div>
                <button onClick={() => setActivePage("npcs")}
                  style={{ background: C.gold, border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  See all characters
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default NPCProfilePage;