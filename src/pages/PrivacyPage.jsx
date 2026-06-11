import React, { useState } from "react";
import { C } from "../constants.js";

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 40 }}>
    <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid " + C.border }}>{title}</div>
    <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.8 }}>{children}</div>
  </div>
);

const Highlight = ({ children }) => (
  <span style={{ color: C.text, fontWeight: 700 }}>{children}</span>
);

const GreenPill = ({ children }) => (
  <span style={{ background: "#10b98118", border: "1px solid #10b98144", borderRadius: C.radius.badge, padding: "2px 8px", color: "#10b981", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>
);

const RedPill = ({ children }) => (
  <span style={{ background: "#ef444418", border: "1px solid #ef444444", borderRadius: C.radius.badge, padding: "2px 8px", color: "#ef4444", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>
);

function PrivacyPage({ isMobile, setActivePage }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "70px 16px 80px" : "80px 24px 60px" }}>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ color: C.accentSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Privacy Policy</div>
        <h1 style={{ margin: "0 0 12px", fontWeight: 900, fontSize: isMobile ? 28 : 36, color: C.text, lineHeight: 1.2 }}>We built this place.<br />You own your data.</h1>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, maxWidth: 560, marginBottom: 16 }}>
          This privacy policy exists to explain how GuildLink works, what we collect, and why. If something is unclear, reach out at <Highlight>privacy@guildlink.gg</Highlight> and we'll answer any questions you have.
        </div>
        <div style={{ color: C.textDim, fontSize: 12 }}>Last updated: May 2026 · Applies to all GuildLink users worldwide</div>
      </div>

      {/* Plain English Summary */}
      <PixelCornerBox size="lg" borderColor={C.accentDim} bg={C.surface} style={{ padding: isMobile ? 20 : 28, marginBottom: 48 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 16 }}>The short version</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { pill: <GreenPill>We collect</GreenPill>, text: "your email, username, and the games you add to your shelf." },
            { pill: <GreenPill>We use it to</GreenPill>, text: "run the platform. Your shelf powers game discovery, The Charts, and game recommendations." },
            { pill: <RedPill>We never sell</RedPill>, text: "your data to anyone." },
            { pill: <RedPill>We never profile</RedPill>, text: "you based on browsing history, demographics, or behavior outside GuildLink." },
            { pill: <GreenPill>If we show ads</GreenPill>, text: "they target games instead of people. Our goal is for indie game developers to target users that play or liked games similar to their own. We don't collect or position ads against demographic profiling or off-platform data." },
            { pill: <GreenPill>You can</GreenPill>, text: "delete your account and all your data at any time from your profile page." },
            { pill: <GreenPill>You can</GreenPill>, text: "request a full export of your data before leaving." },
            { pill: <GreenPill>Analytics</GreenPill>, text: "are handled without cookies and are GDPR compliant." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
              <div style={{ flexShrink: 0, paddingTop: 1 }}>{item.pill}</div>
              <div>{item.text}</div>
            </div>
          ))}
        </div>
      </PixelCornerBox>

      {/* Full Policy */}
      <Section title="1. Who we are">
        GuildLink is a gaming social platform built and operated by Matt Curtis, sole founder. GuildLink is accessible at guildlink.gg. For any privacy-related questions or requests, contact us through your profile page or reach out directly at <Highlight>privacy@guildlink.gg</Highlight>.
      </Section>

      <Section title="2. What we collect and why">
        <div style={{ marginBottom: 12 }}><Highlight>Account credentials.</Highlight> When you sign up, we collect your email address and a hashed password. Your email is used for account authentication, password resets, and occasional platform communications. It is stored separately from your public profile and is never visible to other users.</div>
        <div style={{ marginBottom: 12 }}><Highlight>Profile information.</Highlight> Your username, handle, bio, avatar, and player tags. This is what other users see when they visit your profile. You control all of it and can update or delete it at any time.</div>
        <div style={{ marginBottom: 12 }}><Highlight>Gaming activity.</Highlight> The games you add to your shelf, your reviews, posts, Q&A, and comments. This is the core of GuildLink: your game history is your profile, and it drives discovery for you and others. You choose what you add. If you connect a Steam, Xbox, or PlayStation account to import your library, we only store the game titles. We do not store any platform credentials, purchase history, or playtime data. PlayStation library imports use your PSN trophy history to identify games you've played; your NPSSO token is used only to fetch this data and is never stored. Imported games are treated identically to games you add manually.</div>
import { PixelCornerBox } from "../components/PixelCornerBox.jsx";
        <div style={{ marginBottom: 12 }}><Highlight>Guild activity.</Highlight> Guild memberships, sessions you create or join, and posts in guild threads. This is visible to your fellow guild members.</div>
        <div><Highlight>Usage analytics.</Highlight> We use Vercel Analytics to understand how people navigate GuildLink. GuildLink doesn't collect cookies, perform fingerprinting, or track you across other websites. GuildLink collects aggregate data like page views and session counts in a way that isn't connected to your identity.</div>
      </Section>

      <Section title="3. What we do not collect">
        We do not collect your location. We do not track what you do outside of GuildLink. We do not build behavioral profiles. We do not use third-party advertising trackers. We do not use analytics pixels, We do not use data brokers. We do not collect payment information. GuildLink is free to use.
      </Section>

      <Section title="4. How we use your data">
        <div style={{ marginBottom: 12 }}>The data you provide is only used to run GuildLink. Specifically:</div>
        <div style={{ marginBottom: 8 }}>→ Your shelf powers The Charts, game discovery sections, and gamer recommendations.</div>
        <div style={{ marginBottom: 8 }}>→ Your posts and reviews appear in the feed and on game pages.</div>
        <div style={{ marginBottom: 8 }}>→ Your email is used for account management and platform communication. Users can opt out of marketing emails.</div>
        <div>→ Aggregate, anonymized activity is used to improve the platform.</div>
      </Section>

      <Section title="5. Advertising">
        GuildLink does not currently show ads. If and when we introduce advertising, here is our commitment: <Highlight>ads are targeted to games, not to people.</Highlight> A developer can choose to reach players who have a specific game on their shelf. GuildLink does not build user profiles for advertising purposes.
        <div style={{ marginTop: 12 }}>
          This is an important distinction to make. Traditional ad targeting asks "who is this person and what are they likely to buy?" GuildLink advertising asks "which players have already shown interest in games like this one?" This means no demographic data, behavioral profiling or data from outside GuildLink is involved in advertising.
        </div>
        <div style={{ marginTop: 12 }}>
          We see this as a genuine part of game discovery. GuildLink's approach advertising provides a way for independent studios and smaller developers to reach players who are already predisposed to love their game. We will never sell your data to advertisers, and we will never use browsing history, demographics, or off-platform behavior to target ads.
        </div>
        <div style={{ marginTop: 12 }}>
          When ads are introduced, this policy will be updated and users will be notified.
        </div>
      </Section>

      <Section title="6. Data sharing">
        We do not sell your data. We do not share your data with third parties for marketing purposes. The only circumstances under which we would share data are:
        <div style={{ marginTop: 12, marginBottom: 8 }}>→ With service providers who help us run the platform. These providers are contractually bound to handle your data securely and only for the purpose of serving GuildLink.</div>
        <div>→ If required by law. For example, a valid legal order. We would notify you if legally permitted to do so.</div>
      </Section>

      <Section title="7. Data retention">
        Your data is retained for as long as your account is active. If you delete your account, all of your data (profile, shelf, reviews, posts, comments, guild activity, and analytics events) will be permanently deleted within 14 days. Data cannot be recovered after that window closes.
      </Section>

      <Section title="8. Your rights">
        <div style={{ marginBottom: 8 }}>Regardless of where you live, we give every GuildLink user the same rights:</div>
        <div style={{ marginBottom: 8 }}><Highlight>Right to access.</Highlight> You can view all the information on your profile at any time.</div>
        <div style={{ marginBottom: 8 }}><Highlight>Right to correction.</Highlight> You can update your profile information at any time from your profile page.</div>
        <div style={{ marginBottom: 8 }}><Highlight>Right to deletion.</Highlight> You can delete your account from your profile page. All data is permanently removed within 14 days.</div>
        <div style={{ marginBottom: 8 }}><Highlight>Right to portability.</Highlight> You can request a full export of your data before deleting your account. Use the data export option in the account deletion menu and we will fulfill your request within 14 days.</div>
        <div><Highlight>Right to object.</Highlight> If you have concerns about how we process your data, contact us at privacy@guildlink.gg. We will respond within 30 days.</div>
      </Section>

      <Section title="9. Security">
        Your password is hashed which means we cannot see it. Your email is stored in a separate, access-controlled table not visible to other users or accessible via our public API. We use Row Level Security on our database, which means every data query is scoped to the authenticated user by policy.
      </Section>

      <Section title="10. Children">
        GuildLink is not directed at children under 13. We do not knowingly collect data from anyone under 13. If you believe a child under 13 has created an account, contact us and we will delete it promptly.
      </Section>

      <Section title="11. Changes to this policy">
        If we make material changes to this policy we will notify users via the platform before the changes take effect. The "last updated" date at the top of this page will always reflect the most recent version.
      </Section>

      <Section title="12. Contact">
        Questions, requests, or concerns about your data: <Highlight>privacy@guildlink.gg</Highlight>
        <div style={{ marginTop: 8 }}>Data export or deletion requests can also be submitted directly from your profile page.</div>
      </Section>

      {/* Footer CTA */}
      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ color: C.textDim, fontSize: 13 }}>GuildLink · guildlink.gg · The game discovery engine.</div>
        <button onClick={() => setActivePage("feed")} style={{ background: C.accent, border: "none", borderRadius: C.radius.button, padding: "8px 20px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Back to GuildLink</button>
      </div>

    </div>
  );
}

export default PrivacyPage;
