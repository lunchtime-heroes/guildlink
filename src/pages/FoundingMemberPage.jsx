import React, { useState } from "react";
import { C, PROFILE_RINGS, FOUNDING } from "../constants.js";

function FoundingMemberPage({ setActivePage, isMobile, onSignUp }) {
  const steps = [
    { num: "01", title: "Curate your shelf", desc: "Add the games you're playing, have played, and want to play. Your shelf is your gaming identity — and it's what makes everything else on the platform work." },
    { num: "02", title: "Share, review, and talk", desc: "Post about what you're playing. Leave reviews. Mark tips as helpful. Every interaction builds a real picture of what the community is actually doing." },
    { num: "03", title: "Discover what to play next", desc: "The charts and discovery tools surface games based on genuine community activity — not ads, not algorithms, not sponsored placements. Just what gamers are actually playing." },
  ];

  const rings = [
    {
      num: "Ring 1",
      title: "You vs. GuildLink",
      color: C.accent,
      desc: "Your shelf matched against the whole platform. This ring looks for the different amongst the same. When another gamer's library has a lot in common with yours, the differences are often hidden gems.",
      today: "The Game Discovery section on the Games page runs Ring 1 — similar shelf players, games trending in your genres, hidden gems the community is playing that you haven't found yet.",
    },
    {
      num: "Ring 2",
      title: "You vs. Your Network",
      color: C.teal,
      desc: "Your shelf filtered through the people you follow. When you follow gamers who post great content or play games you like, you benefit from their good taste too.",
      today: "The Following tab in Reviews and your activity feed surface what people you follow are saying and playing. The more intentional you are about who you follow, the better this signal becomes.",
    },
    {
      num: "Ring 3",
      title: "You vs. Your Guild",
      color: C.gold,
      desc: "Your shelf weighted by the people you actually game with. Their gaming choices are a great signal for your next favorite game — even if it's not something you'll play together.",
      today: "Your guild's activity feed shows what members are playing and talking about. The gaming schedule shows what they're coordinating around. These are the highest-trust signals on the platform.",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", paddingTop: 60, background: C.bg }}>

      {/* Hero */}
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
          <button onClick={() => onSignUp?.()} style={{ background: "linear-gradient(135deg, " + C.gold + ", #d97706)", border: "none", borderRadius: 12, padding: "14px 40px", color: "#000", fontSize: 15, fontWeight: 900, cursor: "pointer", boxShadow: "0 8px 32px " + C.gold + "44" }}>Join Free</button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "40px 16px 80px" : "64px 24px 80px" }}>

        {/* How it works */}
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

        {/* NPC section */}
        <div style={{ background: "linear-gradient(135deg, #080e1a, #0d1829)", border: "1px solid " + C.accentDim, borderRadius: 20, padding: isMobile ? 24 : 40, marginBottom: 64, textAlign: "center" }}>
          <div style={{ fontWeight: 900, color: C.text, fontSize: isMobile ? 20 : 26, marginBottom: 14, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
            For years you've jumped into<br /><span style={{ color: C.accentSoft }}>NPC worlds.</span> Now they're joining yours.
          </div>
          <p style={{ color: C.textMuted, fontSize: isMobile ? 14 : 15, maxWidth: 560, margin: "0 auto", lineHeight: 1.75 }}>
            GuildLink's NPCs are characters from gaming culture — lore keepers, merchants, quest givers — posting, sharing tips, and talking about games alongside real players. They're not bots. They're part of the world.
          </p>
        </div>

        {/* Profile rings */}
        <div style={{ background: C.surface, border: "1px solid " + C.goldBorder, borderRadius: 16, padding: isMobile ? 20 : 32, marginBottom: 64 }}>
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

        {/* Algorithm section */}
        <div style={{ marginBottom: 0 }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontWeight: 800, color: C.text, fontSize: isMobile ? 22 : 28, marginBottom: 12, letterSpacing: "-0.5px", textAlign: "center" }}>The Algorithm Belongs to You</div>
            <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.8, maxWidth: 640, margin: "0 auto 12px" }}>
              Most platforms have an algorithm. You don't get to see it, understand it, or change it. It works for them by keeping you engaged, driving clicks, and getting that doom scroll going. More engagement means more time to show you ads. Your time on-platform trains it so they can keep you engaged longer.
            </p>
            <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.8, maxWidth: 640, margin: "0 auto" }}>
              The GuildLink algorithm works differently. We believe the recommendation engine here belongs to you. It's built from what you do, it works in your interest, and you can see exactly how it operates.
            </p>
          </div>

          {/* Discovery rings — horizontal card grid matching steps */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontWeight: 800, color: C.text, fontSize: isMobile ? 18 : 22, marginBottom: 8 }}>Three Rings of Discovery</div>
            <div style={{ color: C.textMuted, fontSize: 14, maxWidth: 560, margin: "0 auto" }}>Every recommendation flows through one of three rings, each more trusted and personal than the last. Right now each ring has a home on the platform. Over time, they'll filter everything you see.</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20, marginBottom: 48 }}>
            {rings.map((ring, i) => (
              <div key={i} style={{ background: C.surface, border: "1px solid " + ring.color + "44", borderRadius: 16, padding: 28, boxShadow: "0 0 24px " + ring.color + "0d" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                    <div style={{ position: "absolute", inset: -2, borderRadius: "50%", border: "2px solid " + ring.color, boxShadow: "0 0 10px " + ring.color + "66" }} />
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, " + ring.color + "22, " + ring.color + "11)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: ring.color, fontWeight: 900, fontSize: 12 }}>{i + 1}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ color: ring.color, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 1 }}>{ring.num}</div>
                    <div style={{ fontWeight: 800, color: C.text, fontSize: 15, lineHeight: 1.2 }}>{ring.title}</div>
                  </div>
                </div>
                <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>{ring.desc}</div>
                <div style={{ background: ring.color + "0d", border: "1px solid " + ring.color + "33", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ color: ring.color, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>On GuildLink today</div>
                  <div style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.6 }}>{ring.today}</div>
                </div>
              </div>
            ))}
          </div>

          {/* What drives discovery */}
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: isMobile ? 20 : 32, marginBottom: 48 }}>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18, marginBottom: 6 }}>What Drives Game Discovery?</div>
            <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              Everything on GuildLink is driven by community behavior. There are no sponsored recommendations or editorial picks. The central hub of discovery is called The Charts. Here's what influences them:
            </p>
            {[
              { label: "Reviews", desc: "Carry the most weight. A real opinion from someone who played the game." },
              { label: "Adding a game to your shelf", desc: "It doesn't matter if you want to play it, are currently playing it, or have played it in the past." },
              { label: "Posts and comments", desc: "A measure of what matters to the gaming community. The influence these have on the charts isn't 1:1, so spamming about your favorite game won't rocket it up the charts." },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, marginTop: 6, flexShrink: 0 }} />
                <div>
                  <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{item.label} </span>
                  <span style={{ color: C.textMuted, fontSize: 14 }}>{item.desc}</span>
                </div>
              </div>
            ))}
            <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginTop: 8, marginBottom: 0 }}>
              That's it. The Charts reflect the conversation happening across the platform over the last seven days. The power of capturing this movement is in how it reveals games you didn't know about.
            </p>
          </div>

          {/* Your profile */}
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: isMobile ? 20 : 32, marginBottom: 48 }}>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18, marginBottom: 12 }}>Your Profile Is Yours</div>
            <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 0 }}>
              Every time you add a game to your shelf, write a review, post or comment, or join a guild, you're building a clear picture of who you are as a gamer. The more you share, the more tailored your discovery recommendations become. The goal is to help you find your next favorite game.
            </p>
          </div>
        </div>
      </div>

      {/* What We Don't Do — full width gold hero */}
      <div style={{
        background: "linear-gradient(135deg, #0f0a00 0%, #1f1500 40%, #0a0800 100%)",
        borderTop: "1px solid " + C.goldBorder,
        borderBottom: "1px solid " + C.goldBorder,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, " + C.gold + "06 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div style={{ maxWidth: 760, margin: "0 auto", padding: isMobile ? "48px 16px" : "72px 24px", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.goldGlow, border: "1px solid " + C.goldBorder, borderRadius: 20, padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ color: C.gold, fontSize: 12, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>Transparency</span>
          </div>
          <div style={{ fontWeight: 900, color: "#fff", fontSize: isMobile ? 24 : 32, marginBottom: 20, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
            <span style={{ color: C.gold }}>What we do</span> and what we don't.
          </div>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: isMobile ? 14 : 16, lineHeight: 1.8, marginBottom: 16 }}>
            Ads aren't a part of GuildLink yet, but they are part of our roadmap. Because of that, we want to be clear about what we will and won't do.
          </p>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: isMobile ? 14 : 16, lineHeight: 1.8, marginBottom: 16 }}>
            Ads aren't sold based on demographic information because we don't capture it. Ads target meaningful gaming behaviors you've told us about. Our goal is to create a platform where ads are a meaningful piece of the game discovery process. If an indie developer is making a game like Elden Ring, they'll be able to reach players who have actually played Elden Ring.
          </p>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: isMobile ? 14 : 16, lineHeight: 1.8, marginBottom: 16 }}>
            That's the role ads will play. Game recommendations won't be influenced to favor specific games and we won't tweak the algorithm to show you ads that aren't relevant. We'll even show you what led to you seeing a specific ad.
          </p>
          <p style={{ color: C.gold, fontSize: isMobile ? 14 : 16, lineHeight: 1.8, fontWeight: 600, marginBottom: 0 }}>
            We believe there can be a mutually beneficial balance struck with advertising.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "40px 16px 80px" : "64px 24px 80px" }}>
        <div style={{ background: "linear-gradient(135deg, #0f0a00, #1f1500)", border: "1px solid " + C.goldBorder, borderRadius: 16, padding: isMobile ? 24 : 36, textAlign: "center" }}>
          <div style={{ fontWeight: 800, color: C.gold, fontSize: isMobile ? 18 : 22, marginBottom: 10 }}>Ready to find your next game?</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 24px" }}>
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
