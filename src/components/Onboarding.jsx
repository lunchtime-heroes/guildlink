import React, { useState, useRef } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { isUsernameRestricted } from "../utils.js";

// ── Error boundary — silently dismiss onboarding on crash ─────────────────────
export class OnboardingErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ── Username gate — shown before onboarding if username is auto-generated ──────
export function UsernameGateModal({ userId, isMobile, onComplete }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = username.trim();
    if (!trimmed) { setError("Please choose a username."); return; }
    if (trimmed.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setError("Letters, numbers, and underscores only."); return; }
    setSaving(true);
    setError("");

    const restricted = await isUsernameRestricted(trimmed);
    if (restricted) { setError("Username unavailable."); setSaving(false); return; }

    const { data: existing } = await supabase.from("profiles").select("id").eq("username", trimmed).neq("id", userId).limit(1);
    if (existing?.length > 0) { setError("That username is already taken."); setSaving(false); return; }

    const { error: updateError } = await supabase.from("profiles").update({
      username: trimmed,
      handle: "@" + trimmed.toLowerCase(),
      avatar_initials: trimmed.slice(0, 2).toUpperCase(),
    }).eq("id", userId);

    if (updateError) { setError("Something went wrong. Please try again."); setSaving(false); return; }
    onComplete(trimmed);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: C.surface, border: "1px solid " + C.accentDim, borderRadius: 20, padding: isMobile ? 28 : 40, maxWidth: 440, width: "100%" }}>
        <div style={{ fontSize: 36, marginBottom: 16, textAlign: "center" }}>👋</div>
        <div style={{ fontWeight: 900, fontSize: isMobile ? 22 : 26, color: C.text, marginBottom: 8, textAlign: "center" }}>One last thing.</div>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 24, textAlign: "center" }}>
          Choose a username so other gamers can find you. This is how you'll appear across GuildLink.
        </div>
        <div style={{ marginBottom: 16 }}>
          <input
            value={username}
            onChange={e => { setUsername(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && save()}
            placeholder="Choose a username"
            autoFocus
            style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + (error ? "#ef4444" : C.border), borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box" }}
          />
          {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{error}</div>}
          <div style={{ color: C.textDim, fontSize: 11, marginTop: 6 }}>Letters, numbers, and underscores only.</div>
        </div>
        <button
          onClick={save}
          disabled={saving || !username.trim()}
          style={{ width: "100%", background: username.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 10, padding: "13px", color: username.trim() ? C.accentText : C.textDim, fontSize: 15, fontWeight: 800, cursor: username.trim() ? "pointer" : "default", transition: "all 0.2s" }}>
          {saving ? "Saving..." : "Set Username"}
        </button>
      </div>
    </div>
  );
}

// ── Onboarding modal — shown after username is set ────────────────────────────
export function OnboardingModal({ currentUser, isMobile, onComplete, setActivePage, setProfileDefaultTab }) {
  const [step, setStep] = useState(0);
  const [addedGames, setAddedGames] = useState([]);
  const [questPopped, setQuestPopped] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Always use the real username — onboarding only starts after UsernameGateModal completes
  const username = currentUser?.name || currentUser?.username || "friend";

  const STEPS = [
    {
      heading: "Welcome to GuildLink. I'm Bizmond.",
      body: "I'll be your guide for the next few minutes. When I'm not enchanting scrolls or vanquishing magical beasts, I help gamers find their way around GuildLink.",
      cta: `Hi Bizmond, I'm ${username}!`,
      highlight: null,
    },
    {
      heading: `Good to meet you, ${username}!`,
      body: "Now that we're best friends, I'm going to tell you a secret: GuildLink's source of power comes from your shelf. What you've played, what you're playing now, and what's waiting in your queue make up your gaming lineage. And it's the key to helping you find your next favorite game.",
      cta: "I'll keep it a secret.",
      highlight: "shelf",
    },
    {
      heading: "I think you're ready…",
      body: "Go ahead and add one game you're playing to your shelf. It's right below you.",
      cta: null,
      highlight: null,
      showSearch: true,
    },
    {
      heading: "Every time you complete a quest, a unicorn gets its wings.",
      body: "Your shelf just got its first entry! And you just completed your first quest. Whenever you want to check your quests, check the quests tab in your profile.",
      cta: "Quest accepted",
      highlight: "quests",
      questPop: true,
    },
    {
      heading: "Now to meet some new friends.",
      body: "The main feed is where the conversation happens. Tag a game like you would a friend, follow gamers, and say hello to your favorite NPCs. Yep, we're here too! Ok, have fun!",
      cta: "Take me to the feed!",
      highlight: null,
      last: true,
    },
  ];

  const current = STEPS[step] || STEPS[STEPS.length - 1];
  const progress = (step / (STEPS.length - 1)) * 100;

  const addGame = async (game) => {
    if (addedGames.find(g => g.id === game.id)) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("user_games").upsert({ user_id: authUser.id, game_id: game.id, status: "playing", updated_at: new Date().toISOString() }, { onConflict: "user_id,game_id" });
    await supabase.from("user_games_history").insert({ user_id: authUser.id, game_id: game.id, from_status: null, to_status: "playing" });
    await supabase.from("chart_events").insert({ game_id: game.id, user_id: authUser.id, event_type: "shelf_playing", date: new Date().toISOString().slice(0, 10), week_start: new Date().toISOString().slice(0, 10), post_sequence: 1 });
    await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "shelf_add" });
    await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "have_played" });
    setAddedGames(prev => [...prev, game]);
    setQuestPopped(prev => {
      if (!prev) setTimeout(() => advance(3), 600);
      return true;
    });
  };

  const advance = (toStep) => {
    setTransitioning(true);
    const nextStep = toStep !== undefined ? toStep : step + 1;
    // When reaching the "add a game" step, navigate to profile games tab
    if (nextStep === 2) {
      setActivePage?.("profile");
      setProfileDefaultTab?.("games");
    }
    setTimeout(() => { setStep(nextStep); setTransitioning(false); }, 200);
  };

  const finish = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) await supabase.from("profiles").update({ onboarded: true }).eq("id", authUser.id);
    setProfileDefaultTab?.("games");
    setActivePage?.("feed");
    onComplete();
  };

  const skip = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) await supabase.from("profiles").update({ onboarded: true }).eq("id", authUser.id);
    setActivePage?.("feed");
    onComplete();
  };

  // Game search
  const [atText, setAtText] = useState("");
  const [atResults, setAtResults] = useState([]);
  const [atIndex, setAtIndex] = useState(0);
  const atInputRef = useRef(null);

  const handleAtInput = async (e) => {
    const val = e.target.value;
    setAtText(val);
    const q = val.startsWith("@") ? val.slice(1) : val;
    if (q.length >= 2) {
      const [localRes, igdbRes] = await Promise.allSettled([
        supabase.from("games").select("id, name, genre, cover_url").ilike("name", `%${q}%`).limit(4),
        fetch("/api/igdb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) }).then(r => r.json()).catch(() => ({ games: [] })),
      ]);
      const local = localRes.status === "fulfilled" ? (localRes.value.data || []) : [];
      const igdb = igdbRes.status === "fulfilled" ? (igdbRes.value.games || []) : [];
      const localNames = new Set(local.map(g => g.name.toLowerCase()));
      const fromIGDB = igdb.filter(g => !localNames.has(g.name.toLowerCase())).map(g => ({ ...g, _fromIGDB: true }));
      setAtResults([...local, ...fromIGDB].slice(0, 6));
    } else {
      setAtResults([]);
    }
  };

  const selectAtGame = async (game) => {
    if (game._fromIGDB) {
      const { data: inserted } = await supabase.from("games").insert({
        name: game.name, genre: game.genre, summary: game.summary,
        cover_url: game.cover_url, igdb_id: game.igdb_id, followers: 0,
        platforms: game.platforms || null,
      }).select().single();
      if (inserted) await addGame(inserted);
    } else {
      await addGame(game);
    }
    setAtResults([]);
    setAtText("");
    setTimeout(() => atInputRef.current?.focus(), 0);
  };

  const BIZMOND_COLOR = "#a78bfa";

  return (
    <>
      {current.highlight && (
        <style>{`
          [data-tour="${current.highlight === "shelf" ? "games-tab" : "quests-tab"}"] {
            animation: navPulse 1s ease-in-out infinite !important;
          }
          @keyframes navPulse {
            0%, 100% { color: ${C.gold} !important; text-shadow: none; }
            50% { color: ${C.gold} !important; text-shadow: 0 0 12px ${C.gold}, 0 0 24px ${C.gold}88; }
          }
        `}</style>
      )}

      <div style={{
        position: "fixed",
        top: isMobile ? 52 : 60,
        left: "50%",
        transform: `translateX(-50%) translateY(${transitioning ? "-8px" : "0"})`,
        width: isMobile ? "calc(100vw - 24px)" : 540,
        zIndex: 9999,
        background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surfaceRaised} 100%)`,
        border: "1px solid " + C.border,
        borderBottom: `3px solid ${BIZMOND_COLOR}`,
        borderRadius: "0 0 18px 18px",
        boxShadow: "0 8px 40px #00000088",
        opacity: transitioning ? 0 : 1,
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}>
        <div style={{ height: 3, background: C.surfaceRaised }}>
          <div style={{ height: "100%", width: progress + "%", background: `linear-gradient(90deg, ${BIZMOND_COLOR}, ${C.accent})`, transition: "width 0.4s ease" }} />
        </div>

        <div style={{ padding: isMobile ? "14px 16px 16px" : "18px 22px 20px" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: isMobile ? 44 : 52, height: isMobile ? 44 : 52,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${BIZMOND_COLOR}33, ${BIZMOND_COLOR}11)`,
                border: `2px solid ${BIZMOND_COLOR}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isMobile ? 22 : 26,
                boxShadow: `0 0 16px ${BIZMOND_COLOR}33`,
              }}>🧙</div>
              <div style={{ color: C.gold, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>BIZMOND</div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {current.questPop && (
                <div style={{
                  background: C.green + "15", border: "1px solid " + C.green + "44",
                  borderRadius: 8, padding: "7px 12px", marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 16 }}>🎯</span>
                  <div>
                    <div style={{ color: C.green, fontWeight: 800, fontSize: 11 }}>Quest Complete — First Game Added</div>
                    <div style={{ color: C.gold, fontSize: 10 }}>+50 XP earned</div>
                  </div>
                </div>
              )}

              <div style={{ fontWeight: 800, color: C.text, fontSize: isMobile ? 13 : 15, marginBottom: 5, lineHeight: 1.3 }}>
                {current.heading}
              </div>
              <div style={{ color: C.textMuted, fontSize: isMobile ? 12 : 13, lineHeight: 1.6 }}>
                {current.body}
              </div>

              {current.showSearch && (
                <div style={{ marginTop: 12, position: "relative" }}>
                  <input
                    ref={atInputRef}
                    value={atText}
                    onChange={handleAtInput}
                    placeholder="Search for a game..."
                    autoFocus
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                  {atResults.length > 0 && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: 8, overflow: "hidden", zIndex: 10001, boxShadow: "0 8px 24px #00000066", maxHeight: 240, overflowY: "auto" }}>
                      {atResults.map((game, idx) => (
                        <div key={game.id || game.igdb_id} onClick={() => selectAtGame(game)}
                          style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 10, background: idx === atIndex ? C.surfaceRaised : "transparent" }}
                          onMouseEnter={() => setAtIndex(idx)}>
                          {game.cover_url && <img src={game.cover_url} alt="" style={{ width: 22, height: 29, borderRadius: 3, objectFit: "cover", flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: C.text, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                            {game.genre && <div style={{ color: C.textDim, fontSize: 10 }}>{game.genre}</div>}
                          </div>
                          {game._fromIGDB && <span style={{ color: C.teal, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>+ Add</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {addedGames.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {addedGames.map(g => (
                        <div key={g.id} style={{ background: C.accent + "18", border: "1px solid " + C.accentDim, borderRadius: 6, padding: "3px 10px", color: C.accentSoft, fontSize: 11, fontWeight: 700 }}>✓ {g.name}</div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => advance(3)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: "6px 0 0", display: "block" }}>
                    Skip for now →
                  </button>
                </div>
              )}

              {current.cta && (
                <button
                  onClick={current.last ? finish : () => advance()}
                  style={{ marginTop: 14, background: C.accent, border: "none", borderRadius: 10, padding: isMobile ? "9px 18px" : "10px 22px", color: C.accentText, fontSize: isMobile ? 12 : 13, fontWeight: 800, cursor: "pointer" }}>
                  {current.cta}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={skip} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: "4px 0" }}>
              Skip intro
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
