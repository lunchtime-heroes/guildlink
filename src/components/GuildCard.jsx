import React from "react";
import { C } from "../constants.js";
import { PixelCornerBox } from "./PixelCornerBox.jsx";
import { PixelButton } from "./PixelButton.jsx";

function GuildCard({ guild, onJoin, isMember, isRequested, onCancelRequest, memberCount }) {
  const isPlatform = !!guild.is_platform_guild;
  const borderColor = isPlatform ? C.accent : C.border;
  const bgStyle = isPlatform
    ? "color-mix(in srgb, " + C.accent + " 6%, " + C.bg + ")"
    : null;

  const joinLabel = isMember ? "Joined" : isRequested ? "Pending" : guild.is_public ? "Join" : "Request to Join";
  const joinBg = isMember ? C.surfaceRaised : isRequested ? C.gold + "22" : C.accent;
  const joinBorder = isMember ? C.border : isRequested ? C.gold + "55" : C.accent;
  const joinColor = isMember ? C.textDim : isRequested ? C.gold : "#fff";

  return (
    <PixelCornerBox
      size="lg"
      borderColor={borderColor}
      bg={bgStyle ? null : C.surface}
      bgStyle={bgStyle}
      style={{ padding: 20, display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Platform badge */}
      {isPlatform && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ background: "color-mix(in srgb, " + C.accent + " 12%, " + C.bg + ")", border: "1px solid " + C.accentDim, color: C.accentSoft, fontSize: 10, fontWeight: 700, borderRadius: 2, padding: "2px 8px", letterSpacing: "0.5px", textTransform: "uppercase" }}>GuildLink Guild</span>
        </div>
      )}

      {/* Name */}
      <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 8, lineHeight: 1.2 }}>{guild.name}</div>

      {/* Description */}
      {guild.description && (
        <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 12, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", flex: 1 }}>
          {guild.description}
        </div>
      )}

      {/* Tags row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        {guild.looking_for_members && (
          <span style={{ background: "#22c55e22", border: "1px solid #22c55e44", color: "#22c55e", fontSize: 11, fontWeight: 700, borderRadius: 2, padding: "3px 8px" }}>LFM</span>
        )}
        <span style={{ background: C.surfaceRaised, border: "1px solid " + C.border, color: C.textDim, fontSize: 11, fontWeight: 600, borderRadius: 2, padding: "3px 8px" }}>
          {guild.is_public ? "Public" : "Private"}
        </span>
        {guild.discord_url && (
          <a href={guild.discord_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ background: "#5865f222", border: "1px solid #5865f244", color: "#5865f2", fontSize: 11, fontWeight: 600, borderRadius: 2, padding: "3px 8px", textDecoration: "none" }}>Discord</a>
        )}
        {guild.website_url && (
          <a href={guild.website_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, color: C.accentSoft, fontSize: 11, fontWeight: 600, borderRadius: 2, padding: "3px 8px", textDecoration: "none" }}>Website</a>
        )}
      </div>

      {/* Member count */}
      <div style={{ color: C.textDim, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
        {memberCount} {memberCount === 1 ? "member" : "members"}
      </div>

      {/* Join button */}
      <div style={{ padding: "1px 0" }}>
        <PixelButton
          fullWidth
          onClick={isMember || isRequested ? undefined : onJoin}
          bg={joinBg}
          borderColor={joinBorder}
          size="sm">
          <span style={{ color: joinColor, fontWeight: 700 }}>{joinLabel}</span>
        </PixelButton>
      </div>

      {/* Cancel request */}
      {isRequested && onCancelRequest && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <span onClick={onCancelRequest}
            style={{ color: C.textDim, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
            Cancel request
          </span>
        </div>
      )}
    </PixelCornerBox>
  );
}

export default GuildCard;
