import React, { useState } from "react";
import { C } from "../constants.js";

function SessionCard({ session, currentUserId, rsvps, onRsvp, onDelete, onEdit, isMobile }) {
  const [showEdit, setShowEdit] = useState(false);
  const [editTime, setEditTime] = useState(() => {
    if (!session.scheduled_at) return "";
    const d = new Date(session.scheduled_at);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return h + ":" + m;
  });
  const [editDuration, setEditDuration] = useState(
    session.duration_minutes ? String(session.duration_minutes / 60) : ""
  );

  const myRsvp = rsvps.find(r => r.user_id === currentUserId);
  const isCreator = session.created_by === currentUserId;

  const scheduled = new Date(session.scheduled_at);
  const hours = scheduled.getHours();
  const minutes = scheduled.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const timeStr = minutes === 0 ? displayHour + ampm : displayHour + ":" + String(minutes).padStart(2, "0") + ampm;
  const durationHours = session.duration_minutes ? session.duration_minutes / 60 : null;
  const durationStr = durationHours ? durationHours + "h" : null;

  const statusColor = () => {
    if (isCreator && !myRsvp) return "#22c55e";
    if (!myRsvp) return C.gold;
    if (myRsvp.response === "in") return "#22c55e";
    if (myRsvp.response === "maybe") return "#f59e0b";
    return "#ef4444";
  };

  const statusGlow = () => {
    if (isCreator && !myRsvp) return "#22c55e22";
    if (!myRsvp) return C.gold + "33";
    if (myRsvp.response === "in") return "#22c55e22";
    if (myRsvp.response === "maybe") return "#f59e0b22";
    return "#ef444422";
  };

  const statusBorder = () => {
    if (isCreator && !myRsvp) return "#22c55e55";
    if (!myRsvp) return C.gold + "66";
    if (myRsvp.response === "in") return "#22c55e55";
    if (myRsvp.response === "maybe") return "#f59e0b55";
    return "#ef444455";
  };

  const counts = { in: 0, maybe: 0, out: 0 };
  rsvps.forEach(r => { if (counts[r.response] !== undefined) counts[r.response]++; });

  const DURATIONS = ["0.5", "1", "1.5", "2", "2.5", "3"];

  const handleSaveEdit = () => {
    const base = new Date(session.scheduled_at);
    const [h, m] = editTime.split(":").map(Number);
    base.setHours(h, m, 0, 0);
    onEdit(session.id, {
      game: session.game,
      scheduled_at: base.toISOString(),
      duration_minutes: editDuration ? Math.round(parseFloat(editDuration) * 60) : null,
    });
    setShowEdit(false);
  };

  if (showEdit) {
    return (
      <div style={{ background: statusGlow(), border: "2px solid " + statusBorder(), borderRadius: 10, padding: "10px 12px", marginBottom: 6, boxShadow: "0 0 8px " + statusBorder() }}>
        <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Edit Session</div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: C.textDim, fontSize: 10, marginBottom: 4 }}>Start Time</div>
          <input
            type="time"
            value={editTime}
            onChange={e => setEditTime(e.target.value)}
            style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 6, padding: "6px 10px", color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: C.textDim, fontSize: 10, marginBottom: 4 }}>Duration</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {DURATIONS.map(d => (
              <button key={d} onClick={() => setEditDuration(d)}
                style={{ background: editDuration === d ? C.accentGlow : C.surfaceRaised, border: "1px solid " + (editDuration === d ? C.accentDim : C.border), borderRadius: 6, padding: "4px 8px", color: editDuration === d ? C.accentSoft : C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {d}h
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleSaveEdit}
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
        padding: "8px 10px",
        marginBottom: 6,
        cursor: currentUserId ? "pointer" : "default",
        boxShadow: "0 0 8px " + statusBorder(),
        transition: "box-shadow 0.15s",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 12, color: C.text, marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
        {session.game || "Untitled"}
      </div>
      <div style={{ fontSize: 11, color: statusColor(), fontWeight: 700, marginBottom: 4 }}>
        {timeStr}{durationStr ? " · " + durationStr : ""}
      </div>
      <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.8 }}>
        <div>{counts.in} in</div>
        <div>{counts.maybe} maybe</div>
        <div>{counts.out} out</div>
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
