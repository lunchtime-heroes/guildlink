import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { PixelCornerBox } from "../components/PixelCornerBox.jsx";
import { PixelButton } from "../components/PixelButton.jsx";
import { PixelTabBar } from "../components/PixelTabBar.jsx";

function AuthPage({ onBack, defaultMode = "login", setActivePage, onSignupOptIn }) {
  const [mode, setMode] = useState(defaultMode); // "login" | "signup" | "forgot" | "reset"
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [patchNotesOptIn, setPatchNotesOptIn] = useState(false);

  // Detect password reset redirect from Supabase email link
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") && hash.includes("token_hash=")) {
      setMode("reset");
    }
  }, []);

  const fakeEmail = (u) => u.trim().toLowerCase().replace(/\s+/g, "_") + "@guildlink.gg";

  const handle = async () => { console.log("handle called, mode:", mode);
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
      if (!contactEmail.trim()) { setError("Email is required."); setLoading(false); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) { setError("Please enter a valid email address."); setLoading(false); return; }
      if (!password) { setError("Password is required."); setLoading(false); return; }
      const { data, error } = await supabase.auth.signUp({ email: contactEmail.trim(), password });
      if (error) { setError(error.message); setLoading(false); return; }
      if (data?.user) {
        await supabase.from("user_private").insert({
          id: data.user.id,
          contact_email: contactEmail.trim(),
        });
        // If user opted in to Patch Notes, notify parent to add to Resend audience
        if (patchNotesOptIn) {
          onSignupOptIn?.(contactEmail.trim());
        }
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
      if (tokenHash) { console.log("token_hash found:", tokenHash);
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }); console.log("verify result:", verifyData, verifyError);
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
          <PixelCornerBox size="lg" borderColor={C.border} bg={C.surface} style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18, marginBottom: 10 }}>Check your email</div>
            <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              We sent a confirmation link to<br />
              <span style={{ color: C.accentSoft, fontWeight: 700 }}>{confirmedEmail}</span>.<br />
              Click the link to activate your account and jump in.
            </div>
            <div style={{ color: C.textDim, fontSize: 12 }}>Didn't get it? Check your spam folder.</div>
          </PixelCornerBox>

        /* Forgot password email sent */
        ) : forgotSuccess ? (
          <PixelCornerBox size="lg" borderColor={C.border} bg={C.surface} style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18, marginBottom: 10 }}>Check your email</div>
            <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              We sent a reset link to<br />
              <span style={{ color: C.accentSoft, fontWeight: 700 }}>{contactEmail}</span>.<br />
              Click the link to set a new password.
            </div>
            <div style={{ color: C.textDim, fontSize: 12, marginBottom: 20 }}>Didn't get it? Check your spam folder.</div>
            <PixelButton onClick={() => { setForgotSuccess(false); setMode("login"); setContactEmail(""); }} bg="transparent" borderColor={C.accentDim} color={C.accentSoft}>{"Back to log in"}</PixelButton>
          </PixelCornerBox>

        /* Reset password form (after clicking email link) */
        ) : mode === "reset" ? (
          <PixelCornerBox size="lg" borderColor={C.border} bg={C.surface} style={{ padding: 32 }}>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18, marginBottom: 6 }}>Set a new password</div>
            <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 24 }}>Choose something you'll remember.</div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>New Password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="new password"
                onKeyDown={e => e.key === "Enter" && handle()}
                style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 3, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
            </div>
            {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <PixelButton fullWidth onClick={handle} disabled={loading} bg={C.accent} color={C.accentText}>{loading ? "..." : "Set Password"}</PixelButton>
          </PixelCornerBox>

        ) : (
          <PixelCornerBox size="lg" borderColor={C.border} bg={C.surface} style={{ padding: 32 }}>
            {/* Tab switcher */}
            {mode !== "forgot" && (
              <div style={{ marginBottom: 24 }}>
                <PixelTabBar
                  tabs={[{ id: "login", label: "Log In" }, { id: "signup", label: "Sign Up" }]}
                  active={mode}
                  onChange={(m) => { setMode(m); setError(""); }}
                />
              </div>
            )}

            {mode === "login" && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Email</div>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="you@email.com"
                    onKeyDown={e => e.key === "Enter" && handle()}
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 3, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                  <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>Existing member? You can still log in with your username.</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Password</div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password"
                    onKeyDown={e => e.key === "Enter" && handle()}
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 3, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
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
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Email</div>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@email.com"
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 3, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Password</div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password"
                    onKeyDown={e => e.key === "Enter" && handle()}
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 3, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                </div>
                {/* Patch Notes opt-in */}
                <div onClick={() => setPatchNotesOptIn(v => !v)}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20, cursor: "pointer", userSelect: "none" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (patchNotesOptIn ? C.accent : C.border), background: patchNotesOptIn ? C.accent : "transparent", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                    {patchNotesOptIn && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5 }}>
                    Send me <strong style={{ color: C.text }}>Patch Notes</strong> — occasional updates about new GuildLink features. Unsubscribe anytime.
                  </div>
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
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 3, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
                </div>
              </>
            )}

            {mode === "signup" && (
              <div style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6, marginBottom: 16, textAlign: "center" }}>
                By creating an account you agree to our{" "}
                <span onClick={() => { setActivePage?.("culture"); window.history.pushState({ page: "culture" }, "", "/culture"); }} style={{ color: C.accentSoft, cursor: "pointer", textDecoration: "underline" }}>Culture Agreement</span>
                {" "}and{" "}
                <span onClick={() => { setActivePage?.("privacy"); window.history.pushState({ page: "privacy" }, "", "/privacy"); }} style={{ color: C.accentSoft, cursor: "pointer", textDecoration: "underline" }}>Privacy Policy</span>.
              </div>
            )}

            {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}

            <div style={{ padding: "1px 0" }}>
              <PixelButton fullWidth onClick={handle} disabled={loading} bg={C.accent} color={C.accentText}>
                {loading ? "..." : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
              </PixelButton>
            </div>

            {mode === "forgot" && (
              <div style={{ marginTop: 10, padding: "1px 0" }}>
                <PixelButton fullWidth onClick={() => { setMode("login"); setError(""); }} bg="transparent" borderColor={C.border} color={C.textDim}>{"Back to log in"}</PixelButton>
              </div>
            )}

            {onBack && mode !== "forgot" && (
              <div style={{ marginTop: 10, padding: "1px 0" }}>
                <PixelButton fullWidth onClick={onBack} bg="transparent" borderColor={C.border} color={C.textDim}>{"Back"}</PixelButton>
              </div>
            )}
          </PixelCornerBox>
        )}
      </div>
    </div>
  );
}

export default AuthPage;
