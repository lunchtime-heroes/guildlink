import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { logChartEvent } from "../utils.js";

const GAMES = {};

function GamesPage({ setActivePage, setCurrentGame, isMobile, currentUser, onSignIn }) {
  // ── Games data ──
  const [dbGames, setDbGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [userShelf, setUserShelf] = useState(new Set());

  // ── Discovery state ──
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [activeRing, setActiveRing] = useState(1);
  const [activeInsight, setActiveInsight] = useState(null);
  const [followIds, setFollowIds] = useState([]);
  const [guildMemberIds, setGuildMemberIds] = useState([]);
  const [nameSearch, setNameSearch] = useState("");
  const [typeaheadResults, setTypeaheadResults] = useState([]);
  const [shelfMenuOpen, setShelfMenuOpen] = useState(null);
  const [discoveryResults, setDiscoveryResults] = useState(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryLabel, setDiscoveryLabel] = useState("");

  // ── Charts data ──
  const [chartsLoading, setChartsLoading] = useState(true);
  const [overall, setOverall] = useState([]);
  const [emerging, setEmerging] = useState([]);
  const [byGenre, setByGenre] = useState({});
  const [byGenreFull, setByGenreFull] = useState({});
  const [expandedGenreAll, setExpandedGenreAll] = useState(new Set());
  const [expandedOverall, setExpandedOverall] = useState(null);
  const [expandedGenre, setExpandedGenre] = useState({});
  const [prevRanks, setPrevRanks] = useState({});
  const [genreLeaders, setGenreLeaders] = useState({});
  const [genreContext, setGenreContext] = useState({});
  const [sparklines, setSparklines] = useState({});
  const [loadingSparkline, setLoadingSparkline] = useState({});

  const COLORS = ['#0ea5e9','#f59e0b','#10b981','#ef4444','#3b82f6','#0d9488','#f97316','#38bdf8'];

  const gameVisuals = (g) => {
    const hard = Object.values(GAMES).find(h => h.name.toLowerCase() === g.name?.toLowerCase());
    if (hard) return { color: hard.color };
    const colorIndex = (g.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length;
    return { color: COLORS[colorIndex] };
  };

  const getWeekStart = () => {
    const now = new Date();
    const pacificOffset = -new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "shortOffset" })
      .match(/GMT([+-]\d+)/)?.[1] * 60 || -480;
    const pacificNow = new Date(now.getTime() + (pacificOffset + now.getTimezoneOffset()) * 60000);
    const dayOfWeek = pacificNow.getDay();
    const sunday = new Date(pacificNow);
    sunday.setDate(pacificNow.getDate() - dayOfWeek);
    const y = sunday.getFullYear();
    const m = String(sunday.getMonth() + 1).padStart(2, "0");
    const d = String(sunday.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  };

  const getWeekStarts = (count) => {
    const starts = [];
    const base = getWeekStart();
    const [y, m, d] = base.split("-").map(Number);
    for (let i = 0; i < count; i++) {
      const dt = new Date(y, m - 1, d - i * 7);
      starts.push(dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"));
    }
    return starts;
  };

  const scoreEvents = (events, recencyWeights) => {
    const WEIGHTS = { review: 3, shelf_playing: 1.5, shelf_want: 1.0, shelf_played: 0.75, comment: 0.75 };
    const scoreMap = {}, countMap = {}, userMap = {};
    events.forEach(e => {
      if (!e.games) return;
      const id = e.game_id;
      if (!scoreMap[id]) { scoreMap[id] = 0; countMap[id] = { game: e.games, post: 0, review: 0, shelf_playing: 0, shelf_want: 0, shelf_played: 0, comment: 0 }; userMap[id] = new Set(); }
      userMap[id].add(e.user_id);
      const rw = recencyWeights ? (recencyWeights[e.week_start] || 0.1) : 1.0;
      if (e.event_type === "post") { const seq = e.post_sequence || 1; scoreMap[id] += (seq === 1 ? 1.0 : seq === 2 ? 0.5 : seq === 3 ? 0.25 : 0.1) * rw; countMap[id].post++; }
      else { scoreMap[id] += (WEIGHTS[e.event_type] || 0) * rw; if (countMap[id][e.event_type] !== undefined) countMap[id][e.event_type]++; }
    });
    return Object.entries(scoreMap).map(([id, rawScore]) => {
      const uniqueUsers = userMap[id].size;
      const finalScore = rawScore * (1 + Math.log(Math.max(uniqueUsers, 1)) * 0.2);
      const g = countMap[id].game;
      return { id, finalScore, uniqueUsers, ...countMap[id], name: g?.name, genre: g?.genre, cover_url: g?.cover_url };
    }).sort((a, b) => b.finalScore - a.finalScore);
  };

  // Load games + shelf
  useEffect(() => {
    supabase.from("games").select("*").order("followers", { ascending: false }).then(({ data }) => {
      if (data) setDbGames(data);
      setGamesLoading(false);
    });
    if (currentUser?.id) {
      supabase.from("user_games").select("game_id").eq("user_id", currentUser.id).then(({ data }) => {
        if (data) setUserShelf(new Set(data.map(r => r.game_id)));
      });
    }
  }, [currentUser?.id]);

  // Load social graph (follows + guild members)
  useEffect(() => {
    if (!currentUser?.id) return;
    const loadSocialGraph = async () => {
      const [followsRes, guildsRes] = await Promise.all([
        supabase.from("follows").select("followed_user_id").eq("follower_id", currentUser.id),
        supabase.from("guild_members").select("guild_id").eq("user_id", currentUser.id).eq("status", "active"),
      ]);
      const fIds = (followsRes.data || []).map(f => f.followed_user_id).filter(Boolean);
      setFollowIds(fIds);
      if (guildsRes.data && guildsRes.data.length > 0) {
        const guildIds = guildsRes.data.map(g => g.guild_id);
        const { data: members } = await supabase.from("guild_members")
          .select("user_id").in("guild_id", guildIds).eq("status", "active")
          .neq("user_id", currentUser.id);
        // Dedupe across all guilds
        const uniqueIds = [...new Set((members || []).map(m => m.user_id))];
        setGuildMemberIds(uniqueIds);
      }
    };
    loadSocialGraph();
  }, [currentUser?.id]);

  // Build fixed 9-slot sparkline data
  const buildSparkline = (gameId, events, allWeekStarts, globalMax, referencePoints) => {
    const WEIGHTS = { review: 3, shelf_playing: 1.5, shelf_want: 1.0, shelf_played: 0.75, comment: 0.75 };
    const weekScores = {};
    allWeekStarts.forEach(w => { weekScores[w] = { score: 0, users: new Set() }; });
    events.filter(e => e.game_id === gameId).forEach(e => {
      if (!weekScores[e.week_start]) return;
      weekScores[e.week_start].users.add(e.user_id);
      if (e.event_type === "post") { const seq = e.post_sequence || 1; weekScores[e.week_start].score += seq === 1 ? 1.0 : seq === 2 ? 0.5 : seq === 3 ? 0.25 : 0.1; }
      else { weekScores[e.week_start].score += WEIGHTS[e.event_type] || 0; }
    });
    const ordered = allWeekStarts.slice().reverse();
    const points = [...ordered.map(w => { const { score, users } = weekScores[w]; return score * (1 + Math.log(Math.max(users.size, 1)) * 0.2); }), 0];
    const labels = [...ordered.map(w => { const d = new Date(w + "T12:00:00"); return (d.getMonth() + 1) + "/" + d.getDate(); }), ""];
    return { points, labels, globalMax, referencePoints };
  };

  const computePoints = (gameId, events, allWeekStarts) => {
    const WEIGHTS = { review: 3, shelf_playing: 1.5, shelf_want: 1.0, shelf_played: 0.75, comment: 0.75 };
    const weekScores = {};
    allWeekStarts.forEach(w => { weekScores[w] = { score: 0, users: new Set() }; });
    events.filter(e => e.game_id === gameId).forEach(e => {
      if (!weekScores[e.week_start]) return;
      weekScores[e.week_start].users.add(e.user_id);
      if (e.event_type === "post") { const seq = e.post_sequence || 1; weekScores[e.week_start].score += seq === 1 ? 1.0 : seq === 2 ? 0.5 : seq === 3 ? 0.25 : 0.1; }
      else { weekScores[e.week_start].score += WEIGHTS[e.event_type] || 0; }
    });
    const ordered = allWeekStarts.slice().reverse();
    return [...ordered.map(w => { const { score, users } = weekScores[w]; return score * (1 + Math.log(Math.max(users.size, 1)) * 0.2); }), 0];
  };

  // Load charts
  useEffect(() => {
    const load = async () => {
      setChartsLoading(true);
      setSparklines({});
      const getPacificDate = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d); };
      const { data: latestDateRow } = await supabase.from("daily_chart_scores").select("date").order("date", { ascending: false }).limit(1).single();
      const chartDate = latestDateRow?.date || getPacificDate(0);
      const { data: scores } = await supabase.from("daily_chart_scores").select("game_id, score, games(id, name, genre, cover_url)").eq("date", chartDate).order("score", { ascending: false });
      if (!scores) { setChartsLoading(false); return; }
      const top10 = scores.filter(s => s.games).slice(0, 10).map(s => ({ id: s.game_id, finalScore: s.score, name: s.games.name, genre: s.games.genre, cover_url: s.games.cover_url, uniqueUsers: 1, post: 0, review: 0, shelf_playing: 0, shelf_want: 0, shelf_played: 0, comment: 0 }));
      setOverall(top10);
      const genres = {}, genresFull = {};
      scores.filter(s => s.games).forEach(s => {
        const g = { id: s.game_id, finalScore: s.score, name: s.games.name, genre: s.games.genre, cover_url: s.games.cover_url };
        const pg = Array.isArray(s.games.genre) ? s.games.genre[0] : (s.games.genre || "Other");
        if (!genres[pg]) { genres[pg] = []; genresFull[pg] = []; }
        genresFull[pg].push(g);
        if (genres[pg].length < 5) genres[pg].push(g);
      });
      setByGenre(genres); setByGenreFull(genresFull);
      setExpandedGenreAll(new Set()); setChartsLoading(false);
      const prevDate = new Date(chartDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const d2Str = prevDate.toISOString().slice(0, 10);
      const { data: prevScores } = await supabase.from("daily_chart_scores").select("game_id, score").eq("date", d2Str).order("score", { ascending: false });
      if (prevScores) { const pRanks = {}; prevScores.forEach((s, i) => { pRanks[s.game_id] = i + 1; }); setPrevRanks(pRanks); }
      if (top10.length === 0) return;
      const allRankedIds = [...new Set([...top10.map(g => g.id), ...Object.values(genresFull).flat().map(g => g.id)])];
      const sparkDates = [];
      for (let i = 7; i >= 0; i--) { sparkDates.push(getPacificDate(i)); }
      const { data: sparkScores } = await supabase.from("daily_chart_scores").select("game_id, score, date").in("game_id", allRankedIds).in("date", sparkDates);
      const scoresByGame = {};
      (sparkScores || []).forEach(s => { if (!scoresByGame[s.game_id]) scoresByGame[s.game_id] = {}; scoresByGame[s.game_id][s.date] = s.score; });
      const buildPoints = (gameId) => {
        // Use zero for missing days — no interpolation
        return sparkDates.map(d => scoresByGame[gameId]?.[d] ?? 0);
      };
      const buildLabels = () => sparkDates.map(d => { const dt = new Date(d + "T12:00:00"); return (dt.getMonth() + 1) + "/" + dt.getDate(); });
      const globalMax = Math.max(...top10.map(g => Math.max(...buildPoints(g.id))), 0.1);
      const overallRef = buildPoints(top10[0].id);
      const labels = buildLabels();
      const gLeaders = {}, genreRefPoints = {}, genreMaxes = {};
      Object.entries(genresFull).forEach(([genre, games]) => {
        if (games.length === 0) return;
        gLeaders[genre] = games[0].id;
        genreRefPoints[genre] = buildPoints(games[0].id);
        genreMaxes[genre] = Math.max(...games.map(g => Math.max(...buildPoints(g.id))), 0.1);
      });
      setGenreLeaders(gLeaders);
      const newSparklines = {}, newGenreContext = {};
      allRankedIds.forEach(id => {
        const game = [...top10, ...Object.values(genresFull).flat()].find(g => g.id === id);
        const genre = game ? (Array.isArray(game.genre) ? game.genre[0] : (game.genre || "Other")) : "Other";
        const isOverallLeader = id === top10[0].id;
        const isGenreLeader = gLeaders[genre] === id;
        const points = buildPoints(id);
        newSparklines[id] = { points, labels, globalMax, referencePoints: isOverallLeader ? null : overallRef, genreGlobalMax: genreMaxes[genre] || globalMax, genreRefPoints: isGenreLeader ? null : (genreRefPoints[genre] || null) };
        newGenreContext[id] = { genreGlobalMax: genreMaxes[genre] || globalMax, genreRefPoints: isGenreLeader ? null : (genreRefPoints[genre] || null) };
      });
      setSparklines(newSparklines);
      setGenreContext(newGenreContext);
      const last7Dates = Array.from({ length: 7 }, (_, i) => getPacificDate(i));
      const prev7Dates = Array.from({ length: 7 }, (_, i) => getPacificDate(i + 7));
      const [recentEventsRes, prevEventsRes] = await Promise.all([
        supabase.from("chart_events").select("game_id, user_id").in("date", last7Dates),
        supabase.from("chart_events").select("game_id").in("date", prev7Dates),
      ]);
      const prevGameIds = new Set((prevEventsRes.data || []).map(e => e.game_id));
      const recentByGame = {};
      (recentEventsRes.data || []).forEach(e => { if (!recentByGame[e.game_id]) recentByGame[e.game_id] = new Set(); recentByGame[e.game_id].add(e.user_id); });
      const emergingGameIds = new Set(Object.entries(recentByGame).filter(([gameId, users]) => !prevGameIds.has(gameId) && users.size >= 2).map(([gameId]) => gameId));
      const emergingList = (scores || []).filter(s => s.games && emergingGameIds.has(s.game_id)).slice(0, 10)
        .map(s => ({ id: s.game_id, finalScore: s.score, name: s.games.name, genre: s.games.genre, cover_url: s.games.cover_url, uniqueUsers: 1, post: 0, review: 0, shelf_playing: 0, shelf_want: 0, shelf_played: 0, comment: 0 }));
      setEmerging(emergingList);
      const emergingNewSparklines = {};
      emergingList.forEach(g => {
        if (newSparklines[g.id]) return;
        const points = buildPoints(g.id);
        emergingNewSparklines[g.id] = { points, labels, globalMax, referencePoints: null, genreGlobalMax: globalMax, genreRefPoints: null };
      });
      if (Object.keys(emergingNewSparklines).length > 0) { setSparklines(prev => ({ ...prev, ...emergingNewSparklines })); }
    };
    load();
  }, []);

  const loadSparkline = async (gameId) => {
    if (sparklines[gameId]) return;
    setLoadingSparkline(prev => ({ ...prev, [gameId]: true }));
    const getPacificDate = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d); };
    const sparkDates = [];
    for (let i = 1; i <= 8; i++) { sparkDates.push(getPacificDate(i)); }
    const { data: sparkScores } = await supabase.from("daily_chart_scores").select("game_id, score, date").eq("game_id", gameId).in("date", sparkDates);
    const scoreMap = {};
    (sparkScores || []).forEach(s => { scoreMap[s.date] = s.score; });
    const ordered = sparkDates.slice().reverse();
    const points = [...ordered.map(d => scoreMap[d] || 0), 0];
    const labels = [...ordered.map(d => { const dt = new Date(d + "T12:00:00"); return (dt.getMonth() + 1) + "/" + dt.getDate(); }), ""];
    const existingMax = Object.values(sparklines).map(s => s?.globalMax || 0);
    const globalMax = existingMax.length > 0 ? Math.max(...existingMax) : 0.1;
    const ctx = genreContext[gameId] || {};
    setSparklines(prev => ({ ...prev, [gameId]: { points, labels, globalMax, referencePoints: null, genreGlobalMax: ctx.genreGlobalMax || globalMax, genreRefPoints: ctx.genreRefPoints || null } }));
    setLoadingSparkline(prev => ({ ...prev, [gameId]: false }));
  };

  const handleExpand = (gameId, section) => {
    if (section === "overall") setExpandedOverall(prev => prev === gameId ? null : gameId);
    else setExpandedGenre(prev => ({ ...prev, [section]: prev[section] === gameId ? null : gameId }));
    loadSparkline(gameId);
  };

  // ── Ring-aware insight definitions ──
  const RING_INSIGHTS = {
    1: [
      {
        id: "most_talked_about",
        label: "Most Talked About",
        desc: "Highest combined posts and comments this week",
        run: async () => {
          const weekStarts = getWeekStarts(1);
          const { data } = await supabase.from("chart_events").select("game_id, event_type, games(id, name, genre, cover_url)").in("week_start", weekStarts).in("event_type", ["post", "comment"]);
          const counts = {};
          (data || []).forEach(e => { if (!e.games) return; if (!counts[e.game_id]) counts[e.game_id] = { game: e.games, count: 0 }; counts[e.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " post" + (r.count !== 1 ? "s" : "") + " & comments" }));
        }
      },
      {
        id: "everyone_playing",
        label: "Everyone's Playing",
        desc: "Top games on currently playing shelves",
        run: async () => {
          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").eq("status", "playing");
          const counts = {};
          (data || []).forEach(r => { if (!r.games) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " playing now" }));
        }
      },
      {
        id: "blowing_up",
        label: "Blowing Up",
        desc: "Biggest week-over-week momentum spike",
        run: async () => {
          const [thisWeek, lastWeek] = [getWeekStarts(1)[0], getWeekStarts(2)[1]];
          const [thisData, lastData] = await Promise.all([
            supabase.from("chart_events").select("game_id, event_type, post_sequence, user_id, games(id, name, genre, cover_url)").eq("week_start", thisWeek),
            supabase.from("chart_events").select("game_id, event_type, post_sequence, user_id").eq("week_start", lastWeek),
          ]);
          const WEIGHTS = { review: 3, shelf_playing: 1.5, shelf_want: 1.0, shelf_played: 0.75, comment: 0.75 };
          const score = (events) => { const s = {}; (events || []).forEach(e => { if (!s[e.game_id]) s[e.game_id] = 0; s[e.game_id] += e.event_type === "post" ? (e.post_sequence === 1 ? 1.5 : 0.75) : (WEIGHTS[e.event_type] || 0); }); return s; };
          const thisScores = score(thisData.data);
          const lastScores = score(lastData.data);
          const gameMap = {};
          (thisData.data || []).forEach(e => { if (e.games) gameMap[e.game_id] = e.games; });
          return Object.entries(thisScores).map(([id, s]) => { const prev = lastScores[id] || 0; const pct = prev > 0 ? Math.round(((s - prev) / prev) * 100) : 100; return { id, pct, game: gameMap[id] }; })
            .filter(r => r.game && r.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 12).map(r => ({ ...r.game, _stat: "+" + r.pct + "% this week" }));
        }
      },
      {
        id: "most_wanted",
        label: "Most Wanted",
        desc: "Highest want-to-play across the community",
        run: async () => {
          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").eq("status", "want_to_play");
          const counts = {};
          (data || []).forEach(r => { if (!r.games) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " want to play" }));
        }
      },
      {
        id: "critics_choice",
        label: "Critic's Choice",
        desc: "Highest rated games by community reviews",
        run: async () => {
          const { data } = await supabase.from("reviews").select("game_id, rating, games(id, name, genre, cover_url)");
          const agg = {};
          (data || []).forEach(r => { if (!r.games) return; if (!agg[r.game_id]) agg[r.game_id] = { ...r.games, total: 0, count: 0 }; agg[r.game_id].total += r.rating; agg[r.game_id].count++; });
          return Object.values(agg).filter(g => g.count >= 1).map(g => ({ ...g, avg: g.total / g.count })).sort((a, b) => b.avg - a.avg).slice(0, 12)
            .map(g => ({ ...g, _stat: g.avg.toFixed(1) + " avg · " + g.count + " review" + (g.count !== 1 ? "s" : "") }));
        }
      },
      {
        id: "not_on_shelf",
        label: "Not on Your Shelf Yet",
        desc: "Community favorites you haven't added",
        run: async () => {
          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").in("status", ["playing", "have_played"]);
          const counts = {};
          (data || []).forEach(r => { if (!r.games || userShelf.has(r.game_id)) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " player" + (r.count !== 1 ? "s" : "") }));
        }
      },
    ],
    2: currentUser ? [
      {
        id: "your_people",
        label: "Your People Are Playing",
        desc: "On the currently playing shelf of people you follow",
        run: async (userPool) => {
          if (!userPool || userPool.length === 0) return [];
          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").in("user_id", userPool).eq("status", "playing");
          const counts = {};
          (data || []).forEach(r => { if (!r.games) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " of your connections playing" }));
        }
      },
      {
        id: "something_new",
        label: "Something New",
        desc: "Top picks from your network not on your shelf",
        run: async (userPool) => {
          if (!userPool || userPool.length === 0) return [];
          const [shelfRes, reviewRes] = await Promise.all([
            supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").in("user_id", userPool).eq("status", "want_to_play"),
            supabase.from("reviews").select("game_id, rating, games(id, name, genre, cover_url)").in("user_id", userPool),
          ]);
          const scores = {};
          (shelfRes.data || []).forEach(r => { if (!r.games || userShelf.has(r.game_id)) return; if (!scores[r.game_id]) scores[r.game_id] = { game: r.games, score: 0 }; scores[r.game_id].score += 1.5; });
          (reviewRes.data || []).forEach(r => { if (!r.games || userShelf.has(r.game_id)) return; if (!scores[r.game_id]) scores[r.game_id] = { game: r.games, score: 0 }; scores[r.game_id].score += r.rating / 10 * 2; });
          return Object.values(scores).sort((a, b) => b.score - a.score).slice(0, 12).map(r => ({ ...r.game, _stat: "recommended by your network" }));
        }
      },
      {
        id: "hidden_gems",
        label: "Hidden Gems",
        desc: "Highly reviewed, on less than 10% of shelves",
        run: async (userPool) => {
          const [reviewRes, shelfCountRes] = await Promise.all([
            supabase.from("reviews").select("game_id, rating, user_id, games(id, name, genre, cover_url)"),
            supabase.from("user_games").select("game_id"),
          ]);
          const followSet = new Set(userPool || []);
          const shelfCounts = {};
          (shelfCountRes.data || []).forEach(r => { shelfCounts[r.game_id] = (shelfCounts[r.game_id] || 0) + 1; });
          const totalUsers = await supabase.from("profiles").select("id", { count: "exact", head: true });
          const userCount = Math.max(totalUsers.count || 1, 1);
          const threshold = userCount * 0.1;
          const agg = {};
          (reviewRes.data || []).forEach(r => {
            if (!r.games) return;
            if (!agg[r.game_id]) agg[r.game_id] = { ...r.games, score: 0, count: 0 };
            const multiplier = followSet.has(r.user_id) ? 2 : 1;
            agg[r.game_id].score += r.rating * multiplier;
            agg[r.game_id].count++;
          });
          return Object.values(agg).filter(g => (shelfCounts[g.id] || 0) < threshold && g.count >= 1)
            .map(g => ({ ...g, avg: g.score / g.count })).sort((a, b) => b.avg - a.avg).slice(0, 12)
            .map(g => ({ ...g, _stat: g.avg.toFixed(1) + " avg · " + (shelfCounts[g.id] || 0) + " shelves" }));
        }
      },
      {
        id: "network_critics",
        label: "Network Critic's Choice",
        desc: "Highest rated by people you follow",
        run: async (userPool) => {
          if (!userPool || userPool.length === 0) return [];
          const { data } = await supabase.from("reviews").select("game_id, rating, games(id, name, genre, cover_url)").in("user_id", userPool);
          const agg = {};
          (data || []).forEach(r => { if (!r.games) return; if (!agg[r.game_id]) agg[r.game_id] = { ...r.games, total: 0, count: 0 }; agg[r.game_id].total += r.rating; agg[r.game_id].count++; });
          return Object.values(agg).filter(g => g.count >= 1).map(g => ({ ...g, avg: g.total / g.count })).sort((a, b) => b.avg - a.avg).slice(0, 12)
            .map(g => ({ ...g, _stat: g.avg.toFixed(1) + " avg from your network" }));
        }
      },
    ] : [],
    3: currentUser ? [
      {
        id: "guild_playing",
        label: "Guild Members Are Playing",
        desc: "What your guild mates are actively playing right now",
        run: async (userPool) => {
          if (!userPool || userPool.length === 0) return [];
          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").in("user_id", userPool).eq("status", "playing");
          const counts = {};
          (data || []).forEach(r => { if (!r.games) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " guild member" + (r.count !== 1 ? "s" : "") + " playing" }));
        }
      },
      {
        id: "guild_recommends",
        label: "Your Guild Recommends",
        desc: "Highest rated games by your guild members",
        run: async (userPool) => {
          if (!userPool || userPool.length === 0) return [];
          const { data } = await supabase.from("reviews").select("game_id, rating, games(id, name, genre, cover_url)").in("user_id", userPool);
          const agg = {};
          (data || []).forEach(r => { if (!r.games) return; if (!agg[r.game_id]) agg[r.game_id] = { ...r.games, total: 0, count: 0 }; agg[r.game_id].total += r.rating; agg[r.game_id].count++; });
          return Object.values(agg).filter(g => g.count >= 1).map(g => ({ ...g, avg: g.total / g.count })).sort((a, b) => b.avg - a.avg).slice(0, 12)
            .map(g => ({ ...g, _stat: g.avg.toFixed(1) + " avg from your guild" }));
        }
      },
      {
        id: "guild_hidden_gem",
        label: "Guild's Hidden Gem",
        desc: "Loved by one or two guild members, undiscovered by the rest",
        run: async (userPool) => {
          if (!userPool || userPool.length === 0) return [];
          const [reviewRes, shelfRes] = await Promise.all([
            supabase.from("reviews").select("game_id, rating, user_id, games(id, name, genre, cover_url)").in("user_id", userPool),
            supabase.from("user_games").select("game_id, user_id").in("user_id", userPool),
          ]);
          const guildSize = userPool.length;
          const shelfCounts = {};
          (shelfRes.data || []).forEach(r => { shelfCounts[r.game_id] = (shelfCounts[r.game_id] || 0) + 1; });
          const agg = {};
          (reviewRes.data || []).forEach(r => {
            if (!r.games || userShelf.has(r.game_id)) return;
            if (!agg[r.game_id]) agg[r.game_id] = { ...r.games, total: 0, count: 0 };
            agg[r.game_id].total += r.rating;
            agg[r.game_id].count++;
          });
          const threshold = Math.max(Math.floor(guildSize * 0.4), 1);
          return Object.values(agg).filter(g => g.count >= 1 && (shelfCounts[g.id] || 0) <= threshold)
            .map(g => ({ ...g, avg: g.total / g.count })).sort((a, b) => b.avg - a.avg).slice(0, 12)
            .map(g => ({ ...g, _stat: g.avg.toFixed(1) + " avg · " + (shelfCounts[g.id] || 0) + " guild members have it" }));
        }
      },
    ] : [],
  };

  const getUserPool = (ring) => {
    if (ring === 1) return null;
    if (ring === 2) return followIds;
    if (ring === 3) return guildMemberIds;
    return null;
  };

  const runInsight = async (insight) => {
    if (activeInsight === insight.id && discoveryResults !== null) {
      setActiveInsight(null); setDiscoveryResults(null); setDiscoveryLabel(""); return;
    }
    setActiveInsight(insight.id);
    setDiscoveryLoading(true);
    setDiscoveryResults(null);
    setDiscoveryLabel(insight.label);
    setNameSearch("");
    const userPool = getUserPool(activeRing);
    const results = await insight.run(userPool);
    setDiscoveryResults(results);
    setDiscoveryLoading(false);
  };

  const runNameSearch = async (q) => {
    if (!q.trim()) { setDiscoveryResults(null); setActiveInsight(null); setDiscoveryLabel(""); return; }
    setActiveInsight(null);
    setDiscoveryLoading(true);
    setDiscoveryLabel("Results for \"" + q + "\"");
    const [localRes, igdbRes] = await Promise.allSettled([
      supabase.from("games").select("id, name, genre, cover_url").ilike("name", "%" + q + "%").limit(8),
      fetch("/api/igdb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) }).then(r => r.json()).catch(() => ({ games: [] })),
    ]);
    const local = localRes.status === "fulfilled" ? (localRes.value.data || []) : [];
    const igdb = igdbRes.status === "fulfilled" ? (igdbRes.value.games || []) : [];
    const localNames = new Set(local.map(g => g.name.toLowerCase()));
    const fromIGDB = igdb.filter(g => !localNames.has(g.name.toLowerCase())).map(g => ({ ...g, _fromIGDB: true }));
    const all = [...local, ...fromIGDB].slice(0, 16);
    setDiscoveryResults(all.map(g => ({ ...g, _stat: g.genre || "" })));
    setDiscoveryLoading(false);
  };

  const clearDiscovery = () => {
    setActiveInsight(null); setDiscoveryResults(null);
    setDiscoveryLabel(""); setNameSearch(""); setDiscoveryOpen(false);
  };

  const Sparkline = ({ points, labels, color = C.accent }) => {
    if (!points || points.length === 0) return null;
    const W = 1000, h = 240, pad = 20;
    const slots = points.length;
    const dataMax = Math.max(...points);
    // Always start Y axis from zero — flat lines look flat
    const max = dataMax > 0 ? dataMax * 1.1 : 0.1;
    const xPos = (i) => pad + (i / (slots - 1)) * (W - pad * 2);
    const yPos = (v) => h - pad - (v / max) * (h - pad * 2);
    const baseline = h - pad;
    const linePts = points.map((v, i) => xPos(i) + "," + yPos(v)).join(" ");
    const areaPath = "M " + xPos(0) + "," + baseline + " " + points.map((v, i) => "L " + xPos(i) + "," + yPos(v)).join(" ") + " L " + xPos(slots - 1) + "," + baseline + " Z";
    const lastIdx = slots - 1;
    return (
      <div style={{ marginTop: 8, width: "100%" }}>
        <svg viewBox={"0 0 " + W + " " + h} style={{ display: "block", width: "100%", height: h }}>
          <defs><linearGradient id={"grad-" + color.replace("#","")} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
          <path d={areaPath} fill={"url(#grad-" + color.replace("#","") + ")"} />
          <polyline points={linePts} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((v, i) => v > 0 && <circle key={i} cx={xPos(i)} cy={yPos(v)} r={i === lastIdx ? 5 : 3} fill={color} opacity={i === lastIdx ? 1 : 0.4} />)}
        </svg>
        <div style={{ position: "relative", height: 14, marginTop: 2 }}>
          {labels && labels.map((l, i) => i < slots ? (
            <span key={i} style={{ position: "absolute", left: (xPos(i) / W) * 100 + "%", transform: "translateX(-50%)", color: C.textDim, fontSize: 9, whiteSpace: "nowrap" }}>{l}</span>
          ) : null)}
        </div>
      </div>
    );
  };

  const getDominantSignal = (entry) => {
    if (entry.shelf_playing > 0) return entry.shelf_playing + " playing";
    if (entry.review > 0) return entry.review + " review" + (entry.review > 1 ? "s" : "");
    if (entry.comment > 0) return entry.comment + " comment" + (entry.comment > 1 ? "s" : "");
    if (entry.shelf_want > 0) return entry.shelf_want + " want to play";
    if (entry.post > 0) return entry.post + " post" + (entry.post > 1 ? "s" : "");
    return entry.uniqueUsers + " player" + (entry.uniqueUsers > 1 ? "s" : "");
  };

  const ChartRow = ({ entry, rank, section }) => {
    const isExpanded = section === "overall" ? expandedOverall === entry.id : expandedGenre[section] === entry.id;
    const spData = sparklines[entry.id];
    const sp = spData?.points || spData;
    const spLabels = spData?.labels || null;
    const isOverall = section === "overall";
    const spGlobalMax = isOverall ? (spData?.globalMax || null) : (spData?.genreGlobalMax || spData?.globalMax || null);
    const spRefPoints = isOverall ? (spData?.referencePoints || null) : (spData?.genreRefPoints || null);
    const isLoadingSp = loadingSparkline[entry.id];
    const movement = (() => {
      const prevRank = prevRanks[entry.id];
      const historyPoints = spData?.points || [];
      const hasHistory = historyPoints.slice(0, 7).some(p => p > 0.01);
      if (!prevRank && !hasHistory) return { label: "NEW", color: C.teal };
      if (!prevRank) return { label: "—", color: C.textDim };
      const diff = prevRank - rank;
      if (diff === 0) return { label: "—", color: C.textDim };
      if (diff > 0) return { label: "+" + diff, color: "#22c55e" };
      return { label: String(diff), color: "#ef4444" };
    })();
    return (
      <div style={{ borderBottom: "1px solid " + C.border, overflow: "hidden" }}>
        <div onClick={() => handleExpand(entry.id, section)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", background: isExpanded ? C.accentGlow : "transparent" }}
          onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = C.surfaceHover; }}
          onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}>
          <div style={{ width: 24, textAlign: "center", fontWeight: 800, fontSize: rank <= 3 ? 16 : 13, color: rank === 1 ? C.gold : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : C.textDim, flexShrink: 0 }}>{rank}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{entry.name}</div>
          </div>
          {movement && <div style={{ color: movement.color, fontSize: 13, fontWeight: 700, flexShrink: 0, minWidth: 24, textAlign: "center" }}>{movement.label}</div>}
          <div style={{ color: isExpanded ? C.accentSoft : C.textDim, fontSize: 11, flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</div>
        </div>
        {isExpanded && (
          <div style={{ padding: "4px 20px 18px", borderTop: "1px solid " + C.border, background: C.accentGlow }}>
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 4, marginTop: 8 }}>Momentum — last 8 days</div>
            {sp ? <Sparkline points={sp} labels={spLabels} color={C.accent} />
              : isLoadingSp ? <div style={{ color: C.textDim, fontSize: 12, padding: "12px 0" }}>Loading trend…</div>
              : <div style={{ color: C.textDim, fontSize: 12, padding: "12px 0" }}>No trend data yet.</div>}
            <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
              {entry.post > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>{entry.post}</div><div style={{ color: C.textDim, fontSize: 10 }}>posts</div></div>}
              {entry.comment > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>{entry.comment}</div><div style={{ color: C.textDim, fontSize: 10 }}>comments</div></div>}
              {entry.shelf_playing > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: "#22c55e", fontSize: 16 }}>{entry.shelf_playing}</div><div style={{ color: C.textDim, fontSize: 10 }}>playing</div></div>}
              {entry.shelf_want > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.accentSoft, fontSize: 16 }}>{entry.shelf_want}</div><div style={{ color: C.textDim, fontSize: 10 }}>want to play</div></div>}
              {entry.review > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.gold, fontSize: 16 }}>{entry.review}</div><div style={{ color: C.textDim, fontSize: 10 }}>reviews</div></div>}
              <div style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
                <button onClick={e => { e.stopPropagation(); setCurrentGame(entry.id); setActivePage("game"); }}
                  style={{ background: C.accent, border: "none", borderRadius: 8, padding: "7px 16px", color: C.accentText, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View Game →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Ring configs
  const RINGS = [
    { ring: 1, label: "Ring 1", desc: "Discover through all of GuildLink", color: C.accent, locked: false },
    { ring: 2, label: "Ring 2", desc: "Discover through your connections", color: C.teal, locked: currentUser && followIds.length === 0, lockMsg: "Follow gamers to unlock" },
    { ring: 3, label: "Ring 3", desc: "Discover through your guilds", color: C.gold, locked: currentUser && guildMemberIds.length === 0, lockMsg: "Join a guild to unlock" },
  ];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 24px 40px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: isMobile ? 22 : 28, color: C.text, letterSpacing: "-0.5px", marginBottom: 6 }}>Games</div>
        <div style={{ color: C.textMuted, fontSize: 14 }}>What the community is playing, reviewing, and shelving.</div>
      </div>

      {/* ── Game Discovery Card ── */}
      {!currentUser ? (
        <div style={{ background: C.goldGlow, border: "2px solid " + C.gold + "66", borderRadius: 20, marginBottom: 32, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.gold, marginBottom: 4, letterSpacing: "-0.3px" }}>Game Discovery</div>
            <div style={{ color: C.textMuted, fontSize: 13 }}>Game discovery works when you build your game shelf.</div>
          </div>
          <button onClick={() => onSignIn?.("Build your shelf and unlock game discovery.")}
            style={{ background: C.gold, border: "none", borderRadius: 10, padding: "8px 18px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            Sign Up Now
          </button>
        </div>
      ) : (
        <div style={{ background: C.goldGlow, border: "2px solid " + C.gold + "55", borderRadius: 20, marginBottom: 32, transition: "border-color 0.2s" }}>
          {/* Card header */}
          <div onClick={() => setDiscoveryOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.gold, letterSpacing: "-0.3px" }}>Game Discovery</div>
              <div style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>Find something to play based on what the community is doing.</div>
            </div>
            <div style={{ color: C.gold, fontSize: 12, marginLeft: 16, flexShrink: 0, opacity: 0.7 }}>{discoveryOpen ? "▲" : "▼"}</div>
          </div>

          {/* Expanded panel */}
          {discoveryOpen && (
            <div style={{ borderTop: "1px solid " + C.gold + "33", padding: "20px 22px 22px" }}>

              {/* Ring sections — all always visible */}
              <div style={{ marginBottom: 20 }}>
                {RINGS.map(r => (
                  <div key={r.ring} style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ position: "relative", width: 28, height: 28, flexShrink: 0 }}>
                        <div style={{ position: "absolute", inset: -2, borderRadius: "50%", border: "2px solid " + (r.locked ? r.color + "22" : r.color + "88") }} />
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: r.locked ? "transparent" : r.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: r.locked ? r.color + "33" : r.color, fontWeight: 900, fontSize: 10 }}>{r.ring}</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: r.locked ? C.textDim : r.color, fontSize: 13 }}>{r.label} — {r.desc}</div>
                        {r.locked && <div style={{ color: C.textDim, fontSize: 11, marginTop: 1 }}>{r.lockMsg}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 38 }}>
                      {(RING_INSIGHTS[r.ring] || []).map(insight => (
                        <button key={insight.id}
                          onClick={() => { if (!r.locked) { setActiveRing(r.ring); runInsight(insight); } }}
                          title={r.locked ? r.lockMsg : insight.desc}
                          disabled={r.locked}
                          style={{ background: activeInsight === insight.id ? r.color + "22" : C.surfaceRaised, border: "1px solid " + (activeInsight === insight.id ? r.color + "55" : r.locked ? C.border + "88" : C.border), borderRadius: 20, padding: "6px 14px", color: r.locked ? C.textDim : activeInsight === insight.id ? r.color : C.textMuted, fontSize: 12, fontWeight: activeInsight === insight.id ? 700 : 500, cursor: r.locked ? "default" : "pointer", opacity: r.locked ? 0.45 : 1, transition: "all 0.15s" }}>
                          {insight.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Name search */}
              <div style={{ position: "relative", zIndex: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ color: C.textDim, fontSize: 12, flexShrink: 0 }}>or search by name</div>
                  <input value={nameSearch}
                    onChange={async e => {
                      const val = e.target.value;
                      setNameSearch(val);
                      const q = val.startsWith("@") ? val.slice(1) : val;
                      if (!q) { setDiscoveryResults(null); setActiveInsight(null); setDiscoveryLabel(""); setTypeaheadResults([]); return; }
                      if (q.length >= 2) {
                        const [localRes, igdbRes] = await Promise.allSettled([
                          supabase.from("games").select("id, name, genre, cover_url").ilike("name", "%" + q + "%").limit(4),
                          fetch("/api/igdb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) }).then(r => r.json()).catch(() => ({ games: [] })),
                        ]);
                        const local = localRes.status === "fulfilled" ? (localRes.value.data || []) : [];
                        const igdb = igdbRes.status === "fulfilled" ? (igdbRes.value.games || []) : [];
                        const localNames = new Set(local.map(g => g.name.toLowerCase()));
                        const fromIGDB = igdb.filter(g => !localNames.has(g.name.toLowerCase())).map(g => ({ ...g, _fromIGDB: true }));
                        setTypeaheadResults([...local, ...fromIGDB].slice(0, 6));
                      } else {
                        setTypeaheadResults([]);
                      }
                    }}
                    onKeyDown={e => { if (e.key === "Enter") { setTypeaheadResults([]); runNameSearch(nameSearch.startsWith("@") ? nameSearch.slice(1) : nameSearch); } }}
                    onBlur={() => setTimeout(() => setTypeaheadResults([]), 150)}
                    placeholder="Search by name or @game..."
                    style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 10, padding: "8px 14px", color: C.text, fontSize: 14, outline: "none" }}
                  />
                  {nameSearch && (
                    <button onClick={() => { setTypeaheadResults([]); runNameSearch(nameSearch.startsWith("@") ? nameSearch.slice(1) : nameSearch); }}
                      style={{ background: C.accent, border: "none", borderRadius: 10, padding: "8px 16px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      Search
                    </button>
                  )}
                </div>
                {typeaheadResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 120, right: nameSearch ? 96 : 0, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, marginTop: 4, zIndex: 200, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                    {typeaheadResults.map((g, i) => (
                      <div key={g.id || g.igdb_id} onMouseDown={async () => {
                        if (g._fromIGDB) {
                          const { data: inserted } = await supabase.from("games").insert({ name: g.name, genre: g.genre, summary: g.summary, cover_url: g.cover_url, igdb_id: g.igdb_id, first_release_date: g.first_release_date, followers: 0 }).select().single();
                          if (inserted) { setCurrentGame(inserted.id); setActivePage("game"); }
                        } else { setCurrentGame(g.id); setActivePage("game"); }
                        setTypeaheadResults([]); setNameSearch("");
                      }}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderBottom: i < typeaheadResults.length - 1 ? "1px solid " + C.border : "none", background: C.surface }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                        onMouseLeave={e => e.currentTarget.style.background = C.surface}>
                        {g.cover_url
                          ? <img src={g.cover_url} alt="" style={{ width: 24, height: 32, borderRadius: 3, objectFit: "cover", flexShrink: 0 }} />
                          : <div style={{ width: 24, height: 32, borderRadius: 3, background: C.surfaceRaised, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🎮</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                          {g.genre && <div style={{ color: C.textDim, fontSize: 10 }}>{g.genre}</div>}
                        </div>
                        {g._fromIGDB && <span style={{ color: C.teal, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>+ Add</span>}
                      </div>
                    ))}
                    <div onMouseDown={() => { setTypeaheadResults([]); runNameSearch(nameSearch.startsWith("@") ? nameSearch.slice(1) : nameSearch); }}
                      style={{ padding: "8px 12px", color: C.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer", borderTop: "1px solid " + C.border, textAlign: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      Search all results for "{nameSearch.startsWith("@") ? nameSearch.slice(1) : nameSearch}" →
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Discovery Results ── */}
      {(discoveryResults !== null || discoveryLoading) && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>
              {discoveryLoading ? "Finding games…" : discoveryLabel + " · " + (discoveryResults?.length || 0) + " game" + (discoveryResults?.length !== 1 ? "s" : "")}
            </div>
            <button onClick={clearDiscovery} style={{ background: "transparent", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Clear</button>
          </div>
          {discoveryLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
              {[...Array(8)].map((_, i) => <div key={i} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 12, height: 90 }} />)}
            </div>
          ) : discoveryResults?.length === 0 ? (
            <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "40px 24px", textAlign: "center", color: C.textDim }}>
              No results found. Try a different approach.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
              {discoveryResults.map(g => {
                const cardId = g.id || g.igdb_id;
                const onShelf = userShelf.has(g.id);
                const menuOpen = shelfMenuOpen === cardId;
                return (
                  <div key={cardId} style={{ background: C.surface, border: "1px solid " + (onShelf ? C.accentDim : C.border), borderRadius: 12, cursor: "pointer", position: "relative", alignSelf: "start", minWidth: 0, overflow: "hidden" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = onShelf ? C.accent : C.borderHover}
                    onMouseLeave={e => e.currentTarget.style.borderColor = onShelf ? C.accentDim : C.border}>
                    <div style={{ width: "100%", height: 200, flexShrink: 0, background: "#0a0f1a" }} onClick={async () => {
                      if (menuOpen) { setShelfMenuOpen(null); return; }
                      if (g._fromIGDB) {
                        const { data: inserted } = await supabase.from("games").insert({ name: g.name, genre: g.genre, summary: g.summary, cover_url: g.cover_url, igdb_id: g.igdb_id, first_release_date: g.first_release_date, followers: 0 }).select().single();
                        if (inserted) { setCurrentGame(inserted.id); setActivePage("game"); }
                      } else { setCurrentGame(g.id); setActivePage("game"); }
                    }}>
                      {g.cover_url
                        ? <img src={g.cover_url} alt={g.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                        : <div style={{ width: "100%", height: "100%", background: C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🎮</div>
                      }
                    </div>
                    {menuOpen && (
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(8,14,26,0.92)", borderRadius: 12, zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 12px", gap: 8 }}>
                        {[{ id: "playing", label: "Playing Now" }, { id: "want_to_play", label: "Want to Play" }, { id: "have_played", label: "Have Played" }].map(opt => (
                          <button key={opt.id} onClick={async e => {
                            e.stopPropagation();
                            const { data: { user: authUser } } = await supabase.auth.getUser();
                            if (!authUser) return;
                            await supabase.from("user_games").upsert({ user_id: authUser.id, game_id: g.id, status: opt.id, updated_at: new Date().toISOString() }, { onConflict: "user_id,game_id" });
                            await supabase.from("user_games_history").insert({ user_id: authUser.id, game_id: g.id, from_status: null, to_status: opt.id });
                            const eventMap = { playing: 'shelf_playing', want_to_play: 'shelf_want', have_played: 'shelf_played' };
                            if (eventMap[opt.id]) logChartEvent(g.id, eventMap[opt.id], authUser.id);
                            setUserShelf(prev => new Set([...prev, g.id]));
                            setShelfMenuOpen(null);
                          }}
                            style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "11px 12px", cursor: "pointer", color: C.text, fontSize: 13, fontWeight: 600, textAlign: "left" }}
                            onMouseEnter={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = C.accent; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.surfaceRaised; e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.border; }}>
                            {opt.label}
                          </button>
                        ))}
                        <button onClick={e => { e.stopPropagation(); setShelfMenuOpen(null); }}
                          style={{ background: "transparent", border: "none", color: C.textDim, fontSize: 12, cursor: "pointer", marginTop: 4 }}>
                          Cancel
                        </button>
                      </div>
                    )}
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 2, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                      {g._stat && g._stat.includes("avg") && (
                        <div style={{ display: "inline-block", background: C.goldDim, border: "1px solid " + C.gold + "44", borderRadius: 6, padding: "1px 7px", color: C.gold, fontWeight: 800, fontSize: 11, marginBottom: 4 }}>
                          {g._stat.split(" avg")[0]}/10
                        </div>
                      )}
                      {currentUser && !g._fromIGDB && (
                        onShelf
                          ? <div style={{ fontSize: 11, color: C.accentSoft, fontWeight: 700 }}>On your shelf</div>
                          : <button onClick={e => { e.stopPropagation(); setShelfMenuOpen(menuOpen ? null : cardId); }}
                              style={{ background: "transparent", border: "1px solid " + C.gold + "66", borderRadius: 6, padding: "3px 10px", color: C.gold, fontSize: 11, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                              + Add to Shelf
                            </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── The Charts ── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: C.text, letterSpacing: "-0.3px" }}>The Charts</div>
          <div style={{ color: C.textMuted, fontSize: 13, marginTop: 3 }}>Ranked by what the community is actually doing.</div>
        </div>
      </div>

      {chartsLoading ? (
        <div style={{ color: C.textDim, fontSize: 14, textAlign: "center", padding: 60 }}>Loading charts…</div>
      ) : overall.length === 0 ? (
        <div style={{ color: C.textDim, fontSize: 14, textAlign: "center", padding: 60, lineHeight: 1.8 }}>
          No chart data yet.<br />
          <span style={{ fontSize: 12 }}>Charts fill up as the community posts, plays, and reviews games.</span>
        </div>
      ) : (
        <>
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, marginBottom: 32, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Top 10 Overall</div>
              <div style={{ color: C.textDim, fontSize: 12 }}>Last 8 days</div>
            </div>
            {overall.map((entry, i) => <ChartRow key={entry.id} entry={entry} rank={i + 1} section="overall" />)}
          </div>

          {emerging.length > 0 && (
            <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, marginBottom: 32, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Emerging</div>
                <div style={{ color: C.textDim, fontSize: 12 }}>Back on the radar after going quiet</div>
              </div>
              {emerging.map((entry, i) => <ChartRow key={entry.id} entry={entry} rank={i + 1} section="emerging" />)}
            </div>
          )}

          {(() => {
            const genreEntries = Object.entries(byGenre).filter(([, games]) => games.length >= 1);
            if (genreEntries.length === 0) return null;
            return (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>By Genre</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                  {genreEntries.map(([genre, games]) => {
                    const fullList = byGenreFull[genre] || games;
                    const isExpanded = expandedGenreAll.has(genre);
                    const displayList = isExpanded ? fullList : games;
                    const hasMore = fullList.length > games.length;
                    return (
                      <div key={genre} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, overflow: "hidden" }}>
                        <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid " + C.border }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{genre}</div>
                        </div>
                        {displayList.map((entry, i) => <ChartRow key={entry.id} entry={entry} rank={i + 1} section={genre} />)}
                        {(hasMore || isExpanded) && (
                          <button onClick={() => setExpandedGenreAll(prev => { const n = new Set(prev); isExpanded ? n.delete(genre) : n.add(genre); return n; })}
                            style={{ margin: "10px 16px 14px", background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "7px", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", width: "calc(100% - 32px)" }}>
                            {isExpanded ? "Show less" : "See all " + fullList.length + " in " + genre + " →"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

export default GamesPage;
