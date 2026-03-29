import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo } from "../utils.js";
import { Avatar } from "../components/Avatar.jsx";

function ReviewsPage({ isMobile, currentUser, setActivePage, setCurrentGame, setCurrentPlayer, setGameDefaultTab }) {
  const [tab, setTab] = useState("feed");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameSearch, setGameSearch] = useState("");
  const [gameResults, setGameResults] = useState([]);
  const [gameSearchLoading, setGameSearchLoading] = useState(false);
  const [topRated, setTopRated] = useState([]);

  const loadReviews = async (mode) => {
    setLoading(true);
    setReviews([]);
    if (mode === "feed") {
      const { data, error } = await supabase.from("reviews")
        .select("id, rating, headline, loved, didnt_love, content, time_played, completed, created_at, user_id, game_id, profiles(id, username, handle, avatar_initials, is_founding, active_ring, avatar_config), games(id, name, genre, cover_url)")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) console.error("Reviews feed error:", error);
      setReviews(data || []);
    } else if (mode === "following") {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoading(false); return; }
      const { data: follows } = await supabase.from("follows")
        .select("followed_user_id").eq("follower_id", authUser.id);
      const ids = (follows || []).map(f => f.followed_user_id).filter(Boolean);
      if (!ids.length) { setLoading(false); return; }
      const { data, error } = await supabase.from("reviews")
        .select("id, rating, headline, loved, didnt_love, content, time_played, completed, created_at, user_id, game_id, profiles(id, username, handle, avatar_initials, is_founding, active_ring, avatar_config), games(id, name, genre, cover_url)")
        .in("user_id", ids)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) console.error("Reviews following error:", error);
      setReviews(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { if (tab !== "by_game") loadReviews(tab); }, [tab]);

  useEffect(() => {
    const loadTopRated = async () => {
      const { data } = await supabase.from("reviews").select("game_id, rating, games(id, name)");
      if (!data) return;
      const agg = {};
      data.forEach(r => {
        if (!r.games) return;
        if (!agg[r.game_id]) agg[r.game_id] = { id: r.games.id, name: r.games.name, total: 0, count: 0 };
        agg[r.game_id].total += r.rating;
        agg[r.game_id].count += 1;
      });
      const ranked = Object.values(agg)
        .map(g => ({ ...g, avg: g.total / g.count }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 10);
      setTopRated(ranked);
    };
    loadTopRated();
  }, []);

  const searchGames = async (q) => {
    setGameSearch(q);
    const clean = q.replace(/^@/, "");
    if (clean.length < 2) { setGameResults([]); return; }
    setGameSearchLoading(true);
    const { data, error } = await supabase.from("games")
      .select("id, name, genre")
      .ilike("name", "%" + clean + "%")
      .limit(12);
    if (error) console.error("Game search error:", error);
    setGameResults(data || []);
    setGameSearchLoading(false);
  };

  const TABS = [
    { id: "feed", label: "All Reviews" },
    { id: "following", label: "Following" },
    { id: "by_game", label: "By Game" },
  ];

  const ReviewCard = ({ review }) => {
    const profile = review.profiles;
    const game = review.games;
    if (!game) return null;
    const initials = (profile?.avatar_initials || profile?.username || "?").slice(0,2).toUpperCase();
    const coverW = isMobile ? 72 : 96;
    return (
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
        <div style={{ display: "flex" }}>
          <div onClick={() => { setCurrentGame(game.id); setActivePage("game"); }}
            style={{ width: coverW, flexShrink: 0, cursor: "pointer", alignSelf: "stretch", overflow: "hidden", position: "relative" }}>
            {game.cover_url
              ? <img src={game.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: coverW * 1.4 }} />
              : <div style={{ width: "100%", minHeight: coverW * 1.4, background: C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🎮</div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0, padding: isMobile ? "12px 14px" : "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <span onClick={() => { setCurrentGame(game.id); setActivePage("game"); }}
                style={{ fontWeight: 800, color: C.text, fontSize: isMobile ? 14 : 16, cursor: "pointer", lineHeight: 1.3 }}>
                {game.name}
              </span>
              <div style={{ background: C.goldDim, border: "1px solid " + C.gold + "44", borderRadius: 8, padding: "3px 10px", color: C.gold, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                {review.rating}/10
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div onClick={() => profile?.id && (setCurrentPlayer(profile.id), setActivePage("player"))} style={{ cursor: profile?.id ? "pointer" : "default", flexShrink: 0 }}>
                <Avatar initials={initials} size={20} founding={profile?.is_founding} ring={profile?.active_ring} avatarConfig={profile?.avatar_config} />
              </div>
              <span onClick={() => { if (profile?.id) { setCurrentPlayer(profile.id); setActivePage("player"); } }}
                style={{ fontWeight: 600, color: C.textMuted, fontSize: 12, cursor: profile?.id ? "pointer" : "default" }}>
                {profile?.username || "Guildies Member"}
              </span>
              <span style={{ color: C.textDim, fontSize: 11 }}>· {timeAgo(review.created_at)}</span>
              {review.time_played && <span style={{ color: C.textDim, fontSize: 11 }}>· {review.time_played}h</span>}
              {currentUser && review.user_id === currentUser.id && (
                <button onClick={() => { setGameDefaultTab?.("reviews"); setCurrentGame(game.id); setActivePage("game"); }}
                  style={{ marginLeft: "auto", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 6, padding: "2px 8px", color: C.textMuted, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>Edit</button>
              )}
            </div>
            {review.headline && <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{review.headline}</div>}
            {review.loved && <div style={{ color: C.textMuted, fontSize: 12 }}>✓ {review.loved}</div>}
            {review.didnt_love && <div style={{ color: C.textDim, fontSize: 12 }}>✗ {review.didnt_love}</div>}
          </div>
        </div>
        {review.content && (
          <div style={{ padding: isMobile ? "10px 14px 12px" : "10px 16px 14px", borderTop: "1px solid " + C.border }}>
            <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{review.content}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 24px 40px" }}>
      <div style={{ fontWeight: 800, fontSize: isMobile ? 22 : 28, color: C.text, letterSpacing: "-0.5px", marginBottom: 6 }}>Reviews</div>
      <div style={{ color: C.textMuted, fontSize: 14, marginBottom: 24 }}>What the community thinks about the games they've played.</div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: 4, marginBottom: 20, gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, background: tab === t.id ? C.accentGlow : "transparent", border: "1px solid " + (tab === t.id ? C.accentDim : "transparent"), borderRadius: 9, padding: "8px 12px", color: tab === t.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                {t.label}
              </button>
            ))}
          </div>

          {(tab === "feed" || tab === "following") && (
            <>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1,2,3].map(i => <div key={i} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, height: 120 }} />)}
                </div>
              ) : reviews.length === 0 ? (
                <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "60px 24px", textAlign: "center" }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                    {tab === "following" ? "No reviews from people you follow yet." : "No reviews yet."}
                  </div>
                  <div style={{ color: C.textMuted, fontSize: 13 }}>
                    {tab === "following" ? "Follow more gamers to see their reviews here." : "Be the first to review a game."}
                  </div>
                </div>
              ) : (
                reviews.map(r => <ReviewCard key={r.id} review={r} />)
              )}
            </>
          )}

          {tab === "by_game" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <input
                  value={gameSearch}
                  onChange={e => searchGames(e.target.value)}
                  placeholder="Search by name or @game..."
                  autoFocus
                  style={{ width: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              {gameSearch.length < 2 ? (
                <div style={{ color: C.textDim, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Type a game name to find its reviews.</div>
              ) : gameSearchLoading ? (
                <div style={{ color: C.textDim, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Searching...</div>
              ) : gameResults.length === 0 ? (
                <div style={{ color: C.textDim, fontSize: 13, textAlign: "center", padding: "40px 0" }}>No games found for "{gameSearch.replace(/^@/, "")}".</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {gameResults.map(g => (
                    <div key={g.id} onClick={() => { setGameDefaultTab?.("reviews"); setCurrentGame(g.id); setActivePage("game"); }}
                      style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = C.accentDim}
                      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{g.name}</div>
                        <div style={{ color: C.textDim, fontSize: 12, marginTop: 2 }}>{g.genre}</div>
                      </div>
                      <div style={{ color: C.accentSoft, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>See reviews →</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!isMobile && (
          <div style={{ width: 220, flexShrink: 0 }}>
            <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid " + C.border }}>
                <div style={{ fontWeight: 800, color: C.text, fontSize: 13 }}>Top Rated</div>
                <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>By avg. community rating</div>
              </div>
              {topRated.length === 0 ? (
                <div style={{ padding: 16, color: C.textDim, fontSize: 12 }}>No rated games yet.</div>
              ) : topRated.map((g, i) => (
                <div key={g.id} onClick={() => { setGameDefaultTab?.("reviews"); setCurrentGame(g.id); setActivePage("game"); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: i < topRated.length - 1 ? "1px solid " + C.border : "none", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 20, textAlign: "center", fontWeight: 800, fontSize: i < 3 ? 14 : 12, color: i === 0 ? C.gold : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : C.textDim, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: C.text, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                    <div style={{ color: C.textDim, fontSize: 10, marginTop: 1 }}>{g.count} review{g.count !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ background: C.goldDim, color: C.gold, borderRadius: 5, padding: "2px 6px", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{g.avg.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewsPage;
