import React from "react";
import { C } from "../constants.js";
import { PixelCornerBox } from "../components/PixelCornerBox.jsx";

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
  <span style={{ background: "#10b98118", border: "1px solid #10b98144", borderRadius: 3, padding: "2px 8px", color: "#10b981", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>
);

const RedPill = ({ children }) => (
  <span style={{ background: "#ef444418", border: "1px solid #ef444444", borderRadius: 3, padding: "2px 8px", color: "#ef4444", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>
);

function EULAPage({ isMobile, setActivePage }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "70px 16px 80px" : "80px 24px 60px" }}>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ color: C.accentSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>End User License Agreement</div>
        <h1 style={{ margin: "0 0 12px", fontWeight: 900, fontSize: isMobile ? 28 : 36, color: C.text, lineHeight: 1.2 }}>The terms behind<br />using GuildLink.</h1>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, maxWidth: 560, marginBottom: 16 }}>
          This agreement covers your license to use GuildLink, and what's expected of everyone in the community. Questions? Reach us at <Highlight>support@guildlink.gg</Highlight>.
        </div>
        <div style={{ color: C.textDim, fontSize: 12 }}>Last updated: July 28, 2026 · Applies to all GuildLink users worldwide</div>
      </div>

      {/* Plain English Summary */}
      <PixelCornerBox size="lg" borderColor={C.accentDim} bg={C.surface} style={{ padding: isMobile ? 20 : 28, marginBottom: 48 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 16 }}>The short version</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { pill: <GreenPill>This agreement</GreenPill>, text: "is between you and Matt Curtis, the developer of GuildLink — not Apple. GuildLink is an independent project." },
            { pill: <GreenPill>You get</GreenPill>, text: "a personal, non-transferable license to use GuildLink on devices you own." },
            { pill: <RedPill>Zero tolerance</RedPill>, text: "for objectionable content or abusive behavior. Report, block, and moderation tools exist and are actively used." },
            { pill: <GreenPill>Violations</GreenPill>, text: "result in real consequences, from a warning up to permanent removal, depending on severity." },
            { pill: <GreenPill>Full details</GreenPill>, text: "on how content is moderated live at guildlink.gg/culture." },
            { pill: <GreenPill>Questions</GreenPill>, text: "go to support@guildlink.gg." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
              <div style={{ flexShrink: 0, paddingTop: 1 }}>{item.pill}</div>
              <div>{item.text}</div>
            </div>
          ))}
        </div>
      </PixelCornerBox>

      {/* Full Agreement */}
      <Section title="1. This Agreement Is Between You and Us">
        This License Agreement is between you and Matt Curtis, the developer of GuildLink ("we," "us," "GuildLink"), not Apple. Apple is not a party to this agreement and is not responsible for GuildLink or its content in any way. GuildLink is an independent project and is not affiliated with any other business.
      </Section>

      <Section title="2. License">
        We grant you a limited, non-exclusive, non-transferable, revocable license to use GuildLink on any Apple-branded device that you own or control, as permitted by the Usage Rules in Apple's App Store Terms of Service.
      </Section>

      <Section title="3. Maintenance and Support">
        Apple has no obligation whatsoever to provide any maintenance or support for GuildLink. We provide support through the Contact Us option in the app and at <Highlight>support@guildlink.gg</Highlight>.
      </Section>

      <Section title="4. Warranty">
        We do not provide any warranty for GuildLink. GuildLink is provided "as is." To the extent any warranty exists that cannot be disclaimed under applicable law, that warranty belongs solely to us — Apple has no warranty obligation whatsoever with respect to GuildLink.
      </Section>

      <Section title="5. Product Claims">
        We, not Apple, are responsible for addressing any claims relating to GuildLink or your use of it — including product liability claims, claims that GuildLink fails to conform to any legal or regulatory requirement, and claims arising under consumer protection, privacy, or similar law.
      </Section>

      <Section title="6. Intellectual Property">
        If a third party claims that GuildLink or your possession and use of it infringes that party's intellectual property rights, we, not Apple, are solely responsible for investigating, defending, settling, and discharging any such claim.
      </Section>

      <Section title="7. Legal Compliance">
        By using GuildLink, you represent and warrant that you are not located in a country subject to a U.S. government embargo, or that has been designated by the U.S. government as a "terrorist supporting" country, and that you are not listed on any U.S. government list of prohibited or restricted parties.
      </Section>

      <Section title="8. Contact">
        GuildLink is developed and provided by Matt Curtis.
        <div style={{ marginTop: 8 }}>Contact: <Highlight>support@guildlink.gg</Highlight></div>
      </Section>

      <Section title="9. Third-Party Terms">
        Your use of GuildLink must comply with the terms of any applicable third-party agreements (for example, your wireless carrier's data terms) as well as this agreement.
      </Section>

      <Section title="10. Apple as Third-Party Beneficiary">
        Apple and Apple's subsidiaries are third-party beneficiaries of this Agreement, and upon your acceptance, Apple has the right to enforce this Agreement against you as a third-party beneficiary.
      </Section>

      <Section title="11. Community Standards and Content">
        <div style={{ marginBottom: 12 }}>GuildLink includes features for posting, commenting, and interacting with other users. This section explains what's expected of you, and what we do about it when those expectations aren't met.</div>
        <div style={{ marginBottom: 12 }}><Highlight>We have zero tolerance for objectionable content or abusive behavior.</Highlight> GuildLink is a space for talking about games honestly, even harshly, but about the games themselves, not personal attacks on the people who like or dislike them. Hate speech, harassment, and content that shifts from critiquing a game to attacking a person are not permitted.</div>
        <div style={{ marginBottom: 12 }}>Users can report content that violates these standards, and can block other users at any time. Blocking is immediate, requires no review, and stops all contact between the two accounts in both directions.</div>
        <div style={{ marginBottom: 12 }}>Reported content is reviewed by GuildLink's moderation team. Confirmed violations result in consequences ranging from warning, temporary suspension, and potentially, permanent removal from GuildLink depending on the severity and pattern of the violation. Our full community standards, including how violations are evaluated, are available at <Highlight>guildlink.gg/culture</Highlight>.</div>
        <div>We aim to review and act on reports promptly, and to communicate the outcome to both the reporting user and the user whose content was reported, consistent with the process described at guildlink.gg/culture.</div>
      </Section>

      {/* Footer CTA */}
      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ color: C.textDim, fontSize: 13 }}>GuildLink · guildlink.gg · The game discovery engine.</div>
        <button onClick={() => setActivePage("feed")} style={{ background: C.accent, border: "none", borderRadius: 3, padding: "8px 20px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Back to GuildLink</button>
      </div>

    </div>
  );
}

export default EULAPage;
