import React from "react";
import { C } from "../constants.js";

function GuildCard({ guild, onJoin, isMember, isRequested, onCancelRequest }) {
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
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
          <button
            onClick={isMember || isRequested ? undefined : onJoin}
            disabled={isMember || isRequested}
            style={{ background: isMember ? C.surfaceRaised : isRequested ? C.gold + "22" : C.accent, border: isRequested ? "1px solid " + C.gold + "55" : "none", borderRadius: 8, padding: "8px 18px", color: isMember ? C.textDim : isRequested ? C.gold : "#fff", fontSize: 13, fontWeight: 700, cursor: isMember || isRequested ? "default" : "pointer" }}>
            {isMember ? "Joined" : isRequested ? "Pending" : guild.is_public ? "Join" : "Request to Join"}
          </button>
          {isRequested && onCancelRequest && (
            <button onClick={onCancelRequest}
              style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
              Cancel request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuildCard;
