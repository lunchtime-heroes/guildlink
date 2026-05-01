// src/components/ShareButton.jsx
import React, { useState } from "react";
import { C } from "../constants.js";

function ShareIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function ShareLightbox({ imageUrl, filename, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 560, width: "100%" }}>
        <img src={imageUrl} alt="Share preview" style={{ width: "100%", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }} />
        <div style={{ display: "flex", gap: 12 }}>
          <a href={imageUrl} download={filename} style={{ background: "#fbae17", border: "none", borderRadius: 10, padding: "12px 28px", color: "#0d1424", fontSize: 15, fontWeight: 800, cursor: "pointer", textDecoration: "none" }}>
            ↓ Download
          </a>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "12px 20px", color: "rgba(255,255,255,0.7)", fontSize: 15, cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

async function fetchShareImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// Normalize handle — always exactly one @
function normalizeHandle(raw) {
  if (!raw) return "";
  const stripped = raw.replace(/^@+/, "");
  return stripped ? `@${stripped}` : "";
}

export function SharePostButton({ post, currentUser, taggedGameName, style = {} }) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  // Use post author's handle
  const handle = normalizeHandle(
    post.user?.handle || post.profiles?.handle || post.profiles?.username || post.user?.username || ""
  );

  const handleShare = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const params = new URLSearchParams({
        content: post.content || "",
        handle,
        game: taggedGameName || "",
      });
      const url = await fetchShareImage(`/api/share-post?${params}`);
      setImageUrl(url);
    } catch (err) {
      console.error("Share failed:", err);
    }
    setLoading(false);
  };

  return (
    <>
      <button onClick={handleShare} disabled={loading} title="Share this post"
        style={{ background: "none", border: "none", cursor: loading ? "default" : "pointer", color: C.textDim, display: "flex", alignItems: "center", padding: "4px 6px", borderRadius: 6, opacity: loading ? 0.5 : 1, transition: "color 0.15s", ...style }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.color = C.accentSoft; }}
        onMouseLeave={e => { e.currentTarget.style.color = C.textDim; }}>
        {loading ? <span style={{ fontSize: 11 }}>...</span> : <ShareIcon size={15} />}
      </button>
      {imageUrl && <ShareLightbox imageUrl={imageUrl} filename="guildlink-post.png" onClose={() => { URL.revokeObjectURL(imageUrl); setImageUrl(null); }} />}
    </>
  );
}

export function ShareReviewButton({ review, style = {} }) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  const handle = normalizeHandle(
    review.profiles?.handle || review.profiles?.username || ""
  );

  const handleShare = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const params = new URLSearchParams({
        game: review.games?.name || "",
        rating: review.rating || "",
        loved: review.loved || "",
        didnt_love: review.didnt_love || "",
        handle,
        cover: review.games?.cover_url || "",
      });
      const url = await fetchShareImage(`/api/share-review?${params}`);
      setImageUrl(url);
    } catch (err) {
      console.error("Share failed:", err);
    }
    setLoading(false);
  };

  return (
    <>
      <button onClick={handleShare} disabled={loading}
        style={{ background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", cursor: loading ? "default" : "pointer", color: C.textMuted, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.5 : 1, flexShrink: 0, ...style }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = C.accentDim; e.currentTarget.style.color = C.accentSoft; } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
        <ShareIcon size={13} />
        {loading ? "Generating..." : "Share"}
      </button>
      {imageUrl && <ShareLightbox imageUrl={imageUrl} filename="guildlink-review.png" onClose={() => { URL.revokeObjectURL(imageUrl); setImageUrl(null); }} />}
    </>
  );
}

export function ShareChartsButton({ games, style = {} }) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  const date = new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });

  const handleShare = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const params = new URLSearchParams({
        games: JSON.stringify(games.slice(0, 10).map(g => ({ name: g.name, change: g.change ?? 0 }))),
        date,
      });
      const url = await fetchShareImage(`/api/share-charts?${params}`);
      setImageUrl(url);
    } catch (err) {
      console.error("Share failed:", err);
    }
    setLoading(false);
  };

  return (
    <>
      <button onClick={handleShare} disabled={loading} title="Share the charts"
        style={{ background: "none", border: "none", cursor: loading ? "default" : "pointer", color: C.textDim, display: "flex", alignItems: "center", gap: 4, padding: "2px 6px", borderRadius: 6, opacity: loading ? 0.5 : 1, ...style }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.color = C.accentSoft; }}
        onMouseLeave={e => { e.currentTarget.style.color = C.textDim; }}>
        {loading ? <span style={{ fontSize: 10 }}>...</span> : <ShareIcon size={13} />}
      </button>
      {imageUrl && <ShareLightbox imageUrl={imageUrl} filename="guildlink-charts.png" onClose={() => { URL.revokeObjectURL(imageUrl); setImageUrl(null); }} />}
    </>
  );
}
