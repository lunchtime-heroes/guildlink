import React, { useState } from "react";
import { C } from "../constants.js";

function SessionCard({ session, currentUserId, rsvps, onRsvp, onDelete, onEdit, isMobile }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showRsvp, setShowRsvp] = useState(false);
  const [editTime, setEditTime] = useState(() => {
    if (!session.scheduled_at) return "";
    const d = new Date(session.scheduled_at);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  });
  const [editDurH, setEditDurH] = useState(() => {
    if (!session.duration_minutes) return "";
    return String(Math.floor(session.duration_minutes / 60));
  });
  const [editDurM, setEditDurM] = useState(() => {
    if (!session.duration_minutes) return "";
    return String(session.duration_minutes % 60);
  });

  const myRsvp = rsvps.find(r => r.user_id === currentUserId);
  const isCreator = session.created_by === currentUserId;

  const scheduled = new Date(session.scheduled_at);
  const hours = scheduled.getHours();
  const minutes = scheduled.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const timeStr = minutes === 0 ? displayHour + ampm : displayHour + ":" + String(minutes).padStart(2, "0") + ampm;

  const durH = session.duration_minutes ? Math.floor(session.duration_minutes / 60) : 0;
  const durM = session.duration_minutes ? session.duration_minutes % 60 : 0;
  const durationStr = session.duration_minutes
    ? (durH > 0 && durM > 0 ? durH + "h " + durM + "m" : durH > 0 ? durH + "h" : durM + "m")
    : null;

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

  const handleSaveEdit = () => {
    const base = new Date(session.scheduled_at);
    const [h, m] = editTime.split(":").map(Number);
    base.setHours(h, m, 0, 0);
    const totalMinutes = (parseInt(editDurH) || 0) * 60 + (parseInt(editDurM) || 0);
    onEdit(session.id, {
      game: session.game,
      scheduled_at: base.toISOString(),
      duration_minutes: totalMinutes > 0 ? totalMinutes : null,
    });
    setShowEdit(false);
  };

  const handleRsvpSelect = (response) => {
    onRsvp(session.id, response);
    setShowRsvp(false);
  };

  const smallInput = { background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 6, padding: "6px 8px", color: C.text, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" };

  if (showEdit) {
    return (
      <div style={{ background: statusGlow(), border: "2px solid " + statusBorder(), borderRadius: 10, padding: "10px 12px", marginBottom: 6, boxShadow: "0 0 8px " + statusBorder() }}>
        <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Edit Session</div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: C.textDim, fontSize: 10, marginBottom: 4 }}>Start Time</div>
          <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={smallInput} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: C.textDim, fontSize: 10, marginBottom: 4 }}>Duration</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <input type="number" min="0" max="12" placeholder="0" value={editDurH} onChange={e => setEditDurH(e.target.value)} style={smallInput} />
              <div style={{ color: C.textDim, fontSize: 9, textAlign: "center", marginTop: 2 }}>hrs</div>
            </div>
            <div style={{ color: C.textDim, fontSize: 14, paddingBottom: 14 }}>:</div>
            <div style={{ flex: 1 }}>
              <input type="number" min="0" max="59" placeholder="0" value={editDurM} onChange={e => setEditDurM(e.target.value)} style={smallInput} />
              <div style={{ color: C.textDim, fontSize: 9, textAlign: "center", marginTop: 2 }}>min</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleSaveEdit} style={{ background: C.accent, border: "none", borderRadius: 6, padding: "5px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
          <button onClick={() => setShowEdit(false)} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 6, padding: "5px 10px", color: C.textMuted, fontSize: 11, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onDelete(session.id)} style={{ background: "#ef444422", border: "1px solid #ef444444", borderRadius: 6, padding: "5px 10px", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer", marginLeft: "auto" }}>Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: statusGlow(), border: "2px solid " + statusBorder(), borderRadius: 10, padding: "8px 10px", marginBottom: 6, boxShadow: "0 0 8px " + statusBorder() }}>
      <div
        onClick={() => {
          if (!currentUserId) return;
          if (isCreator) { setShowEdit(true); return; }
          setShowRsvp(r => !r);
        }}
        style={{ cursor: currentUserId ? "pointer" : "default" }}
      >
        <div style={{ fontWeight: 800, fontSize: 12, color: C.text, marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          {session.game || "Untitled"}
        </div>
        <div style={{ fontSize: 11, color: statusColor(), fontWeight: 700, marginBottom: 4 }}>
          {timeStr}{durationStr ? " · " + durationStr : ""}
        </div>
        <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.8 }}>
          <div>{counts.in} in · {counts.maybe} maybe · {counts.out} out</div>
        </div>
        {!myRsvp && !isCreator && (
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, marginTop: 4 }}>Tap to respond</div>
        )}
        {myRsvp && !isCreator && (
          <div style={{ fontSize: 10, color: statusColor(), fontWeight: 700, marginTop: 4 }}>
            You're {myRsvp.response === "in" ? "in" : myRsvp.response === "maybe" ? "maybe" : "out"} · tap to change
          </div>
        )}
        {isCreator && (
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>Tap to edit</div>
        )}
      </div>

      {showRsvp && !isCreator && (
        <div style={{ display: "flex", gap: 5, marginTop: 8, paddingTop: 8, borderTop: "1px solid " + statusBorder(), flexWrap: "wrap" }}>
          {[
            { response: "in", label: "In", color: "#22c55e", bg: "#22c55e18", border: "#22c55e44" },
            { response: "maybe", label: "Maybe", color: "#f59e0b", bg: "#f59e0b18", border: "#f59e0b44" },
            { response: "out", label: "Out", color: "#ef4444", bg: "#ef444418", border: "#ef444444" },
          ].map(opt => (
            <button
              key={opt.response}
              onClick={() => handleRsvpSelect(opt.response)}
              style={{
                background: myRsvp?.response === opt.response ? opt.bg : "transparent",
                border: "1px solid " + (myRsvp?.response === opt.response ? opt.border : C.border),
                borderRadius: 20,
                padding: "3px 10px",
                color: myRsvp?.response === opt.response ? opt.color : C.textDim,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SessionCard;