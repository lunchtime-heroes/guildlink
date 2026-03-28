import React, { useState } from "react";
import { C } from "../constants.js";

function SessionCard({ session, currentUserId, rsvps, onRsvp, onDelete, onEdit, isMobile }) {
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ game: session.game || "", scheduled_at: session.scheduled_at || "", duration_minutes: session.duration_minutes || "" });

  const myRsvp = rsvps.find(r => r.user_id === currentUserId);
  const isCreator = session.created_by === currentUserId;

  const scheduled = new Date(session.scheduled_at);
  const timeStr = scheduled.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const duration = session.duration_minutes ? session.duration_minutes + " min" : null;

  const statusColor = () => {
    if (!myRsvp) return C.gold;
    if (myRsvp.response === "in") return "#22c55e";
    if (myRsvp.response === "maybe") return "#f59e0b";
    return "#ef4444";
  };

  const statusGlow = () => {
    if (!myRsvp) return C.gold + "33";
    if (myRsvp.response === "in") return "#22c55e22";
    if (myRsvp.response === "maybe") return "#f59e0b22";
    return "#ef444422";
  };

  const statusBorder = () => {
    if (!myRsvp) return C.gold + "66";
    if (myRsvp.response === "in") return "#22c55e55";
    if (myRsvp.response === "maybe") return "#f59e0b55";
    return "#ef444455";
  };

  const counts = { in: 0, maybe: 0, out: 0 };
  rsvps.forEach(r => { if (counts[r.response] !== undefined) counts[r.response]++; });

  if (showEdit) {
    return (
      <div style={{ background: statusGlow(), border: "1px solid " + statusBorder(), borderRadius: 10, padding: "10px 12px", marginBottom: 6 }}>
        <input
          value={editForm.game}
          onChange={e => setEditForm(f => ({ ...f, game: e.target.value }))}
          placeholder="Game"
          style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 6, padding: "6px 10px", color: C.text, fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }}
        />
        <input
          type="datetime-local"
          value={editForm.scheduled_at ? editForm.scheduled_at.slice(0, 16) : ""}
          onChange={e => setEditForm(f => ({ ...f, scheduled_at: e.target.value }))}
          style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 6, padding: "6px 10px", color: C.text, fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }}
        />
        <input
          type="number"
          value={editForm.duration_minutes}
          onChange={e => setEditForm(f => ({ ...f, duration_minutes: e.target.value }))}
          placeholder="Duration (min)"
          style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 6, padding: "6px 10px", color: C.text, fontSize: 12, outline: "none", marginBottom: 8, boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { onEdit(session.id, editForm); setShowEdit(false); }}
            style={{ background: C.accent, border: "none", borderRadius: 6, padding: "5px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
          <button onClick={() => setShowEdit(false)}
            style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 6, padding: "5px 10px", color: C.textMuted, fontSize: 11, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onDelete(session.id)}
            style={{ background: "#ef444422", border: "1px solid #ef444444", borderRadius: 6, padding: "5px 10px", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer", marginLeft: "auto" }}>Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (!currentUserId) return;
        if (isCreator) { setShowEdit(true); return; }
        const next = !myRsvp ? "in" : myRsvp.response === "in" ? "maybe" : myRsvp.response === "maybe" ? "out" : "in";
        onRsvp(session.id, next);
      }}
      style={{
        background: statusGlow(),
        border: "2px solid " + statusBorder(),
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 6,
        cursor: currentUserId ? "pointer" : "default",
        boxShadow: "0 0 8px " + statusBorder(),
        transition: "box-shadow 0.15s",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
        {session.game || "Untitled"}
      </div>
      <div style={{ fontSize: 11, color: statusColor(), fontWeight: 700 }}>
        {timeStr}{duration ? " · " + duration : ""}
      </div>
      <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>
        {counts.in} in · {counts.maybe} maybe · {counts.out} out
      </div>
      {!myRsvp && !isCreator && (
        <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, marginTop: 4 }}>Tap to respond</div>
      )}
      {isCreator && (
        <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>Tap to edit</div>
      )}
    </div>
  );
}

export default SessionCard;
