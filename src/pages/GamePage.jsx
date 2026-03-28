import React, { useState, useEffect, useCallback } from "react";
import { C, NPCS } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo, logChartEvent } from "../utils.js";
import { Avatar } from "../components/Avatar.jsx";
import { FeedPostCard } from "../components/FeedPostCard.jsx";
import { Badge } from "../components/FoundingBadge.jsx";

function GamePage({ gameId, setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, isMobile, currentUser, isGuest, onSignIn, defaultTab, onTabConsumed, onQuestComplete }) {
  const hardcoded = null;
  const [activeTab, setActiveTab] = useState(defaultTab || "pulse");

  useEffect(() => {
    if (defaultTab) { setActiveTab(defaultTab); onTabConsumed?.(); }
  }, [gameId]);
  const [followed, setFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [shelfStatus, setShelfStatus] = useState(null);
  const [showShelfMenu, setShowShelfMenu] = useState(false);
  const [dbGame, setDbGame] = useState(null);
  const [gamePosts, setGamePosts] = useState([]);
  const [gameTips, setGameTips] = useState([]);
  const [topVoices, setTopVoices] = useState([]);
  const [latestReviews, setLatestReviews] = useState([]);
  const [chartsData, setChartsData] = useState(null);
  const [shelfCounts, setShelfCounts] = useState({ want_to_play: 0, playing: 0, have_played: 0 });
  const [shelfPlayers, setShelfPlayers] = useState({ want_to_play: [], playing: [], have_played: [] });
  const [shelfDrawer, setShelfDrawer] = useState(null); // "want_to_play" | "playing" | "have_played" | null
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, headline: "", time_played: "", completed: false, loved: "", didnt_love: "", content: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [myReview, setMyReview] = useState(null); // current user's existing review for this game

  useEffect(() => {
    const load = async () => {
      if (!gameId || !gameId.includes('-')) return;
      let query = supabase.from("games").select("*").eq("id", gameId);
      const { data } = await query.single();
      if (!data) return;
      setDbGame(data);
      const dbId = data.id;

      // Posts
      const { data: posts } = await supabase
        .from("posts")
        .select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring, avatar_config), npcs(name, handle, avatar_initials)")
        .eq("game_tag", dbId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (posts) setGamePosts(posts);

      // Tips — posts with tip votes, sorted by tip count
      const { data: tips } = await supabase
        .from("posts")
        .select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring, avatar_config), npcs(name, handle, avatar_initials)")
        .eq("game_tag", dbId)
        .gte("tip_count", 1)
        .order("tip_count", { ascending: false })
        .limit(30);
      if (tips) {
        // Also fetch which tips the current user has voted on
        const tipIds = (tips || []).map(p => p.id);
        let tippedIds = new Set();
        if (currentUser && tipIds.length > 0) {
          const { data: myTips } = await supabase.from("tip_votes").select("post_id").eq("user_id", currentUser.id).in("post_id", tipIds);
          tippedIds = new Set((myTips || []).map(t => t.post_id));
        }
        setGameTips(tips.map(p => ({ ...p, tipped: tippedIds.has(p.id) })));
      }

      // Top Voices — users with most likes on posts for this game
      const { data: voicePosts } = await supabase
        .from("posts")
        .select("user_id, likes, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
        .eq("game_tag", dbId)
        .not("user_id", "is", null);
      if (voicePosts) {
        const byUser = {};
        voicePosts.forEach(p => {
          if (!p.user_id || !p.profiles) return;
          if (!byUser[p.user_id]) byUser[p.user_id] = { ...p.profiles, user_id: p.user_id, totalLikes: 0, postCount: 0 };
          byUser[p.user_id].totalLikes += (p.likes || 0);
          byUser[p.user_id].postCount += 1;
        });
        const sorted = Object.values(byUser).sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 5);
        setTopVoices(sorted);
      }

      // Latest reviews — filtered to this game
      const { data: reviews } = await supabase
        .from("reviews")
        .select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
        .eq("game_id", dbId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (reviews) setLatestReviews(reviews);

      // Shelf counts — how many users have this game in each status
      const { data: shelfData } = await supabase
        .from("user_games")
        .select("status, user_id, profiles(id, username, handle, avatar_initials, active_ring, is_founding)")
        .eq("game_id", dbId);
      if (shelfData) {
        const counts = { want_to_play: 0, playing: 0, have_played: 0 };
        const players = { want_to_play: [], playing: [], have_played: [] };
        shelfData.forEach(e => {
          if (counts[e.status] !== undefined) {
            counts[e.status]++;
            if (e.profiles) players[e.status].push(e.profiles);
          }
        });
        setShelfCounts(counts);
        setShelfPlayers(players);
      }

      // Check if current user already reviewed this game
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: existing } = await supabase.from("reviews")
          .select("*").eq("game_id", dbId).eq("user_id", authUser.id).maybeSingle();
        if (existing) {
          setMyReview(existing);
          setReviewForm({
            rating: existing.rating || 0,
            headline: existing.headline || "",
            time_played: existing.time_played ? String(existing.time_played) : "",
            completed: existing.completed || false,
            loved: existing.loved || "",
            didnt_love: existing.didnt_love || "",
            content: existing.content || "",
          });
        }
      }

      // Charts data — rank by weekly posts + reviews
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: weeklyPosts } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("game_tag", dbId)
        .gte("created_at", oneWeekAgo);
      const { count: weeklyReviews } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("game_id", dbId)
        .gte("created_at", oneWeekAgo);
      const { data: avgData } = await supabase
        .from("reviews")
        .select("rating")
        .eq("game_id", dbId);
      const avgRating = avgData && avgData.length > 0
        ? (avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length).toFixed(1)
        : null;
      setChartsData({ weeklyPosts: weeklyPosts || 0, weeklyReviews: weeklyReviews || 0, avgRating, totalReviews: avgData?.length || 0 });
    };
    load();
  }, [gameId]);

  useEffect(() => {
    const checkFollow = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !dbGame) return;
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("followed_game_id", dbGame.id).maybeSingle();
      setFollowed(!!data);
      const { data: shelfData } = await supabase.from("user_games").select("status").eq("user_id", user.id).eq("game_id", dbGame.id).maybeSingle();
      setShelfStatus(shelfData?.status || null);
    };
    if (dbGame) checkFollow();
  }, [dbGame]);

  const setShelf = async (status) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !dbGame) return;
    await supabase.from("user_games").upsert({ user_id: user.id, game_id: dbGame.id, status, updated_at: new Date().toISOString() }, { onConflict: "user_id,game_id" });
    await supabase.from("user_games_history").insert({ user_id: user.id, game_id: dbGame.id, from_status: shelfStatus, to_status: status });
    const eventMap = { playing: 'shelf_playing', want_to_play: 'shelf_want', have_played: 'shelf_played' };
    if (eventMap[status]) logChartEvent(dbGame.id, eventMap[status], user.id);
    setShelfStatus(status);
    setShowShelfMenu(false);
  };

  const toggleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !dbGame) return;
    setFollowLoading(true);
    if (followed) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_game_id", dbGame.id);
      setFollowed(false);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_game_id: dbGame.id });
      setFollowed(true);
    }
    setFollowLoading(false);
  };

  const submitReview = async () => {
    if (!reviewForm.rating || submittingReview) return;
    setSubmittingReview(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || !dbGame) { setSubmittingReview(false); return; }
    const { error } = await supabase.from("reviews").upsert({
      user_id: authUser.id,
      game_id: dbGame.id,
      rating: reviewForm.rating,
      headline: reviewForm.headline || null,
      time_played: reviewForm.time_played ? parseInt(reviewForm.time_played) : null,
      completed: reviewForm.completed,
      loved: reviewForm.loved || null,
      didnt_love: reviewForm.didnt_love || null,
      content: reviewForm.content || null,
    });
    if (!error) {
      const isEdit = !!myReview;
      if (!isEdit) {
        logChartEvent(dbGame.id, 'review', authUser.id);
        supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "review_written" }).then(() => onQuestComplete?.());
      }
      // Refresh reviews
      const { data: reviews } = await supabase.from("reviews")
        .select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
        .eq("game_id", dbGame.id).order("created_at", { ascending: false }).limit(20);
      if (reviews) setLatestReviews(reviews);
      const { data: avgData } = await supabase.from("reviews").select("rating").eq("game_id", dbGame.id);
      const avgRating = avgData && avgData.length > 0 ? (avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length).toFixed(1) : null;
      setChartsData(prev => ({ ...prev, avgRating, totalReviews: avgData?.length || 0 }));
      // Update myReview so button reflects the saved state
      setMyReview({ ...reviewForm, game_id: dbGame.id, user_id: authUser.id });
      setShowReviewForm(false);
    }
    setSubmittingReview(false);
  };

  const game = dbGame ? {
    trendingTopics: [],
    topVoices: [],
    alsoLiked: [],
    tips: [],
    posts: [],
    activePlayers: 0,
    completions: 0,
    reviewScore: chartsData?.avgRating || null,
    reviewCount: chartsData?.totalReviews || 0,
    year: null,
    ...(hardcoded || {}),
    name: dbGame.name,
    developer: dbGame.developer,
    description: dbGame.description || dbGame.summary,
    followers: dbGame.followers,
    genre: dbGame.genre ? [dbGame.genre] : (hardcoded?.genre || []),
    color: hardcoded?.color || C.accent,
    gradient: hardcoded?.gradient || ("linear-gradient(135deg, " + C.accent + "18 0%, #080e1a 100%)"),
    icon: hardcoded?.icon || { 'MMO':'🌐','MOBA':'⚔️','Battle Royale':'🎯','Action RPG':'🗡️','RPG':'📖','Roguelike':'🎲','Tactical Shooter':'🔫','Hero Shooter':'🦸','Looter Shooter':'💥','Soulslike':'💀','Fighting':'🥊','Farming Sim':'🌱','Life Simulation':'🏡','City Builder':'🏙️','Sandbox Survival':'⛏️','Survival':'🪓','Racing':'🏎️','Sports':'⚽','Platformer':'🕹️','Auto Battler':'♟️','RTS':'🏰','Turn-Based Strategy':'🎖️' }[dbGame.genre] || '🎮',
    claimed: dbGame.is_claimed,
    cover_url: dbGame.cover_url || null,
    summary: dbGame.summary || null,
    id: gameId,
  } : hardcoded;

  if (!game) return (
    <div style={{ maxWidth: 800, margin: "100px auto", textAlign: "center", color: C.textMuted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>Loading...</div>
      <button onClick={() => setActivePage("games")} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "10px 24px", color: C.accentText, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>Browse Games</button>
    </div>
  );

  const tabs = [{ id: "pulse", label: "Pulse" }, { id: "reviews", label: "Reviews" }, { id: "tips", label: "Tips" }, { id: "posts", label: "Posts" }];

  return (
    <div style={{ paddingTop: isMobile ? 52 : 60 }}>
      <div style={{ background: game.gradient, borderBottom: "1px solid " + game.color + "33" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "24px 16px 20px" : "36px 24px 28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 14 : 20, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            {game.cover_url
              ? <img src={game.cover_url} alt={game.name} style={{ width: isMobile ? 56 : 100, height: isMobile ? 75 : 133, borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }} />
              : <div style={{ width: isMobile ? 56 : 80, height: isMobile ? 56 : 80, borderRadius: 16, fontSize: isMobile ? 30 : 44, background: game.color + "22", border: "2px solid " + game.color + "44", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{game.icon}</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? 20 : 28, color: "#fff" }}>{game.name}</h1>
                {game.claimed && false && <Badge color={C.teal}>✓ Dev Claimed</Badge>}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: isMobile ? 8 : 10 }}>{game.developer} · {game.year}</div>
              {!isMobile && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: "0 0 16px", maxWidth: 540, lineHeight: 1.6 }}>{game.description}</p>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: isMobile ? 12 : 0, position: "relative" }}>
                <button onClick={toggleFollow} disabled={followLoading} style={{ background: followed ? game.color + "33" : game.color, border: "1px solid " + game.color, borderRadius: 8, padding: "7px 18px", color: followed ? game.color : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{followLoading ? "..." : followed ? "✓ Following" : "+ Follow"}</button>
                {currentUser && (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setShowShelfMenu(m => !m)}
                      style={{ background: shelfStatus ? C.goldGlow : "transparent", border: "1px solid " + C.gold, borderRadius: 8, padding: "7px 18px", color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {shelfStatus === "playing" ? "Playing" : shelfStatus === "want_to_play" ? "Want to Play" : shelfStatus === "have_played" ? "Played" : "+ Add to Shelf"}
                    </button>
                    {showShelfMenu && (
                      <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, zIndex: 100, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", minWidth: 160 }}>
                        {[{ id: "playing", label: "Playing Now" }, { id: "want_to_play", label: "Want to Play" }, { id: "have_played", label: "Have Played" }].map(opt => (
                          <div key={opt.id} onClick={() => setShelf(opt.id)}
                            style={{ padding: "10px 16px", cursor: "pointer", color: shelfStatus === opt.id ? C.gold : C.text, fontWeight: shelfStatus === opt.id ? 700 : 500, fontSize: 13, background: shelfStatus === opt.id ? C.goldGlow : "transparent" }}
                            onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                            onMouseLeave={e => e.currentTarget.style.background = shelfStatus === opt.id ? C.goldGlow : "transparent"}>
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-start" }}>
              {[{ label: "Followers", value: (game.followers / 1000).toFixed(1) + "k", color: game.color }, { label: "Active", value: (game.activePlayers || 0).toLocaleString(), color: C.online }, { label: "Score", value: game.reviewScore ? "★ " + game.reviewScore : "—", color: C.gold }].map(s => (
                <div key={s.label} style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: isMobile ? "8px 12px" : "12px 16px", textAlign: "center", flex: isMobile ? 1 : "none", minWidth: isMobile ? 0 : 80 }}>
                  <div style={{ fontWeight: 800, fontSize: isMobile ? 14 : 17, color: s.color }}>{s.value}</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, borderBottom: "1px solid " + C.border, position: "sticky", top: isMobile ? 52 : 60, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px", display: "flex", overflowX: "auto" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: "transparent", border: "none", borderBottom: activeTab === tab.id ? "2px solid " + game.color : "2px solid transparent", padding: isMobile ? "12px 14px" : "14px 18px", cursor: "pointer", color: activeTab === tab.id ? "#fff" : C.textMuted, fontSize: isMobile ? 12 : 13, fontWeight: activeTab === tab.id ? 700 : 500, whiteSpace: "nowrap" }}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "16px 16px 80px" : "24px" }}>
        {activeTab === "pulse" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 20 }}>
            <div>
              {/* The Charts card */}
              <div style={{ background: C.surface, border: "1px solid " + game.color + "44", borderRadius: 14, padding: 22, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>The Charts</div>
                  <span style={{ color: C.textDim, fontSize: 12 }}>This week</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Posts This Week", value: chartsData?.weeklyPosts ?? "—", color: game.color },
                    { label: "New Reviews", value: chartsData?.weeklyReviews ?? "—", color: C.teal },
                    { label: "Avg Rating", value: chartsData?.avgRating ? chartsData.avgRating + "/10" : "—", color: C.gold },
                  ].map(s => (
                    <div key={s.label} style={{ background: C.surfaceRaised, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ fontWeight: 800, fontSize: 20, color: s.color }}>{s.value}</div>
                      <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {chartsData?.weeklyPosts === 0 && (
                  <div style={{ textAlign: "center", color: C.textDim, fontSize: 13, marginTop: 14 }}>
                    Be the first to post about {game.name} and get on The Charts.
                  </div>
                )}
              </div>

              {/* Community Shelf */}
              {(shelfCounts.want_to_play + shelfCounts.playing + shelfCounts.have_played) > 0 && (
                <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 22, marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 16, marginBottom: 14 }}>🎮 Community Shelf</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      { key: "playing", label: "Playing", color: C.green },
                      { key: "want_to_play", label: "Want to Play", color: C.accent },
                      { key: "have_played", label: "Have Played", color: C.gold },
                    ].map(({ key, label, color }) => shelfCounts[key] > 0 && (
                      <button key={key} onClick={() => setShelfDrawer(shelfDrawer === key ? null : key)}
                        style={{ background: shelfDrawer === key ? color + "22" : C.surfaceRaised, border: "1px solid " + (shelfDrawer === key ? color + "66" : C.border), borderRadius: 10, padding: "10px 16px", cursor: "pointer", textAlign: "center", flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 20, color }}>{shelfCounts[key]}</div>
                        <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>{label}</div>
                      </button>
                    ))}
                  </div>
                  {shelfDrawer && shelfPlayers[shelfDrawer]?.length > 0 && (
                    <div style={{ marginTop: 14, borderTop: "1px solid " + C.border, paddingTop: 14 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {shelfPlayers[shelfDrawer].map(p => (
                          <div key={p.id} onClick={() => { setCurrentPlayer(p.id); setActivePage("player"); }}
                            style={{ display: "flex", alignItems: "center", gap: 8, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 20, padding: "5px 12px 5px 6px", cursor: "pointer" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = C.accentDim}
                            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                            <Avatar initials={(p.avatar_initials || p.username || "?").slice(0,2).toUpperCase()} size={24} ring={p.active_ring} founding={p.is_founding} avatarConfig={p.avatar_config} />
                            <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{p.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Latest Reviews */}
              <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 22, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>⭐ Latest Reviews</div>
                  <button onClick={() => setShowReviewForm(true)} style={{ background: C.accent, border: "none", borderRadius: 7, padding: "6px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Write Review</button>
                </div>
                {showReviewForm && (
                  <div style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 12, padding: 18, marginBottom: 18 }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 14 }}>Your Review of {game.name}</div>
                    {/* Star rating */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Rating (required)</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))}
                            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid " + reviewForm.rating >= n ? C.gold : C.border, background: reviewForm.rating >= n ? C.goldDim : C.surfaceRaised, color: reviewForm.rating >= n ? C.gold : C.textDim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{n}</button>
                        ))}
                      </div>
                    </div>
                    <input value={reviewForm.headline} onChange={e => setReviewForm(f => ({ ...f, headline: e.target.value }))} placeholder="Headline (e.g. 'A masterpiece that respects your time')" style={{ width: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                      <input value={reviewForm.time_played} onChange={e => setReviewForm(f => ({ ...f, time_played: e.target.value }))} placeholder="Hours played" type="number" style={{ flex: 1, background: C.surface, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted, fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" checked={reviewForm.completed} onChange={e => setReviewForm(f => ({ ...f, completed: e.target.checked }))} />
                        Completed
                      </label>
                    </div>
                    <input value={reviewForm.loved} onChange={e => setReviewForm(f => ({ ...f, loved: e.target.value }))} placeholder="What you loved..." style={{ width: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
                    <input value={reviewForm.didnt_love} onChange={e => setReviewForm(f => ({ ...f, didnt_love: e.target.value }))} placeholder="What you didn't love..." style={{ width: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
                    <textarea value={reviewForm.content} onChange={e => setReviewForm(f => ({ ...f, content: e.target.value }))} placeholder="Full thoughts (optional)..." style={{ width: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", resize: "none", minHeight: 80, marginBottom: 12, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => setShowReviewForm(false)} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "7px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                      <button onClick={submitReview} disabled={!reviewForm.rating || submittingReview} style={{ background: reviewForm.rating ? game.color : C.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 18px", color: reviewForm.rating ? "#000" : C.textDim, fontSize: 13, fontWeight: 700, cursor: reviewForm.rating ? "pointer" : "default" }}>{submittingReview ? "Saving..." : "Submit Review"}</button>
                    </div>
                  </div>
                )}
                {latestReviews.length > 0 ? latestReviews.map((review, i) => (
                  <div key={review.id} style={{ padding: "14px 0", borderBottom: i < latestReviews.length - 1 ? "1px solid " + C.border : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <Avatar initials={review.profiles?.avatar_initials || "GL"} size={30} founding={review.profiles?.is_founding} ring={review.profiles?.active_ring} avatarConfig={review.profiles?.avatar_config} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{review.profiles?.username || "Gamer"}</div>
                        <div style={{ color: C.textDim, fontSize: 11 }}>{timeAgo(review.created_at)}{review.time_played ? " · " + review.time_played + "h played" : ""}{review.completed ? " · ✓ Completed" : ""}</div>
                      </div>
                      {currentUser && review.user_id === currentUser.id && (
                        <button onClick={() => { setActiveTab("reviews"); setShowReviewForm(true); }}
                          style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "4px 10px", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Edit</button>
                      )}
                      <div style={{ background: C.goldDim, border: "1px solid " + C.gold + "44", borderRadius: 8, padding: "4px 10px", color: C.gold, fontWeight: 800, fontSize: 14 }}>{review.rating + "/10"}</div>
                    </div>
                    {review.headline && <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 6 }}>{review.headline}</div>}
                    {review.loved && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>Loved: {review.loved}</div>}
                    {review.didnt_love && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>Didn't love: {review.didnt_love}</div>}
                    {review.content && <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{review.content}</p>}
                  </div>
                )) : (
                  <div style={{ textAlign: "center", padding: "30px 0", color: C.textDim }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
                    <div style={{ fontSize: 13 }}>No reviews yet. Be the first.</div>
                  </div>
                )}
              </div>

              {game.alsoLiked.length > 0 && (
                <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 22 }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 16, marginBottom: 4 }}>🎲 Players Who Like {game.name} Also Love...</div>
                  <div style={{ color: C.textDim, fontSize: 12, marginBottom: 16 }}>Based on follows, reviews & completions</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                    {game.alsoLiked.map(g2 => (
                      <div key={g2.id} onClick={() => { setCurrentGame(g2.id); setActiveTab("pulse"); }}
                        style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 12, padding: 14, cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 22 }}>{g2.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{g2.name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <div style={{ height: 4, width: 50, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: g2.overlap + "%", background: game.color, borderRadius: 2 }} />
                              </div>
                              <span style={{ color: game.color, fontSize: 11, fontWeight: 700 }}>{g2.overlap}%</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ color: C.textDim, fontSize: 12, fontStyle: "italic" }}>{g2.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar — Top Voices */}
            <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, alignSelf: "start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontWeight: 800, color: C.text, fontSize: 15 }}>🏆 Top Voices</div>
                <span style={{ color: C.textDim, fontSize: 12 }}>By likes earned</span>
              </div>
              {topVoices.length > 0 ? topVoices.map((voice, i) => (
                <div key={voice.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < topVoices.length - 1 ? "1px solid " + C.border : "none" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: i === 0 ? C.goldDim : C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: i === 0 ? C.gold : C.textDim, fontSize: 11 }}>#{i + 1}</div>
                  <Avatar initials={voice.avatar_initials || "GL"} size={56} founding={voice.is_founding} ring={voice.active_ring} avatarConfig={voice.avatar_config} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{voice.username || "Gamer"}</div>
                    <div style={{ color: C.textDim, fontSize: 11 }}>{voice.totalLikes} likes · {voice.postCount} posts</div>
                  </div>
                </div>
              )) : (
                // Fallback to hardcoded for games that have it
                game.topVoices.length > 0 ? game.topVoices.map((voice, i) => (
                  <div key={voice.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < game.topVoices.length - 1 ? "1px solid " + C.border : "none" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: i === 0 ? C.goldDim : C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: i === 0 ? C.gold : C.textDim, fontSize: 11 }}>#{i + 1}</div>
                    <Avatar initials={voice.avatar} size={34} color={i === 0 ? C.gold : C.accent} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{voice.name} {voice.badge}</div>
                      <div style={{ color: C.textDim, fontSize: 11 }}>{(voice.score / 1000).toFixed(1)}k pts</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: "center", padding: "30px 0", color: C.textDim }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                    <div style={{ fontSize: 13 }}>Post about {game.name} to appear here.</div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {activeTab === "tips" && (
          <div style={{ maxWidth: 680 }}>
            {gameTips.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💡</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>No community tips yet.</div>
                <div style={{ fontSize: 13, color: C.textDim }}>When players mark a post as Helpful, it shows up here.</div>
              </div>
            ) : gameTips.map(post => {
              const author = post.npc_id ? post.npcs : post.profiles;
              const isNPC = !!post.npc_id;
              return (
                <FeedPostCard key={post.id} post={{
                  id: post.id,
                  npc_id: post.npc_id,
                  game_tag: post.game_tag,
                  user_id: post.user_id,
                  tip_count: post.tip_count || 0,
                  tagged_users: post.tagged_users || [],
                  user: {
                    name: isNPC ? (author?.name || "NPC") : (author?.username || "Gamer"),
                    handle: author?.handle || "",
                    avatar: author?.avatar_initials || "GL",
                    status: "online",
                    isNPC,
                    isFounding: !isNPC && (author?.is_founding || false),
                    activeRing: !isNPC ? (author?.active_ring || "none") : "none",
                    avatarConfig: !isNPC ? (author?.avatar_config || null) : null,
                  },
                  content: post.content,
                  time: timeAgo(post.created_at),
                  likes: post.likes || 0,
                  liked: post.liked || false,
                  tipped: post.tipped || false,
                  tip_count: post.tip_count || 0,
                  comment_count: post.comment_count || 0,
                  commentList: [],
                }} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={currentUser} isGuest={isGuest} onSignIn={onSignIn} />
              );
            })}
          </div>
        )}

        {activeTab === "posts" && (
          <div style={{ maxWidth: 680 }}>
            {gamePosts.length > 0 ? gamePosts.map(post => {
              const author = post.profiles || {};
              const isNPC = !!post.npc_id;
              return (
                <FeedPostCard key={post.id} post={{
                  id: post.id,
                  npc_id: post.npc_id,
                  game_tag: post.game_tag,
                  user_id: post.user_id,
                  tagged_users: post.tagged_users || [],
                  user: {
                    name: author.username || "Gamer",
                    handle: author.handle || "@gamer",
                    avatar: author.avatar_initials || "GL",
                    status: "online",
                    isNPC,
                    isFounding: author.is_founding || false,
                    activeRing: !isNPC ? (author.active_ring || "none") : "none",
                    avatarConfig: !isNPC ? (author.avatar_config || null) : null,
                  },
                  content: post.content,
                  time: timeAgo(post.created_at),
                  likes: post.likes || 0,
                  liked: post.liked || false,
                  comment_count: post.comment_count || 0,
                  commentList: [],
                }} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={currentUser} isGuest={isGuest} onSignIn={onSignIn} />
              );
            }) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎮</div>
                <div style={{ fontSize: 14 }}>No posts yet. Be the first to post about {game.name}.</div>
              </div>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div>
            {currentUser && !isGuest && !showReviewForm && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button onClick={() => setShowReviewForm(true)} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Write Review</button>
              </div>
            )}
            {currentUser && !isGuest && showReviewForm && (
                  <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20 }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 16 }}>Your Review</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))}
                          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid " + (reviewForm.rating >= n ? C.gold : C.border), background: reviewForm.rating >= n ? C.goldDim : C.surfaceRaised, color: reviewForm.rating >= n ? C.gold : C.textDim, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <input value={reviewForm.headline} onChange={e => setReviewForm(f => ({ ...f, headline: e.target.value }))} placeholder="Headline (optional)" style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
                    <textarea value={reviewForm.content} onChange={e => setReviewForm(f => ({ ...f, content: e.target.value }))} placeholder="What did you think?" rows={3} style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", resize: "none", marginBottom: 12, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={submitReview} disabled={!reviewForm.rating || submittingReview}
                        style={{ background: reviewForm.rating ? game.color : C.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 20px", color: reviewForm.rating ? "#000" : C.textDim, fontSize: 13, fontWeight: 700, cursor: reviewForm.rating ? "pointer" : "default" }}>
                        {submittingReview ? "Submitting..." : "Submit"}
                      </button>
                      <button onClick={() => setShowReviewForm(false)} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
            )}
            <div>
              {latestReviews.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>&#11088;</div>
                  <div style={{ fontSize: 14 }}>No reviews yet. Be the first.</div>
                </div>
              ) : latestReviews.map((review, idx) => (
                <div key={idx} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Avatar initials={review.profiles?.avatar_initials || "GL"} size={32} founding={review.profiles?.is_founding} ring={review.profiles?.active_ring} avatarConfig={review.profiles?.avatar_config} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{review.profiles?.username || "Gamer"}</div>
                      <div style={{ color: C.textDim, fontSize: 11 }}>{timeAgo(review.created_at)}</div>
                    </div>
                    {currentUser && review.user_id === currentUser.id && (
                      <button onClick={() => setShowReviewForm(true)} style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "4px 10px", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Edit</button>
                    )}
                    <div style={{ background: C.goldDim, border: "1px solid " + C.gold + "44", borderRadius: 8, padding: "4px 10px", color: C.gold, fontWeight: 800, fontSize: 14 }}>{review.rating + "/10"}</div>
                  </div>
                  {review.headline ? <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 6 }}>{review.headline}</div> : null}
                  {review.loved ? <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>{"Loved: " + review.loved}</div> : null}
                  {review.didnt_love ? <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>{"Didn't love: " + review.didnt_love}</div> : null}
                  {review.content ? <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{review.content}</p> : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "developer" && (
          <div>
            {game.claimed ? (
              <div style={{ background: C.surface, border: "1px solid " + C.teal + "33", borderRadius: 14, padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: C.teal + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏢</div>
                  <div>
                    <div style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>{game.developer}</div>
                    <Badge color={C.teal}>✓ Verified Developer</Badge>
                  </div>
                </div>
                <div style={{ background: C.surfaceRaised, borderRadius: 12, padding: 20 }}>
                  <div style={{ fontWeight: 700, color: C.teal, fontSize: 14, marginBottom: 8 }}>📢 Official Announcement</div>
                  <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, margin: 0 }}>Patch 1.12 is now live. Balance changes to Colosseum fights, new shard farm locations, and several boss hitbox fixes.</p>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 40px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
                <div style={{ fontWeight: 800, color: C.text, fontSize: 20, marginBottom: 8 }}>Are you the developer?</div>
                <p style={{ color: C.textMuted, fontSize: 14, maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.7 }}>Claim this page to access community insights and post official announcements — without controlling the conversation.</p>
                <button style={{ background: C.teal, border: "none", borderRadius: 10, padding: "12px 32px", color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Claim This Page</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GamePage;
