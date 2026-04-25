import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";

function XboxImportModal({ currentUser, onClose, onImportComplete, onXboxConnected }) {
  const [step, setStep] = useState("explain"); // explain | connecting | review | importing | done
  const [xboxData, setXboxData] = useState(null);
  const [selectedGames, setSelectedGames] = useState(new Set());
  const [statusOverrides, setStatusOverrides] = useState({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState(null);

  // On mount, check if we're returning from Xbox OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const xboxImport = params.get("xbox_import");
    const xboxError = params.get("xbox_error");

    if (xboxError) {
      setError(getErrorMessage(xboxError));
      setStep("explain");
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (xboxImport) {
      try {
        const data = JSON.parse(decodeURIComponent(xboxImport));
        setXboxData(data);
        // Pre-select all games
        setSelectedGames(new Set(data.games.map(g => g.id)));
        // Init status overrides
        const overrides = {};
        data.games.forEach(g => { overrides[g.id] = g.suggested_status; });
        setStatusOverrides(overrides);
        setStep("review");
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      } catch (e) {
        setError("Failed to read Xbox data. Please try again.");
        setStep("explain");
      }
    }
  }, []);

  const startAuth = () => {
    setStep("connecting");
    window.location.href = "/api/xbox-auth";
  };

  const toggleGame = (id) => {
    setSelectedGames(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const doImport = async () => {
    if (!xboxData || selectedGames.size === 0) return;
    setImporting(true); setImportProgress(0);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setImporting(false); return; }

    const toImport = xboxData.games.filter(g => selectedGames.has(g.id));
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
          // Insert as basic game entry using Xbox cover if available
          const { data: inserted } = await supabase.from("games").insert({
            name: game.name,
            cover_url: game.cover_url || null,
            followers: 0,
          }).select().single();
          gameId = inserted?.id;
        }

        if (gameId) {
          const status = statusOverrides[game.id] || "have_played";
          await supabase.from("user_games").upsert({
            user_id: authUser.id, game_id: gameId, status,
          }, { onConflict: "user_id,game_id" });

          await supabase.from("chart_events").insert({
            game_id: gameId, user_id: authUser.id,
            event_type: status === "playing" ? "shelf_playing" : status === "have_played" ? "shelf_played" : "shelf_want",
            date: new Date().toISOString().slice(0, 10),
            week_start: new Date(Date.now() - new Date().getDay() * 86400000).toISOString().slice(0, 10),
          }, { ignoreDuplicates: true });
        }
      } catch (err) {
        console.error("[xbox-import] failed for game:", game.name, err);
      }

      done++;
      setImportProgress(Math.round((done / toImport.length) * 100));
    }

    // Save gamertag
    if (xboxData?.gamertag) {
      await supabase.from("user_private").upsert(
        { id: authUser.id, xbox_gamertag: xboxData.gamertag },
        { onConflict: "id" }
      );
      onXboxConnected?.(xboxData.gamertag);
    }

    setImporting(false);
    setStep("done");
  };

  const statusColors = { playing: C.green, have_played: C.gold, want_to_play: C.accent };
  const statusLabels = { playing: "Playing Now", have_played: "Have Played", want_to_play: "Want to Play" };

  const xboxGreen = "#107c10";
  const xboxGreenDim = "#107c1022";
  const xboxGreenBorder = "#107c1066";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: xboxGreen, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 16, fontWeight: 900 }}>X</span>
            </div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 15 }}>Import Xbox Library</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer", padding: "0 4px" }}>×</button>
        </div>

        {/* Done */}
        {step === "done" ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 16 }}>
            <div style={{ fontSize: 40 }}>🎮</div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>Xbox library imported!</div>
            <div style={{ color: C.textDim, fontSize: 13, textAlign: "center" }}>Your games are now on your shelf.</div>
            <button onClick={() => { onImportComplete?.(); onClose(); }}
              style={{ background: xboxGreen, border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              View My Shelf
            </button>
          </div>

        ) : importing ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 16 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>Importing {selectedGames.size} games…</div>
            <div style={{ width: "100%", maxWidth: 300, height: 8, background: C.surfaceRaised, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: importProgress + "%", background: xboxGreen, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <div style={{ color: C.textDim, fontSize: 13 }}>{importProgress}%</div>
          </div>

        ) : step === "connecting" ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 16 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>Connecting to Xbox…</div>
            <div style={{ color: C.textDim, fontSize: 13 }}>You'll be redirected to Microsoft to sign in.</div>
          </div>

        ) : step === "explain" ? (
          <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ color: C.text, fontSize: 14, lineHeight: 1.6 }}>
              You're about to import your Xbox game history into GuildLink. Here's how your games will be organized:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { status: "playing", color: C.green, label: "Playing Now", desc: "Games you've played in the last two weeks." },
                { status: "have_played", color: C.gold, label: "Have Played", desc: "Everything else in your Xbox history." },
              ].map(item => (
                <div key={item.status} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ background: item.color + "22", border: "1px solid " + item.color + "55", color: item.color, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {item.label}
                  </span>
                  <span style={{ color: C.textMuted, fontSize: 13 }}>{item.desc}</span>
                </div>
              ))}
            </div>
            {error && (
              <div style={{ padding: "10px 14px", background: "#ef444418", border: "1px solid #ef444444", borderRadius: 8, color: "#ef4444", fontSize: 13 }}>
                {error}
              </div>
            )}
            <div style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6, borderTop: "1px solid " + C.border, paddingTop: 16 }}>
              You'll be redirected to Microsoft to sign in with your Xbox account. We only use your game history to populate your shelf — we don't store your Xbox credentials.
            </div>
            <button onClick={startAuth}
              style={{ background: xboxGreen, border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>
              Connect Xbox Account
            </button>
          </div>

        ) : step === "review" && xboxData ? (
          <>
            {/* Xbox profile summary */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 12, background: xboxGreenDim }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: xboxGreen, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 20, fontWeight: 900 }}>X</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: xboxGreen, fontSize: 14 }}>{xboxData.gamertag}</div>
                <div style={{ color: C.textDim, fontSize: 12 }}>{xboxData.games.length} games found</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => setSelectedGames(new Set(xboxData.games.map(g => g.id)))}
                  style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 6, padding: "4px 10px", color: C.textMuted, fontSize: 11, cursor: "pointer" }}>All</button>
                <button onClick={() => setSelectedGames(new Set())}
                  style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 6, padding: "4px 10px", color: C.textMuted, fontSize: 11, cursor: "pointer" }}>None</button>
              </div>
            </div>

            {/* Game list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {xboxData.games.map(game => {
                const selected = selectedGames.has(game.id);
                const status = statusOverrides[game.id] || "have_played";
                return (
                  <div key={game.id} onClick={() => toggleGame(game.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid " + C.border, cursor: "pointer", background: selected ? xboxGreenDim : "transparent", opacity: selected ? 1 : 0.4 }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.opacity = "0.7"; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.opacity = "0.4"; }}>
                    {/* Checkbox */}
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (selected ? xboxGreen : C.border), background: selected ? xboxGreen : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {selected && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </div>
                    {/* Game cover */}
                    {game.cover_url
                      ? <img src={game.cover_url} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
                      : <div style={{ width: 32, height: 32, borderRadius: 4, background: C.surfaceRaised, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎮</div>
                    }
                    {/* Name + playtime */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                      <div style={{ color: C.textDim, fontSize: 11 }}>
                        {game.minutes_played > 0 ? `${Math.round(game.minutes_played / 60)}h played` : "In library"}
                        {status === "playing" && <span style={{ color: C.green, marginLeft: 6 }}>● Recent</span>}
                      </div>
                    </div>
                    {/* Status selector */}
                    {selected && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {["playing", "have_played", "want_to_play"].map(s => (
                          <button key={s} onClick={() => setStatusOverrides(prev => ({ ...prev, [game.id]: s }))}
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
                  style={{ background: xboxGreen, border: "none", borderRadius: 8, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: selectedGames.size > 0 ? "pointer" : "default", opacity: selectedGames.size > 0 ? 1 : 0.5 }}>
                  Import {selectedGames.size} Games
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function getErrorMessage(code) {
  switch (code) {
    case "auth_failed": return "Xbox authorization was cancelled or failed. Please try again.";
    case "token_failed": return "Failed to connect to Microsoft. Please try again.";
    case "xbl_failed": return "Failed to connect to Xbox Live. Make sure your Microsoft account has an Xbox profile.";
    case "xsts_failed": return "Xbox authentication failed. Your account may not have Xbox Live access.";
    default: return "Something went wrong. Please try again.";
  }
}

export default XboxImportModal;
