import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo } from "../utils.js";
import { Avatar } from "../components/Avatar.jsx";
import { Badge } from "../components/FoundingBadge.jsx";

function AdminPage({ isMobile, currentUser, setActivePage, setCurrentPlayer }) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [chartEvents, setChartEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [feedbackData, setFeedbackData] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [enriching, setEnriching] = useState({});
  const [enrichMsg, setEnrichMsg] = useState({});
  const [mostWanted, setMostWanted] = useState([]);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Check if this user has is_admin flag in profiles
      const { data: profile } = await supabase.from("profiles").select("is_admin, is_writer, username").eq("id", user.id).single();
      if (profile?.is_admin) {
        setAuthorized(true);
        loadAll();
      } else {
        setAuthorized(false);
        setLoading(false);
      }
    };
    check();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [usersRes, postsRes, reviewsRes, chartRes, weekPostsRes, dayPostsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, handle, created_at, is_founding, is_admin").order("created_at", { ascending: false }).limit(50),
      supabase.from("posts").select("*, profiles!posts_user_id_fkey(username, handle), npcs(name)").order("created_at", { ascending: false }).limit(30),
      supabase.from("reviews").select("*, profiles(username, avatar_initials, active_ring, is_founding, avatar_config), games(name)").order("created_at", { ascending: false }).limit(20),
      supabase.from("chart_events").select("game_id, event_type, games(name)").gte("created_at", oneWeekAgo),
      supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo),
      supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", oneDayAgo),
    ]);

    if (usersRes.data) setUsers(usersRes.data);
    if (postsRes.data) setPosts(postsRes.data);
    if (reviewsRes.data) setReviews(reviewsRes.data);

    // Load all games for the Games tab
    const { data: gamesData } = await supabase.from("games").select("id, name, genre, igdb_id, cover_url, summary").order("name");
    if (gamesData) setAllGames(gamesData);

    // Analytics
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: analyticsEvents } = await supabase.from("analytics_events")
      .select("user_id, event_type, page, created_at")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false });
    if (analyticsEvents) {
      const byPage = {}, byDay = {}, uniqueUsers = new Set();
      analyticsEvents.forEach(e => {
        if (e.user_id) uniqueUsers.add(e.user_id);
        if (e.page) byPage[e.page] = (byPage[e.page] || 0) + 1;
        const day = e.created_at.split("T")[0];
        if (!byDay[day]) byDay[day] = new Set();
        if (e.user_id) byDay[day].add(e.user_id);
      });
      setAnalyticsData({
        totalEvents: analyticsEvents.length,
        uniqueUsers: uniqueUsers.size,
        byPage: Object.entries(byPage).sort((a,b) => b[1]-a[1]),
        dailyActiveUsers: Object.entries(byDay).map(([day, users]) => ({ day, count: users.size })).sort((a,b) => a.day.localeCompare(b.day)),
      });
    }

    // Feedback
    const { data: fbData } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
    if (fbData) setFeedbackData(fbData);

    // Most Wanted — shelf elevations last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: elevData } = await supabase.from("shelf_elevations")
      .select("game_id, to_position, from_position, created_at, games(id, name, cover_url)")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false });
    if (elevData) {
      const byGame = {};
      elevData.forEach(r => {
        if (!r.games) return;
        if (!byGame[r.game_id]) byGame[r.game_id] = { game: r.games, elevations: 0, topSlotCount: 0, score: 0, latestAt: r.created_at };
        const posWeight = r.to_position === 0 ? 1.0 : r.to_position === 1 ? 0.8 : r.to_position === 2 ? 0.6 : 0.4;
        const magnitude = Math.max(0, r.from_position - r.to_position);
        byGame[r.game_id].elevations++;
        byGame[r.game_id].score += posWeight + (magnitude * 0.1);
        if (r.to_position === 0) byGame[r.game_id].topSlotCount++;
        if (r.created_at > byGame[r.game_id].latestAt) byGame[r.game_id].latestAt = r.created_at;
      });
      setMostWanted(Object.values(byGame).sort((a, b) => b.score - a.score).slice(0, 20));
    }

    // Aggregate chart events by game
    if (chartRes.data) {
      const byGame = {};
      chartRes.data.forEach(e => {
        const name = e.games?.name || e.game_id;
        if (!byGame[name]) byGame[name] = { name, total: 0, types: {} };
        byGame[name].total++;
        byGame[name].types[e.event_type] = (byGame[name].types[e.event_type] || 0) + 1;
      });
      setChartEvents(Object.values(byGame).sort((a, b) => b.total - a.total).slice(0, 15));
    }

    const newUsersWeek = usersRes.data?.filter(u => new Date(u.created_at) > new Date(oneWeekAgo)).length || 0;
    setStats({
      totalUsers: usersRes.data?.length || 0,
      newUsersWeek,
      postsWeek: weekPostsRes.count || 0,
      postsToday: dayPostsRes.count || 0,
      totalReviews: reviewsRes.data?.length || 0,
    });
    setLoading(false);
  };

  if (loading) return <div style={{ maxWidth: 900, margin: "0 auto", padding: "100px 20px", textAlign: "center", color: C.textMuted }}>Loading admin data...</div>;

  if (!authorized) return (
    <div style={{ maxWidth: 500, margin: "100px auto", textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontWeight: 800, color: C.text, fontSize: 20, marginBottom: 8 }}>Access Denied</div>
      <div style={{ color: C.textMuted, fontSize: 14, marginBottom: 24 }}>You need admin privileges to view this page.</div>
      <button onClick={() => setActivePage("feed")} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "10px 24px", color: C.accentText, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Back to Feed</button>
    </div>
  );

  const tabs = [
    { id: "overview", label: "📊 Overview" },
    { id: "analytics", label: "📈 Analytics" },
    { id: "feedback", label: "💬 Feedback" },
    { id: "users", label: "👤 Users" },
    { id: "posts", label: "📝 Posts" },
    { id: "charts", label: "🏆 Chart Activity" },
    { id: "reviews", label: "⭐ Reviews" },
    { id: "games", label: "🎮 Games" },
    { id: "most_wanted", label: "🎯 Most Wanted" },
  ];

  const enrichGame = async (game) => {
    setEnriching(prev => ({ ...prev, [game.id]: true }));
    try {
      const res = await fetch("/api/igdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: game.name }),
      });
      const { games } = await res.json();
      if (!games?.length) { setEnrichMsg(prev => ({ ...prev, [game.id]: "Not found" })); return; }
      const match = games.find(g => g.name.toLowerCase() === game.name.toLowerCase()) || games[0];
      const updates = {};
      if (match.cover_url) updates.cover_url = match.cover_url;
      if (match.summary) updates.summary = match.summary;
      if (match.igdb_id) updates.igdb_id = match.igdb_id;
      if (match.genre && !game.genre) updates.genre = match.genre;
      if (Object.keys(updates).length === 0) { setEnrichMsg(prev => ({ ...prev, [game.id]: "No new data" })); return; }
      const { error } = await supabase.from("games").update(updates).eq("id", game.id);
      if (error) { setEnrichMsg(prev => ({ ...prev, [game.id]: "Error" })); return; }
      setAllGames(prev => prev.map(g => g.id === game.id ? { ...g, ...updates } : g));
      setEnrichMsg(prev => ({ ...prev, [game.id]: "✓ Updated" }));
    } catch { setEnrichMsg(prev => ({ ...prev, [game.id]: "Failed" })); }
    finally { setEnriching(prev => ({ ...prev, [game.id]: false })); }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: isMobile ? 20 : 26, color: C.text }}>Admin Dashboard</h2>
          <div style={{ color: C.textDim, fontSize: 13 }}>GuildLink Activity Monitor</div>
        </div>
        <button onClick={loadAll} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>↻ Refresh</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? C.accentGlow : C.surface, border: "1px solid " + tab === t.id ? C.accentDim : C.border, borderRadius: 8, padding: "7px 14px", color: tab === t.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: tab === t.id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      {/* Analytics */}
      {tab === "analytics" && (
        <div>
          {!analyticsData ? (
            <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", padding: 40 }}>No analytics data yet. Data populates as users navigate the platform.</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
                {[
                  { label: "Page Views (7d)", value: analyticsData.totalEvents, color: C.accent },
                  { label: "Unique Users (7d)", value: analyticsData.uniqueUsers, color: C.online },
                  { label: "Avg Daily Active", value: analyticsData.dailyActiveUsers.length ? Math.round(analyticsData.dailyActiveUsers.reduce((s,d) => s + d.count, 0) / analyticsData.dailyActiveUsers.length) : 0, color: C.gold },
                ].map(s => (
                  <div key={s.label} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: 18, textAlign: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: 28, color: s.color }}>{s.value}</div>
                    <div style={{ color: C.textDim, fontSize: 12, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 14 }}>Time Spent by Page</div>
                  {analyticsData.byPage.map(([page, count]) => {
                    const pct = Math.round((count / analyticsData.totalEvents) * 100);
                    return (
                      <div key={page} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: C.text, fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{page}</span>
                          <span style={{ color: C.textDim, fontSize: 12 }}>{count} views · {pct}%</span>
                        </div>
                        <div style={{ height: 6, background: C.surfaceRaised, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: pct + "%", background: C.accent, borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 14 }}>Daily Active Users (7d)</div>
                  {analyticsData.dailyActiveUsers.length === 0 ? (
                    <div style={{ color: C.textDim, fontSize: 13 }}>No data yet.</div>
                  ) : analyticsData.dailyActiveUsers.map(({ day, count }) => (
                    <div key={day} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <div style={{ color: C.textDim, fontSize: 12, width: 90, flexShrink: 0 }}>{day}</div>
                      <div style={{ flex: 1, height: 20, background: C.surfaceRaised, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: Math.max(4, (count / Math.max(...analyticsData.dailyActiveUsers.map(d => d.count))) * 100) + "%", background: C.accent + "99", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6 }}>
                          <span style={{ color: C.text, fontSize: 10, fontWeight: 700 }}>{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Feedback */}
      {tab === "feedback" && (
        <div>
          {feedbackData.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", padding: 40 }}>No feedback submitted yet.</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Total Responses", value: feedbackData.length, color: C.accent },
                  { label: "Avg Rating", value: (feedbackData.reduce((s,f) => s + (f.rating||0), 0) / feedbackData.length).toFixed(1) + "/10", color: C.gold },
                  { label: "Rating ≥ 7", value: feedbackData.filter(f => f.rating >= 7).length, color: C.online },
                  { label: "Rating < 5", value: feedbackData.filter(f => f.rating < 5).length, color: C.red },
                ].map(s => (
                  <div key={s.label} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: 16, textAlign: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: 24, color: s.color }}>{s.value}</div>
                    <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {feedbackData.map(f => (
                <div key={f.id} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{f.username || "Anonymous"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ background: f.rating >= 7 ? C.online + "22" : f.rating >= 5 ? C.gold + "22" : C.red + "22", color: f.rating >= 7 ? C.online : f.rating >= 5 ? C.gold : C.red, borderRadius: 8, padding: "3px 10px", fontWeight: 800, fontSize: 13 }}>{f.rating}/10</div>
                      <div style={{ color: C.textDim, fontSize: 11 }}>{new Date(f.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  {f.liked && <div style={{ marginBottom: 8 }}><span style={{ color: C.online, fontSize: 11, fontWeight: 700 }}>LIKED · </span><span style={{ color: C.textMuted, fontSize: 13 }}>{f.liked}</span></div>}
                  {f.confused && <div style={{ marginBottom: 8 }}><span style={{ color: C.gold, fontSize: 11, fontWeight: 700 }}>CONFUSED · </span><span style={{ color: C.textMuted, fontSize: 13 }}>{f.confused}</span></div>}
                  {f.missing && <div><span style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>MISSING · </span><span style={{ color: C.textMuted, fontSize: 13 }}>{f.missing}</span></div>}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Overview */}
      {tab === "overview" && stats && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
            {[
              { label: "Total Users", value: stats.totalUsers, color: C.accent, icon: "👤" },
              { label: "New This Week", value: stats.newUsersWeek, color: C.online, icon: "🆕" },
              { label: "Posts This Week", value: stats.postsWeek, color: C.accentSoft, icon: "📝" },
              { label: "Posts Today", value: stats.postsToday, color: C.gold, icon: "🔥" },
              { label: "Reviews", value: stats.totalReviews, color: "#0d9488", icon: "⭐" },
            ].map(s => (
              <div key={s.label} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 26, color: s.color, marginBottom: 4 }}>{s.value}</div>
                <div style={{ color: C.textDim, fontSize: 11 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent signups preview */}
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>Recent Signups</div>
            {users.slice(0, 5).map(u => (
              <div key={u.id} onClick={() => { setCurrentPlayer(u.id); setActivePage("player"); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid " + C.border, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <Avatar initials={(u.username || "?").slice(0,2).toUpperCase()} size={32} founding={u.is_founding} ring={u.active_ring} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{u.username || "—"} <span style={{ color: C.textDim, fontWeight: 400 }}>{u.handle}</span></div>
                  <div style={{ color: C.textDim, fontSize: 11 }}>{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                {u.is_founding && <Badge small color={C.gold}>⚔️ Founding</Badge>}
                {u.is_admin && <Badge small color={C.accent}>Admin</Badge>}
              </div>
            ))}
            <button onClick={() => setTab("users")} style={{ background: "none", border: "none", color: C.accentSoft, fontSize: 13, cursor: "pointer", marginTop: 10, padding: 0 }}>View all users →</button>
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid " + C.border, fontWeight: 700, color: C.text, fontSize: 13 }}>
            {users.length} users (most recent first)
          </div>
          {users.map((u, i) => (
            <div key={u.id} onClick={() => { setCurrentPlayer(u.id); setActivePage("player"); }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < users.length - 1 ? "1px solid " + C.border : "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ color: C.textDim, fontSize: 12, width: 24, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
              <Avatar initials={(u.username || "?").slice(0,2).toUpperCase()} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{u.username || "—"} <span style={{ color: C.textDim, fontWeight: 400, fontSize: 12 }}>{u.handle}</span></div>
                <div style={{ color: C.textDim, fontSize: 11 }}>Joined {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {u.is_founding && <Badge small color={C.gold}>⚔️</Badge>}
                {u.is_admin && <Badge small color={C.accent}>Admin</Badge>}
              </div>
              <div style={{ color: C.textDim, fontSize: 12, flexShrink: 0 }}>→</div>
            </div>
          ))}
        </div>
      )}

      {/* Posts tab */}
      {tab === "posts" && (
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid " + C.border, fontWeight: 700, color: C.text, fontSize: 13 }}>
            Last 30 posts
          </div>
          {posts.map((p, i) => {
            const author = p.profiles?.username || p.npcs?.name || "Unknown";
            const isNPC = !!p.npc_id;
            return (
              <div key={p.id} style={{ padding: "12px 20px", borderBottom: i < posts.length - 1 ? "1px solid " + C.border : "none" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: isNPC ? C.gold : C.accent, fontSize: 12, fontWeight: 600 }}>{author}</span>
                  {isNPC && <Badge small color={C.gold}>NPC</Badge>}
                  <span style={{ color: C.textDim, fontSize: 11, marginLeft: "auto" }}>{timeAgo(p.created_at)}</span>
                  <span style={{ color: C.red, fontSize: 12 }}>♥ {p.likes || 0}</span>
                </div>
                <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.content}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart Activity tab */}
      {tab === "charts" && (
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid " + C.border, fontWeight: 700, color: C.text, fontSize: 13 }}>
            Chart events this week — top 15 games
          </div>
          {chartEvents.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No chart events yet this week.</div>}
          {chartEvents.map((g, i) => (
            <div key={g.name} style={{ padding: "12px 20px", borderBottom: i < chartEvents.length - 1 ? "1px solid " + C.border : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ color: C.textDim, fontSize: 12, width: 20 }}>#{i + 1}</span>
                <span style={{ color: C.text, fontSize: 13, fontWeight: 600, flex: 1 }}>{g.name}</span>
                <span style={{ color: C.accent, fontSize: 13, fontWeight: 700 }}>{g.total} events</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: 30 }}>
                {Object.entries(g.types).map(([type, count]) => (
                  <span key={type} style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: C.textMuted }}>{type}: {count}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reviews tab */}
      {tab === "reviews" && (
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid " + C.border, fontWeight: 700, color: C.text, fontSize: 13 }}>
            Last 20 reviews
          </div>
          {reviews.map((r, i) => (
            <div key={r.id} style={{ padding: "12px 20px", borderBottom: i < reviews.length - 1 ? "1px solid " + C.border : "none" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: C.accent, fontSize: 12, fontWeight: 600 }}>{r.profiles?.username || "—"}</span>
                <span style={{ color: C.textDim, fontSize: 12 }}>reviewed</span>
                <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{r.games?.name || "—"}</span>
                <span style={{ color: C.gold, fontSize: 12, marginLeft: "auto" }}>{"★".repeat(r.rating || 0)}</span>
                <span style={{ color: C.textDim, fontSize: 11 }}>{timeAgo(r.created_at)}</span>
              </div>
              {r.headline && <div style={{ color: C.textMuted, fontSize: 13, fontStyle: "italic" }}>"{r.headline}"</div>}
            </div>
          ))}
        </div>
      )}

      {/* Games tab */}
      {tab === "games" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ color: C.textMuted, fontSize: 13 }}>{allGames.length} games · {allGames.filter(g => g.cover_url).length} with cover art · {allGames.filter(g => !g.igdb_id).length} not yet enriched</div>
            <button onClick={async () => {
              // Enrich all games missing cover art
              const missing = allGames.filter(g => !g.cover_url);
              for (const game of missing) {
                await enrichGame(game);
              }
            }} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 14px", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>
              Enrich All Missing →
            </button>
          </div>
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
            {allGames.map((game, i) => (
              <div key={game.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < allGames.length - 1 ? "1px solid " + C.border : "none" }}>
                {game.cover_url
                  ? <img src={game.cover_url} alt="" style={{ width: 48, height: 64, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 48, height: 64, borderRadius: 5, background: C.surfaceRaised, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎮</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                  <div style={{ color: C.textDim, fontSize: 11 }}>{game.genre || "No genre"} · {game.igdb_id ? `IGDB #${game.igdb_id}` : "No IGDB ID"}</div>
                </div>
                <div style={{ fontSize: 11, color: enrichMsg[game.id] ? C.teal : C.textDim, minWidth: 80, textAlign: "right" }}>
                  {enrichMsg[game.id] || (game.cover_url ? "✓ Has art" : "No art")}
                </div>
                <button
                  onClick={() => enrichGame(game)}
                  disabled={enriching[game.id]}
                  style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 7, padding: "5px 12px", color: C.accentSoft, fontSize: 11, fontWeight: 600, cursor: enriching[game.id] ? "default" : "pointer", flexShrink: 0, opacity: enriching[game.id] ? 0.6 : 1 }}>
                  {enriching[game.id] ? "…" : "Enrich"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "most_wanted" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 4 }}>Most Wanted</div>
            <div style={{ color: C.textMuted, fontSize: 13 }}>Games players have elevated on their Want to Play lists — last 30 days. Score weights landing position and jump magnitude.</div>
          </div>
          {mostWanted.length === 0 ? (
            <div style={{ color: C.textDim, fontSize: 13, textAlign: "center", padding: 60 }}>No elevation data yet. Start reordering Want to Play shelves to generate signal.</div>
          ) : (
            <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 80px 80px 80px 100px", gap: 0, padding: "8px 16px", borderBottom: "1px solid " + C.border }}>
                {["#", "Game", "Elevations", "#1 Slots", "Score", "Last Elevated"].map(h => (
                  <div key={h} style={{ color: C.textDim, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</div>
                ))}
              </div>
              {mostWanted.map((entry, i) => (
                <div key={entry.game.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr 80px 80px 80px 100px", gap: 0, padding: "12px 16px", borderBottom: i < mostWanted.length - 1 ? "1px solid " + C.border : "none", alignItems: "center" }}>
                  <div style={{ fontWeight: 800, color: i < 3 ? C.gold : C.textDim, fontSize: 13 }}>{i + 1}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {entry.game.cover_url
                      ? <img src={entry.game.cover_url} alt="" style={{ width: 24, height: 32, borderRadius: 3, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 24, height: 32, borderRadius: 3, background: C.surfaceRaised, flexShrink: 0 }} />
                    }
                    <div style={{ fontWeight: 600, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.game.name}</div>
                  </div>
                  <div style={{ color: C.text, fontSize: 13 }}>{entry.elevations}</div>
                  <div style={{ color: entry.topSlotCount > 0 ? C.gold : C.textDim, fontSize: 13, fontWeight: entry.topSlotCount > 0 ? 700 : 400 }}>{entry.topSlotCount}</div>
                  <div style={{ color: C.accentSoft, fontSize: 13, fontWeight: 700 }}>{entry.score.toFixed(1)}</div>
                  <div style={{ color: C.textDim, fontSize: 11 }}>{new Date(entry.latestAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPage;
