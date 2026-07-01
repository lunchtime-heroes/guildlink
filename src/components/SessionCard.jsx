import React, { useState } from "react";
import ReactDOM from "react-dom";
import { C } from "../constants.js";
import { PixelCornerBox } from "./PixelCornerBox.jsx";
import { PixelButton } from "./PixelButton.jsx";

function SessionCard({ session, currentUserId, rsvps, onRsvp, onDelete, onEdit, isMobile, isLive, guildName }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showRsvp, setShowRsvp] = useState(false);

  // Store time as 24h "HH:MM" string internally
  const [editTime, setEditTime] = useState(() => {
    if (!session.scheduled_at) return "22:00";
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

  // Derive 12h display values from editTime string
  const editH24 = editTime ? (parseInt(editTime.split(":")[0]) || 0) : 22;
  const editMin = editTime ? (parseInt(editTime.split(":")[1]) || 0) : 0;
  const editAmpm = editH24 >= 12 ? "pm" : "am";
  const editH12 = editH24 % 12 === 0 ? 12 : editH24 % 12;

  const updateTime = (h12, m, ampm) => {
    let h24 = h12 % 12;
    if (ampm === "pm") h24 = h24 + 12;
    setEditTime(String(h24).padStart(2, "0") + ":" + String(m).padStart(2, "0"));
  };
  const handleHourChange = (val) => {
    const parsed = parseInt(val) || 12;
    const clamped = parsed < 1 ? 1 : parsed > 12 ? 12 : parsed;
    updateTime(clamped, editMin, editAmpm);
  };
  const handleMinChange = (val) => {
    const parsed = parseInt(val) || 0;
    const clamped = parsed < 0 ? 0 : parsed > 59 ? 59 : parsed;
    updateTime(editH12, clamped, editAmpm);
  };

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

  // Color helpers — compute once, use in PixelCornerBox bgStyle/borderColor
  const getBaseColor = () => {
    if (isLive) return C.accent;
    if (isCreator && !myRsvp) return "#22c55e";
    if (!myRsvp) return C.gold;
    if (myRsvp.response === "in") return "#22c55e";
    if (myRsvp.response === "maybe") return "#f59e0b";
    return "#ef4444";
  };
  const getBorderColor = () => {
    if (isLive) return C.accent + "88";
    if (isCreator && !myRsvp) return "#22c55e55";
    if (!myRsvp) return C.gold + "66";
    if (myRsvp.response === "in") return "#22c55e55";
    if (myRsvp.response === "maybe") return "#f59e0b55";
    return "#ef444455";
  };
  const getStatusColor = () => {
    if (isLive) return C.accent;
    if (isCreator && !myRsvp) return "#22c55e";
    if (!myRsvp) return C.gold;
    if (myRsvp.response === "in") return "#22c55e";
    if (myRsvp.response === "maybe") return "#f59e0b";
    return "#ef4444";
  };

  const baseColor = getBaseColor();
  const borderColor = getBorderColor();
  const statusColor = getStatusColor();
  // Use color-mix for bg — semitransparent hex composites incorrectly inside clip-path
  const bgStyle = "color-mix(in srgb, " + baseColor + " 10%, " + C.bg + ")";

  const counts = { in: 0, maybe: 0, out: 0 };
  rsvps.forEach(r => { if (counts[r.response] !== undefined) counts[r.response]++; });

  const handleSaveEdit = () => {
    const base = new Date(session.scheduled_at);
    const h = parseInt(editTime.split(":")[0]) || 0;
    const m = parseInt(editTime.split(":")[1]) || 0;
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

  const smallInput = {
    background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 3,
    padding: "8px 10px", color: C.text, fontSize: 13, outline: "none",
    width: "100%", boxSizing: "border-box", textAlign: "center",
  };

  if (showEdit) {
    const editForm = (
      <>
        <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Edit Session</div>

        {/* Custom time picker — type="text" with inputMode avoids native spinners on desktop */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.textDim, fontSize: 10, marginBottom: 6 }}>Start Time</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={editH12}
                onChange={e => handleHourChange(e.target.value)} style={smallInput} />
              <div style={{ color: C.textDim, fontSize: 9, textAlign: "center", marginTop: 2 }}>hr</div>
            </div>
            <div style={{ color: C.textDim, fontSize: 16, paddingBottom: 16 }}>:</div>
            <div style={{ flex: 1 }}>
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={String(editMin).padStart(2, "0")}
                onChange={e => handleMinChange(e.target.value)} style={smallInput} />
              <div style={{ color: C.textDim, fontSize: 9, textAlign: "center", marginTop: 2 }}>min</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 16 }}>
              <button onClick={() => updateTime(editH12, editMin, "am")}
                style={{ background: editAmpm === "am" ? C.accent + "33" : "transparent", border: "1px solid " + (editAmpm === "am" ? C.accent : C.border), borderRadius: 2, padding: "4px 10px", color: editAmpm === "am" ? C.accent : C.textDim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                AM
              </button>
              <button onClick={() => updateTime(editH12, editMin, "pm")}
                style={{ background: editAmpm === "pm" ? C.accent + "33" : "transparent", border: "1px solid " + (editAmpm === "pm" ? C.accent : C.border), borderRadius: 2, padding: "4px 10px", color: editAmpm === "pm" ? C.accent : C.textDim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                PM
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.textDim, fontSize: 10, marginBottom: 6 }}>Duration</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0" value={editDurH}
                onChange={e => setEditDurH(e.target.value.replace(/[^0-9]/g, ""))} style={smallInput} />
              <div style={{ color: C.textDim, fontSize: 9, textAlign: "center", marginTop: 2 }}>hrs</div>
            </div>
            <div style={{ color: C.textDim, fontSize: 16, paddingBottom: 16 }}>:</div>
            <div style={{ flex: 1 }}>
              <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0" value={editDurM}
                onChange={e => setEditDurM(e.target.value.replace(/[^0-9]/g, ""))} style={smallInput} />
              <div style={{ color: C.textDim, fontSize: 9, textAlign: "center", marginTop: 2 }}>min</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ padding: "1px 0" }}>
            <PixelButton onClick={handleSaveEdit} size="sm" bg={C.accent} borderColor={C.accent}>Save</PixelButton>
          </div>
          <div style={{ padding: "1px 0" }}>
            <PixelButton onClick={() => setShowEdit(false)} size="sm" bg="transparent" borderColor={C.border}>Cancel</PixelButton>
          </div>
          <div style={{ padding: "1px 0", marginLeft: "auto" }}>
            <PixelButton onClick={() => onDelete(session.id)} size="sm" bg="#ef444422" borderColor="#ef444444">{"Delete"}</PixelButton>
          </div>
        </div>
      </>
    );

    // Mobile: full-screen overlay for comfortable editing
    if (isMobile) {
      return ReactDOM.createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: C.bg, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "16px 20px 12px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{session.game || "Untitled"}</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: 24 }}>
            {editForm}
          </div>
        </div>,
        document.body
      );
    }

    // Desktop: inline edit card with padding
    return (
      <PixelCornerBox size="lg" bgStyle={bgStyle} borderColor={borderColor} style={{ padding: "12px 14px", marginBottom: 6 }}>
        {editForm}
      </PixelCornerBox>
    );
  }

  return (
    <PixelCornerBox size="lg" bgStyle={bgStyle} borderColor={borderColor} style={{ padding: "10px 12px", marginBottom: 6 }}>
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
        <div style={{ fontSize: 11, color: statusColor, fontWeight: 700, marginBottom: guildName ? 2 : 6 }}>
          {isLive ? "\u25cf Online Now" : (timeStr + (durationStr ? " \u00b7 " + durationStr : ""))}
        </div>
        {guildName && (
          <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, marginBottom: 6, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{guildName}</div>
        )}
        {!showRsvp && (
          <div style={{ fontSize: 11, lineHeight: 2 }}>
            <div style={{ color: "#22c55e", fontWeight: 700 }}>{counts.in} in</div>
            <div style={{ color: "#f59e0b", fontWeight: 700 }}>{counts.maybe} maybe</div>
            <div style={{ color: "#ef4444", fontWeight: 700 }}>{counts.out} out</div>
          </div>
        )}
        {myRsvp && !isCreator && (
          <div style={{ fontSize: 10, color: statusColor, fontWeight: 700, marginTop: 4, lineHeight: 1.5 }}>
            <div>{"You're " + (myRsvp.response === "in" ? "in" : myRsvp.response === "maybe" ? "maybe" : "out")}</div>
            <div>tap to change</div>
          </div>
        )}
        {!myRsvp && !isCreator && (
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, marginTop: 4 }}>Tap to respond</div>
        )}
        {isCreator && (
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>Tap to edit</div>
        )}
      </div>

      {showRsvp && !isCreator && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8, paddingTop: 8, borderTop: "1px solid " + borderColor }}>
          {[
            { response: "in", label: "I'm in", color: "#22c55e", bg: "#22c55e22", border: "#22c55e55", selectedBg: "#22c55e33", selectedBorder: "#22c55e88", count: counts.in },
            { response: "maybe", label: "Not sure", color: "#f59e0b", bg: "#f59e0b22", border: "#f59e0b55", selectedBg: "#f59e0b33", selectedBorder: "#f59e0b88", count: counts.maybe },
            { response: "out", label: "I'm out", color: "#ef4444", bg: "#ef444422", border: "#ef444455", selectedBg: "#ef444433", selectedBorder: "#ef444488", count: counts.out },
          ].map(opt => {
            const isSelected = myRsvp?.response === opt.response;
            return (
              <button
                key={opt.response}
                onClick={() => handleRsvpSelect(opt.response)}
                style={{
                  width: "100%",
                  background: isSelected ? opt.selectedBg : opt.bg,
                  border: "1px solid " + (isSelected ? opt.selectedBorder : opt.border),
                  borderRadius: 3,
                  padding: "6px 10px",
                  color: opt.color,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                <span style={{
                  background: isSelected ? opt.selectedBg : opt.bg,
                  border: "1px solid " + opt.border,
                  borderRadius: 3,
                  padding: "2px 7px",
                  fontSize: 11,
                  fontWeight: 800,
                  minWidth: 22,
                  textAlign: "center",
                }}>{opt.count}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </PixelCornerBox>
  );
}

export default SessionCard;

