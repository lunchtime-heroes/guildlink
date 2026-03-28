import React from "react";
import { C, PROFILE_RINGS, AVATAR_SKIN_TONES, AVATAR_HAIR_COLORS, AVATAR_BG_COLORS, AVATAR_CLASS_COLORS, AVATAR_CLASS_ICONS, AVATAR_TORSO_COLORS } from "../constants.js";

function renderAvatarSVG(config = {}, size = 40) {
  const {
    skin: skinKey = "s1", hairStyle = "short", hairColor: hairColorKey = "darkbrown",
    eyes: eyeStyle = "normal", bg: bgKey = "navy", classType = "warrior",
    accessory = "none", torso = "hoodie", weather = "none",
  } = config;

  // Always render on a 16x16 grid, scale via viewBox
  const s = 1;
  const W = 16; const H = 16;
  const skin = AVATAR_SKIN_TONES[skinKey] || AVATAR_SKIN_TONES.s1;
  const hairColor = AVATAR_HAIR_COLORS[hairColorKey] || AVATAR_HAIR_COLORS.darkbrown;
  const classColor = AVATAR_CLASS_COLORS[classType] || AVATAR_CLASS_COLORS.warrior;
  const bgDef = AVATAR_BG_COLORS[bgKey];
  const bgIsGrad = Array.isArray(bgDef);
  const bgId = "avbg" + bgKey + size;
  const tc = AVATAR_TORSO_COLORS[torso] || AVATAR_TORSO_COLORS.hoodie;

  const px = (x, y, color) => `<rect x="${x*s}" y="${y*s}" width="${s}" height="${s}" fill="${color}"/>`;
  const row = (xs, y, color) => xs.map(x => px(x, y, color)).join("");

  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">`;

  // Background
  if (bgIsGrad) {
    svg += `<defs><linearGradient id="${bgId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bgDef[0]}"/><stop offset="100%" stop-color="${bgDef[1]}"/></linearGradient></defs>`;
    svg += `<rect width="${W}" height="${H}" fill="url(#${bgId})"/>`;
  } else {
    svg += `<rect width="${W}" height="${H}" fill="${bgDef || "#0f1923"}"/>`;
  }

  // Class accent strip
  svg += `<rect x="0" y="${H-s}" width="${W}" height="${s}" fill="${classColor}" opacity="0.6"/>`;

  // Body/torso
  [[9,[5,6,7,8,9,10]],[10,[4,5,6,7,8,9,10,11]],[11,[4,5,6,7,8,9,10,11]],[12,[3,4,5,6,7,8,9,10,11,12]],[13,[3,4,5,6,7,8,9,10,11,12]],[14,[3,4,5,6,7,8,9,10,11,12]],[15,[3,4,5,6,7,8,9,10,11,12]]].forEach(([y,xs]) => svg += row(xs, y, tc.main));
  svg += px(4,9,tc.shadow)+px(11,9,tc.shadow)+row([7,8],10,tc.accent)+row([7,8],11,tc.accent);
  svg += row([3,2],10,tc.main)+row([12,13],10,tc.main)+row([2,3],11,tc.shadow)+row([12,13],11,tc.shadow)+px(2,12,tc.main)+px(13,12,tc.main)+px(2,13,skin.skin)+px(13,13,skin.skin);
  svg += row([7,8],8,skin.skin)+px(7,9,skin.shadow);

  // Face
  [[3,[5,6,7,8,9,10]],[4,[4,5,6,7,8,9,10,11]],[5,[4,5,6,7,8,9,10,11]],[6,[4,5,6,7,8,9,10,11]],[7,[5,6,7,8,9,10]]].forEach(([y,xs]) => svg += row(xs, y, skin.skin));
  svg += px(4,4,skin.shadow)+px(11,4,skin.shadow)+px(4,6,skin.shadow)+px(11,6,skin.shadow);

  // Eyes
  const eyeMap = {
    normal: () => { svg += px(6,5,"#1a1a1a")+px(9,5,"#1a1a1a")+px(6,4,"#ffffff44")+px(9,4,"#ffffff44"); },
    determined: () => { svg += row([5,6],5,"#1a1a1a")+row([9,10],5,"#1a1a1a")+px(5,4,"#1a1a1a")+px(10,4,"#1a1a1a"); },
    sleepy: () => { svg += px(6,5,"#1a1a1a")+px(9,5,"#1a1a1a")+row([5,6,7],5,skin.shadow)+row([8,9,10],5,skin.shadow); },
    wide: () => { svg += px(6,5,"#1a1a1a")+px(9,5,"#1a1a1a")+px(5,5,"#1a1a1a")+px(10,5,"#1a1a1a")+px(6,4,"#ffffff66")+px(9,4,"#ffffff66"); },
    stern: () => { svg += px(6,5,"#2a1a0a")+px(9,5,"#2a1a0a")+row([5,6,7],4,"#2a1a0a")+row([8,9,10],4,"#2a1a0a"); },
    sharp: () => { svg += px(6,5,"#1a1a3a")+px(9,5,"#1a1a3a")+px(7,4,"#1a1a3a")+px(8,4,"#1a1a3a"); },
    friendly: () => { svg += px(6,5,"#3a2a1a")+px(9,5,"#3a2a1a")+px(6,6,"#3a2a1a")+px(9,6,"#3a2a1a"); },
    soft: () => { svg += px(6,5,"#3a3a5a")+px(9,5,"#3a3a5a"); },
  };
  (eyeMap[eyeStyle] || eyeMap.normal)();

  // Mouth
  svg += row([7,8],7,skin.lip)+px(6,7,skin.shadow)+px(9,7,skin.shadow);

  // Hair
  const hairMap = {
    short: () => { svg += row([4,5,6,7,8,9,10,11],2,hairColor)+row([4,5,6,7,8,9,10,11],3,hairColor)+px(4,4,hairColor)+px(11,4,hairColor); },
    spiky: () => { svg += px(6,0,hairColor)+px(8,0,hairColor)+px(10,0,hairColor)+row([5,6,7,8,9,10],1,hairColor)+row([4,5,6,7,8,9,10,11],2,hairColor)+px(4,3,hairColor)+px(11,3,hairColor); },
    long: () => { svg += row([4,5,6,7,8,9,10,11],2,hairColor)+row([4,5,6,7,8,9,10,11],3,hairColor)+px(4,4,hairColor)+px(11,4,hairColor)+px(4,5,hairColor)+px(11,5,hairColor)+px(4,6,hairColor)+px(11,6,hairColor)+px(3,7,hairColor)+px(12,7,hairColor); },
    curly: () => { svg += row([5,6,7,8,9,10],1,hairColor)+row([4,5,6,7,8,9,10,11],2,hairColor)+px(3,3,hairColor)+px(12,3,hairColor)+px(3,4,hairColor)+px(12,4,hairColor)+px(4,5,hairColor)+px(11,5,hairColor); },
    bun: () => { svg += row([6,7,8,9],0,hairColor)+row([5,6,7,8,9,10],1,hairColor)+row([4,5,6,7,8,9,10,11],2,hairColor)+px(4,3,hairColor)+px(11,3,hairColor); },
    braids: () => { svg += row([4,5,6,7,8,9,10,11],2,hairColor)+row([4,5,6,7,8,9,10,11],3,hairColor)+px(4,4,hairColor)+px(11,4,hairColor)+px(4,5,hairColor)+px(11,5,hairColor)+px(3,6,hairColor)+px(12,6,hairColor)+px(3,7,hairColor)+px(12,7,hairColor)+px(3,8,hairColor)+px(12,8,hairColor); },
    mohawk: () => { svg += row([7,8],0,hairColor)+row([7,8],1,hairColor)+row([6,7,8,9],2,hairColor)+row([5,6,9,10],3,hairColor)+px(4,4,hairColor)+px(11,4,hairColor); },
    buzz: () => { svg += row([5,6,7,8,9,10],2,hairColor)+row([4,5,6,7,8,9,10,11],3,hairColor); },
    wavy: () => { svg += row([5,7,9,11],1,hairColor)+row([4,5,6,7,8,9,10,11],2,hairColor)+row([4,5,6,7,8,9,10,11],3,hairColor)+px(4,4,hairColor)+px(11,4,hairColor)+px(3,5,hairColor)+px(12,5,hairColor); },
    bald: () => { svg += row([6,7,8,9],2,skin.shadow); },
  };
  (hairMap[hairStyle] || hairMap.short)();

  // Accessories
  const accMap = {
    glasses: () => { svg += row([5,6,7],5,"#888888")+row([8,9,10],5,"#888888")+px(7,5,"#666666")+px(6,5,"#ffffff22")+px(9,5,"#ffffff22"); },
    sunglasses: () => { svg += row([5,6,7],5,"#111111")+row([8,9,10],5,"#111111")+px(7,5,"#333333")+px(4,5,"#111111")+px(11,5,"#111111"); },
    monocle: () => { svg += row([9,10],4,"#c0a060")+row([9,10],6,"#c0a060")+px(8,5,"#c0a060")+px(11,5,"#c0a060")+px(9,5,"#ffffff22"); },
    cap: () => { svg += row([4,5,6,7,8,9,10,11],2,classColor)+row([3,4,5,6,7,8,9,10,11,12],1,classColor); },
    wizardhat: () => { svg += px(8,-1,classColor)+row([7,8,9],0,classColor)+row([6,7,8,9,10],1,classColor)+row([4,5,6,7,8,9,10,11,12],2,classColor)+px(7,0,"#ffcc00")+px(10,1,"#ffcc00"); },
    crown: () => { svg += row([4,6,8,10,12],1,"#ffcc00")+row([4,5,6,7,8,9,10,11,12],2,"#ffcc00")+px(5,1,"#cc0000")+px(8,0,"#cc0000")+px(11,1,"#cc0000"); },
    headband: () => { svg += row([4,5,6,7,8,9,10,11],3,classColor); },
    beanie: () => { svg += row([4,5,6,7,8,9,10,11],1,"#4a7abf")+row([4,5,6,7,8,9,10,11],2,"#3a6aaf")+row([4,5,6,7,8,9,10,11],3,"#2a4a7f")+px(7,0,"#3a6aaf")+px(8,0,"#3a6aaf"); },
    eyepatch: () => { svg += row([5,6,7],4,"#1a1a1a")+row([5,6,7],5,"#1a1a1a")+row([4,5,6,7,8],5,"#333333"); },
    laurel: () => { svg += px(4,3,"#2d6a2d")+px(5,2,"#2d6a2d")+px(3,4,"#2d6a2d")+px(3,5,"#3d8a3d")+px(11,3,"#2d6a2d")+px(10,2,"#2d6a2d")+px(12,4,"#2d6a2d")+px(12,5,"#3d8a3d"); },
  };
  if (accMap[accessory]) accMap[accessory]();

  // Class icon
  svg += `<text x="${W-s*1.5}" y="${H-s*0.8}" font-size="${s*2}" text-anchor="middle" dominant-baseline="middle" fill="${classColor}" opacity="0.9">${AVATAR_CLASS_ICONS[classType]||"⚔"}</text>`;

  // Weather
  if (weather === "snow") {
    [[3,2],[8,1],[13,4],[5,7],[11,5],[2,10],[9,8],[14,11],[6,13],[12,3]].forEach(([x,y],i) => {
      svg += `<circle cx="${x*s}" cy="${y*s}" r="${s*0.4}" fill="white" opacity="0.8"><animate attributeName="cy" from="${-s}" to="${H+s}" dur="${2+i*0.3}s" repeatCount="indefinite" begin="${(-i*0.3).toFixed(1)}s"/></circle>`;
    });
  } else if (weather === "rain") {
    [[2,1],[5,3],[9,0],[13,2],[7,5],[11,4],[3,7],[14,6]].forEach(([x,y],i) => {
      svg += `<line x1="${x*s}" y1="${-s}" x2="${x*s}" y2="${s*2}" stroke="#88aacc" stroke-width="${s*0.3}" opacity="0.7"><animate attributeName="y1" from="${-s*2}" to="${H+s}" dur="${0.8+i*0.1}s" repeatCount="indefinite" begin="${(-i*0.1).toFixed(1)}s"/><animate attributeName="y2" from="${s*2}" to="${H+s*3}" dur="${0.8+i*0.1}s" repeatCount="indefinite" begin="${(-i*0.1).toFixed(1)}s"/></line>`;
    });
  } else if (weather === "sparkles") {
    [[2,2],[7,1],[13,3],[4,6],[11,5],[9,8],[6,13],[12,11]].forEach(([x,y],i) => {
      svg += `<text x="${x*s}" y="${y*s}" font-size="${s*2}" fill="#ffdd44" opacity="0" text-anchor="middle">✦<animate attributeName="opacity" values="0;1;0" dur="${1.5+i*0.2}s" repeatCount="indefinite" begin="${(-i*0.2).toFixed(1)}s"/></text>`;
    });
  } else if (weather === "stars") {
    [[1,1],[4,3],[8,0],[12,2],[15,4],[2,6],[11,7],[14,10],[3,12],[9,13]].forEach(([x,y],i) => {
      svg += `<circle cx="${x*s}" cy="${y*s}" r="${s*0.3}" fill="white"><animate attributeName="opacity" values="0.2;1;0.2" dur="${2+i*0.25}s" repeatCount="indefinite" begin="${(-i*0.25).toFixed(1)}s"/></circle>`;
    });
  } else if (weather === "confetti") {
    const cc = ["#ff3333","#33ff33","#3333ff","#ffff33","#ff33ff","#33ffff"];
    [[2,0],[6,1],[10,0],[14,2],[4,4],[8,3],[12,5],[3,7],[9,6],[13,8],[1,10],[7,9]].forEach(([x,y],i) => {
      svg += `<rect x="${x*s}" y="${y*s}" width="${s*0.8}" height="${s*0.8}" fill="${cc[i%cc.length]}" opacity="0.8"><animate attributeName="y" from="${-s}" to="${H+s}" dur="${2+i*0.15}s" repeatCount="indefinite" begin="${(-i*0.15).toFixed(1)}s"/></rect>`;
    });
  } else if (weather === "lightning") {
    svg += `<path d="M${9*s},${s} L${7*s},${7*s} L${9*s},${7*s} L${7*s},${14*s}" stroke="#ffdd00" stroke-width="${s*0.6}" fill="none" opacity="0"><animate attributeName="opacity" values="0;0;0;0.9;0;0;0;0.7;0;0" dur="4s" repeatCount="indefinite"/></path>`;
  } else if (weather === "leaves") {
    [[3,1],[10,0],[14,3],[5,5],[12,7]].forEach(([x,y],i) => {
      svg += `<text x="${x*s}" y="${y*s}" font-size="${s*2}" opacity="0.9"><animate attributeName="y" from="${-s}" to="${H+s}" dur="${3+i*0.4}s" repeatCount="indefinite" begin="${(-i*0.4).toFixed(1)}s"/>🍃</text>`;
    });
  }

  svg += `</svg>`;
  return svg;
}

function AvatarPixel({ config, size = 40, ring = null, founding = false, status = null }) {
  const svgStr = renderAvatarSVG(config, size);
  const statusColors = { online: C.online, away: C.gold, offline: C.textDim };
  const ringData = ring ? PROFILE_RINGS.find(r => r.id === ring) : null;
  const showFoundingRing = founding && !ring;
  const ringColor = ringData?.color || (showFoundingRing ? C.gold : null);
  const ringGlow = ringData?.glow || (showFoundingRing ? C.goldBorder : null);
  const hasRing = ringColor && ringColor !== "transparent";
  const isDouble = ringData?.double || showFoundingRing;
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flexShrink: 0 }}>
      {hasRing && <div style={{ position: "absolute", inset: -3, borderRadius: "16%", border: "3px solid " + ringColor, boxShadow: "0 0 " + size*0.3 + "px " + (ringGlow||ringColor+"44"), zIndex: 1, pointerEvents: "none" }} />}
      {hasRing && isDouble && <div style={{ position: "absolute", inset: -7, borderRadius: "16%", border: "2px solid " + ringColor + "88", zIndex: 1, pointerEvents: "none" }} />}
      <div style={{ width: size, height: size, borderRadius: "12%", overflow: "hidden", imageRendering: "pixelated", flexShrink: 0, display: "flex" }}
        dangerouslySetInnerHTML={{ __html: svgStr }} />
    </div>
  );
}

function Avatar({ initials, size = 40, status, isNPC = false, ring = null, founding = false, avatarConfig = null }) {
  if (avatarConfig && !isNPC) {
    return <AvatarPixel config={avatarConfig} size={size} ring={ring} founding={founding} status={status} />;
  }
  const statusColors = { online: C.online, away: C.gold, ingame: C.purple, offline: C.textDim };
  const ringData = ring ? PROFILE_RINGS.find(r => r.id === ring) : null;
  const showFoundingRing = founding && !ring;
  const ringColor = ringData?.color || (showFoundingRing ? C.gold : null);
  const ringGlow = ringData?.glow || (showFoundingRing ? C.goldBorder : null);
  const hasRing = ringColor && ringColor !== "transparent";
  const isDouble = ringData?.double || (showFoundingRing);

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flexShrink: 0 }}>
      {/* Ring — bleeds outward, never changes container size */}
      {hasRing && (
        <div style={{
          position: "absolute", inset: -3,
          borderRadius: "50%",
          border: `3px solid ${ringColor}`,
          boxShadow: `0 0 ${size * 0.3}px ${ringGlow || ringColor + "44"}, inset 0 0 ${size * 0.15}px ${ringGlow || ringColor + "22"}`,
          zIndex: 1, pointerEvents: "none",
        }} />
      )}
      {/* Double ring for founding members */}
      {hasRing && isDouble && (
        <div style={{
          position: "absolute", inset: -7,
          borderRadius: "50%",
          border: `2px solid ${ringColor}88`,
          zIndex: 1, pointerEvents: "none",
        }} />
      )}
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: isNPC
          ? `linear-gradient(135deg, #3d2e00, #7a5c00)`
          : `linear-gradient(135deg, ${C.accent}cc, ${C.accent}55)`,
        border: "2px solid " + isNPC ? C.gold + "66" : hasRing ? ringColor + "44" : C.accent + "55",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35, fontWeight: 700, color: isNPC ? C.gold : "#fff",
        letterSpacing: "-0.5px", position: "relative", zIndex: 0, flexShrink: 0,
      }}>{initials}</div>
    </div>
  );
}

export { Avatar, AvatarPixel, renderAvatarSVG };
