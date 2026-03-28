import React, { useState } from "react";
import { C, AVATAR_SKIN_TONES, AVATAR_HAIR_COLORS, AVATAR_BG_COLORS, AVATAR_CLASS_COLORS, AVATAR_CLASS_ICONS, AVATAR_TORSO_COLORS } from "../constants.js";
import supabase from "../supabase.js";
import { renderAvatarSVG, AvatarPixel } from "../components/Avatar.jsx";

function AvatarBuilderModal({ currentUser, userRewards, onSave, onClose }) {
  const DEFAULT_CONFIG = { skin: "s1", hairStyle: "short", hairColor: "darkbrown", eyes: "normal", bg: "navy", classType: "warrior", accessory: "none", torso: "hoodie", weather: "none" };
  const [cfg, setCfg] = React.useState(() => ({ ...DEFAULT_CONFIG, ...(currentUser?.avatarConfig || {}), weather: "none" }));
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("face");
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  const unlockedAccessories = new Set(["none","glasses","sunglasses","cap","headband","beanie","eyepatch",...(userRewards||[]).map(r => r.reward_id)]);
  const unlockedWeather = new Set(["none","snow","rain",...(userRewards||[]).map(r => r.reward_id)]);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ avatar_config: cfg }).eq("id", user.id);
    onSave?.(cfg);
    setSaving(false);
    onClose();
  };

  const tabs = [
    { id: "face", label: "Face" },
    { id: "hair", label: "Hair" },
    { id: "outfit", label: "Outfit" },
    { id: "background", label: "Background" },
  ];

  const Swatch = ({ value, current, onClick, color, label, locked }) => (
    <button onClick={locked ? undefined : onClick}
      title={label}
      style={{ width: 36, height: 36, borderRadius: 8, background: color || C.surfaceRaised, border: "2px solid " + (value === current ? C.accent : C.border), cursor: locked ? "not-allowed" : "pointer", position: "relative", opacity: locked ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.text, fontWeight: 600, overflow: "hidden" }}>
      {label && !color && <span style={{ fontSize: 9, textAlign: "center", lineHeight: 1.2 }}>{label}</span>}
      {locked && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔒</span>}
    </button>
  );

  const OptionGrid = ({ children }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>;
  const Label = ({ children }) => <div style={{ color: C.textDim, fontSize: 11, fontWeight: 700, marginBottom: 6, marginTop: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</div>;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, border: "1px solid " + C.border, borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18 }}>Character Builder</div>
            <div style={{ color: C.textDim, fontSize: 12 }}>Design your pixel art character</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {/* Preview */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "20px 0 16px", background: C.surface, borderBottom: "1px solid " + C.border }}>
          <AvatarPixel config={cfg} size={96} ring={currentUser?.activeRing} founding={currentUser?.isFounding} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid " + C.border, background: C.surface }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: "2px solid " + (activeTab === t.id ? C.accent : "transparent"), color: activeTab === t.id ? C.accentSoft : C.textDim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Options panel */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 20px" }}>

          {activeTab === "face" && <>
            <Label>Skin Tone</Label>
            <OptionGrid>
              {Object.entries(AVATAR_SKIN_TONES).map(([k, v]) => (
                <Swatch key={k} value={k} current={cfg.skin} onClick={() => set("skin", k)} color={v.skin} label={k} />
              ))}
            </OptionGrid>
            <Label>Eyes</Label>
            <OptionGrid>
              {["normal","determined","sleepy","wide","stern","friendly"].map(e => (
                <button key={e} onClick={() => set("eyes", e)}
                  style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid " + (cfg.eyes === e ? C.accent : C.border), background: cfg.eyes === e ? C.accentGlow : C.surfaceRaised, color: cfg.eyes === e ? C.accentSoft : C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                  {e}
                </button>
              ))}
            </OptionGrid>
          </>}

          {activeTab === "hair" && <>
            <Label>Hair Style</Label>
            <OptionGrid>
              {["short","spiky","long","bun","bald"].map(h => (
                <button key={h} onClick={() => set("hairStyle", h)}
                  style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid " + (cfg.hairStyle === h ? C.accent : C.border), background: cfg.hairStyle === h ? C.accentGlow : C.surfaceRaised, color: cfg.hairStyle === h ? C.accentSoft : C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                  {h}
                </button>
              ))}
            </OptionGrid>
            <Label>Hair Color</Label>
            <OptionGrid>
              {Object.entries(AVATAR_HAIR_COLORS).map(([k, v]) => (
                <Swatch key={k} value={k} current={cfg.hairColor} onClick={() => set("hairColor", k)} color={v} label={k} />
              ))}
            </OptionGrid>
          </>}

          {activeTab === "outfit" && <>
            <Label>Torso</Label>
            <OptionGrid>
              {["hoodie","tee","armor","robe"].map(t => (
                <button key={t} onClick={() => set("torso", t)}
                  style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid " + (cfg.torso === t ? C.accent : C.border), background: cfg.torso === t ? C.accentGlow : C.surfaceRaised, color: cfg.torso === t ? C.accentSoft : C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                  {t}
                </button>
              ))}
            </OptionGrid>
            <Label>Accessory</Label>
            <OptionGrid>
              {["none","glasses","sunglasses","cap","headband","beanie"].map(a => (
                <button key={a} onClick={() => set("accessory", a)}
                  style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid " + (cfg.accessory === a ? C.accent : C.border), background: cfg.accessory === a ? C.accentGlow : C.surfaceRaised, color: cfg.accessory === a ? C.accentSoft : C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                  {a}
                </button>
              ))}
            </OptionGrid>
          </>}

          {activeTab === "background" && <>
            <Label>Background</Label>
            <OptionGrid>
              {Object.keys(AVATAR_BG_COLORS).map(k => {
                const v = AVATAR_BG_COLORS[k];
                const bg = Array.isArray(v) ? `linear-gradient(to bottom, ${v[0]}, ${v[1]})` : v;
                return <Swatch key={k} value={k} current={cfg.bg} onClick={() => set("bg", k)} color={bg} label={k} />;
              })}
            </OptionGrid>
          </>}

        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid " + C.border, display: "flex", gap: 10, justifyContent: "flex-end" }}>
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
