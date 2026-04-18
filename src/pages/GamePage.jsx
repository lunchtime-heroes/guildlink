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
  const [gameQA, setGameQA] = useState([]);
  const [qaShelfStatus, setQaShelfStatus] = useState({}); // userId -> status
  const [showAskForm, setShowAskForm] = useState(false);
  const [askText, setAskText] = useState("");
  const [submittingAsk, setSubmittingAsk] = useState(false);
  const [answeringId, setAnsweringId] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [topVoices, setTopVoices] = useState([]);
  const [latestReviews, setLatestReviews] = useState([]);
  const [chartsData, setChartsData] = useState(null);
  const [shelfCounts, setShelfCounts] = useState({ want_to_play: 0, playing: 0, have_played: 0 });
  const [shelfPlayers, setShelfPlayers] = useState({ want_to_play: [], playing: [], have_played: [] });
  const [shelfDrawer, setShelfDrawer] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, headline: "", time_played: "", completed: false, loved: "", didnt_love: "", content: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [myReview, setMyReview] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!gameId || !gameId.includes('-')) return;
      let query = supabase.from("games").select("*").eq("id", gameId);
      const { data } = await query.single();
      if (!data) return;
      setDbGame(data);
      const dbId = data.id;

      // Posts (non-question)
      const { data: posts } = await supabase
        .from("posts")
        .select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring, avatar_config), npcs(name, handle, avatar_initials)")
        .eq("game_tag", dbId)
        .or("post_type.eq.post,post_type.is.null")
        .order("created_at", { ascending: false })
        .limit(20);
      if (posts) setGamePosts(posts);

      // Q&A — questions for this game
      const { data: questions } = await supabase
        .from("posts")
        .select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring, avatar_config), comments(id, content, created_at, user_id, profiles(username, avatar_initials, is_founding, active_ring, avatar_config))")
        .eq("game_tag", dbId)
        .eq("post_type", "question")
        .order("created_at", { ascending: false })
        .limit(30);
      if (questions) {
        setGameQA(questions);
        // Collect all commenter user IDs to check shelf status
        const commenterIds = [...new Set(questions.flatMap(q => (q.comments || []).map(c => c.user_id).filter(Boolean)))];
        if (commenterIds.length > 0) {
          const { data: shelfData } = await supabase.from("user_games")
            .select("user_id, status").eq("game_id", dbId).in("user_id", commenterIds);
          const statusMap = {};
          (shelfData || []).forEach(s => { statusMap[s.user_id] = s.status; });
          setQaShelfStatus(statusMap);
        }
      }

      // Top Voices — ranked by chart contribution score
      const [voicePostsRes, voiceEventsRes] = await Promise.allSettled([
        supabase.from("posts")
          .select("user_id, likes, comment_count, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
          .eq("game_tag", dbId)
          .not("user_id", "is", null),
        supabase.from("chart_events")
          .select("user_id, event_type")
          .eq("game_id", dbId)
          .not("user_id", "is", null),
      ]);
      const voicePosts = voicePostsRes.status === "fulfilled" ? (voicePostsRes.value.data || []) : [];
      const voiceEvents = voiceEventsRes.status === "fulfilled" ? (voiceEventsRes.value.data || []) : [];
      const EVENT_WEIGHTS = { post: 3, comment: 2, review: 4, shelf_playing: 2, shelf_played: 2, shelf_want: 2 };
      const byUser = {};
      voicePosts.forEach(p => {
        if (!p.user_id || !p.profiles) return;
        if (!byUser[p.user_id]) byUser[p.user_id] = { ...p.profiles, user_id: p.user_id, score: 0, postCount: 0 };
        byUser[p.user_id].score += (p.likes || 0) + (p.comment_count || 0);
        byUser[p.user_id].postCount += 1;
      });
      voiceEvents.forEach(e => {
        if (!e.user_id || !byUser[e.user_id]) return;
        byUser[e.user_id].score += (EVENT_WEIGHTS[e.event_type] || 1);
      });
      setTopVoices(Object.values(byUser).sort((a, b) => b.score - a.score).slice(0, 5));

      // Latest reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
        .eq("game_id", dbId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (reviews) setLatestReviews(reviews);

      // Shelf counts
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

      // Current user review
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

      // Charts data
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: weeklyPosts } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("game_tag", dbId).gte("created_at", oneWeekAgo);
      const { count: weeklyReviews } = await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("game_id", dbId).gte("created_at", oneWeekAgo);
      const { data: avgData } = await supabase.from("reviews").select("rating").eq("game_id", dbId);
      const avgRating = avgData && avgData.length > 0 ? (avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length).toFixed(1) : null;
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
      const { data: reviews } = await supabase.from("reviews")
        .select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
        .eq("game_id", dbGame.id).order("created_at", { ascending: false }).limit(20);
      if (reviews) setLatestReviews(reviews);
      const { data: avgData } = await supabase.from("reviews").select("rating").eq("game_id", dbGame.id);
      const avgRating = avgData && avgData.length > 0 ? (avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length).toFixed(1) : null;
      setChartsData(prev => ({ ...prev, avgRating, totalReviews: avgData?.length || 0 }));
      setMyReview({ ...reviewForm, game_id: dbGame.id, user_id: authUser.id });
      setShowReviewForm(false);
    }
    setSubmittingReview(false);
  };

  const submitQuestion = async () => {
    if (!askText.trim() || submittingAsk || !dbGame) return;
    setSubmittingAsk(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setSubmittingAsk(false); return; }
    const { data, error } = await supabase.from("posts").insert({
      user_id: authUser.id,
      content: askText.trim(),
      game_tag: dbGame.id,
      post_type: "question",
      likes: 0,
      comment_count: 0,
    }).select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring, avatar_config)").single();
    if (!error && data) {
      setGameQA(prev => [{ ...data, comments: [] }, ...prev]);
      logChartEvent(dbGame.id, 'post', authUser.id);
      setAskText("");
      setShowAskForm(false);
    }
    setSubmittingAsk(false);
  };

  const submitAnswer = async (questionId) => {
    if (!answerText.trim() || submittingAnswer || !dbGame) return;
    setSubmittingAnswer(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setSubmittingAnswer(false); return; }
    const { data, error } = await supabase.from("comments").insert({
      post_id: questionId,
      user_id: authUser.id,
      content: answerText.trim(),
    }).select("*, profiles(username, avatar_initials, is_founding, active_ring, avatar_config)").single();
    if (!error && data) {
      setGameQA(prev => prev.map(q => q.id === questionId
        ? { ...q, comments: [...(q.comments || []), data] }
        : q
      ));
      logChartEvent(dbGame.id, 'comment', authUser.id);
      // Update shelf status for new commenter
      const { data: shelfData } = await supabase.from("user_games")
        .select("status").eq("game_id", dbGame.id).eq("user_id", authUser.id).maybeSingle();
      if (shelfData) setQaShelfStatus(prev => ({ ...prev, [authUser.id]: shelfData.status }));
      setAnswerText("");
      setAnsweringId(null);
    }
    setSubmittingAnswer(false);
  };

  const game = dbGame ? {
    trendingTopics: [],
    topVoices: [],
    alsoLiked: [],
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

  const tabs = [
    { id: "pulse", label: "Pulse" },
    { id: "reviews", label: "Reviews" },
    { id: "qa", label: "Q&A" },
    { id: "posts", label: "Posts" },
  ];

  return (
    <div style={{ paddingTop: isMobile ? 52 : 60 }}>
      <div style={{ background: game.gradient, borderBottom: "1px solid " + game.color + "33" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "24px 16px 20px" : "36px 24px 28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 14 : 20, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            {game.cover_url
              ? <img src={game.cover_url} alt={game.name} style={{ width: isMobile ? 56 : 100, height: isMobile ? 75 : 133, borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }} />
              : <div style={{ width: isMobile ? 56 : 100, height: isMobile ? 75 : 133, borderRadius: 10, background: game.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 28 : 48, flexShrink: 0 }}>{game.icon}</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: isMobile ? 22 : 32, color: "#fff", marginBottom: 6, letterSpacing: "-0.5px", lineHeight: 1.15 }}>{game.name}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {(game.genre || []).map(g => <span key={g} style={{ background: game.color + "22", border: "1px solid " + game.color + "44", color: game.color, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>{g}</span>)}
                {game.year && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{game.year}</span>}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowShelfMenu(s => !s)}
                    style={{ background: shelfStatus ? game.color + "22" : game.color, border: "1px solid " + game.color + (shelfStatus ? "44" : ""), borderRadius: 8, padding: "8px 16px", color: shelfStatus ? game.color : "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {shelfStatus === "playing" ? "✓ Playing" : shelfStatus === "have_played" ? "✓ Played" : shelfStatus === "want_to_play" ? "✓ Want to Play" : "+ Add to Shelf"}
                  </button>
                  {showShelfMenu && (
                    <>
                      <div onClick={() => setShowShelfMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden", zIndex: 50, minWidth: 160, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                        {[{ id: "playing", label: "Playing Now" }, { id: "want_to_play", label: "Want to Play" }, { id: "have_played", label: "Have Played" }].map(opt => (
                          <button key={opt.id} onClick={() => setShelf(opt.id)}
                            style={{ display: "block", width: "100%", background: shelfStatus === opt.id ? game.color + "22" : "none", border: "none", padding: "10px 16px", color: shelfStatus === opt.id ? game.color : C.text, fontSize: 13, cursor: "pointer", textAlign: "left", fontWeight: shelfStatus === opt.id ? 700 : 400 }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button onClick={isGuest ? () => onSignIn?.("Sign in to follow games.") : toggleFollow} disabled={followLoading}
                  style={{ background: followed ? "rgba(255,255,255,0.1)" : "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 16px", color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {followLoading ? "..." : followed ? "✓ Following" : "Follow"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
              {[
                { label: "Playing", count: shelfCounts.playing, id: "playing" },
                { label: "Played", count: shelfCounts.have_played, id: "have_played" },
                { label: "Want", count: shelfCounts.want_to_play, id: "want_to_play" },
              ].map(s => (
                <div key={s.id} onClick={() => setShelfDrawer(shelfDrawer === s.id ? null : s.id)} style={{ textAlign: "center", cursor: "pointer" }}>
                  <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 22, color: "#fff" }}>{s.count}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          {shelfDrawer && shelfPlayers[shelfDrawer]?.length > 0 && (
            <div style={{ marginTop: 16, background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {shelfDrawer === "playing" ? "Currently Playing" : shelfDrawer === "have_played" ? "Have Played" : "Want to Play"}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {shelfPlayers[shelfDrawer].slice(0, 12).map(p => (
                  <div key={p.id} onClick={() => { setCurrentPlayer(p.id); setActivePage("player"); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
                    <Avatar initials={(p.avatar_initials || p.username || "?").slice(0,2).toUpperCase()} size={20} founding={p.is_founding} ring={p.active_ring} />
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>{p.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid " + C.border, background: C.bg + "f0", backdropFilter: "blur(10px)", position: "sticky", top: isMobile ? 52 : 60, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 " + (isMobile ? "16px" : "24px"), display: "flex", gap: 0 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: "14px 20px", background: "none", border: "none", borderBottom: "2px solid " + (activeTab === tab.id ? game.color : "transparent"), color: activeTab === tab.id ? game.color : C.textMuted, fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 16px 80px" : "28px 24px 40px" }}>

        {activeTab === "pulse" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 24 }}>
            <div>
              {game.description && (
                <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 8 }}>About</div>
                  <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>{game.description}</p>
                </div>
              )}
              {chartsData && (chartsData.weeklyPosts > 0 || chartsData.weeklyReviews > 0) && (
                <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 14 }}>This Week</div>
                  <div style={{ display: "flex", gap: 24 }}>
                    {chartsData.weeklyPosts > 0 && <div><div style={{ fontWeight: 800, color: game.color, fontSize: 22 }}>{chartsData.weeklyPosts}</div><div style={{ color: C.textDim, fontSize: 11 }}>posts</div></div>}
                    {chartsData.weeklyReviews > 0 && <div><div style={{ fontWeight: 800, color: C.gold, fontSize: 22 }}>{chartsData.weeklyReviews}</div><div style={{ color: C.textDim, fontSize: 11 }}>reviews</div></div>}
                    {chartsData.avgRating && <div><div style={{ fontWeight: 800, color: C.gold, fontSize: 22 }}>{chartsData.avgRating}</div><div style={{ color: C.textDim, fontSize: 11 }}>avg rating</div></div>}
                  </div>
                </div>
              )}
            </div>
            <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, alignSelf: "start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontWeight: 800, color: C.text, fontSize: 15 }}>🏆 Top Voices</div>
                <span style={{ color: C.textDim, fontSize: 12 }}>By conversation score</span>
              </div>
              {topVoices.length > 0 ? topVoices.map((voice, i) => (
                <div key={voice.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < topVoices.length - 1 ? "1px solid " + C.border : "none" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: i === 0 ? C.goldDim : C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: i === 0 ? C.gold : C.textDim, fontSize: 11 }}>#{i + 1}</div>
                  <Avatar initials={voice.avatar_initials || "GL"} size={32} founding={voice.is_founding} ring={voice.active_ring} avatarConfig={voice.avatar_config} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{voice.username || "Gamer"}</div>
                    <div style={{ color: C.textDim, fontSize: 11 }}>{voice.score} pts · {voice.postCount} posts</div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: "center", padding: "30px 0", color: C.textDim }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                  <div style={{ fontSize: 13 }}>Post about {game.name} to appear here.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "qa" && (
          <div style={{ maxWidth: 680 }}>
            {/* Ask a question */}
            {currentUser && !isGuest && (
              <div style={{ marginBottom: 20 }}>
                {!showAskForm ? (
                  <button onClick={() => setShowAskForm(true)}
                    style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 12, padding: "14px 20px", color: C.accentSoft, fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", textAlign: "left" }}>
                    Ask a question about {game.name}…
                  </button>
                ) : (
                  <div style={{ background: C.surface, border: "1px solid " + C.accentDim, borderRadius: 12, padding: 16 }}>
                    <textarea
                      value={askText}
                      onChange={e => setAskText(e.target.value)}
                      placeholder={"What do you want to know about " + game.name + "?"}
                      autoFocus
                      style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, resize: "none", outline: "none", minHeight: 80, boxSizing: "border-box", marginBottom: 10 }}
                    />
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => { setShowAskForm(false); setAskText(""); }} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "7px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                      <button onClick={submitQuestion} disabled={!askText.trim() || submittingAsk}
                        style={{ background: askText.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 20px", color: askText.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: askText.trim() ? "pointer" : "default" }}>
                        {submittingAsk ? "Posting…" : "Ask"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {gameQA.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>❓</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>No questions yet.</div>
                <div style={{ fontSize: 13 }}>Be the first to ask something about {game.name}.</div>
              </div>
            ) : gameQA.map(q => {
              const author = q.profiles;
              const answerCount = (q.comments || []).length;
              return (
                <div key={q.id} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 18, marginBottom: 12 }}>
                  {/* Question header */}
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                    <Avatar initials={(author?.avatar_initials || "?").slice(0,2).toUpperCase()} size={32} founding={author?.is_founding} ring={author?.active_ring} avatarConfig={author?.avatar_config} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{author?.username || "Gamer"}</span>
                        <span style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 6, padding: "1px 7px", color: C.accentSoft, fontSize: 10, fontWeight: 700 }}>Q&A</span>
                        <span style={{ color: C.textDim, fontSize: 11 }}>{timeAgo(q.created_at)}</span>
                      </div>
                      <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{q.content}</p>
                    </div>
                  </div>

                  {/* Answers */}
                  {(q.comments || []).length > 0 && (
                    <div style={{ borderTop: "1px solid " + C.border, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      {q.comments.map(comment => {
                        const shelf = qaShelfStatus[comment.user_id];
                        const hasPlayed = shelf === "have_played" || shelf === "playing";
                        return (
                          <div key={comment.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <Avatar initials={(comment.profiles?.avatar_initials || "?").slice(0,2).toUpperCase()} size={28} founding={comment.profiles?.is_founding} ring={comment.profiles?.active_ring} avatarConfig={comment.profiles?.avatar_config} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                <span style={{ fontWeight: 700, color: C.text, fontSize: 12 }}>{comment.profiles?.username || "Gamer"}</span>
                                {hasPlayed && (
                                  <span style={{ background: "#22c55e18", border: "1px solid #22c55e44", borderRadius: 5, padding: "1px 6px", color: "#22c55e", fontSize: 10, fontWeight: 700 }}>
                                    {shelf === "playing" ? "Playing" : "Has Played"}
                                  </span>
                                )}
                                <span style={{ color: C.textDim, fontSize: 10 }}>{timeAgo(comment.created_at)}</span>
                              </div>
                              <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{comment.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Answer count / CTA */}
                  <div style={{ marginTop: 12, borderTop: "1px solid " + C.border, paddingTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: answeringId === q.id ? 10 : 0 }}>
                      <span style={{ color: C.textDim, fontSize: 12 }}>{answerCount} {answerCount === 1 ? "answer" : "answers"}</span>
                      {currentUser && !isGuest && answeringId !== q.id && (
                        <button onClick={() => { setAnsweringId(q.id); setAnswerText(""); }}
                          style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "5px 14px", color: C.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Answer →
                        </button>
                      )}
                      {!currentUser && (
                        <button onClick={() => onSignIn?.("Sign in to answer questions.")}
                          style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "5px 14px", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Sign in to answer →
                        </button>
                      )}
                    </div>
                    {answeringId === q.id && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <textarea
                          value={answerText}
                          onChange={e => setAnswerText(e.target.value)}
                          placeholder="Write your answer…"
                          autoFocus
                          style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13, resize: "none", outline: "none", minHeight: 72, boxSizing: "border-box" }}
                        />
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button onClick={() => { setAnsweringId(null); setAnswerText(""); }}
                            style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "6px 14px", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                          <button onClick={() => submitAnswer(q.id)} disabled={!answerText.trim() || submittingAnswer}
                            style={{ background: answerText.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "6px 18px", color: answerText.trim() ? "#fff" : C.textDim, fontSize: 12, fontWeight: 700, cursor: answerText.trim() ? "pointer" : "default" }}>
                            {submittingAnswer ? "Posting…" : "Post Answer"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
              <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 16 }}>
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
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
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
                  {review.headline && <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 6 }}>{review.headline}</div>}
                  {review.loved && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>{"Loved: " + review.loved}</div>}
                  {review.didnt_love && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>{"Didn't love: " + review.didnt_love}</div>}
                  {review.content && <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{review.content}</p>}
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
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 40px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
                <div style={{ fontWeight: 800, color: C.text, fontSize: 20, marginBottom: 8 }}>Are you the developer?</div>
                <p style={{ color: C.textMuted, fontSize: 14, maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.7 }}>Claim this page to access community insights and post official announcements.</p>
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
