import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { logChartEvent, formatScore } from "../utils.js";
import { ShareChartsButton } from "../components/ShareButton.jsx";
import { PixelCornerBox } from "../components/PixelCornerBox.jsx";
import { PixelButton } from "../components/PixelButton.jsx";


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
  const [genreContext, setGenreContext] = useState({});
  const [sparklines, setSparklines] = useState({});
  const [loadingSparkline, setLoadingSparkline] = useState({});
  const [signalsByGame, setSignalsByGame] = useState({});

  const COLORS = ['#0ea5e9','#f59e0b','#10b981','#ef4444','#3b82f6','#0d9488','#f97316','#38bdf8'];

  const gameVisuals = (g) => {
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
      const top10 = scores.filter(s => s.games).sort((a, b) => b.score - a.score || a.games.name.localeCompare(b.games.name)).slice(0, 10).map(s => ({ id: s.game_id, finalScore: s.score, name: s.games.name, genre: s.games.genre, cover_url: s.games.cover_url, uniqueUsers: 1, post: 0, review: 0, shelf_playing: 0, shelf_want: 0, shelf_played: 0, comment: 0 }));
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
      const last7Dates = Array.from({ length: 7 }, (_, i) => getPacificDate(i));
      const prev7Dates = Array.from({ length: 7 }, (_, i) => getPacificDate(i + 7));
      const [recentEventsRes, prevEventsRes] = await Promise.all([
        supabase.from("chart_events").select("game_id, user_id").in("date", last7Dates),
        supabase.from("chart_events").select("game_id").in("date", prev7Dates),
      ]);
      const prevGameIds = new Set((prevEventsRes.data || []).map(e => e.game_id));
      const recentByGame = {};
      (recentEventsRes.data || []).forEach(e => { if (!recentByGame[e.game_id]) recentByGame[e.game_id] = new Set(); recentByGame[e.game_id].add(e.user_id); });
      // Emerging = games with activity this week that had none in the prior week
      const emergingGameIds = new Set(Object.entries(recentByGame).filter(([gameId, users]) => !prevGameIds.has(gameId)).map(([gameId]) => gameId));
      const emergingList = (scores || []).filter(s => s.games && emergingGameIds.has(s.game_id)).slice(0, 10)
        .map(s => ({ id: s.game_id, finalScore: s.score, name: s.games.name, genre: s.games.genre, cover_url: s.games.cover_url, uniqueUsers: 1, post: 0, review: 0, shelf_playing: 0, shelf_want: 0, shelf_played: 0, comment: 0 }));
      setEmerging(emergingList);
      // Sparklines for emerging games load on demand via loadSparkline when expanded —
      // buildPoints was removed in a past refactor, leaving this call orphaned and crashing.
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
    const points = ordered.map(d => scoreMap[d] || 0);
    const labels = ordered.map(d => { const dt = new Date(d + "T12:00:00"); return (dt.getMonth() + 1) + "/" + dt.getDate(); });
    const existingMax = Object.values(sparklines).map(s => s?.globalMax || 0);
    const globalMax = existingMax.length > 0 ? Math.max(...existingMax) : 0.1;
    const ctx = genreContext[gameId] || {};
    setSparklines(prev => ({ ...prev, [gameId]: { points, labels, globalMax, referencePoints: null, genreGlobalMax: ctx.genreGlobalMax || globalMax, genreRefPoints: ctx.genreRefPoints || null } }));
    setLoadingSparkline(prev => ({ ...prev, [gameId]: false }));
  };

  const loadSignals = async (gameId) => {
    if (signalsByGame[gameId]) return;
    const getPacificDate = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d); };
    const today = getPacificDate(0);
    const dates = Array.from({ length: 8 }, (_, i) => getPacificDate(i));
    const { data } = await supabase.from("chart_events").select("event_type, date, post_sequence").eq("game_id", gameId).in("date", dates);
    const DECAY = { 0: 1.0, 1: 0.8, 2: 0.6, 3: 0.45, 4: 0.3, 5: 0.2, 6: 0.1, 7: 0.05 };
    const WEIGHTS = {
      review: () => 3.0, shelf_playing: () => 0.75, shelf_want: () => 0.3,
      shelf_played: () => 0.25, comment: () => 0.75,
      post: (seq) => seq === 1 ? 1.5 : seq === 2 ? 0.75 : seq === 3 ? 0.4 : 0.1,
    };
    const counts = { post: 0, comment: 0, shelf_playing: 0, shelf_played: 0, review: 0, shelf_want: 0 };
    let socialScore = 0, historyScore = 0, tasteScore = 0;
    (data || []).forEach(e => {
      const daysAgo = Math.round((new Date(today) - new Date(e.date)) / 86400000);
      const decay = DECAY[daysAgo] ?? 0;
      const weight = WEIGHTS[e.event_type]?.(e.post_sequence) ?? 0;
      const score = weight * decay;
      if (counts[e.event_type] !== undefined) counts[e.event_type]++;
      if (e.event_type === "post" || e.event_type === "comment") socialScore += score;
      else if (e.event_type === "shelf_playing" || e.event_type === "shelf_played") historyScore += score;
      else if (e.event_type === "review" || e.event_type === "shelf_want") tasteScore += score;
    });
    socialScore = Math.round(socialScore * 100) / 100;
    historyScore = Math.round(historyScore * 100) / 100;
    tasteScore = Math.round(tasteScore * 100) / 100;
    const totalScore = socialScore + historyScore + tasteScore || 1;
    setSignalsByGame(prev => ({ ...prev, [gameId]: { socialScore, historyScore, tasteScore, totalScore, counts } }));
  };

  const handleExpand = (gameId, section) => {
    if (section === "overall") setExpandedOverall(prev => prev === gameId ? null : gameId);
    else setExpandedGenre(prev => ({ ...prev, [section]: prev[section] === gameId ? null : gameId }));
    loadSparkline(gameId);
    loadSignals(gameId);
  };

  // ── Ring-aware insight definitions ──
  const RING_INSIGHTS = {
    1: [
      {
        id: "most_shelved",
        label: "Most Shelved",
        desc: "Most added games across the community",
        run: async () => {
          if (userShelf.size === 0) return "__empty_shelf__";
          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").in("status", ["playing", "have_played", "want_to_play"]);
          const counts = {};
          (data || []).forEach(r => { if (!r.games || userShelf.has(r.game_id)) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " player" + (r.count !== 1 ? "s" : "") + " have this" }));
        }
      },
      {
        id: "most_wanted",
        label: "Most Wanted",
        desc: "Highest want-to-play across the community",
        run: async () => {
          if (userShelf.size === 0) return "__empty_shelf__";
          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").eq("status", "want_to_play");
          const counts = {};
          (data || []).forEach(r => { if (!r.games || userShelf.has(r.game_id)) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " want to play" }));
        }
      },
      {
        id: "played_by_people_like_you",
        label: "Played by People Like You",
        desc: "Games on shelves of players with similar taste",
        run: async () => {
          if (userShelf.size === 0) return "__empty_shelf__";
          if (!currentUser) return [];

          // Try precomputed similarity first
          const { data: simData } = await supabase
            .from("user_similarity")
            .select("similar_user_id, overlap_count, similarity_score")
            .eq("user_id", currentUser.id)
            .order("similarity_score", { ascending: false })
            .limit(50);

          let similarUserIds = (simData || []).map(r => r.similar_user_id);

          // Fall back to live query for new users not yet in similarity table
          if (similarUserIds.length === 0) {
            const { data: allShelf } = await supabase.from("user_games").select("game_id, user_id").in("status", ["have_played", "playing"]);
            const overlapByUser = {};
            (allShelf || []).forEach(r => { if (userShelf.has(r.game_id) && r.user_id !== currentUser.id) overlapByUser[r.user_id] = (overlapByUser[r.user_id] || 0) + 1; });
            const OVERLAP_THRESHOLD = Math.max(2, Math.floor(userShelf.size * 0.15));
            similarUserIds = Object.entries(overlapByUser).filter(([, c]) => c >= OVERLAP_THRESHOLD).map(([uid]) => uid);
          }

          if (similarUserIds.length === 0) return [];

          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").in("user_id", similarUserIds).in("status", ["have_played", "playing"]);
          const counts = {};
          (data || []).forEach(r => { if (!r.games || userShelf.has(r.game_id)) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12)
            .map(r => ({ ...r.game, _stat: r.count + " player" + (r.count !== 1 ? "s" : "") + " with a similar shelf" }));
        }
      },
      {
        id: "hidden_gems",
        label: "Hidden Gems",
        desc: "Rare finds on shelves of players with taste like yours",
        run: async () => {
          if (userShelf.size === 0) return "__empty_shelf__";
          if (!currentUser) return [];

          // Step 1 — find similar users with their similarity scores
          const { data: simData } = await supabase
            .from("user_similarity")
            .select("similar_user_id, overlap_count, similarity_score")
            .eq("user_id", currentUser.id)
            .order("similarity_score", { ascending: false })
            .limit(50);

          let similarUsers = (simData || []);
          let similarUserIds = similarUsers.map(r => r.similar_user_id);

          // Fall back to live query for new users not yet in similarity table
          if (similarUserIds.length === 0) {
            const { data: allShelfRaw } = await supabase.from("user_games").select("game_id, user_id").in("status", ["have_played", "playing"]);
            const overlapByUser = {};
            (allShelfRaw || []).forEach(r => { if (userShelf.has(r.game_id) && r.user_id !== currentUser.id) overlapByUser[r.user_id] = (overlapByUser[r.user_id] || 0) + 1; });
            const OVERLAP_THRESHOLD = Math.max(2, Math.floor(userShelf.size * 0.15));
            similarUserIds = Object.entries(overlapByUser).filter(([, c]) => c >= OVERLAP_THRESHOLD).map(([uid]) => uid);
            similarUsers = similarUserIds.map(uid => ({ similar_user_id: uid, similarity_score: 1, overlap_count: 0 }));
          }

          if (similarUserIds.length === 0) return [];

          // Build a similarity score lookup for ranking
          const simScoreByUser = {};
          similarUsers.forEach(r => { simScoreByUser[r.similar_user_id] = r.similarity_score || 0; });

          // Step 2 — fetch only similar users' games (scoped query, avoids Supabase
          // row limit that breaks the old approach of fetching the entire platform's shelf).
          // Shelf exclusion is done client-side below — .not("game_id", "in", ...) with
          // hundreds of UUIDs exceeds Supabase REST URL limits and silently drops the filter,
          // causing the current user's own games to flood back in as candidates.
          const similarGamesQuery = supabase
            .from("user_games")
            .select("game_id, user_id, games(id, name, genre, cover_url, first_release_date)")
            .in("user_id", similarUserIds)
            .in("status", ["have_played", "playing", "want_to_play"]);
          const { data: similarGames } = await similarGamesQuery;

          // Release date filter applied client-side — PostgREST doesn't reliably filter
          // on nested join columns, and the filter would silently do nothing rather than error.
          // first_release_date is stored as a Unix timestamp (integer) from IGDB — not a date
          // string. 1577836800 = 2020-01-01 00:00:00 UTC. Comparing against a date string
          // coerces to NaN in JS and silently rejects every game.
          // Games with null/zero release dates (incomplete IGDB data) are also excluded.
          const GEM_CUTOFF = 1577836800; // 2020-01-01 Unix timestamp
          const filteredGames = (similarGames || []).filter(r =>
            r.games &&
            !userShelf.has(r.game_id) &&
            r.games.first_release_date != null &&
            r.games.first_release_date >= GEM_CUTOFF
          );

          const candidateGameIds = [...new Set(filteredGames.map(r => r.game_id))];
          if (candidateGameIds.length === 0) return [];

          // Step 3 — get platform-wide counts for ONLY these candidate games.
          // Since we're checking specific rare game IDs, this won't hit row limits
          // (a game with 1-2 shelf entries can only have 1-2 rows to return).
          const { data: platformRows } = await supabase
            .from("user_games")
            .select("game_id")
            .in("game_id", candidateGameIds)
            .in("status", ["have_played", "playing", "want_to_play"]);

          const platformCounts = {};
          (platformRows || []).forEach(r => {
            platformCounts[r.game_id] = (platformCounts[r.game_id] || 0) + 1;
          });

          // Step 4 — build candidate list. A hidden gem is rare platform-wide (≤2 total
          // shelf entries) but present on a similar user's shelf. If too few results,
          // widen to ≤3. Rank by the similarity score of the user who has it —
          // discoveries from your most taste-aligned users surface first.
          const gameData = {};
          const bestSimScore = {};
          filteredGames.forEach(r => {
            const pc = platformCounts[r.game_id] || 0;
            if (pc > 3) return;
            if (!gameData[r.game_id]) {
              gameData[r.game_id] = r.games;
              bestSimScore[r.game_id] = 0;
            }
            const sc = simScoreByUser[r.user_id] || 0;
            if (sc > bestSimScore[r.game_id]) {
              bestSimScore[r.game_id] = sc;
            }
          });

          // Prefer truly rare (≤2) first; fall through to ≤3 if needed
          let results = Object.entries(gameData)
            .filter(([id]) => (platformCounts[id] || 0) <= 2)
            .sort(([aId], [bId]) => (bestSimScore[bId] || 0) - (bestSimScore[aId] || 0));

          if (results.length < 4) {
            results = Object.entries(gameData)
              .sort(([aId], [bId]) => {
                const pcDiff = (platformCounts[aId] || 0) - (platformCounts[bId] || 0);
                if (pcDiff !== 0) return pcDiff;
                return (bestSimScore[bId] || 0) - (bestSimScore[aId] || 0);
              });
          }

          return results.slice(0, 12).map(([id, game]) => {
            const pc = platformCounts[id] || 1;
            return {
              ...game,
              _stat: pc === 1
                ? "only 1 person on GuildLink has this"
                : pc + " people on GuildLink have this"
            };
          });
        }
      },
      {
        id: "highly_rated",
        label: "Highly Rated",
        desc: "Top rated by reviews and shelf popularity",
        run: async () => {
          if (userShelf.size === 0) return "__empty_shelf__";
          const [reviewRes, shelfRes] = await Promise.all([
            supabase.from("reviews").select("game_id, rating, games(id, name, genre, cover_url)"),
            supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").in("status", ["have_played", "playing"]),
          ]);
          const agg = {};
          // Shelf count — each shelf add contributes
          (shelfRes.data || []).forEach(r => {
            if (!r.games || userShelf.has(r.game_id)) return;
            if (!agg[r.game_id]) agg[r.game_id] = { ...r.games, reviewTotal: 0, reviewCount: 0, shelfCount: 0 };
            agg[r.game_id].shelfCount++;
          });
          // Reviews
          (reviewRes.data || []).forEach(r => {
            if (!r.games || userShelf.has(r.game_id)) return;
            if (!agg[r.game_id]) agg[r.game_id] = { ...r.games, reviewTotal: 0, reviewCount: 0, shelfCount: 0 };
            agg[r.game_id].reviewTotal += r.rating;
            agg[r.game_id].reviewCount++;
          });
          // Score: reviews weighted 60%, shelf popularity 40%
          Object.values(agg).forEach(g => {
            const reviewScore = g.reviewCount > 0 ? (g.reviewTotal / g.reviewCount) * 0.6 : 0;
            const shelfScore = Math.min(10, g.shelfCount * 1.5) * 0.4;
            g.score = reviewScore + shelfScore;
          });
          return Object.values(agg).filter(g => g.score > 0).sort((a, b) => b.score - a.score).slice(0, 12).map(g => {
            const parts = [];
            if (g.reviewCount > 0) parts.push((g.reviewTotal / g.reviewCount).toFixed(1) + " avg review");
            if (g.shelfCount > 0) parts.push("on " + g.shelfCount + " player" + (g.shelfCount !== 1 ? "s'" : "'s") + " shelf");
            return { ...g, _stat: parts.join(" · ") };
          });
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
          (data || []).forEach(r => { if (!r.games || userShelf.has(r.game_id)) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " of your connections playing" }));
        }
      },
      {
        id: "network_favorites",
        label: "Network Favorites",
        desc: "Most shelved games among people you follow",
        run: async (userPool) => {
          if (!userPool || userPool.length === 0) return [];
          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").in("user_id", userPool).in("status", ["have_played", "playing"]);
          const counts = {};
          (data || []).forEach(r => { if (!r.games || userShelf.has(r.game_id)) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " in your network" }));
        }
      },
      {
        id: "new_to_you",
        label: "New to You",
        desc: "On your network's want-to-play shelf",
        run: async (userPool) => {
          if (!userPool || userPool.length === 0) return [];
          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").in("user_id", userPool).eq("status", "want_to_play");
          const counts = {};
          (data || []).forEach(r => { if (!r.games || userShelf.has(r.game_id)) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " in your network want this" }));
        }
      },
    ] : [],
    3: currentUser ? [
      {
        id: "guild_playing",
        label: "Guild Is Playing",
        desc: "What your guild mates are actively playing",
        run: async (userPool) => {
          if (!userPool || userPool.length === 0) return [];
          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").in("user_id", userPool).eq("status", "playing");
          const counts = {};
          (data || []).forEach(r => { if (!r.games || userShelf.has(r.game_id)) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: r.count + " guild member" + (r.count !== 1 ? "s" : "") + " playing" }));
        }
      },
      {
        id: "guild_favorites",
        label: "Guild Favorites",
        desc: "Most shelved games among your guild members",
        run: async (userPool) => {
          if (!userPool || userPool.length === 0) return [];
          const { data } = await supabase.from("user_games").select("game_id, games(id, name, genre, cover_url)").in("user_id", userPool).in("status", ["have_played", "playing"]);
          const counts = {};
          (data || []).forEach(r => { if (!r.games || userShelf.has(r.game_id)) return; if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 }; counts[r.game_id].count++; });
          return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12).map(r => ({ ...r.game, _stat: "high on " + r.count + " guild member" + (r.count !== 1 ? "s'" : "'s") + " shelf" }));
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

  const runInsight = async (insight, ring) => {
    if (activeInsight === insight.id && discoveryResults !== null) {
      setActiveInsight(null); setDiscoveryResults(null); setDiscoveryLabel(""); return;
    }
    setActiveInsight(insight.id);
    setDiscoveryLoading(true);
    setDiscoveryResults(null);
    setDiscoveryLabel(insight.label);
    setNameSearch("");
    const userPool = getUserPool(ring ?? activeRing);
    const results = await insight.run(userPool);
    setDiscoveryResults(results);
    setDiscoveryLoading(false);
    // Anonymous aggregate logging — no user ID
    const insertPayload = {
      insight_id: insight.id,
      ring: ring ?? activeRing,
      shelf_size: userShelf.size,
      result_count: results === "__empty_shelf__" ? 0 : (results?.length || 0),
    };
    supabase.from("discovery_events").insert(insertPayload).then(({ error }) => {
      if (error) console.error("[discovery] insert failed:", error.code, error.message, JSON.stringify(insertPayload));
    });
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

  const Sparkline = ({ points, labels, refPoints, color = C.accent }) => {
    if (!points || points.length === 0) return null;
    const W = 1000, h = 240, pad = 20;
    const slots = points.length;
    // Per-game scaling — never use global max
    const dataMax = Math.max(...points, 0.001);
    const dataMin = 0; // always start from zero baseline
    const range = dataMax - dataMin;
    const max = dataMax * 1.15; // 15% headroom above peak
    const xPos = (i) => pad + (i / (slots - 1)) * (W - pad * 2);
    const yPos = (v) => h - pad - ((v - dataMin) / (max - dataMin)) * (h - pad * 2);
    const baseline = h - pad;
    const linePts = points.map((v, i) => xPos(i) + "," + yPos(v)).join(" ");
    const areaPath = "M " + xPos(0) + "," + baseline + " " + points.map((v, i) => "L " + xPos(i) + "," + yPos(v)).join(" ") + " L " + xPos(slots - 1) + "," + baseline + " Z";
    const refLinePts = refPoints ? refPoints.slice(0, slots).map((v, i) => xPos(i) + "," + yPos(v)).join(" ") : null;
    const lastIdx = slots - 1;
    return (
      <div style={{ marginTop: 8, width: "100%" }}>
        <svg viewBox={"0 0 " + W + " " + h} style={{ display: "block", width: "100%", height: h }}>
          <defs><linearGradient id={"grad-" + color.replace("#","")} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
          {/* Baseline */}
          <line x1={pad} y1={baseline} x2={W - pad} y2={baseline} stroke={color} strokeWidth="1" strokeOpacity="0.2" />
          {/* refPoints temporarily disabled — causes scale issues */}
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
    const sp = Array.isArray(spData?.points) ? spData.points : (Array.isArray(spData) ? spData : []);
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
        {isExpanded && (() => {
          const sig = signalsByGame[entry.id];
          const totalScore = sig?.totalScore || 1;
          const orbSize = (val) => Math.max(28, Math.min(80, 28 + (val / totalScore) * 52));
          const orbs = [
            { label: "Social", value: sig?.socialScore || 0, color: C.accent, detail: [sig?.counts?.post > 0 ? sig.counts.post + " post" + (sig.counts.post !== 1 ? "s" : "") : null, sig?.counts?.comment > 0 ? sig.counts.comment + " comment" + (sig.counts.comment !== 1 ? "s" : "") : null].filter(Boolean).join(", ") || "No activity" },
            { label: "History", value: sig?.historyScore || 0, color: "#22c55e", detail: [sig?.counts?.shelf_playing > 0 ? sig.counts.shelf_playing + " playing" : null, sig?.counts?.shelf_played > 0 ? sig.counts.shelf_played + " played" : null].filter(Boolean).join(", ") || "No activity" },
            { label: "Taste", value: sig?.tasteScore || 0, color: C.gold, detail: [sig?.counts?.review > 0 ? sig.counts.review + " review" + (sig.counts.review !== 1 ? "s" : "") : null, sig?.counts?.shelf_want > 0 ? sig.counts.shelf_want + " want to play" : null].filter(Boolean).join(", ") || "No activity" },
          ];
          return (
            <div style={{ padding: "12px 20px 18px", borderTop: "1px solid " + C.border, background: C.accentGlow }}>
              <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 16, marginTop: 4 }}>Signal breakdown — last 8 days</div>
              {!sig ? (
                <div style={{ color: C.textDim, fontSize: 12, padding: "12px 0" }}>Loading signals…</div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid " + C.border }}>
                  {orbs.map(orb => {
                    const size = orbSize(orb.value);
                    const displayScore = orb.value > 0 ? "+" + formatScore(orb.value) : "—";
                    return (
                      <div key={orb.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
                        <div style={{ width: size, height: size, borderRadius: "50%", background: orb.color + "22", border: "2px solid " + orb.color + (orb.value === 0 ? "33" : "99"), display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s", boxShadow: orb.value > 0 ? "0 0 " + (size * 0.3) + "px " + orb.color + "33" : "none" }}>
                          <span style={{ color: orb.value > 0 ? orb.color : C.textDim, fontWeight: 800, fontSize: size > 50 ? 16 : 13 }}>{displayScore}</span>
                        </div>
                        <div style={{ color: orb.value > 0 ? C.text : C.textDim, fontWeight: 700, fontSize: 12 }}>{orb.label}</div>
                        <div style={{ color: C.textDim, fontSize: 10, textAlign: "center", maxWidth: 100 }}>{orb.detail}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={e => { e.stopPropagation(); setCurrentGame(entry.id); setActivePage("game"); window.history.pushState({ page: "game", gameId: entry.id }, "", `/game/${entry.id}`); }}
                  style={{ background: C.accent, border: "none", borderRadius: 3, padding: "7px 16px", color: C.accentText, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View Game →</button>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // Search dropdown positioning — portaled outside PixelCornerBox to escape clip-path
  const searchWrapRef = useRef(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  useEffect(() => {
    if (typeaheadResults.length === 0) { setDropdownRect(null); return; }
    const updateRect = () => {
      if (searchWrapRef.current) setDropdownRect(searchWrapRef.current.getBoundingClientRect());
    };
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [typeaheadResults]);

  const dropdownLeftOffset = 120;
  const dropdownRightOffset = nameSearch ? 96 : 0;
  const dropdownTop = dropdownRect ? dropdownRect.bottom + 4 : 0;
  const dropdownLeft = dropdownRect ? dropdownRect.left + dropdownLeftOffset : 0;
  const dropdownWidth = dropdownRect ? dropdownRect.width - dropdownLeftOffset - dropdownRightOffset : 0;

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
        <PixelCornerBox size="lg" borderColor={C.goldBorder} bgStyle={"color-mix(in srgb, " + C.gold + " 8%, " + C.bg + ")"} style={{ marginBottom: 32, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.gold, marginBottom: 4, letterSpacing: "-0.3px" }}>Game Discovery</div>
            <div style={{ color: C.textMuted, fontSize: 13 }}>Game discovery works when you build your game shelf.</div>
          </div>
          <button onClick={() => onSignIn?.("Build your shelf and unlock game discovery.")}
            style={{ background: C.gold, border: "none", borderRadius: 4, padding: "8px 18px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            Sign Up Now
          </button>
        </PixelCornerBox>
      ) : (
        <PixelCornerBox size="lg" borderColor={C.goldBorder} bgStyle={"color-mix(in srgb, " + C.gold + " 8%, " + C.bg + ")"} style={{ marginBottom: 32 }}>
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
                          onClick={() => { if (!r.locked) { setActiveRing(r.ring); runInsight(insight, r.ring); } }}
                          title={r.locked ? r.lockMsg : insight.desc}
                          disabled={r.locked}
                          style={{ background: activeInsight === insight.id ? r.color + "22" : C.surfaceRaised, border: "1px solid " + (activeInsight === insight.id ? r.color + "55" : r.locked ? C.border + "88" : C.border), borderRadius: 4, padding: "6px 14px", color: r.locked ? C.textDim : activeInsight === insight.id ? r.color : C.textMuted, fontSize: 12, fontWeight: activeInsight === insight.id ? 700 : 500, cursor: r.locked ? "default" : "pointer", opacity: r.locked ? 0.45 : 1, transition: "all 0.15s" }}>
                          {insight.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Name search */}
              <div ref={searchWrapRef} style={{ position: "relative", zIndex: 100 }}>
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
                    style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 4, padding: "8px 14px", color: C.text, fontSize: 14, outline: "none" }}
                  />
                  {nameSearch && (
                    <button onClick={() => { setTypeaheadResults([]); runNameSearch(nameSearch.startsWith("@") ? nameSearch.slice(1) : nameSearch); }}
                      style={{ background: C.accent, border: "none", borderRadius: 4, padding: "8px 16px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      Search
                    </button>
                  )}
                </div>
                {typeaheadResults.length > 0 && dropdownRect && ReactDOM.createPortal(
                  <div style={{ position: "fixed", top: dropdownTop, left: dropdownLeft, width: dropdownWidth, background: C.surface, border: "1px solid " + C.border, borderRadius: 4, zIndex: 2000, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                    {typeaheadResults.map((g, i) => (
                      <div key={g.id || g.igdb_id} onMouseDown={async () => {
                        if (g._fromIGDB) {
                          const { data: inserted } = await supabase.from("games").insert({ name: g.name, genre: g.genre, summary: g.summary, cover_url: g.cover_url, igdb_id: g.igdb_id, first_release_date: g.first_release_date, followers: 0 }).select().single();
                          if (inserted) { setCurrentGame(inserted.id); setActivePage("game"); window.history.pushState({ page: "game", gameId: inserted.id }, "", `/game/${inserted.id}`); }
                        } else { setCurrentGame(g.id); setActivePage("game"); window.history.pushState({ page: "game", gameId: g.id }, "", `/game/${g.id}`); }
                        setTypeaheadResults([]); setNameSearch("");
                      }}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderBottom: i < typeaheadResults.length - 1 ? "1px solid " + C.border : "none", background: C.surface }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                        onMouseLeave={e => e.currentTarget.style.background = C.surface}>
                        {g.cover_url
                          ? <img src={g.cover_url} alt="" style={{ width: 24, height: 32, borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />
                          : <div style={{ width: 24, height: 32, borderRadius: 2, background: C.surfaceRaised, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🎮</div>
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
                  </div>,
                  document.body
                )}
              </div>
            </div>
          )}
        </PixelCornerBox>
      )}

      {/* ── Discovery Results ── */}
      {(discoveryResults !== null || discoveryLoading) && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>
              {discoveryLoading ? "Finding games…" : discoveryLabel + (discoveryResults === "__empty_shelf__" ? "" : " · " + (discoveryResults?.length || 0) + " game" + (discoveryResults?.length !== 1 ? "s" : ""))}
            </div>
            <button onClick={clearDiscovery} style={{ background: "transparent", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Clear</button>
          </div>
          {discoveryLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
              {[...Array(8)].map((_, i) => <div key={i} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 4, height: 90 }} />)}
            </div>
          ) : discoveryResults === "__empty_shelf__" ? (
            <PixelCornerBox size="lg" borderColor={C.border} bg={C.surface} style={{ padding: "40px 24px", textAlign: "center" }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Add games to your shelf first</div>
              <div style={{ color: C.textDim, fontSize: 13, lineHeight: 1.6, maxWidth: 360, margin: "0 auto" }}>
                The more you curate your shelf, the better your recommendations get. Search for games above to get started.
              </div>
            </PixelCornerBox>
          ) : discoveryResults?.length === 0 ? (
            <PixelCornerBox size="lg" borderColor={C.border} bg={C.surface} style={{ padding: "40px 24px", textAlign: "center", color: C.textDim }}>
              No results found. Try a different approach.
            </PixelCornerBox>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
              {discoveryResults.map(g => {
                const cardId = g.id || g.igdb_id;
                const onShelf = userShelf.has(g.id);
                const menuOpen = shelfMenuOpen === cardId;
                const navigateToGame = async () => {
                  if (menuOpen) { setShelfMenuOpen(null); return; }
                  if (g._fromIGDB) {
                    const { data: inserted } = await supabase.from("games").insert({ name: g.name, genre: g.genre, summary: g.summary, cover_url: g.cover_url, igdb_id: g.igdb_id, first_release_date: g.first_release_date, followers: 0 }).select().single();
                    if (inserted) { setCurrentGame(inserted.id); setActivePage("game"); window.history.pushState({ page: "game", gameId: inserted.id }, "", "/game/" + inserted.id); }
                  } else { setCurrentGame(g.id); setActivePage("game"); window.history.pushState({ page: "game", gameId: g.id }, "", "/game/" + g.id); }
                };
                return (
                  <PixelCornerBox key={cardId} size="lg" borderColor={onShelf ? C.accentDim : C.border} bg={C.surface} style={{ cursor: "pointer", position: "relative", alignSelf: "start", minWidth: 0 }}>
                    {menuOpen && ReactDOM.createPortal(
                      <div onClick={() => setShelfMenuOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />,
                      document.body
                    )}
                    {menuOpen && (
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: C.bg, zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 12px", gap: 8 }}>
                        <div style={{ color: C.text, fontWeight: 700, fontSize: 12, textAlign: "center", marginBottom: 4 }}>{g.name}</div>
                        {[{ id: "want_to_play", label: "Want to Play" }, { id: "playing", label: "Playing Now" }, { id: "have_played", label: "Have Played" }, { id: "not_for_me", label: "Not Interested" }].map(opt => {
                          const optColor = opt.id === "playing" ? C.green : opt.id === "want_to_play" ? C.accent : opt.id === "have_played" ? C.gold : C.red;
                          return (
                            <div key={opt.id} style={{ padding: "1px 0" }}>
                              <PixelButton key={opt.id} fullWidth size="xs" bg={C.surface} borderColor={optColor} color={optColor} style={{ justifyContent: "center" }} onClick={async e => {
                                e.stopPropagation();
                                const { data: { user: authUser } } = await supabase.auth.getUser();
                                if (!authUser) return;
                                await supabase.from("user_games").upsert({ user_id: authUser.id, game_id: g.id, status: opt.id, updated_at: new Date().toISOString() }, { onConflict: "user_id,game_id" });
                                const eventMap = { playing: "shelf_playing", want_to_play: "shelf_want", have_played: "shelf_played" };
                                if (eventMap[opt.id]) logChartEvent(g.id, eventMap[opt.id], authUser.id);
                                setUserShelf(prev => new Set([...prev, g.id]));
                                if (opt.id === "not_for_me") {
                                  setDiscoveryResults(prev => prev.filter(r => r.id !== g.id));
                                }
                                setShelfMenuOpen(null);
                              }}>{opt.label}</PixelButton>
                            </div>
                          );
                        })}
                        <button onClick={e => { e.stopPropagation(); setShelfMenuOpen(null); }}
                          style={{ background: "transparent", border: "none", color: C.textDim, fontSize: 12, cursor: "pointer", marginTop: 4, textAlign: "center" }}>
                          Cancel
                        </button>
                      </div>
                    )}
                    <div style={{ width: "100%", height: 200, flexShrink: 0, background: "#0a0f1a" }} onClick={navigateToGame}>
                      {g.cover_url
                        ? <img src={g.cover_url} alt={g.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                        : <div style={{ width: "100%", height: "100%", background: C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🎮</div>
                      }
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 2, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                      {g._stat && (
                        <div style={{ color: C.textDim, fontSize: 10, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{g._stat}</div>
                      )}
                      {currentUser && !g._fromIGDB && !onShelf && (
                        <div style={{ padding: "1px 0" }}>
                          <PixelButton fullWidth size="xs" bg={C.surface} borderColor={C.goldBorder} color={C.gold} style={{ justifyContent: "center" }} onClick={e => { e.stopPropagation(); setShelfMenuOpen(menuOpen ? null : cardId); }}>
                            {"+ Add to Shelf"}
                          </PixelButton>
                        </div>
                      )}
                    </div>
                  </PixelCornerBox>
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
          <PixelCornerBox size="lg" borderColor={C.border} bg={C.surface} style={{ marginBottom: 32, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Top 10 Overall</div>
                <div style={{ color: C.textDim, fontSize: 12 }}>Last 8 days</div>
              </div>
              <ShareChartsButton
                games={overall.slice(0, 10).map((entry, i) => {
                  const prev = prevRanks[entry.id];
                  const change = prev ? prev - (i + 1) : 0;
                  return { name: entry.name, change };
                })}
              />
            </div>
            {overall.map((entry, i) => <ChartRow key={entry.id} entry={entry} rank={i + 1} section="overall" />)}
          </PixelCornerBox>

          {emerging.length > 0 && (
            <PixelCornerBox size="lg" borderColor={C.border} bg={C.surface} style={{ marginBottom: 32, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Emerging</div>
                  <div style={{ color: C.textDim, fontSize: 12 }}>Games gaining new momentum this week</div>
                </div>
                <ShareChartsButton
                  games={emerging.slice(0, 10).map((entry, i) => ({ name: entry.name, change: 0 }))}
                  label="Emerging"
                />
              </div>
              {emerging.map((entry, i) => <ChartRow key={entry.id} entry={entry} rank={i + 1} section="emerging" />)}
            </PixelCornerBox>
          )}

          {(() => {
            const genreEntries = Object.entries(byGenre).filter(([, games]) => games.length >= 1);
            if (genreEntries.length === 0) return null;
            return (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>By Genre</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, alignItems: "start" }}>
                  {genreEntries.map(([genre, games]) => {
                    const fullList = byGenreFull[genre] || games;
                    const isExpanded = expandedGenreAll.has(genre);
                    const displayList = isExpanded ? fullList : games;
                    const hasMore = fullList.length > games.length;
                    return (
                      <PixelCornerBox key={genre} size="lg" borderColor={C.border} bg={C.surface} style={{ overflow: "hidden" }}>
                        <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{genre}</div>
                          <ShareChartsButton
                            games={fullList.slice(0, 10).map((entry, i) => {
                              const prev = prevRanks[entry.id];
                              const change = prev ? prev - (i + 1) : 0;
                              return { name: entry.name, change };
                            })}
                            label={genre + " Charts"}
                          />
                        </div>
                        {displayList.map((entry, i) => <ChartRow key={entry.id} entry={entry} rank={i + 1} section={genre} />)}
                        {(hasMore || isExpanded) && (
                          <button onClick={() => setExpandedGenreAll(prev => { const n = new Set(prev); isExpanded ? n.delete(genre) : n.add(genre); return n; })}
                            style={{ margin: "10px 16px 14px", background: "transparent", border: "1px solid " + C.border, borderRadius: 3, padding: "7px", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", width: "calc(100% - 32px)" }}>
                            {isExpanded ? "Show less" : "See all " + fullList.length + " in " + genre + " →"}
                          </button>
                        )}
                      </PixelCornerBox>
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
