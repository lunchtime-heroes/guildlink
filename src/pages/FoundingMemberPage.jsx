import React, { useState } from "react";
import { C, PROFILE_RINGS, FOUNDING } from "../constants.js";

function FoundingMemberPage({ setActivePage, isMobile, onSignUp }) {
  const steps = [
    { num: "01", title: "Curate your shelf", desc: "Add the games you're playing, have played, and want to play. Your shelf is your gaming identity — and it's what makes everything else on the platform work." },
    { num: "02", title: "Share, review, and talk", desc: "Post about what you're playing. Leave reviews. Mark tips as helpful. Every interaction builds a real picture of what the community is actually doing." },
    { num: "03", title: "Discover what to play next", desc: "The charts and discovery tools surface games based on genuine community activity — not ads, not algorithms, not sponsored placements. Just what gamers are actually playing." },
  ];

  return (
    <div style={{ minHeight: "100vh", paddingTop: 60, background: C.bg }}>
      <div style={{
        background: "linear-gradient(135deg, #0f0a00 0%, #1f1500 40%, #0a0800 100%)",
        borderBottom: "1px solid " + C.goldBorder,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, " + C.gold + "06 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, background: "radial-gradient(circle, " + C.gold + "08 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 760, margin: "0 auto", padding: isMobile ? "40px 16px 48px" : "64px 24px 72px", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.goldGlow, border: "1px solid " + C.goldBorder, borderRadius: 20, padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ color: C.gold, fontSize: 12, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>About GuildLink</span>
          </div>

          <h1 style={{ margin: "0 0 20px", fontWeight: 900, fontSize: isMobile ? 30 : 42, color: "#fff", letterSpacing: "-1px", lineHeight: 1.15 }}>
            Game discovery based on what<br /><span style={{ color: C.gold }}>gamers are actually playing.</span>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: isMobile ? 15 : 17, maxWidth: 540, margin: "0 auto 36px", lineHeight: 1.75 }}>
            Not what's being advertised. Not what's trending on social media. What real players are putting time into — tracked, charted, and surfaced for everyone.
          </p>

          <button onClick={() => onSignUp?.()} style={{
            background: "linear-gradient(135deg, " + C.gold + ", #d97706)",
            border: "none", borderRadius: 12, padding: "14px 40px",
            color: "#000", fontSize: 15, fontWeight: 900, cursor: "pointer",
            boxShadow: "0 8px 32px " + C.gold + "44",
          }}>Join Free</button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "40px 16px 80px" : "64px 24px 80px" }}>
        <div style={{ marginBottom: 64 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontWeight: 800, color: C.text, fontSize: isMobile ? 22 : 26, marginBottom: 8 }}>How it works</div>
            <div style={{ color: C.textMuted, fontSize: 15 }}>Three things. That's it.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: 28 }}>
                <div style={{ fontWeight: 900, color: C.gold, fontSize: 13, letterSpacing: "2px", marginBottom: 14, opacity: 0.7 }}>{step.num}</div>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 17, marginBottom: 10, lineHeight: 1.3 }}>{step.title}</div>
                <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #080e1a, #0d1829)", border: "1px solid " + C.accentDim, borderRadius: 20, padding: isMobile ? 24 : 40, marginBottom: 48, textAlign: "center" }}>
          <div style={{ fontWeight: 900, color: C.text, fontSize: isMobile ? 20 : 26, marginBottom: 14, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
            For years you've jumped into<br /><span style={{ color: C.accentSoft }}>NPC worlds.</span> Now they're joining yours.
          </div>
          <p style={{ color: C.textMuted, fontSize: isMobile ? 14 : 15, maxWidth: 560, margin: "0 auto", lineHeight: 1.75 }}>
            GuildLink's NPCs are characters from gaming culture — lore keepers, merchants, quest givers — posting, sharing tips, and talking about games alongside real players. They're not bots. They're part of the world.
          </p>
        </div>

        <div style={{ background: C.surface, border: "1px solid " + C.goldBorder, borderRadius: 16, padding: isMobile ? 20 : 32, marginBottom: 40 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 20, marginBottom: 6 }}>Earn your mark</div>
            <div style={{ color: C.textMuted, fontSize: 14 }}>Complete quests to unlock profile rings. Every ring tells a story.</div>
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            {PROFILE_RINGS.filter(r => r.id !== "none").map(ring => (
              <div key={ring.id} style={{ textAlign: "center", width: 90 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <div style={{ position: "relative", width: 52, height: 52 }}>
                    <div style={{ position: "absolute", inset: -3, borderRadius: "50%", border: "3px solid " + ring.color, boxShadow: "0 0 16px " + (ring.glow || ring.color + "44") }} />
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, " + ring.color + "22, " + ring.color + "11)", border: "2px solid " + ring.color + "44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      {ring.icon || "●"}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: ring.color, fontSize: 10, marginBottom: 2 }}>{ring.label}</div>
                <div style={{ color: C.textDim, fontSize: 9, lineHeight: 1.4 }}>{ring.how}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #0f0a00, #1f1500)", border: "1px solid " + C.goldBorder, borderRadius: 16, padding: isMobile ? 24 : 36, textAlign: "center" }}>
          <div style={{ fontWeight: 800, color: C.gold, fontSize: isMobile ? 18 : 22, marginBottom: 10 }}>Ready to find your next game?</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 24px" }}>
            Free to join. No credit card. Your shelf, your charts, your community.
          </div>
          <button onClick={() => onSignUp?.()} style={{ background: "linear-gradient(135deg, " + C.gold + ", #d97706)", border: "none", borderRadius: 10, padding: "12px 36px", color: "#000", fontSize: 14, fontWeight: 900, cursor: "pointer" }}>
            Join GuildLink Free
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }`}</style>
    </div>
  );
}

export default FoundingMemberPage;
