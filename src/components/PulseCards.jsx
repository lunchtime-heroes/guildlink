import React, { useState } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { Avatar } from "./Avatar.jsx";

function ShelfPulseCard({ card, setCurrentGame, setActivePage, currentUser, onAddToShelf }) {
  const accentColor = card.ctaStatus === "playing" ? C.accent : card.ctaStatus === "want_to_play" ? C.gold : card.ctaStatus === "have_played" ? C.teal : C.accentSoft;

  const handleCta = async () => {
    // Track pulse CTA click
    if (currentUser?.id) {
      try {
        await supabase.from("chart_events").insert({
          game_id: card.game.id,
          user_id: null,
          event_type: "pulse_cta",
          date: new Date().toISOString().slice(0, 10),
          week_start: new Date(Date.now() - new Date().getDay() * 86400000).toISOString().slice(0, 10),
        });
      } catch { /* non-fatal */ }
    }
    setCurrentGame(card.game.id); setActivePage("game");
  };

  return (
    <div style={{ background: C.surface, border: "1px solid " + (card.hasFollow ? C.accentDim : C.border), borderRadius: 14, marginBottom: 12, overflow: "hidden", display: "flex", alignItems: "stretch" }}>
      {card.game.cover_url && (
        <div onClick={() => { setCurrentGame(card.game.id); setActivePage("game"); }}
          style={{ width: 48, flexShrink: 0, cursor: "pointer", overflow: "hidden" }}>
          <img src={card.game.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 64 }} />
        </div>
      )}
      <div style={{ flex: 1, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {card.hasFollow && <span style={{ color: accentColor, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 2 }}>● From your network</span>}
          <div style={{ color: C.text, fontSize: 13, lineHeight: 1.4 }}>{card.text}</div>
        </div>
        <button onClick={handleCta}
          style={{ background: accentColor + "18", border: "1px solid " + accentColor + "44", borderRadius: 8, padding: "6px 10px", color: accentColor, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
          {card.cta}
        </button>
      </div>
    </div>
  );
}

function ReviewSpotlightCard({ card, setCurrentGame, setCurrentPlayer, setActivePage, onExit }) {
  const preview = card.review.content
    ? card.review.content.slice(0, 140) + (card.review.content.length > 140 ? "…" : "")
    : card.review.headline || null;
  const initials = (card.profile?.avatar_initials || card.profile?.username || "?").slice(0,2).toUpperCase();

  return (
    <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {/* Game cover */}
        {card.game.cover_url && (
          <div onClick={() => { setCurrentGame(card.game.id); setActivePage("game"); }}
            style={{ width: 56, flexShrink: 0, cursor: "pointer", overflow: "hidden" }}>
            <img src={card.game.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 80 }} />
          </div>
        )}
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, padding: "12px 14px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div onClick={() => { if (card.profile?.id) { setCurrentPlayer(card.review.user_id); setActivePage("player"); } }} style={{ cursor: "pointer", flexShrink: 0 }}>
              <Avatar initials={initials} size={20} founding={card.profile?.is_founding} ring={card.profile?.active_ring} avatarConfig={card.profile?.avatar_config} />
            </div>
            <span onClick={() => { setCurrentPlayer(card.review.user_id); setActivePage("player"); }}
              style={{ fontWeight: 600, color: C.textMuted, fontSize: 12, cursor: "pointer" }}>
              {card.profile?.username || "Guildies Member"}
            </span>
            <span style={{ color: C.textDim, fontSize: 11 }}>reviewed</span>
            <span onClick={() => { setCurrentGame(card.game.id); setActivePage("game"); }}
              style={{ fontWeight: 700, color: C.accentSoft, fontSize: 12, cursor: "pointer", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {card.game.name}
            </span>
            <div style={{ background: C.goldDim, border: "1px solid " + C.gold + "44", borderRadius: 6, padding: "2px 8px", color: C.gold, fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
              {card.review.rating}/10
            </div>
          </div>
          {/* Headline */}
          {card.review.headline && (
            <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 4 }}>{card.review.headline}</div>
          )}
          {/* Preview text */}
          {preview && !card.review.headline && (
            <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>{preview}</div>
          )}
          {preview && card.review.headline && (
            <div style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5 }}>{preview}</div>
          )}
        </div>
      </div>
      {/* Read more */}
      <div style={{ borderTop: "1px solid " + C.border, padding: "8px 14px" }}>
        <button onClick={() => { setCurrentGame(card.game.id); setActivePage("game"); }}
          style={{ background: "none", border: "none", color: C.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          Read full review →
        </button>
      </div>
    </div>
  );
}

export { ShelfPulseCard, ReviewSpotlightCard };
