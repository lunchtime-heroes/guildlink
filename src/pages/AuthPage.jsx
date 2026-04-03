import React, { useState } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";

function AuthPage({ onBack, defaultMode = "login" }) {
  const [mode, setMode] = useState(defaultMode);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState("");

  const fakeEmail = (u) => u.trim().toLowerCase().replace(/\s+/g, "_") + "@guildlink.gg";

  const handle = async () => {
    setLoading(true);
    setError("");

    if (mode === "login") {
      if (!username.trim()) { setError("Email is required."); setLoading(false); return; }
      if (!password) { setError("Password is required."); setLoading(false); return; }

      // Try login with what they entered as email first
      const { error: err1 } = await supabase.auth.signInWithPassword({ email: username.trim(), password });
      if (!err1) { setLoading(false); return; }

      // Fallback: try as username with fake email (existing accounts)
      const { error: err2 } = await supabase.auth.signInWithPassword({ email: fakeEmail(username), password });
      if (!err2) { setLoading(false); return; }

      setError("Email or password incorrect.");

    } else {
      if (!username.trim()) { setError("Username is required."); setLoading(false); return; }
      if (!password) { setError("Password is required."); setLoading(false); return; }
      if (!contactEmail.trim()) { setError("Email is required."); setLoading(false); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) { setError("Please enter a valid email address."); setLoading(false); return; }

      const { data, error } = await supabase.auth.signUp({ email: contactEmail.trim(), password });
      if (error) { setError(error.message); setLoading(false); return; }
      if (data?.user) {
        const profileUpdates = {
          username: username.trim(),
          handle: "@" + username.trim().toLowerCase().replace(/\s+/g, "_"),
          avatar_initials: username.trim().slice(0, 2).toUpperCase(),
          contact_email: contactEmail.trim(),
        };
        await supabase.from("profiles").update(profileUpdates).eq("id", data.user.id);
        setConfirmedEmail(contactEmail.trim());
        setSignupSuccess(true);
      }
    }

    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,900&display=swap'); * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }"}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, " + C.accent + ", " + C.teal + ")", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, fontWeight: 900, color: "#fff" }}>GL</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.text }}>GuildLink</div>
          <div style={{ color: C.textMuted, fontSize: 14, marginTop: 4 }}>The town square for gamers</div>
        </div>

        {signupSuccess ? (
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18, marginBottom: 10 }}>Check your email</div>
            <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              We sent a confirmation link to<br />
              <span style={{ color: C.accentSoft, fontWeight: 700 }}>{confirmedEmail}</span>.<br />
              Click the link to activate your account and jump in.
            </div>
            <div style={{ color: C.textDim, fontSize: 12 }}>Didn't get it? Check your spam folder.</div>
          </div>
        ) : (
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: 32 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {["login", "signup"].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); }}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: mode === m ? C.accent : C.surfaceRaised, color: mode === m ? "#fff" : C.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {m === "login" ? "Log In" : "Sign Up"}
                </button>
              ))}
            </div>

            {mode === "login" ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Email</div>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="you@email.com"
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                  <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>Existing member? You can still log in with your username.</div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Password</div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" onKeyDown={e => e.key === "Enter" && handle()}
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Username</div>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="YourGamerName"
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Email</div>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@email.com"
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Password</div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" onKeyDown={e => e.key === "Enter" && handle()}
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                </div>
              </>
            )}

            {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}

            <button onClick={handle} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: C.accent, color: C.accentText, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              {loading ? "..." : mode === "login" ? "Log In" : "Create Account"}
            </button>
            {onBack && (
              <button onClick={onBack} style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 10, border: "none", background: "transparent", color: C.textDim, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Back
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthPage;
