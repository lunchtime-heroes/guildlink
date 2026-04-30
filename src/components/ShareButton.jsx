// src/components/ShareButton.jsx
// Generates and downloads a branded share image

import React, { useState } from "react";
import { C } from "../constants.js";

// Share icon SVG
function ShareIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

// Share a post
export function SharePostButton({ post, currentUser, style = {} }) {
  const [loading, setLoading] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const params = new URLSearchParams({
        content: post.content || "",
        handle: currentUser?.handle ? `@${currentUser.handle}` : `@${post.profiles?.handle || post.profiles?.username || ""}`,
        game: post.game_tag_name || "",
        avatar: post.profiles?.avatar_url || "",
      });
      const url = `/api/share-post?${params}`;
      await downloadImage(url, `guildlink-post.png`);
    } catch (err) {
      console.error("Share failed:", err);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      title="Share this post"
      style={{
        background: "none", border: "none", cursor: loading ? "default" : "pointer",
        color: C.textDim, display: "flex", alignItems: "center", gap: 4,
        padding: "4px 6px", borderRadius: 6, opacity: loading ? 0.5 : 1,
        transition: "color 0.15s",
        ...style,
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.color = C.accentSoft; }}
      onMouseLeave={e => { e.currentTarget.style.color = C.textDim; }}>
      {loading ? (
        <span style={{ fontSize: 11 }}>...</span>
      ) : (
        <ShareIcon size={15} />
      )}
    </button>
  );
}

// Share a review
export function ShareReviewButton({ review, style = {} }) {
  const [loading, setLoading] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const params = new URLSearchParams({
        game: review.games?.name || review.game_name || "",
        rating: review.rating || "",
        loved: review.loved || "",
        didnt_love: review.didnt_love || "",
        handle: review.profiles?.handle ? `@${review.profiles.handle}` : `@${review.profiles?.username || ""}`,
        cover: review.games?.cover_url || "",
      });
      await downloadImage(`/api/share-review?${params}`, `guildlink-review.png`);
    } catch (err) {
      console.error("Share failed:", err);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      title="Share this review"
      style={{
        background: C.surfaceRaised, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "6px 12px", cursor: loading ? "default" : "pointer",
        color: C.textMuted, fontSize: 12, fontWeight: 600,
        display: "flex", alignItems: "center", gap: 6,
        opacity: loading ? 0.5 : 1, transition: "all 0.15s",
        ...style,
      }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = C.accentDim; e.currentTarget.style.color = C.accentSoft; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
      <ShareIcon size={13} />
      {loading ? "Generating..." : "Share"}
    </button>
  );
}

// Share the charts
export function ShareChartsButton({ games, style = {} }) {
  const [loading, setLoading] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const today = new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
      const params = new URLSearchParams({
        games: JSON.stringify(games.slice(0, 10).map(g => ({
          name: g.name,
          change: g.change ?? 0,
        }))),
        date: today,
      });
      await downloadImage(`/api/share-charts?${params}`, `guildlink-charts.png`);
    } catch (err) {
      console.error("Share failed:", err);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      title="Share the charts"
      style={{
        background: "none", border: "none", cursor: loading ? "default" : "pointer",
        color: C.textDim, display: "flex", alignItems: "center", gap: 6,
        padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600,
        opacity: loading ? 0.5 : 1, transition: "color 0.15s",
        ...style,
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.color = C.accentSoft; }}
      onMouseLeave={e => { e.currentTarget.style.color = C.textDim; }}>
      <ShareIcon size={14} />
      {loading ? "Generating..." : "Share Charts"}
    </button>
  );
}

// Shared download helper
async function downloadImage(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image generation failed: ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export default { SharePostButton, ShareReviewButton, ShareChartsButton };
