import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import { useWindowSize } from "../utils.js";
import supabase from "../supabase.js";

function ChartsWidget({ setActivePage, setCurrentGame, category, refreshKey, limit }) {
  const isMobile = useWindowSize() < 768;
  const [collapsed, setCollapsed] = useState(isMobile);
  const [charts, setCharts] = useState([]);
  const [prevCharts, setPrevCharts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Get most recent date with chart scores (handles cron gaps)
      const getPacificDate = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d); };
      const { data: latestDate, error: dateErr2 } = await supabase
        .from("daily_chart_scores")
        .select("date")
        .order("date", { ascending: false })
        .limit(1)
        .single();
      const chartDate = latestDate?.date || getPacificDate(0);

      // Query daily_chart_scores for most recent date
      const { data: scores } = await supabase
        .from("daily_chart_scores")
        .select("game_id, score, games(id, name, genre)")
        .eq("date", chartDate)
        .order("score", { ascending: false })
        .limit(limit || 10);

      if (scores && scores.length > 0) {
        const sorted = scores
          .filter(s => s.games)
          .map((s, i) => ({
            rank: i + 1,
            id: s.game_id,
            finalScore: s.score,
            name: s.games.name,
            genre: s.games.genre,
            dominantSignal: "",
          }));
        setCharts(sorted);

        // Get previous date for movement arrows
        const prevDate = new Date(chartDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().slice(0, 10);
        const { data: prevScores } = await supabase
          .from("daily_chart_scores")
          .select("game_id, score")
          .eq("date", prevDateStr)
          .order("score", { ascending: false });
        if (prevScores) {
          const prev = {};
          prevScores.forEach((s, i) => { prev[s.game_id] = i + 1; });
          setPrevCharts(prev);
        }
      }
      setLoading(false);
    };
    load();
  }, [category, refreshKey]);

  const getDominantSignal = (counts) => {
    if (counts.shelf_playing > 0) return `${counts.shelf_playing} playing`;
    if (counts.review > 0) return `${counts.review} review${counts.review > 1 ? 's' : ''}`;
    if (counts.comment > 0) return `${counts.comment} comment${counts.comment > 1 ? 's' : ''}`;
    if (counts.shelf_want > 0) return `${counts.shelf_want} want to play`;
    if (counts.post > 0) return `${counts.post} post${counts.post > 1 ? 's' : ''}`;
    return null;
  };

  const getMovement = (gameId, currentRank) => {
    const prev = prevCharts[gameId];
    // Check if game has any previous score in daily_chart_scores (not truly new)
    const hasPrevScore = Object.keys(prevCharts).length > 0 && prevCharts[gameId] === undefined
      ? false : true;
    if (!prev) {
      // If prevCharts loaded but this game isn't in it, it may still have older history
      // Show — instead of NEW unless prevCharts is completely empty (first ever load)
      if (Object.keys(prevCharts).length > 0) return { label: "—", color: C.textDim };
      return { label: "NEW", color: C.teal };
    }
    const diff = prev - currentRank;
    if (diff > 0) return { label: "+" + diff, color: C.green };
    if (diff < 0) return { label: "" + diff, color: C.red };
    return { label: "—", color: C.textDim };
  };

  return (
    <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div onClick={() => isMobile && setCollapsed(c => !c)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: collapsed ? 0 : 12, cursor: isMobile ? "pointer" : "default" }}>
        <div style={{ fontWeight: 700, color: C.text, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {category ? `${category} Charts` : "The Charts"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ color: C.textDim, fontSize: 10 }}>This week</div>
          {isMobile && <span style={{ color: C.textDim, fontSize: 11 }}>{collapsed ? "▼" : "▲"}</span>}
        </div>
      </div>

      {!collapsed && (loading ? (
        <div style={{ color: C.textDim, fontSize: 12, textAlign: "center", padding: "20px 0" }}>Loading...</div>
      ) : charts.length === 0 ? (
        <div style={{ color: C.textDim, fontSize: 12, textAlign: "center", padding: "20px 0", lineHeight: 1.6 }}>
          Charts fill up as the community posts, reviews, and plays games this week.
        </div>
      ) : (
        <div>
          {charts.map((entry, i) => {
            const mv = getMovement(entry.id, entry.rank);
            return (
              <div key={entry.id}
                onClick={() => { setCurrentGame(entry.id); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < charts.length - 1 ? "1px solid " + C.border : "none", cursor: "pointer" }}>
                <div style={{ width: 18, textAlign: "center", color: i < 3 ? C.gold : C.textDim, fontWeight: 800, fontSize: i < 3 ? 13 : 11, flexShrink: 0 }}>
                  {entry.rank}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</div>
                </div>
                <div style={{ color: mv.color, fontSize: 11, fontWeight: 700, flexShrink: 0, minWidth: 28, textAlign: "right" }}>{mv.label}</div>
              </div>
            );
          })}
          {limit && (
            <button onClick={() => setActivePage("games")}
              style={{ width: "100%", marginTop: 10, background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "7px", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              See Full Charts →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export { ChartsWidget };
