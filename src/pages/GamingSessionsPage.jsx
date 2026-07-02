import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { PixelCornerBox } from "../components/PixelCornerBox.jsx";
import { PixelButton } from "../components/PixelButton.jsx";
import SessionCard from "../components/SessionCard.jsx";

function GamingSessionsPage({ currentUser, setActivePage, isMobile }) {
  const [userGuilds, setUserGuilds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionRsvps, setSessionRsvps] = useState({});
  const [loading, setLoading] = useState(true);

  // Schedule form state
  const [activeDay, setActiveDay] = useState(null);
  const [selectedGuildId, setSelectedGuildId] = useState(null);
  const [sessionTime, setSessionTime] = useState("20:00");
  const [sessionDurH, setSessionDurH] = useState("2");
  const [sessionDurM, setSessionDurM] = useState("0");
  const [gameSearch, setGameSearch] = useState("");
  const [gameResults, setGameResults] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [saving, setSaving] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => { load(); }, [currentUser?.id]);

  const load = async () => {
    if (!currentUser?.id) { setLoading(false); return; }
    setLoading(true);

    const { data: memberships } = await supabase
      .from("guild_members")
      .select("guild_id, guilds(id, name)")
      .eq("user_id", currentUser.id)
      .eq("status", "active");

    const guilds = (memberships || []).map(m => m.guilds).filter(Boolean);
    setUserGuilds(guilds);

    if (guilds.length === 0) { setLoading(false); return; }
    if (guilds.length === 1 && !selectedGuildId) setSelectedGuildId(guilds[0].id);

    const guildIds = guilds.map(g => g.id);
    const guildNameMap = {};
    guilds.forEach(g => { guildNameMap[g.id] = g.name; });

    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const weekEnd = new Date(localMidnight);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { data: sessionData } = await supabase
      .from("guild_sessions")
      .select("*")
      .in("guild_id", guildIds)
      .gte("scheduled_at", localMidnight.toISOString())
      .lt("scheduled_at", weekEnd.toISOString())
      .order("scheduled_at", { ascending: true });

    const sessionsWithGuild = (sessionData || []).map(s => ({
      ...s,
      guild_name: guildNameMap[s.guild_id] || "",
    }));
    setSessions(sessionsWithGuild);

    if (sessionsWithGuild.length > 0) {
      const sessionIds = sessionsWithGuild.map(s => s.id);
      const { data: rsvpData } = await supabase
        .from("guild_session_rsvps")
        .select("*")
        .in("session_id", sessionIds);
      const rsvpMap = {};
      (rsvpData || []).forEach(r => {
        if (!rsvpMap[r.session_id]) rsvpMap[r.session_id] = [];
        rsvpMap[r.session_id].push(r);
      });
      setSessionRsvps(rsvpMap);
    }

    setLoading(false);
  };

  const checkIsLive = (session) => {
    const now = new Date();
    const start = new Date(session.scheduled_at);
    const durMs = (session.duration_minutes || 60) * 60000;
    const end = new Date(start.getTime() + durMs);
    return now >= start && now <= end;
  };

  const sessionsForDay = (d) => {
    const dayStr = d.toDateString();
    const daySessions = sessions.filter(s => new Date(s.scheduled_at).toDateString() === dayStr);
    const live = daySessions.filter(s => checkIsLive(s));
    const upcoming = daySessions.filter(s => !checkIsLive(s));
    return [...live, ...upcoming];
  };

  const handleRsvp = async (sessionId, response) => {
    if (!currentUser?.id) return;
    await supabase.from("guild_session_rsvps").upsert(
      { session_id: sessionId, user_id: currentUser.id, response },
      { onConflict: "session_id,user_id" }
    );
    setSessionRsvps(prev => {
      const existing = (prev[sessionId] || []).filter(r => r.user_id !== currentUser.id);
      return { ...prev, [sessionId]: [...existing, { session_id: sessionId, user_id: currentUser.id, response }] };
    });
  };

  const handleEditSession = async (sessionId, form) => {
    await supabase.from("guild_sessions").update({
      game: form.game,
      scheduled_at: form.scheduled_at,
      duration_minutes: form.duration_minutes,
    }).eq("id", sessionId);
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...form } : s));
  };

  const handleDeleteSession = async (sessionId) => {
    await supabase.from("guild_sessions").delete().eq("id", sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const handleGameSearch = async (q) => {
    setGameSearch(q);
    if (q.length < 2) { setGameResults([]); return; }
    const { data } = await supabase.from("games").select("id, name, cover_url").ilike("name", "%" + q + "%").limit(6);
    setGameResults(data || []);
  };

  const scheduleSession = async (dayDate) => {
    if (!selectedGuildId || saving) return;
    setSaving(true);
    try {
      const parts = sessionTime.split(":");
      const h = parseInt(parts[0]) || 20;
      const m = parseInt(parts[1]) || 0;
      const scheduled = new Date(dayDate);
      scheduled.setHours(h, m, 0, 0);
      const totalMinutes = (parseInt(sessionDurH) || 0) * 60 + (parseInt(sessionDurM) || 0);
      const sessionId = crypto.randomUUID();
      await supabase.from("guild_sessions").insert({
        id: sessionId,
        guild_id: selectedGuildId,
        created_by: currentUser.id,
        game: selectedGame?.name || "TBD",
        game_id: selectedGame?.id || null,
        title: selectedGame?.name || "Gaming Session",
        scheduled_at: scheduled.toISOString(),
        duration_minutes: totalMinutes > 0 ? totalMinutes : null,
      });
      // Auto-RSVP creator as "in"
      try {
        await supabase.from("guild_session_rsvps").insert({
          session_id: sessionId,
          user_id: currentUser.id,
          response: "in",
        });
      } catch(e) {}
      setActiveDay(null);
      setGameSearch("");
      setSelectedGame(null);
      setGameResults([]);
      setSessionTime("20:00");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const dayLabel = (d) => {
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[d.getDay()] + " | " + (d.getMonth() + 1) + "/" + d.getDate();
  };

  // Time picker helpers
  const schedH24 = parseInt((sessionTime || "20:00").split(":")[0]) || 20;
  const schedMin = parseInt((sessionTime || "20:00").split(":")[1]) || 0;
  const schedAmpm = schedH24 >= 12 ? "pm" : "am";
  const schedH12 = schedH24 % 12 === 0 ? 12 : schedH24 % 12;

  // Local display state for time inputs — allows empty/partial values while typing.
  // Committed to sessionTime only on blur to avoid the "defaults to 12" snap mid-edit.
  const [hourDisp, setHourDisp] = useState(String(schedH12));
  const [minDisp, setMinDisp] = useState(String(schedMin).padStart(2, "0"));

  // Sync display state when activeDay resets (new form opened)
  useEffect(() => {
    if (activeDay === null) {
      setHourDisp("8");
      setMinDisp("00");
    }
  }, [activeDay]);

  const updateScheduleTime = (h12, min, ampm) => {
    let h24 = h12 % 12;
    if (ampm === "pm") h24 = h24 + 12;
    setSessionTime(String(h24).padStart(2, "0") + ":" + String(min).padStart(2, "0"));
  };

  const inputStyle = {
    background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 3,
    padding: "8px 10px", color: C.text, fontSize: 13, outline: "none",
    width: "100%", boxSizing: "border-box", textAlign: "center",
  };

  const ampmBtnStyle = (active) => ({
    background: active ? C.accent + "33" : "transparent",
    border: "1px solid " + (active ? C.accent : C.border),
    borderRadius: 2, padding: "4px 10px",
    color: active ? C.accent : C.textDim,
    fontSize: 12, fontWeight: 700, cursor: "pointer",
  });

  const scheduleFormContent = (
    <>
      {activeDay !== null && (
        <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 16 }}>
          {"Schedule for " + dayLabel(weekDays[activeDay] || new Date())}
        </div>
      )}

      {/* Guild selector — only shown when in multiple guilds */}
      {userGuilds.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Guild</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {userGuilds.map(g => {
              const isSel = selectedGuildId === g.id;
              return (
                <button key={g.id} onClick={() => setSelectedGuildId(g.id)}
                  style={{ background: isSel ? "color-mix(in srgb, " + C.accent + " 12%, " + C.bg + ")" : C.surfaceRaised, border: "1px solid " + (isSel ? C.accent : C.border), borderRadius: 3, padding: "6px 12px", color: isSel ? C.accent : C.textMuted, fontSize: 12, fontWeight: isSel ? 700 : 400, cursor: "pointer" }}>
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Game search */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Game</div>
        {selectedGame ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 3, padding: "8px 10px" }}>
            {selectedGame.cover_url && <img src={selectedGame.cover_url} alt="" style={{ width: 20, height: 28, borderRadius: 2, objectFit: "cover" }} />}
            <span style={{ flex: 1, color: C.text, fontSize: 13, fontWeight: 600 }}>{selectedGame.name}</span>
            <span onClick={() => { setSelectedGame(null); setGameSearch(""); }} style={{ color: C.textDim, cursor: "pointer", fontSize: 18 }}>×</span>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input value={gameSearch} onChange={e => handleGameSearch(e.target.value)}
              placeholder="Search for a game..."
              style={{ ...inputStyle, textAlign: "left" }} />
            {gameResults.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: 3, zIndex: 100, maxHeight: 200, overflowY: "auto" }}>
                {gameResults.map(g => (
                  <div key={g.id} onClick={() => { setSelectedGame(g); setGameSearch(""); setGameResults([]); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid " + C.border }}>
                    {g.cover_url && <img src={g.cover_url} alt="" style={{ width: 18, height: 24, borderRadius: 2, objectFit: "cover" }} />}
                    <span style={{ color: C.text, fontSize: 13 }}>{g.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Time picker */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Start Time</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <input type="text" inputMode="numeric"
              value={hourDisp}
              onChange={e => setHourDisp(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={() => {
                const v = parseInt(hourDisp) || 12;
                const c = v < 1 ? 1 : v > 12 ? 12 : v;
                setHourDisp(String(c));
                updateScheduleTime(c, schedMin, schedAmpm);
              }}
              style={inputStyle} />
            <div style={{ color: C.textDim, fontSize: 9, textAlign: "center", marginTop: 2 }}>hr</div>
          </div>
          <div style={{ color: C.textDim, fontSize: 16, paddingBottom: 16 }}>:</div>
          <div style={{ flex: 1 }}>
            <input type="text" inputMode="numeric"
              value={minDisp}
              onChange={e => setMinDisp(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={() => {
                const v = parseInt(minDisp) || 0;
                const c = v < 0 ? 0 : v > 59 ? 59 : v;
                setMinDisp(String(c).padStart(2, "0"));
                updateScheduleTime(schedH12, c, schedAmpm);
              }}
              style={inputStyle} />
            <div style={{ color: C.textDim, fontSize: 9, textAlign: "center", marginTop: 2 }}>min</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 16 }}>
            <button onClick={() => updateScheduleTime(schedH12, schedMin, "am")} style={ampmBtnStyle(schedAmpm === "am")}>AM</button>
            <button onClick={() => updateScheduleTime(schedH12, schedMin, "pm")} style={ampmBtnStyle(schedAmpm === "pm")}>PM</button>
          </div>
        </div>
      </div>

      {/* Duration */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Duration</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <input type="text" inputMode="numeric" placeholder="2" value={sessionDurH}
              onChange={e => setSessionDurH(e.target.value.replace(/[^0-9]/g, ""))} style={inputStyle} />
            <div style={{ color: C.textDim, fontSize: 9, textAlign: "center", marginTop: 2 }}>hrs</div>
          </div>
          <div style={{ color: C.textDim, fontSize: 16, paddingBottom: 16 }}>:</div>
          <div style={{ flex: 1 }}>
            <input type="text" inputMode="numeric" placeholder="0" value={sessionDurM}
              onChange={e => setSessionDurM(e.target.value.replace(/[^0-9]/g, ""))} style={inputStyle} />
            <div style={{ color: C.textDim, fontSize: 9, textAlign: "center", marginTop: 2 }}>min</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ padding: "1px 0" }}>
          <PixelButton
            onClick={() => activeDay !== null && scheduleSession(weekDays[activeDay])}
            size="sm"
            bg={selectedGuildId ? C.accent : C.surfaceRaised}
            borderColor={selectedGuildId ? C.accent : C.border}>
            {saving ? "Saving..." : "Save"}
          </PixelButton>
        </div>
        <div style={{ padding: "1px 0" }}>
          <PixelButton onClick={() => { setActiveDay(null); setSelectedGame(null); setGameSearch(""); setGameResults([]); }} size="sm" bg="transparent" borderColor={C.border}>Cancel</PixelButton>
        </div>
      </div>
    </>
  );

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: C.textDim, fontSize: 14 }}>Loading sessions...</div>
  );

  if (userGuilds.length === 0) return (
    <div style={{ padding: 32, maxWidth: 480, margin: "0 auto" }}>
      <PixelCornerBox size="lg" bg={C.surface} borderColor={C.border} style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🎮</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 8 }}>No guilds yet</div>
        <div style={{ color: C.textDim, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Join a guild to start seeing and scheduling gaming sessions with your crew.
        </div>
        <div style={{ padding: "1px 0", display: "inline-block" }}>
          <PixelButton onClick={() => setActivePage("squad")} size="md" bg={C.accent} borderColor={C.accent}>Find Guilds</PixelButton>
        </div>
      </PixelCornerBox>
    </div>
  );

  const dayCount = isMobile ? 3 : 7;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "72px 12px 16px" : "24px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 22, color: C.text }}>Gaming Sessions</div>
        <div style={{ color: C.textDim, fontSize: 12, marginTop: 2 }}>Across all your guilds</div>
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(" + dayCount + ", 1fr)", gap: 8 }}>
        {weekDays.slice(0, dayCount).map((d, i) => {
          const daySessions = sessionsForDay(d);
          const isToday = i === 0;
          const isActiveDayCol = activeDay === i;

          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>

              {/* Day label */}
              <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? C.accentSoft : C.textDim, textAlign: "center", marginBottom: 4 }}>
                {dayLabel(d)}
              </div>

              {/* Sessions */}
              {daySessions.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  currentUserId={currentUser?.id}
                  rsvps={sessionRsvps[s.id] || []}
                  onRsvp={handleRsvp}
                  onEdit={handleEditSession}
                  onDelete={handleDeleteSession}
                  isMobile={isMobile}
                  guildName={s.guild_name}
                />
              ))}

              {/* Add session button */}
              <div style={{ padding: "1px 0" }}>
                <PixelButton fullWidth
                  onClick={() => {
                    setActiveDay(isActiveDayCol ? null : i);
                    setSessionTime("20:00");
                    setGameSearch("");
                    setGameResults([]);
                    setSelectedGame(null);
                  }}
                  bg={isActiveDayCol ? "color-mix(in srgb, " + C.accent + " 12%, " + C.bg + ")" : C.surfaceRaised}
                  borderColor={isActiveDayCol ? C.accentDim : C.border}>
                  <span style={{ color: isActiveDayCol ? C.accentSoft : C.textDim, fontSize: 18, fontWeight: 700 }}>{"+"}</span>
                </PixelButton>
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule form — desktop inline panel */}
      {!isMobile && activeDay !== null && (
        <PixelCornerBox size="lg" borderColor={C.accentDim} bg={C.surfaceRaised} style={{ padding: 20, marginTop: 16 }}>
          {scheduleFormContent}
        </PixelCornerBox>
      )}

      {/* Schedule form — mobile full-screen portal */}
      {isMobile && activeDay !== null && ReactDOM.createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: C.bg, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Schedule Session</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: 20 }}>
            {scheduleFormContent}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default GamingSessionsPage;
