import React from "react";
import { C } from "../constants.js";
import { PixelCornerBox } from "./PixelCornerBox.jsx";
import { PixelButton } from "./PixelButton.jsx";

function GuildCard({ guild, onJoin, isMember, isRequested, onCancelRequest, memberCount, onClick }) {
  const isPlatform = !!guild.is_platform_guild;
  const borderColor = isPlatform ? C.accent : C.border;
  const bgStyle = isPlatform
    ? "color-mix(in srgb, " + C.accent + " 6%, " + C.bg + ")"
    : null;

  return (
    <PixelCornerBox
      size="lg"
      borderColor={borderColor}
      bg={bgStyle ? null : C.surface}
      bgStyle={bgStyle}
      style={{ padding: "14px 16px", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}
      onClick={onClick}>

      {/* Platform badge */}
      {isPlatform && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ background: "color-mix(in srgb, " + C.accent + " 12%, " + C.bg + ")", border: "1px solid " + C.accentDim, color: C.accentSoft, fontSize: 9, fontWeight: 700, borderRadius: 2, padding: "2px 7px", letterSpacing: "0.5px", textTransform: "uppercase" }}>GuildLink Guild</span>
        </div>
      )}

      {/* Name */}
      <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 6, lineHeight: 1.3 }}>
        {guild.name}
      </div>

      {/* Description */}
      {guild.description ? (
        <div style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5, marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", flex: 1 }}>
          {guild.description}
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {/* Badges */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ background: C.surfaceRaised, border: "1px solid " + C.border, color: C.textDim, fontSize: 10, fontWeight: 600, borderRadius: 2, padding: "2px 7px" }}>
          {guild.is_public ? "Public" : "Private"}
        </span>
        {guild.looking_for_members && (
          <span style={{ background: "#22c55e22", border: "1px solid #22c55e44", color: "#22c55e", fontSize: 10, fontWeight: 700, borderRadius: 2, padding: "2px 7px" }}>LFM</span>
        )}
        {guild.discord_url && (
          <a href={guild.discord_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ background: "#5865f222", border: "1px solid #5865f244", color: "#5865f2", fontSize: 10, fontWeight: 600, borderRadius: 2, padding: "2px 7px", textDecoration: "none" }}>Discord</a>
        )}
      </div>

      {/* Member count */}
      <div style={{ color: C.accentSoft, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
        {memberCount} {memberCount === 1 ? "member" : "members"}
      </div>

      {/* Join button */}
      {!isMember && (
        <div style={{ padding: "1px 0" }}>
          <PixelButton
            fullWidth
            size="sm"
            onClick={e => { e.stopPropagation(); if (!isRequested) onJoin && onJoin(); }}
            bg={isRequested ? C.gold + "22" : C.accent}
            borderColor={isRequested ? C.gold + "55" : C.accent}>
            <span style={{ color: isRequested ? C.gold : "#fff", fontWeight: 700 }}>
              {isRequested ? "Pending" : guild.is_public ? "+ Join" : "+ Request to Join"}
            </span>
          </PixelButton>
        </div>
      )}

      {isRequested && onCancelRequest && (
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <span onClick={e => { e.stopPropagation(); onCancelRequest(); }}
            style={{ color: C.textDim, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
            Cancel request
          </span>
        </div>
      )}

      {isMember && (
        <div style={{ padding: "1px 0" }}>
          <PixelButton fullWidth size="sm" bg={C.surfaceRaised} borderColor={C.border}>
            <span style={{ color: C.textDim, fontWeight: 700 }}>View Guild</span>
          </PixelButton>
        </div>
      )}
    </PixelCornerBox>
  );
}

export default GuildCard;
