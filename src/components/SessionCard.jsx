import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { Avatar } from "./Avatar.jsx";
import { PixelCornerBox } from "./PixelCornerBox.jsx";
import { PixelButton } from "./PixelButton.jsx";

function SessionCard({ session, currentUserId, rsvps, onRsvp, onDelete, onEdit, isMobile, guildName }) {
  // Compute isLive from session data directly — no need for parent to pass it
  const now = new Date();
  const sessionStart = new Date(session.scheduled_at);
  const durMs = (session.duration_minutes || 60) * 60000;
  const sessionEnd = new Date(sessionStart.getTime() + durMs);
  const isLive = now >= sessionStart && now <= sessionEnd;
  const [showEdit, setShowEdit] = useState(false);
  const [showRsvp, setShowRsvp] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const threadBottomRef = useRef(null);

  // Load thread messages when modal opens — don't clear on close so reopening is instant
  useEffect(() => {
    if (!showModal) return;
    loadThread();
  }, [showModal]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (threadBottomRef.current) {
      threadBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const loadThread = async () => {
    setLoadingThread(true);
    const { data } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, profiles(id, username, avatar_initials, avatar_config, active_ring, is_founding)")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    const msgs = data || [];
    // Build profile map from the joined data
    const profileMap = {};
    msgs.forEach(m => { if (m.profiles) profileMap[m.user_id] = m.profiles; });
    setProfiles(profileMap);
    setMessages(msgs);
    setLoadingThread(false);
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !currentUserId || sending) return;
    setSending(true);
    const content = msgText.trim();
    setMsgText("");

    // Optimistic insert — profile will be filled in after real insert
    const tempId = "temp-" + Date.now();
    setMessages(prev => [...prev, { id: tempId, content, created_at: new Date().toISOString(), user_id: currentUserId }]);

    // Calculate session end for notification expiry
    const sessionEnd = new Date(session.scheduled_at);
    sessionEnd.setMinutes(sessionEnd.getMinutes() + (session.duration_minutes || 60));

    const { data, error } = await supabase
      .from("posts")
      .insert({ session_id: session.id, user_id: currentUserId, content, post_type: "session_thread" })
      .select("id, content, created_at, user_id, profiles(id, username, avatar_initials, avatar_config, active_ring, is_founding)")
      .single();

    if (error) {
      console.error("[session thread] post insert failed:", error.message, error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setSending(false);
      return;
    }

    if (data) {
      if (data.profiles) setProfiles(prev => ({ ...prev, [currentUserId]: data.profiles }));
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    }

    // Notify other RSVPs who are "in" or "maybe" — exclude sender
    const notifyIds = rsvps
      .filter(r => r.user_id !== currentUserId && (r.response === "in" || r.response === "maybe"))
      .map(r => r.user_id);
    if (notifyIds.length > 0) {
      const notifications = notifyIds.map(uid => ({
        user_id: uid,
        type: "session_message",
        message: "New message in your " + (session.game || "gaming") + " session",
        guild_id: session.guild_id,
        expires_at: sessionEnd.toISOString(),
      }));
      try {
        await supabase.from("notifications").insert(notifications);
      } catch(e) {}
    }

    setSending(false);
  };

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

  // Local display states — allow empty/partial values while typing; committed on blur
  const [editHourDisp, setEditHourDisp] = useState(() => {
    if (!session.scheduled_at) return "10";
    const h24 = new Date(session.scheduled_at).getHours();
    return String(h24 % 12 === 0 ? 12 : h24 % 12);
  });
  const [editMinDisp, setEditMinDisp] = useState(() => {
    if (!session.scheduled_at) return "00";
    return String(new Date(session.scheduled_at).getMinutes()).padStart(2, "0");
  });

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

  // editForm is hoisted so both the standalone edit portal and the modal edit button can use it
  const editForm = (
    <>
      <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Edit Session</div>

        {/* Custom time picker — type="text" with inputMode avoids native spinners on desktop */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.textDim, fontSize: 10, marginBottom: 6 }}>Start Time</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <input type="text" inputMode="numeric" pattern="[0-9]*"
                value={editHourDisp}
                onChange={e => setEditHourDisp(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => {
                  const v = parseInt(editHourDisp) || 12;
                  const c = v < 1 ? 1 : v > 12 ? 12 : v;
                  setEditHourDisp(String(c));
                  handleHourChange(String(c));
                }}
                style={smallInput} />
              <div style={{ color: C.textDim, fontSize: 9, textAlign: "center", marginTop: 2 }}>hr</div>
            </div>
            <div style={{ color: C.textDim, fontSize: 16, paddingBottom: 16 }}>:</div>
            <div style={{ flex: 1 }}>
              <input type="text" inputMode="numeric" pattern="[0-9]*"
                value={editMinDisp}
                onChange={e => setEditMinDisp(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => {
                  const v = parseInt(editMinDisp) || 0;
                  const c = v < 0 ? 0 : v > 59 ? 59 : v;
                  setEditMinDisp(String(c).padStart(2, "0"));
                  handleMinChange(String(c));
                }}
                style={smallInput} />
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

  return (
    <>
      <PixelCornerBox size="lg" bgStyle={bgStyle} borderColor={borderColor} style={{ padding: "10px 12px", marginBottom: 6 }}>
        <div
          onClick={() => { if (currentUserId) setShowModal(true); }}
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
          <div style={{ fontSize: 11, lineHeight: 2 }}>
            <div style={{ color: "#22c55e", fontWeight: 700 }}>{counts.in} in</div>
            <div style={{ color: "#f59e0b", fontWeight: 700 }}>{counts.maybe} maybe</div>
            <div style={{ color: "#ef4444", fontWeight: 700 }}>{counts.out} out</div>
          </div>
          {myRsvp && !isCreator && (
            <div style={{ fontSize: 10, color: statusColor, fontWeight: 700, marginTop: 4 }}>
              {"You're " + (myRsvp.response === "in" ? "in" : myRsvp.response === "maybe" ? "maybe" : "out") + " \u00b7 tap for thread"}
            </div>
          )}
          {!myRsvp && !isCreator && (
            <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, marginTop: 4 }}>Tap to RSVP</div>
          )}
          {isCreator && (
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>Tap to view</div>
          )}
        </div>
      </PixelCornerBox>

      {/* Session modal — full-screen on mobile, centered overlay on desktop */}
      {showModal && ReactDOM.createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center" }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: C.bg, width: isMobile ? "100%" : 520, maxHeight: isMobile ? "90vh" : "80vh", display: "flex", flexDirection: "column", borderRadius: isMobile ? "12px 12px 0 0" : 8, overflow: "hidden" }}>

            {/* Modal header */}
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 2 }}>{session.game || "Untitled"}</div>
                  <div style={{ fontSize: 13, color: isLive ? C.accent : statusColor, fontWeight: 700 }}>
                    {isLive ? "\u25cf Online Now" : (timeStr + (durationStr ? " \u00b7 " + durationStr : ""))}
                  </div>
                  {guildName && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{guildName}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  {isCreator && (
                    <button
                      onClick={() => { setShowModal(false); setShowEdit(true); }}
                      style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 3, padding: "5px 10px", color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => setShowModal(false)}
                    style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "2px 4px" }}>
                    ×
                  </button>
                </div>
              </div>

              {/* RSVP row */}
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                {[
                  { response: "in", label: "I'm in", color: "#22c55e", activeBg: "#22c55e22", activeBorder: "#22c55e88" },
                  { response: "maybe", label: "Maybe", color: "#f59e0b", activeBg: "#f59e0b22", activeBorder: "#f59e0b88" },
                  { response: "out", label: "Can't make it", color: "#ef4444", activeBg: "#ef444422", activeBorder: "#ef444488" },
                ].map(opt => {
                  const isSelected = myRsvp?.response === opt.response;
                  const count = counts[opt.response];
                  return (
                    <button key={opt.response}
                      onClick={() => { onRsvp(session.id, opt.response); }}
                      style={{ flex: 1, background: isSelected ? opt.activeBg : C.surfaceRaised, border: "1px solid " + (isSelected ? opt.activeBorder : C.border), borderRadius: 3, padding: "7px 4px", color: opt.color, fontSize: 11, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>{count}</div>
                      <div>{opt.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thread messages */}
            <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "12px 16px" }}>
              {loadingThread && <div style={{ color: C.textDim, fontSize: 13, textAlign: "center", padding: 20 }}>Loading...</div>}
              {!loadingThread && messages.length === 0 && (
                <div style={{ color: C.textDim, fontSize: 13, textAlign: "center", padding: 24, lineHeight: 1.6 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>
                  No messages yet. Share your gamer tag, ask questions, or let the group know if you'll be late.
                  <div style={{ fontSize: 11, marginTop: 12, color: C.textDim + "88" }}>This thread disappears when the session ends.</div>
                </div>
              )}
              {messages.map(msg => {
                const author = profiles[msg.user_id];
                const isOwn = msg.user_id === currentUserId;
                return (
                  <div key={msg.id} style={{ display: "flex", gap: 10, marginBottom: 14, flexDirection: isOwn ? "row-reverse" : "row" }}>
                    {!isOwn && (
                      <Avatar
                        initials={(author?.avatar_initials || "?").slice(0, 2).toUpperCase()}
                        size={28}
                        founding={author?.is_founding}
                        ring={author?.active_ring}
                        avatarConfig={author?.avatar_config}
                      />
                    )}
                    <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
                      {!isOwn && <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, marginBottom: 3 }}>{author?.username || "Member"}</div>}
                      <div style={{ background: isOwn ? "color-mix(in srgb, " + C.accent + " 15%, " + C.bg + ")" : C.surfaceRaised, border: "1px solid " + (isOwn ? C.accentDim : C.border), borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.text, lineHeight: 1.4 }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={threadBottomRef} />
            </div>

            {/* Message input */}
            <div style={{ padding: "10px 16px", borderTop: "1px solid " + C.border, flexShrink: 0, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Message..."
                style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 20, padding: "9px 14px", color: C.text, fontSize: 14, outline: "none" }}
              />
              <button
                onClick={sendMessage}
                disabled={!msgText.trim() || sending}
                style={{ background: msgText.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: msgText.trim() ? "pointer" : "default", flexShrink: 0, transition: "background 0.15s" }}>
                <span style={{ color: msgText.trim() ? "#fff" : C.textDim, fontSize: 16 }}>{"\u2191"}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit form portal — centered overlay on desktop, full-screen on mobile */}
      {showEdit && ReactDOM.createPortal(
        <div
          onClick={() => setShowEdit(false)}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center" }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: C.bg, width: isMobile ? "100%" : 520, maxHeight: isMobile ? "90vh" : "80vh", display: "flex", flexDirection: "column", borderRadius: isMobile ? "12px 12px 0 0" : 8, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{session.game || "Untitled"}</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: 24 }}>
              {editForm}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default SessionCard;

