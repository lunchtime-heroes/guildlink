import React from "react";
import { C } from "../constants.js";

function SessionCard({ session, currentUserId, rsvps, onRsvp }) {
  const myRsvp = rsvps.find(r => r.user_id === currentUserId);
  const counts = { in: 0, maybe: 0, out: 0 };
  rsvps.forEach(r => { if (counts[r.response] !== undefined) counts[r.response]++; });

  const scheduled = new Date(session.scheduled_at);
  const dateStr = scheduled.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = scheduled.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const btnBg = (resp) => {
    if (myRsvp?.response !== resp) return C.surfaceRaised;
    if (resp === "in") return "#22c55e22";
    if (resp === "maybe") return C.accentGlow;
    return "#ef444422";
  };
  const btnBorder = (resp) => {
    if (myRsvp?.response !== resp) return "1px solid " + C.border;
    if (resp === "in") return "1px solid #22c55e44";
    if (resp === "maybe") return "1px solid " + C.accentDim;
    return "1px solid #ef444444";
  };
  const btnColor = (resp) => {
    if (myRsvp?.response !== resp) return C.textMuted;
    if (resp === "in") return "#22c55e";
    if (resp === "maybe") return C.accentSoft;
    return "#ef4444";
  };

  return (
    <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 4 }}>
        {session.game}{session.title ? " \u2014 " + session.title : ""}
      </div>
      <div style={{ color: C.textDim, fontSize: 13, marginBottom: session.notes ? 8 : 12 }}>{dateStr} at {timeStr}</div>
      {session.notes && (
        <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{session.notes}</div>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: C.textDim, fontSize: 12 }}>{counts.in} In · {counts.maybe} Maybe · {counts.out} Out</span>
        {currentUserId && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onRsvp(session.id, "in")} style={{ background: btnBg("in"), border: btnBorder("in"), color: btnColor("in"), borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>I'm In</button>
            <button onClick={() => onRsvp(session.id, "maybe")} style={{ background: btnBg("maybe"), border: btnBorder("maybe"), color: btnColor("maybe"), borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Maybe</button>
            <button onClick={() => onRsvp(session.id, "out")} style={{ background: btnBg("out"), border: btnBorder("out"), color: btnColor("out"), borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>I'm Out</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionCard;
