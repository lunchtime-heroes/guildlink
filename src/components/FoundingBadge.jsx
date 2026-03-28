import React from "react";
import { C } from "../constants.js";

function FoundingBadge() {
  return (
    <span style={{
      background: C.goldGlow, color: C.gold,
      border: "1px solid " + C.goldBorder,
      borderRadius: 5, padding: "2px 7px",
      fontSize: 10, fontWeight: 800, letterSpacing: "0.5px",
      whiteSpace: "nowrap",
    }}>F</span>
  );
}

function NPCBadge() {
  return (
    <span style={{
      background: C.goldGlow, color: C.gold,
      border: "1px solid " + C.goldBorder,
      borderRadius: 5, padding: "2px 7px",
      fontSize: 10, fontWeight: 800, letterSpacing: "0.5px",
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>⚙ NPC</span>
  );
}

function Badge({ children, color = C.accent, small }) {
  return (
    <span style={{
      background: color + "18", color, border: "1px solid " + color + "33",
      borderRadius: 6, padding: small ? "2px 7px" : "4px 10px",
      fontSize: small ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

export { FoundingBadge, NPCBadge, Badge };
