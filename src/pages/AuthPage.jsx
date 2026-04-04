import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";

function AuthPage({ onBack, defaultMode = "login" }) {
  const [mode, setMode] = useState(defaultMode); // "login" | "signup" | "forgot" | "reset"
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Detect password reset redirect from Supabase email link
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") && hash.includes("token_hash=")) {
      setMode("reset");
    }
  }, []);

  const fakeEmail = (u) => u.trim().toLowerCase().replace(/\s+/g, "_") + "@guildlink.gg";

  const handle = async () => {
    setLoading(true);
    setError("");

    if (mode === "login") {
      if (!username.trim()) { setError("Email is required."); setLoading(false); return; }
      if (!password) { setError("Password is required."); setLoading(false); return; }
      const { error: err1 } = await supabase.auth.signInWithPassword({ email: username.trim(), password });
      if (!err1) { setLoading(false); return; }
      const { error: err2 } = await supabase.auth.signInWithPassword({ email: fakeEmail(username), password });
      if (!err2) { setLoading(false); return; }
      setError("Email or password incorrect.");

    } else if (mode === "signup") {
      if (!username.trim()) { setError("Username is required."); setLoading(false); return; }
      if (!password) { setError("Password is required."); setLoading(false); return; }
      if (!contactEmail.trim()) { setError("Email is required."); setLoading(false); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) { setError("Please enter a valid email address."); setLoading(false); return; }
      const { data, error } = await supabase.auth.signUp({ email: contactEmail.trim(), password });
      if (error) { setError(error.message); setLoading(false); return; }
      if (data?.user) {
        await supabase.from("profiles").update({
          username: username.trim(),
          handle: "@" + username.trim().toLowerCase().replace(/\s+/g, "_"),
          avatar_initials: username.trim().slice(0, 2).toUpperCase(),
          contact_email: contactEmail.trim(),
        }).eq("id", data.user.id);
        setConfirmedEmail(contactEmail.trim());
        setSignupSuccess(true);
      }

    } else if (mode === "forgot") {
      if (!contactEmail.trim()) { setError("Email is required."); setLoading(false); return; }
      const { error } = await supabase.auth.resetPasswordForEmail(contactEmail.trim(), {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setForgotSuccess(true);

    } else if (mode === "reset") {
      if (!password) { setError("Password is required."); setLoading(false); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }
      // Extract token_hash from URL and verify it to establish session
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace("#", ""));
      const tokenHash = params.get("token_hash");
      if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        if (verifyError) { setError(verifyError.message); setLoading(false); return; }
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(error.message); setLoading(false); return; }
      window.history.replaceState(null, "", window.location.pathname);
      setMode("login");
      setPassword("");
      setError("");
    }

    setLoading(false);
  };

  const LOGO = <svg viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}><rect fill="#f59e0b" x="93.5" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="93.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="109.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="109.2" y="47" width="15.7" height="15.7"/><rect fill="#f59e0b" x="124.8" y="47" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="156.1" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="156.1" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="171.8" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="171.8" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="218.7" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="218.7" y="47" width="15.7" height="15.7"/><rect fill="#f59e0b" x="218.7" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="218.7" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="93.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="109.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="156.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="172.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="187.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="171.8" y="187.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="171.8" y="203.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="156.1" y="203.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="156.1" y="219.1" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="219.1" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="234.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="124.8" y="234.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="109.2" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="124.8" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="77.8" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="77.8" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="62.2" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="62.2" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="15.2" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="15.2" y="47" width="15.7" height="15.7"/><rect fill="#f59e0b" x="15.2" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="15.2" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="93.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="109.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="156.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="172.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="187.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="62.2" y="187.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="62.2" y="203.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="77.8" y="203.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="77.8" y="219.1" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="219.1" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="234.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="109.2" y="234.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="124.8" y="109.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="109.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="109.2" y="156.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="124.8" y="156.5" width="15.7" height="15.7"/></svg>;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,900&display=swap'); * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }"}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, margin: "0 auto 16px" }}>{LOGO}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.text }}>GuildLink</div>
          <div style={{ color: C.textMuted, fontSize: 14, marginTop: 4 }}>The town square for gamers</div>
        </div>

        {/* Signup success */}
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

        /* Forgot password email sent */
        ) : forgotSuccess ? (
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18, marginBottom: 10 }}>Check your email</div>
            <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              We sent a reset link to<br />
              <span style={{ color: C.accentSoft, fontWeight: 700 }}>{contactEmail}</span>.<br />
              Click the link to set a new password.
            </div>
            <div style={{ color: C.textDim, fontSize: 12, marginBottom: 20 }}>Didn't get it? Check your spam folder.</div>
            <button onClick={() => { setForgotSuccess(false); setMode("login"); setContactEmail(""); }}
              style={{ background: "none", border: "none", color: C.accentSoft, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              Back to log in
            </button>
          </div>

        /* Reset password form (after clicking email link) */
        ) : mode === "reset" ? (
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: 32 }}>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18, marginBottom: 6 }}>Set a new password</div>
            <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 24 }}>Choose something you'll remember.</div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>New Password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handle()} placeholder="at least 6 characters"
                style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
            </div>
            {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <button onClick={handle} disabled={loading}
              style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: C.accent, color: C.accentText, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              {loading ? "..." : "Update Password"}
            </button>
          </div>

        /* Login / Signup / Forgot forms */
        ) : (
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: 32 }}>

            {mode !== "forgot" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                {["login", "signup"].map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(""); }}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: mode === m ? C.accent : C.surfaceRaised, color: mode === m ? "#fff" : C.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {m === "login" ? "Log In" : "Sign Up"}
                  </button>
                ))}
              </div>
            )}

            {mode === "login" && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Email</div>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="you@email.com"
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                  <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>Existing member? You can still log in with your username.</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Password</div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password"
                    onKeyDown={e => e.key === "Enter" && handle()}
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ textAlign: "right", marginBottom: 20 }}>
                  <button onClick={() => { setMode("forgot"); setError(""); }}
                    style={{ background: "none", border: "none", color: C.textDim, fontSize: 12, cursor: "pointer", padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {mode === "signup" && (
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
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password"
                    onKeyDown={e => e.key === "Enter" && handle()}
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                </div>
              </>
            )}

            {mode === "forgot" && (
              <>
                <div style={{ fontWeight: 800, color: C.text, fontSize: 18, marginBottom: 6 }}>Forgot your password?</div>
                <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>Enter your email and we'll send you a reset link.</div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Email</div>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@email.com"
                    onKeyDown={e => e.key === "Enter" && handle()}
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                </div>
              </>
            )}

            {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}

            <button onClick={handle} disabled={loading}
              style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: C.accent, color: C.accentText, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              {loading ? "..." : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
            </button>

            {mode === "forgot" && (
              <button onClick={() => { setMode("login"); setError(""); }}
                style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 10, border: "none", background: "transparent", color: C.textDim, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Back to log in
              </button>
            )}

            {onBack && mode !== "forgot" && (
              <button onClick={onBack}
                style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 10, border: "none", background: "transparent", color: C.textDim, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
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
