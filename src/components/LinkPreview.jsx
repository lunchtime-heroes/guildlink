import React, { useState, useEffect } from "react";
import { C } from "../constants.js";

function LinkPreviewFetcher({ url, onExit }) {
  const [preview, setPreview] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/link-preview", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).then(r => r.json()).then(data => {
      if (!cancelled && data.allowed) setPreview(data);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);
  if (loading || !preview) return null;
  return <LinkPreviewCard preview={preview} onExit={onExit} />;
}

function decodeHtml(str) {
  if (!str) return str;
  return str.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ");
}

function LinkPreviewCard({ preview, onExit }) {
  if (!preview?.url) return null;
  return (
    <div onClick={e => { e.stopPropagation(); onExit(preview.url); }}
      style={{ marginTop: 10, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden", display: "flex", cursor: "pointer", textDecoration: "none" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.accentDim}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
      {preview.image && <img src={preview.image} alt="" style={{ width: 80, objectFit: "cover", flexShrink: 0 }} onError={e => e.target.style.display = "none"} />}
      <div style={{ padding: "10px 12px", flex: 1, minWidth: 0 }}>
        <div style={{ color: C.textDim, fontSize: 10, marginBottom: 2 }}>{preview.domain} ↗</div>
        <div style={{ fontWeight: 700, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{decodeHtml(preview.title) || preview.url}</div>
        {preview.description && <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{decodeHtml(preview.description)}</div>}
      </div>
    </div>
  );
}

function ExitModal({ url, onClose }) {
  if (!url) return null;
  let domain;
  try { domain = new URL(url).hostname; } catch { domain = url; }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
        <div style={{ fontWeight: 800, color: C.text, fontSize: 16, marginBottom: 8 }}>Leaving GuildLink</div>
        <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 6 }}>You're about to visit:</div>
        <div style={{ color: C.accentSoft, fontSize: 12, fontWeight: 600, marginBottom: 20, wordBreak: "break-all" }}>{domain}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onClose} style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 20px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { window.open(url, "_blank", "noopener,noreferrer"); onClose(); }}
            style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Continue →</button>
        </div>
      </div>
    </div>
  );
}

export { LinkPreviewFetcher, ExitModal, LinkPreviewCard };
