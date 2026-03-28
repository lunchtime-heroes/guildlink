import React from "react";
import { C } from "../constants.js";

function GuildCard({ guild, onJoin, isMember }) {
  return (
    <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>{guild.name}</div>
          {guild.description && (
            <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5, marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {guild.description}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {guild.looking_for_members && (
              <span style={{ background: "#22c55e22", border: "1px solid #22c55e44", color: "#22c55e", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 8px" }}>LFM</span>
            )}
            <span style={{ background: C.surfaceRaised, border: "1px solid " + C.border, color: C.textDim, fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "3px 8px" }}>
              {guild.is_public ? "Public" : "Private"}
            </span>
            {guild.discord_url && (
              <a href={guild.discord_url} target="_blank" rel="noopener noreferrer" style={{ color: "#5865f2", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Discord</a>
            )}
            {guild.website_url && (
              <a href={guild.website_url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Website</a>
            )}
          </div>
        </div>
        <button
          onClick={isMember ? undefined : onJoin}
          disabled={isMember}
          style={{ background: isMember ? C.surfaceRaised : C.accent, border: "none", borderRadius: 8, padding: "8px 18px", color: isMember ? C.textDim : "#fff", fontSize: 13, fontWeight: 700, cursor: isMember ? "default" : "pointer", flexShrink: 0 }}>
          {isMember ? "Joined" : guild.is_public ? "Join" : "Request to Join"}
        </button>
      </div>
    </div>
  );
}

export default GuildCard;
