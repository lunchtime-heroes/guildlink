import React from "react";
import { C } from "../constants.js";
import { PixelButton } from "../components/PixelButton.jsx";

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

const ScreenshotSlot = ({ label, src, alt, aspect, width }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || label}
        style={{ width: width || "100%", height: "auto", display: "block" }}
      />
    );
  }
  const ratio = aspect || "9 / 16";
  return (
    <div
      style={{
        width: width || "100%",
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

// Each row's height is driven entirely by the screenshot — no vertical
// padding on the row itself — and rows alternate background color,
// separated by a thin gold line (borderTop).
const FeatureRow = ({ headingLines, caption, quote, detail, imageLabel, imageSrc, imageSide, bg, isMobile }) => (
  <div style={{ borderTop: "3px solid " + C.goldBorder, background: bg }}>
    <div
      style={{
        maxWidth: 1040,
        margin: "0 auto",
        padding: isMobile ? "0 20px" : "0 24px",
        display: "flex",
        flexDirection: isMobile ? "column" : imageSide === "left" ? "row" : "row-reverse",
        alignItems: "center",
        justifyContent: "center",
        gap: isMobile ? 20 : 56,
      }}
    >
      <div style={{ flexShrink: 0, paddingTop: isMobile ? 28 : 0 }}>
        <ScreenshotSlot src={imageSrc} label={imageLabel} width={isMobile ? 165 : 240} />
      </div>
      <div
        style={{
          // Fixed width instead of flex:1 — otherwise this stretches to fill
          // all remaining space in the row, pinning image and text to
          // opposite edges instead of letting them sit together as one
          // centered group.
          width: isMobile ? "100%" : 400,
          flexShrink: isMobile ? 1 : 0,
          textAlign: isMobile ? "center" : imageSide === "right" ? "right" : "left",
          padding: isMobile ? "20px 0" : 0,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: isMobile ? 24 : 30, color: C.text, lineHeight: 1.3, marginBottom: 10 }}>
          {headingLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: C.accent, marginBottom: detail ? 10 : 0 }}>
          {quote ? "\u201C" + caption + "\u201D" : caption}
        </div>
        {detail && (
          <div
            style={{
              color: C.textMuted,
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: 320,
              // On mobile this maxWidth block needs its own auto margins to
              // actually center within the full-width parent — textAlign
              // alone only centers the text inside this box, not the box
              // itself. That's the "skewed off center" bug.
              marginLeft: isMobile ? "auto" : imageSide === "right" ? "auto" : 0,
              marginRight: isMobile ? "auto" : 0,
            }}
          >
            {detail}
          </div>
        )}
      </div>
    </div>
  </div>
);

// The GuildLink "G" mark, exactly as used in the app NavBar — reused here so
// the gold hero and the in-app nav feel like the same brand, not two logos.
const GLogo = ({ size }) => (
  <div style={{ width: size || 64, height: size || 64 }}>
    <svg viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}><rect fill="#f59e0b" x="93.5" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="93.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="109.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="109.2" y="47" width="15.7" height="15.7"/><rect fill="#f59e0b" x="124.8" y="47" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="156.1" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="156.1" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="171.8" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="171.8" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="218.7" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="218.7" y="47" width="15.7" height="15.7"/><rect fill="#f59e0b" x="218.7" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="218.7" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="93.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="109.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="203.1" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="156.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="172.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="187.4" y="187.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="171.8" y="187.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="171.8" y="203.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="156.1" y="203.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="156.1" y="219.1" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="219.1" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="234.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="124.8" y="234.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="109.2" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="124.8" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="77.8" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="77.8" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="62.2" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="62.2" y="0" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="15.7" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="15.2" y="31.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="15.2" y="47" width="15.7" height="15.7"/><rect fill="#f59e0b" x="15.2" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="15.2" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="93.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="109.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="30.9" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="156.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="172.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="46.5" y="187.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="62.2" y="187.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="62.2" y="203.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="77.8" y="203.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="77.8" y="219.1" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="219.1" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="234.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="109.2" y="234.8" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="62.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="78.3" width="15.7" height="15.7"/><rect fill="#f59e0b" x="124.8" y="109.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="109.6" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="125.2" width="15.7" height="15.7"/><rect fill="#f59e0b" x="93.5" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="140.5" y="140.9" width="15.7" height="15.7"/><rect fill="#f59e0b" x="109.2" y="156.5" width="15.7" height="15.7"/><rect fill="#f59e0b" x="124.8" y="156.5" width="15.7" height="15.7"/></svg>
  </div>
);

const APP_STORE_URL = "https://apps.apple.com/us/app/guildlink/id6795702522";

// NavBar already renders the GuildLink logo plus Sign In / Join Free for
// guests (both mobile and desktop), so this page starts straight into
// content — no second header, no duplicate CTAs up top.
function HomePage({ isMobile, setActivePage, onSignIn, onSignUp }) {
  const goSignUp = () => {
    if (onSignUp) return onSignUp();
  };

  return (
    <div style={{ background: C.bg }}>

      {/* Gold hero — full-width, matches FoundingMemberPage's gold treatment */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f0a00 0%, #1f1500 40%, #0a0800 100%)",
          borderBottom: "1px solid " + C.goldBorder,
          position: "relative",
          overflow: "hidden",
          paddingBottom: isMobile ? 190 : 250,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle at 1px 1px, " + C.gold + "06 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 600,
            height: 600,
            background: "radial-gradient(circle, " + C.gold + "10 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: isMobile ? "48px 20px 0" : "72px 24px 0", textAlign: "center", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <GLogo size={isMobile ? 52 : 64} />
          </div>
          <h1
            style={{
              margin: "0 0 8px",
              fontWeight: 900,
              fontSize: isMobile ? 30 : 42,
              color: "#fff",
              letterSpacing: "-1px",
              lineHeight: 1.15,
            }}
          >
            Find your next favorite game
          </h1>
          <div
            style={{
              fontWeight: 900,
              fontSize: isMobile ? 30 : 42,
              color: C.gold,
              letterSpacing: "-1px",
              lineHeight: 1.15,
              marginBottom: 32,
            }}
          >
            on GuildLink
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <PixelButton
              size="md"
              bg={"linear-gradient(135deg, " + C.gold + ", #d97706)"}
              color="#000"
              style={{ fontWeight: 900, fontSize: 15, padding: "14px 40px", boxShadow: "0 8px 32px " + C.gold + "44" }}
              onClick={goSignUp}
            >
              Sign Up
            </PixelButton>
            <a href={APP_STORE_URL} style={{ textDecoration: "none" }}>
              <PixelButton
                size="md"
                bg="transparent"
                borderColor={C.goldBorder}
                color={C.gold}
                style={{ fontWeight: 800, fontSize: 15, padding: "14px 32px" }}
              >
                Download for iOS
              </PixelButton>
            </a>
          </div>
        </div>

        {/* Blizmond — full image, resting at the gold section's bottom edge. */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: isMobile ? 140 : 190,
            zIndex: 2,
          }}
        >
          <img src="/blizmond.png" alt="Blizmond" style={{ width: "100%", display: "block", imageRendering: "pixelated" }} />
        </div>
      </div>

      {/* Simplified pitch — no buttons here, the gold hero above and the gold
          CTA below already carry both. This section is just the "why". */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: isMobile ? "56px 20px 48px" : "80px 24px 64px", textAlign: "center" }}>
        <div style={{ fontWeight: 900, fontSize: isMobile ? 26 : 34, color: C.text, lineHeight: 1.3, marginBottom: 14 }}>
          The best game recommendations come from people who know your taste
        </div>
        <div style={{ fontWeight: 700, fontSize: isMobile ? 15 : 17, color: C.gold }}>
          Until GuildLink, that was really hard to find
        </div>
      </div>

      {/* App feature rows — real screenshots, alternating image side and
          alternating background, thin gold divider between each (handled
          inside FeatureRow itself). Files ship alongside this component —
          drop them in /public with these exact names. */}
      <FeatureRow
        headingLines={["Add games", "to your shelf"]}
        caption="Any game, any era"
        detail="Every game you've played has shaped your taste in games. On GuildLink, your entire gaming history helps you find your next favorite game."
        imageLabel="Have Played shelf ranking"
        imageSrc="/1_add_games.png"
        imageSide="left"
        bg={C.bg}
        isMobile={isMobile}
      />
      <FeatureRow
        headingLines={["Games In Common", "leads to discovery"]}
        caption="Taste > popularity"
        detail="GuildLink compares your library with other gamers on the platform. When there's a lot of overlap, great discoveries aren't far behind."
        imageLabel="Discovery feed — FAR / L.A. Noire"
        imageSrc="/2_games_in_common.png"
        imageSide="right"
        bg={C.surfaceRaised}
        isMobile={isMobile}
      />
      <FeatureRow
        headingLines={["Reviews mean", "more than ever"]}
        caption="So that's why I disagree!"
        quote
        detail="Opinionated reviews may be fun to read, but they aren't always helpful. But when you know the taste of the one writing the review, you know if they're worth listening to."
        imageLabel="Reviews page"
        imageSrc="/3_reviews.png"
        imageSide="left"
        bg={C.bg}
        isMobile={isMobile}
      />
      <FeatureRow
        headingLines={["Talk games", "with gamers"]}
        caption="Without attention hacks"
        detail="The social side of GuildLink is only about games. No wading through political posts, random pet photos from strangers, or anything that isn't related to gaming."
        imageLabel="Feed comments"
        imageSrc="/4_talk_games.png"
        imageSide="right"
        bg={C.surfaceRaised}
        isMobile={isMobile}
      />
      <FeatureRow
        headingLines={["Schedule", "Gaming Sessions"]}
        caption="Never miss a chance to play"
        detail="Finding a new game is great, but finding opportunities to play with friends is even better. Gaming Sessions let you schedule, RSVP, and plan your next time to play."
        imageLabel="Gaming Sessions"
        imageSrc="/5_game_sessions.png"
        imageSide="left"
        bg={C.bg}
        isMobile={isMobile}
      />
      <FeatureRow
        headingLines={["Create your", "gamer profile"]}
        caption="Share stats from your library"
        detail="Your gaming history is a glimpse into who you are as a gamer. GuildLink is where you can show it off."
        imageLabel="Gamer profile"
        imageSrc="/6_profile.png"
        imageSide="right"
        bg={C.surfaceRaised}
        isMobile={isMobile}
      />

      {/* Gold CTA — mirrors the top hero's treatment, shorter, no logo or
          mascot, closing the page the way it opened. */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f0a00 0%, #1f1500 40%, #0a0800 100%)",
          borderTop: "1px solid " + C.goldBorder,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle at 1px 1px, " + C.gold + "06 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: isMobile ? "56px 20px" : "80px 24px", textAlign: "center", position: "relative" }}>
          <div style={{ fontWeight: 900, fontSize: isMobile ? 26 : 36, color: "#fff", letterSpacing: "-1px", lineHeight: 1.2, marginBottom: 6 }}>
            Find your next favorite game
          </div>
          <div style={{ fontWeight: 900, fontSize: isMobile ? 26 : 36, color: C.gold, letterSpacing: "-1px", lineHeight: 1.2, marginBottom: 28 }}>
            on GuildLink
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <PixelButton
              size="md"
              bg={"linear-gradient(135deg, " + C.gold + ", #d97706)"}
              color="#000"
              style={{ fontWeight: 900, fontSize: 15, padding: "14px 40px", boxShadow: "0 8px 32px " + C.gold + "44" }}
              onClick={goSignUp}
            >
              Sign Up
            </PixelButton>
            <a href={APP_STORE_URL} style={{ textDecoration: "none" }}>
              <PixelButton
                size="md"
                bg="transparent"
                borderColor={C.goldBorder}
                color={C.gold}
                style={{ fontWeight: 800, fontSize: 15, padding: "14px 32px" }}
              >
                Download for iOS
              </PixelButton>
            </a>
          </div>
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
