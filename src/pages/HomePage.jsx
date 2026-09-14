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

const FeatureRow = ({ headingLines, caption, quote, imageLabel, imageSide, isMobile }) => (
  <div style={{ borderTop: "1px solid " + C.goldBorder }}>
    <div
      style={{
        maxWidth: 1040,
        margin: "0 auto",
        padding: isMobile ? "40px 20px" : "64px 24px",
        display: "flex",
        flexDirection: isMobile ? "column" : imageSide === "left" ? "row" : "row-reverse",
        alignItems: "center",
        gap: isMobile ? 28 : 56,
      }}
    >
      <div style={{ flex: isMobile ? "none" : "0 0 42%", width: isMobile ? "70%" : "auto" }}>
        <ScreenshotSlot label={imageLabel} aspect="9 / 18" />
      </div>
      <div style={{ flex: 1, textAlign: isMobile ? "center" : "left" }}>
        <div style={{ fontWeight: 900, fontSize: isMobile ? 24 : 30, color: C.text, lineHeight: 1.3, marginBottom: 10 }}>
          {headingLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: C.accent }}>
          {quote ? "\u201C" + caption + "\u201D" : caption}
        </div>
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

        {/* Blizzmond — full image, resting at the gold section's bottom edge. */}
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
          <img src="/blizzmond.png" alt="Blizzmond" style={{ width: "100%", display: "block", imageRendering: "pixelated" }} />
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

      {/* App feature rows — each one leans on a real screenshot, alternating
          image side left/right. Swap each ScreenshotSlot's `src` for the
          matching App Store asset once it's in /public. */}
      <FeatureRow
        headingLines={["Add games", "to your shelf"]}
        caption="Any game, any era"
        imageLabel="Have Played shelf ranking"
        imageSide="right"
        isMobile={isMobile}
      />
      <FeatureRow
        headingLines={["Games In Common", "leads to discovery"]}
        caption="Taste > popularity"
        imageLabel="Discovery feed — FAR / L.A. Noire"
        imageSide="left"
        isMobile={isMobile}
      />
      <FeatureRow
        headingLines={["Reviews mean", "more than ever"]}
        caption="So that's why I disagree!"
        quote
        imageLabel="Reviews page"
        imageSide="left"
        isMobile={isMobile}
      />
      <FeatureRow
        headingLines={["Talk games", "with gamers"]}
        caption="Without attention hacks"
        imageLabel="Feed comments"
        imageSide="left"
        isMobile={isMobile}
      />
      <FeatureRow
        headingLines={["Schedule", "Gaming Sessions"]}
        caption="Never miss a chance to play"
        imageLabel="Gaming Sessions"
        imageSide="right"
        isMobile={isMobile}
      />
      <FeatureRow
        headingLines={["Create your", "gamer profile"]}
        caption="Share stats from your library"
        imageLabel="Gamer profile"
        imageSide="left"
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
