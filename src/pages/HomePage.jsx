import React from "react";
import { C } from "../constants.js";
import { PixelCornerBox } from "../components/PixelCornerBox.jsx";
import { PixelButton } from "../components/PixelButton.jsx";
import { GameTag } from "../components/GameTag.jsx";

/*
  PUBLIC HOMEPAGE — logged-out landing page
  ------------------------------------------
  Replaces the old "live feed simulation" logged-out view. This page is a
  straight marketing/identity page: why GuildLink, not a preview of the UI.

  IMAGE SLOTS
  Every screenshot placeholder below is a <ScreenshotSlot> — a bordered,
  labeled box standing in for an App Store image. Drop a real <img> in by
  passing a `src` prop (see the component itself), e.g.:

    <ScreenshotSlot src="/images/shelf-screenshot.png" alt="The Shelf" />

  Until real assets are wired in, these render a visible placeholder so it's
  obvious where art belongs and at roughly what aspect ratio/size to export it.
*/

const ScreenshotSlot = ({ label, src, alt, aspect }) => {
  const ratio = aspect || "9 / 16";
  if (src) {
    return (
      <div style={{ width: "100%", borderRadius: 4, overflow: "hidden", border: "1px solid " + C.border }}>
        <img src={src} alt={alt || label} style={{ width: "100%", display: "block" }} />
      </div>
    );
  }
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: ratio,
        borderRadius: 4,
        border: "1px dashed " + C.border,
        background: C.surfaceRaised,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 16,
      }}
    >
      <div style={{ color: C.textDim, fontSize: 12, fontWeight: 600, lineHeight: 1.6 }}>
        {"[ App Store screenshot: " + label + " ]"}
      </div>
    </div>
  );
};

const CheckRow = ({ game, platform }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "12px 16px",
      borderBottom: "1px solid " + C.border,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <span style={{ color: C.green, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{"✓"}</span>
      <span style={{ color: C.text, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {game}
      </span>
    </div>
    <GameTag label={platform} />
  </div>
);

const FeatureCard = ({ title, description, screenshotLabel, reverse, isMobile }) => (
  <PixelCornerBox
    size="lg"
    borderColor={C.border}
    bg={C.surface}
    style={{
      padding: isMobile ? 20 : 28,
      display: "flex",
      flexDirection: isMobile ? "column" : reverse ? "row-reverse" : "row",
      gap: isMobile ? 20 : 32,
      alignItems: "center",
      marginBottom: 20,
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 800, fontSize: 19, color: C.text, marginBottom: 10 }}>{title}</div>
      <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.75 }}>{description}</div>
    </div>
    <div style={{ width: isMobile ? "60%" : 200, flexShrink: 0 }}>
      <ScreenshotSlot label={screenshotLabel} />
    </div>
  </PixelCornerBox>
);

function HomePage({ isMobile, setActivePage, onSignUp }) {
  const goSignUp = () => {
    if (onSignUp) return onSignUp();
    setActivePage("auth");
  };

  const APP_STORE_URL = "https://apps.apple.com/app/guildlink";

  return (
    <div style={{ background: C.bg }}>
      {/* Simple public header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "16px" : "20px 32px",
          borderBottom: "1px solid " + C.border,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18, color: C.text, letterSpacing: "0.02em" }}>GuildLink</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => setActivePage("auth")}
            style={{
              background: "none",
              border: "none",
              color: C.textMuted,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              padding: "8px 10px",
            }}
          >
            Log in
          </button>
          <PixelButton size="sm" bg={C.accent} onClick={goSignUp}>
            Sign up
          </PixelButton>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: isMobile ? "56px 20px 40px" : "88px 24px 56px", textAlign: "center" }}>
        <h1
          style={{
            margin: "0 0 18px",
            fontWeight: 900,
            fontSize: isMobile ? 30 : 44,
            color: C.text,
            lineHeight: 1.18,
          }}
        >
          The best game recommendations come from people who know your taste
        </h1>
        <div style={{ color: C.textMuted, fontSize: isMobile ? 15 : 17, lineHeight: 1.6, marginBottom: 32 }}>
          Until GuildLink, that was really hard to find online.
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <PixelButton size="md" bg={C.accent} onClick={goSignUp}>
            Sign up
          </PixelButton>
          <a href={APP_STORE_URL} style={{ textDecoration: "none" }}>
            <PixelButton size="md" bg={C.surface} borderColor={C.border}>
              Download the iOS app
            </PixelButton>
          </a>
        </div>
      </div>

      {/* Hero screenshot */}
      <div style={{ maxWidth: 320, margin: "0 auto 72px", padding: "0 24px" }}>
        <ScreenshotSlot label="Discovery Feed — hero shot" />
      </div>

      {/* What GuildLink is */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: isMobile ? "0 20px 56px" : "0 24px 72px" }}>
        <div style={{ color: C.accentSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, textAlign: "center" }}>
          A social discovery platform for video games
        </div>
        <div style={{ color: C.textMuted, fontSize: isMobile ? 15 : 16, lineHeight: 1.8, textAlign: "center" }}>
          When you add games to your shelf, GuildLink gets to work doing game discovery how it's always worked
          best: person to person. GuildLink compares your gaming history with other gamers. When their library
          overlaps with yours, what they've played and enjoyed becomes your best recommendation.
        </div>
      </div>

      {/* Any platform, any era */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: isMobile ? "0 20px 72px" : "0 24px 96px" }}>
        <div style={{ textAlign: "center", marginBottom: 8, fontWeight: 800, fontSize: isMobile ? 22 : 26, color: C.text }}>
          Everything you've played influences discovery.
        </div>
        <div style={{ textAlign: "center", marginBottom: 28, color: C.textMuted, fontSize: 15 }}>
          Any platform. Any era.
        </div>
        <PixelCornerBox size="lg" borderColor={C.border} bg={C.surface} style={{ overflow: "hidden" }}>
          <CheckRow game="Contra" platform="NES" />
          <CheckRow game="Sonic" platform="Sega Game Gear" />
          <CheckRow game="Metal Gear Solid" platform="PlayStation" />
          <CheckRow game="Puzzle Quest" platform="Xbox 360" />
          <CheckRow game="Half-Life" platform="PC" />
          <div style={{ borderBottom: "none" }}>
            <CheckRow game="Fortnite" platform="Mobile" />
          </div>
        </PixelCornerBox>
        <div style={{ textAlign: "center", marginTop: 24, color: C.textMuted, fontSize: 15, lineHeight: 1.7 }}>
          On GuildLink, every game you've played helps you find your next favorite game.
        </div>
      </div>

      {/* Feature grid */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: isMobile ? "0 20px 72px" : "0 24px 96px" }}>
        <FeatureCard
          title="The Shelf"
          description="Add games from any platform or era. The more you add, the better your recommendations get."
          screenshotLabel="Shelf view"
          isMobile={isMobile}
        />
        <FeatureCard
          title="Discovery Feed"
          description="See GuildLink Discoveries, follow what your friends are playing, and talk games without the typical drama of social media."
          screenshotLabel="Discovery Feed"
          reverse
          isMobile={isMobile}
        />
        <FeatureCard
          title="Guilds"
          description="Game with friends? Guilds lets you schedule private Gaming Sessions so everyone is in the loop. RSVP with your status for each session, and chat in the session-specific chat."
          screenshotLabel="Guild session"
          isMobile={isMobile}
        />
        <FeatureCard
          title="Gamer Profile"
          description="Curate your gamer profile with stats about your gaming history."
          screenshotLabel="Gamer Profile"
          reverse
          isMobile={isMobile}
        />
      </div>

      {/* Privacy */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: isMobile ? "0 20px 80px" : "0 24px 100px" }}>
        <PixelCornerBox size="lg" borderColor={C.accentDim} bg={C.surface} style={{ padding: isMobile ? 22 : 32, textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 12 }}>Built Around Privacy</div>
          <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            GuildLink collects as little as possible and never sells it. We see you as a gamer, not a product.
          </div>
          <button
            onClick={() => setActivePage("privacy")}
            style={{ background: "none", border: "none", color: C.accentSoft, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
          >
            Read our privacy policy to see what we mean.
          </button>
        </PixelCornerBox>
      </div>

      {/* Final CTA */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: isMobile ? "0 20px 90px" : "0 24px 110px", textAlign: "center" }}>
        <div style={{ fontWeight: 900, fontSize: isMobile ? 24 : 30, color: C.text, marginBottom: 24, lineHeight: 1.3 }}>
          Ready to find your next favorite game?
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <PixelButton size="md" bg={C.accent} onClick={goSignUp}>
            Sign Up
          </PixelButton>
          <a href={APP_STORE_URL} style={{ textDecoration: "none" }}>
            <PixelButton size="md" bg={C.surface} borderColor={C.border}>
              Download on the App Store
            </PixelButton>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid " + C.border,
          padding: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div style={{ color: C.textDim, fontSize: 13 }}>GuildLink · guildlink.gg</div>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={() => setActivePage("culture")} style={{ background: "none", border: "none", color: C.textDim, fontSize: 13, cursor: "pointer" }}>
            Culture Agreement
          </button>
          <button onClick={() => setActivePage("eula")} style={{ background: "none", border: "none", color: C.textDim, fontSize: 13, cursor: "pointer" }}>
            EULA
          </button>
          <button onClick={() => setActivePage("privacy")} style={{ background: "none", border: "none", color: C.textDim, fontSize: 13, cursor: "pointer" }}>
            Privacy
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
