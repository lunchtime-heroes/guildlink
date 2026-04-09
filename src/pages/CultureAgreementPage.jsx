import React from "react";
import { C } from "../constants.js";

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 40 }}>
    <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid " + C.border }}>{title}</div>
    <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.85 }}>{children}</div>
  </div>
);

const Highlight = ({ children }) => (
  <span style={{ color: C.text, fontWeight: 700 }}>{children}</span>
);

const Blip = ({ level, hours, description }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 10, marginBottom: 8 }}>
    <div style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "4px 10px", color: C.accentSoft, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}>{level}</div>
    <div>
      <div style={{ color: C.text, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{hours}</div>
      <div style={{ color: C.textMuted, fontSize: 13 }}>{description}</div>
    </div>
  </div>
);

const Value = ({ title, children }) => (
  <div style={{ display: "flex", gap: 14, marginBottom: 20, alignItems: "flex-start" }}>
    <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, marginTop: 7, flexShrink: 0 }} />
    <div>
      <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 3 }}>{title}</div>
      <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.75 }}>{children}</div>
    </div>
  </div>
);

function CultureAgreementPage({ isMobile, setActivePage }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "70px 16px 80px" : "80px 24px 60px" }}>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ color: C.accentSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>The GuildLink Culture Agreement</div>
        <h1 style={{ margin: "0 0 16px", fontWeight: 900, fontSize: isMobile ? 28 : 36, color: C.text, lineHeight: 1.2 }}>A place worth protecting.</h1>
        <div style={{ color: C.textDim, fontSize: 12 }}>Last updated: April 2026</div>
      </div>

      {/* Preamble */}
      <div style={{ background: C.surface, border: "1px solid " + C.accentDim, borderRadius: 16, padding: isMobile ? 20 : 32, marginBottom: 48 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 16 }}>Why this exists</div>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.85, marginBottom: 16 }}>
          GuildLink was built around a simple idea: the internet should help you do things, not trap you in it. This platform exists to help you find your next favorite game, talk about the ones you love, and then go play them. That's it. No engagement traps. No outrage loops. No infinite scroll designed to keep you here longer than you want to be.
        </div>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.85, marginBottom: 16 }}>
          That kind of place doesn't maintain itself. It requires a shared understanding of what we're building together — not a rulebook handed down from above, but an agreement between people who want the same thing. A community worth being part of.
        </div>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.85, marginBottom: 16 }}>
          Think of GuildLink like an art gallery dedicated to games. People come with different tastes, different opinions, different histories with the medium. Some will love what you hate. Some will have played things you've never heard of. That diversity is what makes the conversation worth having. What makes it work is a shared respect for the space — and for each other as participants in it.
        </div>
        <div style={{ color: C.text, fontSize: 14, lineHeight: 1.85, fontWeight: 600 }}>
          When you create an account, you're agreeing to help build that. We're glad you're here.
        </div>
      </div>

      {/* What GuildLink is for */}
      <Section title="What GuildLink is for">
        GuildLink is a place to talk about games — to review them, recommend them, argue about them, celebrate them, and mourn them when they disappoint you. It's a place to find people who play what you play, and to discover things you wouldn't have found on your own.
        <div style={{ marginTop: 16 }}>
          Posts, reviews, and conversations should be connected to games and gaming. That's the shared context that makes this community work. Content that isn't connected to games — political commentary, personal grievances, off-topic debates — isn't what this space is for, and it dilutes what makes it valuable.
        </div>
        <div style={{ marginTop: 16 }}>
          Games are art. They carry themes, politics, stories, and ideas. Those things can and should be discussed — through the lens of the game itself. A game can be talked about for what it says, how it says it, and whether it succeeds. That conversation belongs here. Using a game as a launching pad for unrelated political debate does not.
        </div>
      </Section>

      {/* Our values */}
      <Section title="What we value">
        <Value title="Honest opinions">
          Say what you actually think. A lukewarm review helps no one. Genuine criticism — of a game's design, story, mechanics, or execution — is one of the most valuable things this community produces. We want it.
        </Value>
        <Value title="Respectful disagreement">
          You will disagree with people here. That's expected and welcome. The line is between disagreeing with an opinion and attacking the person who holds it. Challenge the idea. Leave the person alone.
        </Value>
        <Value title="Curiosity over contempt">
          Someone loved a game you hated. Someone hasn't played something you consider essential. That's interesting, not an offense. Lead with curiosity before you lead with judgment.
        </Value>
        <Value title="Conversation that goes somewhere">
          The best discussions here leave people with something — a new perspective, a game to check out, a detail they hadn't noticed. Aim for that. Posts and comments that exist only to provoke don't serve anyone.
        </Value>
        <Value title="A space for everyone">
          GuildLink is for gamers of all backgrounds, ages, and tastes. Content that makes people feel unwelcome based on who they are has no place here — not in posts, not in comments, not in guild spaces.
        </Value>
      </Section>

      {/* What's not welcome */}
      <Section title="What isn't welcome">
        <div style={{ marginBottom: 12 }}>The following will result in content removal and a blip on your account:</div>
        <Value title="Personal attacks">
          Criticism of a game is welcome. Criticism directed at another person — their intelligence, character, identity, or worth — is not. This includes dismissive language, name-calling, and targeted harassment.
        </Value>
        <Value title="Content unconnected to games">
          Posts that have no connection to games or gaming culture don't belong here. This includes political commentary that isn't anchored to a specific game, spam, and self-promotion unrelated to gaming.
        </Value>
        <Value title="Hate speech and discrimination">
          Content that demeans or threatens people based on race, gender, sexuality, religion, nationality, disability, or any other identity characteristic will be removed immediately.
        </Value>
        <Value title="Harassment">
          Targeting a specific user — in posts, comments, or guild spaces — with the intent to intimidate, embarrass, or drive them off the platform is a serious violation.
        </Value>
        <Value title="Deliberate misuse of reporting">
          The reporting system exists to protect the community. Using it to mass-report users you disagree with, rather than content that genuinely violates these guidelines, undermines that system and will be treated as a violation in its own right.
        </Value>
      </Section>

      {/* Blips */}
      <Section title="Blips">
        <div style={{ marginBottom: 20 }}>
          When content violates this agreement, the author receives a blip. Blips are not permanent marks — they're signals that something went wrong and an opportunity to course-correct. Three blips, however, result in a permanent ban.
        </div>
        <div style={{ marginBottom: 20 }}>
          Blips come with a temporary restriction on posting. The duration scales with severity:
        </div>
        <Blip level="Minor" hours="24-hour restriction" description="First-time or low-severity violations. A nudge in the right direction." />
        <Blip level="Moderate" hours="3-day restriction" description="Repeated minor violations or a single more serious offense." />
        <Blip level="Serious" hours="7-day restriction" description="Significant violations including harassment or hate speech." />
        <Blip level="Severe" hours="30-day restriction" description="Reserved for the most serious violations short of a permanent ban." />
        <div style={{ marginTop: 20 }}>
          <Highlight>Three blips at any level result in a permanent ban.</Highlight> This isn't about punishment — it's about protecting a community that people have invested in. Repeated violations signal an unwillingness to be part of what we're building here.
        </div>
      </Section>

      {/* Appeals */}
      <Section title="Appeals and the path back">
        Every blip can be appealed. An appeal isn't a chance to argue that the blip was wrong — it's a chance to acknowledge what happened, recommit to the culture agreement, and get back to what you came here for.
        <div style={{ marginTop: 16 }}>
          A successful appeal requires three things:
        </div>
        <div style={{ marginTop: 12, marginBottom: 8 }}>→ <Highlight>Acknowledgment.</Highlight> Recognition of what the violation was and why it didn't belong here.</div>
        <div style={{ marginBottom: 8 }}>→ <Highlight>Recommitment.</Highlight> A genuine statement that you understand and agree to the culture agreement going forward.</div>
        <div style={{ marginBottom: 16 }}>→ <Highlight>Patience.</Highlight> The posting restriction runs its course. An appeal doesn't shorten the restriction — it clears the path forward.</div>
        Appeals are reviewed by GuildLink's moderation team. We will respond within a reasonable timeframe. We want people to stay.
      </Section>

      {/* Reporting */}
      <Section title="Reporting content">
        If you see something that violates this agreement, report it. Every report is reviewed. Reporting is one of the ways the community maintains itself — use it when something genuinely doesn't belong here.
        <div style={{ marginTop: 16 }}>
          Reports are not votes. A post that many people disagree with isn't a violation. A post that attacks someone or exists outside the purpose of this platform is. Please report the latter, not the former.
        </div>
      </Section>

      {/* Closing */}
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: isMobile ? 20 : 32, marginTop: 48 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 12 }}>A final word</div>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.85, marginBottom: 16 }}>
          Most of the internet has given up on the idea that a comment section can be a good place. We haven't. GuildLink is an ongoing argument that it's possible to build something online that adds genuine value to people's lives without extracting something from them in return.
        </div>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.85 }}>
          That argument only holds if the people here are willing to make it with us. Thank you for being one of them.
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ color: C.textDim, fontSize: 13 }}>GuildLink · guildlink.gg</div>
        <button onClick={() => { window.scrollTo(0, 0); setActivePage("feed"); }} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 20px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Back to GuildLink</button>
      </div>

    </div>
  );
}

export default CultureAgreementPage;
