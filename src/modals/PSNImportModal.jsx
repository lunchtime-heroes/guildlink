import React, { useState } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";

const PSN_BLUE = "#003087";
const PSN_LIGHT = "#0070cc";

function PSNImportModal({ currentUser, onClose, onImportComplete, onPSNConnected }) {
  const [step, setStep] = useState("explain"); // explain | token | loading | review | importing | done
  const [npsso, setNpsso] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [psnData, setPsnData] = useState(null);
  const [selectedGames, setSelectedGames] = useState(new Set());
  const [statusOverrides, setStatusOverrides] = useState({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);

  const fetchPSN = async () => {
    if (!npsso.trim()) return;
    setLoading(true); setError(null); setPsnData(null);
    try {
      const res = await fetch("/api/psn", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npsso: npsso.trim() }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      if (!data.games || data.games.length === 0) {
        setError("No trophy data found. Make sure your PSN profile is not set to private.");
        setLoading(false); return;
      }
      setPsnData(data);
      setSelectedGames(new Set(data.games.map((_, i) => i)));
      const overrides = {};
      data.games.forEach((g, i) => { overrides[i] = g.suggested_status || "have_played"; });
      setStatusOverrides(overrides);
      setStep("review");
    } catch {
      setError("Failed to connect to PlayStation Network. Please try again.");
    }
    setLoading(false);
  };

  const toggleGame = (idx) => {
    setSelectedGames(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const doImport = async () => {
    if (!psnData || selectedGames.size === 0) return;
    setImporting(true); setImportProgress(0);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setImporting(false); return; }

    const toImport = psnData.games.filter((_, i) => selectedGames.has(i));
    let done = 0;

    for (const game of toImport) {
      console.log("[psn import] processing:", game.name);
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
          const { data: inserted } = await supabase.from("games").insert({
            name: game.name, followers: 0,
          }).select().single();
          gameId = inserted?.id;
        }

        if (gameId) {
          const status = statusOverrides[psnData.games.indexOf(game)] || "have_played";
          await supabase.from("user_games").upsert({
            user_id: authUser.id, game_id: gameId, status,
          }, { onConflict: "user_id,game_id" });

          await supabase.from("chart_events").insert({
            game_id: gameId, user_id: authUser.id,
            event_type: status === "playing" ? "shelf_playing" : status === "have_played" ? "shelf_played" : "shelf_want",
            date: new Date().toISOString().slice(0, 10),
            week_start: new Date(Date.now() - new Date().getDay() * 86400000).toISOString().slice(0, 10),
          }).onConflict("user_id,game_id,event_type,week_start").ignore();
        }
      } catch (err) {
        console.error("[psn import] failed for game:", game.name, err?.message || err);
      }

      done++;
      setImportProgress(Math.round((done / toImport.length) * 100));
    }

    setImporting(false);
    setImportDone(true);
    // Save PSN connected status
    const { data: { user: authUser2 } } = await supabase.auth.getUser();
    if (authUser2) {
      await supabase.from("user_private").upsert(
        { id: authUser2.id, psn_connected: true },
        { onConflict: "id" }
      );
      onPSNConnected?.();
    }
  };

  const statusColors = { playing: C.green, have_played: C.gold, want_to_play: C.accent };
  const statusLabels = { playing: "Playing Now", have_played: "Have Played", want_to_play: "Want to Play" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, border: "1px solid " + PSN_LIGHT + "44", borderRadius: 20, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: PSN_BLUE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.181.76.814.76 1.505v5.02c2.69 1.291 4.71-.239 4.71-3.346 0-3.195-1.566-4.66-4.71-5.48L8.985 2.596zM4 18.508l4.31 1.385.005-1.8-4.315-1.39V18.508zm11.77-1.746c-1.38.484-2.84.544-4.26.175v1.91c1.44.38 3.06.3 4.51-.35l2.55-1.215-2.8-.52zm2.16-1.015l2.07.38V14.22l-2.07-.4v1.927z"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>Import PlayStation Library</div>
              <div style={{ color: C.textDim, fontSize: 12 }}>Add games from your PSN trophy history to your shelf</div>
            </div>
            <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer", padding: 4 }}>×</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {step === "explain" && (
            <div>
              <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                GuildLink uses your PlayStation trophy history to find games you've played. To connect, you'll need to get a temporary token from Sony called an NPSSO.
              </div>
              <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 10 }}>How to get your NPSSO token:</div>
                {[
                  { step: "1", text: "Open a browser and go to playstation.com" },
                  { step: "2", text: "Sign in with your PlayStation account" },
                  { step: "3", text: "In the same browser, visit: ca.account.sony.com/api/v1/ssocookie" },
                  { step: "4", text: 'Copy the value next to "npsso" — it\'s a 64-character token' },
                  { step: "5", text: "Paste it below" },
                ].map(s => (
                  <div key={s.step} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: PSN_BLUE, color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{s.step}</div>
                    <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>{s.text}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 10, padding: "10px 14px", marginBottom: 20, color: C.textMuted, fontSize: 12, lineHeight: 1.6 }}>
                🔒 Your NPSSO token is sent directly to our server to fetch your library and is never stored. We only save the list of games found.
              </div>
              <button onClick={() => setStep("token")} style={{ width: "100%", background: PSN_BLUE, border: "none", borderRadius: 10, padding: "13px", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                I have my token →
              </button>
            </div>
          )}

          {step === "token" && (
            <div>
              <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                Paste your NPSSO token below. It should be 64 characters long.
              </div>
              <div style={{ marginBottom: 12 }}>
                <input
                  value={npsso}
                  onChange={e => { setNpsso(e.target.value); setError(null); }}
                  onKeyDown={e => e.key === "Enter" && fetchPSN()}
                  placeholder="Paste your NPSSO token here..."
                  autoFocus
                  style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + (error ? "#ef4444" : C.border), borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }}
                />
                {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{error}</div>}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep("explain")} style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 10, padding: "11px", color: C.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Back
                </button>
                <button onClick={fetchPSN} disabled={loading || !npsso.trim()} style={{ flex: 2, background: npsso.trim() ? PSN_BLUE : C.surfaceRaised, border: "none", borderRadius: 10, padding: "11px", color: npsso.trim() ? "white" : C.textDim, fontSize: 14, fontWeight: 800, cursor: npsso.trim() ? "pointer" : "default" }}>
                  {loading ? "Connecting to PSN…" : "Fetch My Library"}
                </button>
              </div>
            </div>
          )}

          {step === "review" && psnData && !importDone && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: C.surface, borderRadius: 10, border: "1px solid " + C.border }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>PlayStation connected</div>
                  <div style={{ color: C.textDim, fontSize: 12 }}>{psnData.totalGames} games found from your trophy history</div>
                </div>
                <button onClick={() => setSelectedGames(new Set(psnData.games.map((_, i) => i)))} style={{ marginLeft: "auto", background: "none", border: "none", color: C.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Select all</button>
              </div>

              {importing ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 12 }}>Importing your library…</div>
                  <div style={{ background: C.surfaceRaised, borderRadius: 8, height: 8, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", width: importProgress + "%", background: PSN_BLUE, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ color: C.textDim, fontSize: 13 }}>{importProgress}% complete</div>
                </div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 16 }}>
                  {psnData.games.map((game, idx) => (
                    <div key={idx} onClick={() => toggleGame(idx)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, marginBottom: 4, cursor: "pointer", background: selectedGames.has(idx) ? C.accentGlow : C.surfaceRaised, border: "1px solid " + (selectedGames.has(idx) ? C.accentDim : C.border) }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (selectedGames.has(idx) ? C.accent : C.border), background: selectedGames.has(idx) ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {selectedGames.has(idx) && <span style={{ color: "white", fontSize: 11, fontWeight: 800 }}>✓</span>}
                      </div>
                      {game.iconUrl && <img src={game.iconUrl} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                        <div style={{ color: C.textDim, fontSize: 11 }}>{game.platform} · {game.trophiesEarned} trophies</div>
                      </div>
                      <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {["have_played", "playing", "want_to_play"].map(s => (
                          <button key={s} onClick={e => { e.stopPropagation(); setStatusOverrides(prev => ({ ...prev, [idx]: s })); }}
                            style={{ background: (statusOverrides[idx] || "have_played") === s ? statusColors[s] + "22" : "transparent", border: "1px solid " + ((statusOverrides[idx] || "have_played") === s ? statusColors[s] + "66" : C.border), borderRadius: 6, padding: "2px 7px", color: (statusOverrides[idx] || "have_played") === s ? statusColors[s] : C.textDim, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                            {s === "have_played" ? "Played" : s === "playing" ? "Playing" : "Want"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {importDone && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
              <div style={{ fontWeight: 800, color: C.text, fontSize: 18, marginBottom: 8 }}>PlayStation library imported!</div>
              <div style={{ color: C.textMuted, fontSize: 14, marginBottom: 24 }}>{selectedGames.size} games added to your shelf.</div>
              <button onClick={() => { onImportComplete?.(); onClose(); }} style={{ background: PSN_BLUE, border: "none", borderRadius: 10, padding: "12px 32px", color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Done</button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "review" && psnData && !importDone && !importing && (
          <div style={{ padding: "14px 24px", borderTop: "1px solid " + C.border, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: C.textDim, fontSize: 13 }}>{selectedGames.size} of {psnData.totalGames} selected</div>
            <button onClick={doImport} disabled={selectedGames.size === 0}
              style={{ background: selectedGames.size > 0 ? PSN_BLUE : C.surfaceRaised, border: "none", borderRadius: 10, padding: "10px 24px", color: selectedGames.size > 0 ? "white" : C.textDim, fontSize: 14, fontWeight: 800, cursor: selectedGames.size > 0 ? "pointer" : "default" }}>
              Import {selectedGames.size} games →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PSNImportModal;
