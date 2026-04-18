import React, { useState } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";

function SteamImportModal({ currentUser, onClose, onImportComplete, onSteamConnected }) {
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [steamData, setSteamData] = React.useState(null);
  const [selectedGames, setSelectedGames] = React.useState(new Set());
  const [importing, setImporting] = React.useState(false);
  const [importDone, setImportDone] = React.useState(false);
  const [statusOverrides, setStatusOverrides] = React.useState({});
  const [importProgress, setImportProgress] = React.useState(0);
  const [explained, setExplained] = React.useState(false);

  const fetchSteam = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(null); setSteamData(null);
    try {
      const res = await fetch("/api/steam", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setSteamData(data);
      // Pre-select all games
      setSelectedGames(new Set(data.games.map(g => g.appid)));
      // Init status overrides from suggestions
      const overrides = {};
      data.games.forEach(g => { overrides[g.appid] = g.suggested_status; });
      setStatusOverrides(overrides);
      // Check for empty library
      if (data.games.length === 0) {
        setError("No games found. Make sure your Steam profile and Game details are both set to Public in Steam → Settings → Privacy.");
        setSteamData(null);
        setLoading(false);
        return;
      }
    } catch (e) {
      setError("Failed to connect to Steam. Please try again.");
    }
    setLoading(false);
  };

  const toggleGame = (appid) => {
    setSelectedGames(prev => {
      const next = new Set(prev);
      next.has(appid) ? next.delete(appid) : next.add(appid);
      return next;
    });
  };

  const doImport = async () => {
    if (!steamData || selectedGames.size === 0) return;
    setImporting(true); setImportProgress(0);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setImporting(false); return; }

    const toImport = steamData.games.filter(g => selectedGames.has(g.appid));
    let done = 0;

    for (const game of toImport) {
      try {
        // Search for matching game in DB
        const { data: existing } = await supabase
          .from("games").select("id, name").ilike("name", game.name).limit(1).maybeSingle();

        let gameId = existing?.id;

        if (!gameId) {
          // Try IGDB match
          try {
            const igdbRes = await fetch("/api/igdb", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: game.name }),
            });
            const { games: igdbGames } = await igdbRes.json();
            const match = igdbGames?.find(g => g.name.toLowerCase() === game.name.toLowerCase()) || igdbGames?.[0];
            if (match) {
              // Check if this IGDB game already exists by igdb_id first
              const { data: existingIgdb } = await supabase
                .from("games").select("id").eq("igdb_id", match.igdb_id).maybeSingle();
              if (existingIgdb) {
                gameId = existingIgdb.id;
              } else {
                const { data: inserted } = await supabase.from("games").insert({
                  name: match.name, genre: match.genre, summary: match.summary,
                  cover_url: match.cover_url, igdb_id: match.igdb_id,
                  first_release_date: match.first_release_date, followers: 0,
                  platforms: match.platforms || null,
                }).select().single();
                gameId = inserted?.id;
              }
            }
          } catch { /* IGDB unavailable */ }
        }

        if (!gameId) {
          // Insert as basic game entry
          const { data: inserted } = await supabase.from("games").insert({
            name: game.name, followers: 0,
          }).select().single();
          gameId = inserted?.id;
        }

        if (gameId) {
          const status = statusOverrides[game.appid] || "have_played";
          await supabase.from("user_games").upsert({
            user_id: authUser.id, game_id: gameId, status,
          }, { onConflict: "user_id,game_id" });

          // Log chart event
          await supabase.from("chart_events").insert({
            game_id: gameId, user_id: authUser.id,
            event_type: status === "playing" ? "shelf_playing" : status === "have_played" ? "shelf_played" : "shelf_want",
            date: new Date().toISOString().slice(0, 10),
            week_start: new Date(Date.now() - new Date().getDay() * 86400000).toISOString().slice(0, 10),
          }, { ignoreDuplicates: true });
        }
      } catch (err) {
        console.error("[import] failed for game:", game.name, err);
        // Continue with next game rather than killing the whole import
      }

      done++;
      setImportProgress(Math.round((done / toImport.length) * 100));
    }

    setImporting(false);
    setImportDone(true);

    // Save Steam ID only after successful import
    if (steamData?.steamId) {
      await supabase.from("user_private").upsert(
        { id: authUser.id, steam_id: steamData.steamId },
        { onConflict: "id" }
      );
      onSteamConnected?.(steamData.steamId);
    }
  };

  const statusColors = { playing: C.green, have_played: C.gold, want_to_play: C.accent };
  const statusLabels = { playing: "Playing Now", have_played: "Have Played", want_to_play: "Want to Play" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, border: "1px solid #4a9eda44", borderRadius: 20, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1b2838" }}>
          <div>
            <div style={{ fontWeight: 800, color: "#4a9eda", fontSize: 18 }}>Import from Steam</div>
            <div style={{ color: "#7aa6c2", fontSize: 12 }}>Add your Steam library to your shelf</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#7aa6c2", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {importDone ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 16 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18 }}>Import complete!</div>
            <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center" }}>
              {selectedGames.size} games added to your shelf.
              {steamData?.wishlistGames > 0 && (
                <span style={{ display: "block", marginTop: 4 }}>{steamData.wishlistGames} wishlist games added as Want to Play.</span>
              )}
            </div>
            <button onClick={onImportComplete} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "10px 28px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
              View My Shelf
            </button>
          </div>
        ) : importing ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 16 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>Importing {selectedGames.size} games…</div>
            <div style={{ width: "100%", maxWidth: 300, height: 8, background: C.surfaceRaised, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: importProgress + "%", background: "#4a9eda", borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <div style={{ color: C.textDim, fontSize: 13 }}>{importProgress}%</div>
          </div>
        ) : !explained ? (
          <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ color: C.text, fontSize: 14, lineHeight: 1.6 }}>
              You're about to import your Steam library into GuildLink. Here's how your games will be organized:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { status: "want_to_play", color: C.accent, label: "Want to Play", desc: "Games on your Steam wishlist." },
                { status: "playing", color: C.green, label: "Playing Now", desc: "Games you've played in the last two weeks." },
                { status: "have_played", color: C.gold, label: "Have Played", desc: "Everything else in your library." },
              ].map(item => (
                <div key={item.status} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ background: item.color + "22", border: "1px solid " + item.color + "55", color: item.color, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {item.label}
                  </span>
                  <span style={{ color: C.textMuted, fontSize: 13 }}>{item.desc}</span>
                </div>
              ))}
            </div>
            <div style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6, borderTop: "1px solid " + C.border, paddingTop: 16 }}>
              You can adjust any game's status after importing. We only use your Steam data to populate your shelf — we don't store your Steam ID or account information.
            </div>
            <button onClick={() => setExplained(true)}
              style={{ background: "#4a9eda", border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>
              Got it — connect my Steam
            </button>
          </div>
        ) : !steamData ? (
          <div style={{ padding: 24 }}>
            <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>
              Enter your Steam profile URL, Steam ID, or username. Your profile must be set to public.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchSteam()}
                placeholder="steamcommunity.com/id/username or Steam64 ID"
                style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none" }}
              />
              <button onClick={fetchSteam} disabled={loading || !input.trim()}
                style={{ background: "#4a9eda", border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                {loading ? "Loading…" : "Connect"}
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#ef444418", border: "1px solid #ef444444", borderRadius: 8, color: "#ef4444", fontSize: 13 }}>
                {error}
              </div>
            )}
            <div style={{ marginTop: 16, color: C.textDim, fontSize: 12 }}>
              To make your profile public: Steam → Settings → Privacy → Profile Status → Public
            </div>
          </div>
        ) : (
          <>
            {/* Steam profile summary */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 12, background: "#1b283880" }}>
              {steamData.avatar && <img src={steamData.avatar} alt="" style={{ width: 40, height: 40, borderRadius: 6 }} />}
              <div>
                <div style={{ fontWeight: 700, color: "#4a9eda", fontSize: 14 }}>{steamData.playerName}</div>
                <div style={{ color: C.textDim, fontSize: 12 }}>{steamData.playedGames} library games · {steamData.recentGames} played recently · {steamData.wishlistGames} wishlist</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => setSelectedGames(new Set(steamData.games.map(g => g.appid)))}
                  style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 6, padding: "4px 10px", color: C.textMuted, fontSize: 11, cursor: "pointer" }}>All</button>
                <button onClick={() => setSelectedGames(new Set())}
                  style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 6, padding: "4px 10px", color: C.textMuted, fontSize: 11, cursor: "pointer" }}>None</button>
              </div>
            </div>

            {/* Game list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {steamData.games.map(game => {
                const selected = selectedGames.has(game.appid);
                const status = statusOverrides[game.appid] || "have_played";
                return (
                  <div key={game.appid} onClick={() => toggleGame(game.appid)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid " + C.border, cursor: "pointer", background: selected ? C.accentGlow : "transparent", opacity: selected ? 1 : 0.4 }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.opacity = "0.7"; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.opacity = "0.4"; }}>
                    {/* Checkbox */}
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (selected ? C.accent : C.border), background: selected ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {selected && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </div>
                    {/* Game icon */}
                    {game.img_icon
                      ? <img src={game.img_icon} alt="" style={{ width: 32, height: 32, borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
                      : <div style={{ width: 32, height: 32, borderRadius: 4, background: C.surfaceRaised, flexShrink: 0 }} />
                    }
                    {/* Name + playtime */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                      <div style={{ color: C.textDim, fontSize: 11 }}>
                        {game.playtime_hours}h played
                        {game.recently_played && <span style={{ color: "#4a9eda", marginLeft: 6 }}>● Recent</span>}
                      </div>
                    </div>
                    {/* Status selector */}
                    {selected && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {["playing","have_played","want_to_play"].map(s => (
                          <button key={s} onClick={() => setStatusOverrides(prev => ({ ...prev, [game.appid]: s }))}
                            style={{ padding: "2px 7px", borderRadius: 5, border: "1px solid " + (status === s ? statusColors[s] : C.border), background: status === s ? statusColors[s] + "22" : "transparent", color: status === s ? statusColors[s] : C.textDim, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                            {statusLabels[s]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ color: C.textDim, fontSize: 12 }}>{selectedGames.size} games selected</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onClose} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={doImport} disabled={selectedGames.size === 0}
                  style={{ background: "#4a9eda", border: "none", borderRadius: 8, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: selectedGames.size > 0 ? "pointer" : "default", opacity: selectedGames.size > 0 ? 1 : 0.5 }}>
                  Import {selectedGames.size} Games
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SteamImportModal;
