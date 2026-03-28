import React, { useState, useEffect } from "react";
import { C, NPCS } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo } from "../utils.js";
import { Avatar } from "../components/Avatar.jsx";
import { FeedPostCard } from "../components/FeedPostCard.jsx";
import { Badge } from "../components/FoundingBadge.jsx";

function PlayerProfilePage({ userId, setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, isMobile, currentUser, isGuest, onSignIn, setGameDefaultTab }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [shelf, setShelf] = useState({ want_to_play: [], playing: [], have_played: [] });
  const [postGameNames, setPostGameNames] = useState({});
  const [activeTab, setActiveTab] = useState("posts");
  const [compatibility, setCompatibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    // Check follow status
    const checkFollow = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === userId) return;
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("followed_user_id", userId).maybeSingle();
      setFollowed(!!data);
    };
    checkFollow();
    const load = async () => {
      setLoading(true);
      try {
      // Profile
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (prof) setProfile(prof);

      // Posts + liked state
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const [{ data: userPosts }, likesRes] = await Promise.all([
        supabase.from("posts").select("*").eq("user_id", userId)
          .is("npc_id", null)
          .order("created_at", { ascending: false }).limit(20),
        authUser
          ? supabase.from("post_likes").select("post_id").eq("user_id", authUser.id).then(r => r.error ? { data: [] } : r)
          : Promise.resolve({ data: [] }),
      ]);
      const likedIds = new Set((likesRes.data || []).map(l => l.post_id));
      if (userPosts) {
        setPosts(userPosts.map(p => ({ ...p, liked: likedIds.has(p.id), likes: p.likes ?? 0 })));
        const gameIds = [...new Set(userPosts.filter(p => p.game_tag?.includes('-')).map(p => p.game_tag))];
        if (gameIds.length > 0) {
          const { data: games } = await supabase.from("games").select("id, name").in("id", gameIds);
          if (games) { const m = {}; games.forEach(g => m[g.id] = g.name); setPostGameNames(m); }
        }
      }

      // Reviews
      const { data: userReviews } = await supabase
        .from("reviews").select("*, games(id, name, developer)")
        .eq("user_id", userId).order("created_at", { ascending: false });
      if (userReviews) setReviews(userReviews);

      // Shelf
      const { data: shelfData } = await supabase
        .from("user_games").select("*, games(id, name, developer, genre)")
        .eq("user_id", userId);
      if (shelfData) {
        const s = { want_to_play: [], playing: [], have_played: [] };
        shelfData.forEach(e => { if (s[e.status]) s[e.status].push(e); });
        setShelf(s);

        // Compatibility — compare with current user's shelf
        if (currentUser) {
          const { data: myShelf } = await supabase
            .from("user_games").select("game_id, status, games(name)")
            .eq("user_id", currentUser.id);
          if (myShelf && myShelf.length > 0) {
            // Priority: playing match > want_to_play match > have_played match
            const theirPlaying = shelfData.filter(e => e.status === "playing").map(e => ({ id: e.game_id, name: e.games?.name }));
            const theirWant = shelfData.filter(e => e.status === "want_to_play").map(e => ({ id: e.game_id, name: e.games?.name }));
            const theirPlayed = shelfData.filter(e => e.status === "have_played").map(e => ({ id: e.game_id, name: e.games?.name }));
            const myGameIds = new Set(myShelf.map(e => e.game_id));

            const playingMatch = theirPlaying.find(g => myGameIds.has(g.id));
            if (playingMatch) { setCompatibility({ type: "playing", gameName: playingMatch.name }); }
            else {
              const wantMatch = theirWant.find(g => myGameIds.has(g.id));
              if (wantMatch) { setCompatibility({ type: "want", gameName: wantMatch.name }); }
              else {
                const playedMatch = theirPlayed.find(g => myGameIds.has(g.id));
                if (playedMatch) { setCompatibility({ type: "played", gameName: playedMatch.name }); }
              }
            }
          }
        }
      }

      setLoading(false);
      } catch(e) {
        console.error("PlayerProfilePage load error:", e);
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const toggleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setFollowLoading(true);
    if (followed) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_user_id", userId);
      setFollowed(false);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_user_id: userId });
      setFollowed(true);
    }
    setFollowLoading(false);
  };

  const SHELF_COLUMNS = [
    { id: "want_to_play", label: "Want to Play", color: C.accent },
    { id: "playing", label: "Playing Now", color: C.green },
    { id: "have_played", label: "Have Played", color: C.gold },
  ];

  const compatibilityText = compatibility ? {
    playing: `Also playing ${compatibility.gameName}`,
    want: `Also wants to play ${compatibility.gameName}`,
    played: `Also played ${compatibility.gameName}`,
  }[compatibility.type] : null;

  if (loading) return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px" : "80px 20px", textAlign: "center", color: C.textDim, paddingTop: 120 }}>
      Loading profile...
    </div>
  );

  if (!profile) return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px" : "80px 20px", textAlign: "center", color: C.textDim, paddingTop: 120 }}>
      Player not found.
    </div>
  );

  const totalGames = shelf.want_to_play.length + shelf.playing.length + shelf.have_played.length;
  const tabs = [
    { id: "posts", label: `Posts${posts.length > 0 ? ` (${posts.length})` : ""}` },
    { id: "games", label: `My Shelf${totalGames > 0 ? ` (${totalGames})` : ""}` },
    { id: "reviews", label: `Reviews${reviews.length > 0 ? ` (${reviews.length})` : ""}` },
  ];

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>
      {/* Header card */}
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ height: isMobile ? 100 : 150, background: "linear-gradient(135deg, #1a1040 0%, " + C.accent + "66 50%, #0a2040 100%)", position: "relative" }}>
          <div style={{ position: "absolute", bottom: isMobile ? -28 : -36, left: isMobile ? 16 : 28 }}>
            <Avatar initials={profile.avatar_initials || profile.username?.slice(0,2).toUpperCase() || "??"} size={isMobile ? 64 : 84} status="online" founding={profile.is_founding} ring={profile.active_ring} avatarConfig={profile.avatar_config} />
          </div>
        </div>
        <div style={{ padding: isMobile ? "40px 16px 20px" : "48px 28px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontWeight: 800, color: C.text, fontSize: isMobile ? 18 : 22 }}>{profile.username}</h1>
                {profile.xp !== undefined && (() => {
                  const XP_LEVELS = [0, 100, 250, 450, 750, 1150, 1650, 2250, 3000, 3900];
                  let level = 1;
                  for (let i = 1; i < XP_LEVELS.length; i++) { if ((profile.xp || 0) >= XP_LEVELS[i]) level = i + 1; else break; }
                  return <Badge color={C.gold}>Lv.{Math.min(level, 10)}</Badge>;
                })()}
              </div>
              <div style={{ color: C.textMuted, fontSize: 13, margin: "4px 0" }}>{profile.handle}</div>
              {profile.bio && <p style={{ color: C.textMuted, fontSize: 13, margin: "8px 0 0", maxWidth: 480, lineHeight: 1.6 }}>{profile.bio}</p>}
            </div>
            <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "flex-end", gap: 8, width: isMobile ? "100%" : "auto" }}>
              {!isOwnProfile && (
                <button onClick={toggleFollow} disabled={followLoading} style={{ background: followed ? C.accentGlow : C.accent, border: "1px solid " + (followed ? C.accentDim : C.accent), borderRadius: 8, padding: "8px 22px", color: followed ? C.accentSoft : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flex: isMobile ? 1 : "none" }}>
                  {followLoading ? "..." : followed ? "✓ Following" : "Follow"}
                </button>
              )}
              {compatibilityText && (
                <div style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "6px 12px", color: C.accentSoft, fontSize: 12, fontWeight: 600, flex: isMobile ? 1 : "none", textAlign: "center" }}>
                  {compatibilityText}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 24, marginTop: 20, paddingTop: 20, borderTop: "1px solid " + C.border }}>
            {[
              { label: "Posts", val: posts.length, color: C.accent },
              { label: "Reviews", val: reviews.length, color: C.teal },
              { label: "Games", val: totalGames, color: C.gold },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
                <div style={{ color: C.textDim, fontSize: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ background: activeTab === tab.id ? C.accentGlow : "transparent", border: activeTab === tab.id ? "1px solid " + C.accentDim : "1px solid transparent", borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: activeTab === tab.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {activeTab === "posts" && (
        <div>
          {posts.length > 0 ? posts.map(post => {
            const npc = post.npc_id ? Object.values(NPCS).find(n => n.id === post.npc_id) : null;
            return (
            <FeedPostCard key={post.id} post={{
              id: post.id,
              npc_id: post.npc_id,
              game_tag: post.game_tag,
              user_id: post.user_id || userId,
              liked: post.liked || false,
              user: npc ? {
                name: npc.name, handle: npc.handle, avatar: npc.avatar, status: npc.status, isNPC: true, isFounding: false,
              } : {
                name: profile?.username || "Gamer",
                handle: profile?.handle || "@gamer",
                avatar: profile?.avatar_initials || "GL",
                status: "online",
                isNPC: false,
                isFounding: profile?.is_founding || false,
                activeRing: profile?.active_ring || "none",
              },
              content: post.content,
              tagged_users: post.tagged_users || [],
              time: timeAgo(post.created_at),
              likes: post.likes || 0,
              comment_count: post.comment_count || 0,
              commentList: [],
            }} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC || (() => {})} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={currentUser} isGuest={isGuest} onSignIn={onSignIn} />
            );
          }) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
              <div style={{ fontSize: 13 }}>No posts yet.</div>
            </div>
          )}
        </div>
      )}

      {/* Games — read-only kanban */}
      {activeTab === "games" && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14, minWidth: 0, overflow: "hidden" }}>
          {SHELF_COLUMNS.map(col => (
            <div key={col.id} style={{ background: C.surface, border: "1px solid " + col.color + "33", borderRadius: 14, padding: 14, minHeight: 160, minWidth: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, color: col.color, fontSize: 13, whiteSpace: "nowrap" }}>{col.label}</div>
                <div style={{ background: col.color + "22", color: col.color, borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{shelf[col.id].length}</div>
              </div>
              {shelf[col.id].length > 0 ? shelf[col.id].map(entry => {
                const game = entry.games;
                if (!game) return null;
                const review = reviews.find(r => r.game_id === entry.game_id);
                return (
                  <div key={entry.game_id}
                    onClick={() => { setCurrentGame(game.id); setActivePage("game"); }}
                    style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                        <div style={{ color: C.textDim, fontSize: 11 }}>{game.genre}</div>
                      </div>
                      {review && <span style={{ background: C.goldDim, color: C.gold, borderRadius: 5, padding: "1px 6px", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{review.rating + "/10"}</span>}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ textAlign: "center", padding: "20px 10px", color: C.textDim, fontSize: 12, borderRadius: 8, border: "1px dashed " + col.color + "33" }}>
                  Nothing here yet
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reviews */}
      {activeTab === "reviews" && (
        <div>
          {reviews.length > 0 ? reviews.map(review => (
            <div key={review.id} onClick={() => review.games && (setCurrentGame(review.game_id), setActivePage("game"))}
              style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 12, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.surfaceRaised, border: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, color: C.textDim, fontSize: 11 }}>{(review.games?.name || "?").slice(0,2).toUpperCase()}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{review.games?.name || "Unknown Game"}</div>
                  <div style={{ color: C.textDim, fontSize: 12 }}>{review.games?.developer}{review.time_played ? " · " + review.time_played + "h played" : ""}{review.completed ? " · Completed" : ""}</div>
                </div>
                {currentUser && review.user_id === currentUser.id && (
                  <button onClick={(e) => { e.stopPropagation(); setGameDefaultTab?.("reviews"); setCurrentGame(review.game_id); setActivePage("game"); }}
                    style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "6px 12px", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Edit</button>
                )}
                <div style={{ background: C.goldDim, border: "1px solid " + C.gold + "44", borderRadius: 8, padding: "6px 12px", color: C.gold, fontWeight: 800, fontSize: 16 }}>{review.rating + "/10"}</div>
              </div>
              {review.headline && <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 8 }}>{review.headline}</div>}
              {review.loved && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>{"✅ " + review.loved}</div>}
              {review.didnt_love && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>{"⚠️ " + review.didnt_love}</div>}
              {review.content && <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: "8px 0 0" }}>{review.content}</p>}
              <div style={{ color: C.textDim, fontSize: 11, marginTop: 10 }}>{timeAgo(review.created_at)}</div>
            </div>
          )) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
              <div style={{ fontSize: 13 }}>No reviews yet.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerProfilePage;
