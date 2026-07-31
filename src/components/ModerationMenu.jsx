import React, { useState, useRef, useEffect } from "react";
import { C } from "../constants.js";
import { blockUser, hideContent, submitReport, REPORT_CATEGORIES } from "../moderationUtils.js";

/**
 * ModerationMenu.jsx
 *
 * One shared Hide/Block/Report menu used identically across every real
 * source of user-generated content on web — main feed posts/comments,
 * guild posts, and session messages. This is what makes "the approach
 * needs to feel the same everywhere" a structural guarantee rather than
 * four separate implementations that could quietly drift apart over
 * time. Every surface passes in what content type/id it's dealing
 * with; this component doesn't know or care where it's being rendered.
 *
 * Not shown for a user's own content — each parent screen already
 * handles its own Edit/Delete menu for that case separately.
 */

function ModerationMenu({ targetType, targetId, targetUserId, targetUsername, currentUserId, onHidden, onBlocked }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentUserId || targetUserId === currentUserId) return null;

  const handleHide = async () => {
    setMenuOpen(false);
    await hideContent(currentUserId, targetType, targetId, "hide");
    onHidden?.(targetId);
  };

  const handleBlock = async () => {
    setMenuOpen(false);
    const confirmed = window.confirm(
      `Block ${targetUsername || "this user"}? You won't see their content, and they won't see yours. This applies everywhere on GuildLink, not just here.`
    );
    if (!confirmed) return;
    const { error } = await blockUser(currentUserId, targetUserId);
    if (!error) onBlocked?.(targetUserId);
  };

  const handleReport = async (category) => {
    setSubmitting(true);
    await submitReport(currentUserId, targetType, targetId, category);
    setSubmitting(false);
    setReportModalOpen(false);
    onHidden?.(targetId);
  };

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setMenuOpen(v => !v)}
        style={{ background: "none", border: "none", color: C.textMuted, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "4px 6px" }}
      >
        ···
      </button>

      {menuOpen && (
        <div style={{
          position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 20,
          background: C.surface, border: "1px solid " + C.border, borderRadius: 4,
          minWidth: 160, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", overflow: "hidden",
        }}>
          <button onClick={handleHide} style={menuItemStyle(C)}>Hide</button>
          <button onClick={handleBlock} style={{ ...menuItemStyle(C), color: "#ef4444" }}>Block User</button>
          <button onClick={() => { setMenuOpen(false); setReportModalOpen(true); }} style={menuItemStyle(C)}>Report</button>
        </div>
      )}

      {reportModalOpen && (
        <div
          onClick={() => setReportModalOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 6, padding: 24, width: 340, maxWidth: "90vw" }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>What's the issue?</div>
            <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>
              This hides it for you right away. A moderator will review it separately.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {REPORT_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => handleReport(cat.value)}
                  disabled={submitting}
                  style={{
                    background: "none", border: "1px solid " + C.border, borderRadius: 4,
                    padding: "10px 14px", color: C.text, fontSize: 13, textAlign: "left",
                    cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setReportModalOpen(false)}
              style={{ marginTop: 14, background: "none", border: "none", color: C.textDim, fontSize: 12, cursor: "pointer", width: "100%" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const menuItemStyle = (C) => ({
  display: "block", width: "100%", background: "none", border: "none",
  padding: "10px 16px", color: C.text, fontSize: 13, textAlign: "left", cursor: "pointer",
});

export default ModerationMenu;
