import React, { useState } from "react";
import { C, AVATAR_SKIN_TONES, AVATAR_BG_COLORS } from "../constants.js";
import { ITEM_COLORS, DEFAULT_AVATAR_CONFIG } from "../components/Avatar.jsx";
import supabase from "../supabase.js";
import { AvatarPixel } from "../components/Avatar.jsx";

function AvatarBuilderModal({ currentUser, userRewards, onSave, onClose }) {
  const [cfg, setCfg] = React.useState(() => ({ ...DEFAULT_AVATAR_CONFIG, ...(currentUser?.avatarConfig || {}) }));
  const [saving, setSaving] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState("body");
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ avatar_config: cfg }).eq("id", user.id);
    onSave?.(cfg);
    setSaving(false);
    onClose();
  };

  const categories = [
    { id: "body",       label: "Body" },
    { id: "eyecolor",  label: "Eye Color" },
    { id: "hair",       label: "Hair" },
    { id: "glasses",    label: "Glasses" },
    { id: "hats",       label: "Hats" },
    { id: "shirt",      label: "Shirt" },
    { id: "background", label: "Background" },
  ];

  const ColorSwatch = ({ value, current, onClick, color }) => (
    <button onClick={onClick} title={value}
      style={{ width: 44, height: 44, borderRadius: 10, background: color, border: "3px solid " + (value === current ? "#fff" : "transparent"), cursor: "pointer", flexShrink: 0, transition: "border-color 0.15s" }} />
  );

  const StylePill = ({ value, current, onClick, label }) => (
    <button onClick={onClick}
      style={{ padding: "7px 18px", borderRadius: 20, border: "1px solid " + (value === current ? C.accent : C.border), background: value === current ? C.accentGlow : C.surfaceRaised, color: value === current ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: value === current ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}>
      {label}
    </button>
  );

  const skinTones = {
    s1: "#FDDBB4", s2: "#F5C5A3", s3: "#D4956A",
    s4: "#C68642", s5: "#8D5524", s6: "#4A2511",
  };

  const styleOptions = {
    hair:    ["short", "medium", "long", "none"],
    glasses: ["none", "glasses"],
    hats:    ["none", "beanie", "magician"],
  };

  const styleKey = { hair: "hair", glasses: "glasses", hats: "hat" };
  const colorKey = {
    eyecolor: "eyeColor",
    hair:     "hairColor",
    glasses:  "glassesColor",
    hats:     "hatColor",
    shirt:    "shirtColor",
  };

  const hasStyles  = ["hair", "glasses", "hats"].includes(activeCategory);
  const hasColors  = ["eyecolor", "hair", "glasses", "hats", "shirt"].includes(activeCategory);
  const hasSkins   = activeCategory === "body";
  const hasBg      = activeCategory === "background";

  // Hide color swatches for glasses/hats when "none" is selected
  const showColors = hasColors &&
    !(activeCategory === "glasses" && cfg.glasses === "none") &&
    !(activeCategory === "hats" && cfg.hat === "none");

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, border: "1px solid " + C.border, borderRadius: 20, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, color: C.text, fontSize: 17 }}>Character Builder</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Main layout: left nav + right panel */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* Left nav */}
          <div style={{ width: 130, borderRight: "1px solid " + C.border, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                style={{ padding: "14px 16px", background: activeCategory === cat.id ? C.accentGlow : "transparent", border: "none", borderLeft: "3px solid " + (activeCategory === cat.id ? C.accent : "transparent"), color: activeCategory === cat.id ? C.accentSoft : C.textMuted, fontSize: 14, fontWeight: activeCategory === cat.id ? 700 : 500, cursor: "pointer", textAlign: "left", transition: "all 0.15s", flexShrink: 0 }}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

            {/* Character preview */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 20px 20px", background: C.surface, flexShrink: 0 }}>
              <AvatarPixel config={cfg} size={160} ring={currentUser?.activeRing} founding={currentUser?.isFounding} />
            </div>

            {/* Style pills */}
            {(hasStyles || hasSkins) && (
              <div style={{ padding: "14px 20px 10px", borderTop: "1px solid " + C.border, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {hasSkins && (
                    <>
                      <StylePill value="build1" current={cfg.build} onClick={() => set("build", "build1")} label="Build 1" />
                      <StylePill value="build2" current={cfg.build} onClick={() => set("build", "build2")} label="Build 2" />
                    </>
                  )}
                  {hasStyles && (styleOptions[activeCategory] || []).map(opt => (
                    <StylePill key={opt} value={opt} current={cfg[styleKey[activeCategory]]} onClick={() => set(styleKey[activeCategory], opt)} label={opt.charAt(0).toUpperCase() + opt.slice(1)} />
                  ))}
                </div>
              </div>
            )}

            {/* Color swatches */}
            {(hasSkins || showColors || hasBg) && (
              <div style={{ padding: "12px 20px 20px", borderTop: "1px solid " + C.border, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  {hasSkins && Object.entries(skinTones).map(([k, v]) => (
                    <ColorSwatch key={k} value={k} current={cfg.skin} onClick={() => set("skin", k)} color={v} />
                  ))}
                  {showColors && Object.entries(ITEM_COLORS).map(([k, v]) => (
                    <ColorSwatch key={k} value={k} current={cfg[colorKey[activeCategory]]} onClick={() => set(colorKey[activeCategory], k)} color={v} />
                  ))}
                  {hasBg && Object.entries(AVATAR_BG_COLORS).map(([k, v]) => {
                    const bg = Array.isArray(v) ? "linear-gradient(to bottom, " + v[0] + ", " + v[1] + ")" : v;
                    return <ColorSwatch key={k} value={k} current={cfg.bg} onClick={() => set("bg", k)} color={bg} />;
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid " + C.border, display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 20px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 24px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Saving…" : "Save Character"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarBuilderModal;
