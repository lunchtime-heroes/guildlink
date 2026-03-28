export const THEMES = {
  "deep-space": {
    bg: "#080e1a", surface: "#0d1424", surfaceHover: "#111c30", surfaceRaised: "#162035",
    border: "#1e2d45", borderHover: "#2a3f5f",
    accent: "#0ea5e9", accentGlow: "#0ea5e922", accentSoft: "#38bdf8", accentDim: "#0ea5e944",
    accentText: "#ffffff",
    green: "#22c55e", gold: "#f59e0b", goldDim: "#f59e0b22", goldBorder: "#f59e0b33", goldGlow: "#f59e0b15",
    red: "#ef4444", teal: "#0d9488", purple: "#818cf8",
    text: "#e2e8f4", textMuted: "#7d90ad", textDim: "#3d5068", online: "#22c55e",
  },
  "light": {
    bg: "#f4f6fa", surface: "#ffffff", surfaceHover: "#eef1f7", surfaceRaised: "#e8ecf4",
    border: "#d1d9e6", borderHover: "#b0bcd4",
    accent: "#0284c7", accentGlow: "#0284c722", accentSoft: "#0369a1", accentDim: "#0284c744",
    accentText: "#ffffff",
    green: "#16a34a", gold: "#d97706", goldDim: "#d9770622", goldBorder: "#d9770633", goldGlow: "#d9770615",
    red: "#dc2626", teal: "#0f766e", purple: "#7c3aed",
    text: "#0f172a", textMuted: "#475569", textDim: "#94a3b8", online: "#16a34a",
  },
  "high-contrast": {
    bg: "#000000", surface: "#0a0a0a", surfaceHover: "#141414", surfaceRaised: "#1a1a1a",
    border: "#555555", borderHover: "#888888",
    accent: "#ffffff", accentGlow: "#ffffff22", accentSoft: "#eeeeee", accentDim: "#ffffff44",
    accentText: "#000000",
    green: "#00ff00", gold: "#ffdd00", goldDim: "#ffdd0022", goldBorder: "#ffdd0033", goldGlow: "#ffdd0015",
    red: "#ff5555", teal: "#00dddd", purple: "#cc99ff",
    text: "#ffffff", textMuted: "#cccccc", textDim: "#888888", online: "#00ff00",
  },
  "colorblind": {
    bg: "#0f0a00", surface: "#1a1200", surfaceHover: "#221800", surfaceRaised: "#2a1e00",
    border: "#3d2e00", borderHover: "#5c4500",
    accent: "#f97316", accentGlow: "#f9731622", accentSoft: "#fb923c", accentDim: "#f9731644",
    accentText: "#000000",
    green: "#22c55e", gold: "#facc15", goldDim: "#facc1522", goldBorder: "#facc1533", goldGlow: "#facc1515",
    red: "#ef4444", teal: "#34d399", purple: "#a78bfa",
    text: "#fef3e2", textMuted: "#c4a882", textDim: "#6b5a3e", online: "#22c55e",
  },
  "theme_rpg": {
    label: "RPG", questLabel: "Genre Explorer", icon: "📖",
    bg: "#0e0a1a", surface: "#150f2a", surfaceHover: "#1c1538", surfaceRaised: "#221b42",
    border: "#2e234f", borderHover: "#3d3066",
    accent: "#a78bfa", accentGlow: "#a78bfa22", accentSoft: "#c4b5fd", accentDim: "#a78bfa44",
    accentText: "#ffffff",
    green: "#4ade80", gold: "#fbbf24", goldDim: "#fbbf2422", goldBorder: "#fbbf2433", goldGlow: "#fbbf2415",
    red: "#f87171", teal: "#2dd4bf", purple: "#a78bfa",
    text: "#ede9fe", textMuted: "#9d87c9", textDim: "#4a3d70", online: "#4ade80",
    bgPattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpolygon points='30,4 56,18 56,42 30,56 4,42 4,18' stroke='%23a78bfa' stroke-width='0.4' stroke-opacity='0.12'/%3E%3C/g%3E%3C/svg%3E")`,
  },
  "theme_space": {
    label: "Space", questLabel: "Genre Master", icon: "🚀",
    bg: "#050a14", surface: "#0a1022", surfaceHover: "#0e162e", surfaceRaised: "#121d38",
    border: "#1a2840", borderHover: "#243654",
    accent: "#818cf8", accentGlow: "#818cf822", accentSoft: "#a5b4fc", accentDim: "#818cf844",
    accentText: "#ffffff",
    green: "#34d399", gold: "#fcd34d", goldDim: "#fcd34d22", goldBorder: "#fcd34d33", goldGlow: "#fcd34d15",
    red: "#f87171", teal: "#22d3ee", purple: "#c084fc",
    text: "#e0e7ff", textMuted: "#7b86b8", textDim: "#2d3a5c", online: "#34d399",
    bgPattern: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='4' cy='4' r='1' fill='%23818cf8' fill-opacity='0.18'/%3E%3Ccircle cx='20' cy='36' r='0.6' fill='%23c084fc' fill-opacity='0.14'/%3E%3Ccircle cx='52' cy='12' r='0.8' fill='%23818cf8' fill-opacity='0.12'/%3E%3Ccircle cx='68' cy='60' r='1' fill='%23a5b4fc' fill-opacity='0.16'/%3E%3Ccircle cx='36' cy='68' r='0.5' fill='%23818cf8' fill-opacity='0.1'/%3E%3C/svg%3E")`,
  },
  "theme_retro": {
    label: "Retro", questLabel: "Road Warrior", icon: "🕹️",
    bg: "#0a0800", surface: "#140f00", surfaceHover: "#1c1600", surfaceRaised: "#241c00",
    border: "#3a2e00", borderHover: "#4f3e00",
    accent: "#f59e0b", accentGlow: "#f59e0b22", accentSoft: "#fbbf24", accentDim: "#f59e0b44",
    accentText: "#000000",
    green: "#84cc16", gold: "#f59e0b", goldDim: "#f59e0b22", goldBorder: "#f59e0b33", goldGlow: "#f59e0b15",
    red: "#ef4444", teal: "#14b8a6", purple: "#a78bfa",
    text: "#fef9e7", textMuted: "#b8a060", textDim: "#5a4a18", online: "#84cc16",
    bgPattern: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='40' height='40' fill='none'/%3E%3Crect x='0' y='0' width='20' height='20' fill='%23f59e0b' fill-opacity='0.04'/%3E%3Crect x='20' y='20' width='20' height='20' fill='%23f59e0b' fill-opacity='0.04'/%3E%3C/svg%3E")`,
  },
  "theme_8bit": {
    label: "8-Bit", questLabel: "Trusted Voice", icon: "👾",
    bg: "#020c02", surface: "#061006", surfaceHover: "#0c180c", surfaceRaised: "#102010",
    border: "#1a3a1a", borderHover: "#245024",
    accent: "#4ade80", accentGlow: "#4ade8022", accentSoft: "#86efac", accentDim: "#4ade8044",
    accentText: "#000000",
    green: "#4ade80", gold: "#facc15", goldDim: "#facc1522", goldBorder: "#facc1533", goldGlow: "#facc1515",
    red: "#f87171", teal: "#4ade80", purple: "#c084fc",
    text: "#dcfce7", textMuted: "#6dab7a", textDim: "#234a2a", online: "#4ade80",
    bgPattern: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='8' height='8' fill='%234ade80' fill-opacity='0.04'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%234ade80' fill-opacity='0.04'/%3E%3C/svg%3E")`,
  },
};

export const QUEST_THEMES = [
  { id: "theme_rpg",   label: "RPG",     icon: "📖", questLabel: "Genre Explorer",  rewardId: "theme_rpg" },
  { id: "theme_space", label: "Space",   icon: "🚀", questLabel: "Genre Master",    rewardId: "theme_space" },
  { id: "theme_retro", label: "Retro",   icon: "🕹️", questLabel: "Road Warrior",    rewardId: "theme_retro" },
  { id: "theme_8bit",  label: "8-Bit",   icon: "👾", questLabel: "Trusted Voice",   rewardId: "theme_8bit" },
];

export const C = { ...THEMES["deep-space"] };

export function applyTheme(themeId) {
  const palette = THEMES[themeId] || THEMES["deep-space"];
  Object.assign(C, palette);
  document.body.style.background = palette.bg;
  document.documentElement.style.background = palette.bg;
}

export const FOUNDING = {
  total: 5000,
  claimed: 4847,
};

export const PROFILE_RINGS = [
  { id: "none", label: "No Ring", color: "transparent", description: "Standard member", alwaysUnlocked: true },
  { id: "founding", label: "Founding Ring", color: "#f59e0b", glow: "#f59e0b44", description: "Permanent. Earned by founding members.", icon: "⚔️", foundingOnly: true, how: "Founding Members only", double: true },
  { id: "bronze", label: "Bronze Ring", color: "#a0522d", glow: "#a0522d33", description: "A simple bronze frame. Everyone starts somewhere.", icon: "🥉", questId: "reply_first_npc", how: "Quest: Join the Conversation" },
  { id: "silver", label: "Silver Ring", color: "#c0c0c0", glow: "#c0c0c033", description: "You're finding your groove.", icon: "🥈", questId: "shelf_25", how: "Quest: Committed" },
  { id: "gold", label: "Gold Ring", color: "#f59e0b", glow: "#f59e0b44", description: "A seasoned player. Your shelf speaks for itself.", icon: "🥇", questId: "shelf_100", how: "Quest: Legendary Library" },
  { id: "npc", label: "NPC Friend Ring", color: "#a78bfa", glow: "#a78bfa33", description: "You talk to NPCs. Enough said.", icon: "🤝", questId: "npc_follow_all", how: "Quest: One of the Regulars" },
];

export const QUESTS = [
  { id: "add_first_game", title: "Add Your First Game", desc: "Add a game to your shelf", reward: "XP", progress: 0, total: 1, done: false, ring: null },
  { id: "shelf_5", title: "Getting Started", desc: "Add 5 games to your shelf", reward: "XP", progress: 0, total: 5, done: false, ring: null },
  { id: "shelf_10", title: "Building a Library", desc: "Add 10 games to your shelf", reward: "XP", progress: 0, total: 10, done: false, ring: null },
  { id: "shelf_25", title: "Committed", desc: "Add 25 games to your shelf", reward: "Silver Ring", progress: 0, total: 25, done: false, ring: "silver" },
  { id: "shelf_50", title: "The Collection", desc: "Add 50 games to your shelf", reward: "XP", progress: 0, total: 50, done: false, ring: null },
  { id: "shelf_100", title: "Legendary Library", desc: "Add 100 games to your shelf", reward: "Gold Ring", progress: 0, total: 100, done: false, ring: "gold" },
  { id: "played_10", title: "Veteran", desc: "Mark 10 games as played", reward: "XP", progress: 0, total: 10, done: false, ring: null },
  { id: "played_25", title: "Road Warrior", desc: "Mark 25 games as played", reward: "Retro Theme", progress: 0, total: 25, done: false, ring: null },
  { id: "played_50", title: "Hall of Fame", desc: "Mark 50 games as played", reward: "XP", progress: 0, total: 50, done: false, ring: null },
  { id: "played_100", title: "The Veteran's Veteran", desc: "Mark 100 games as played", reward: "XP", progress: 0, total: 100, done: false, ring: null },
  { id: "want_5", title: "The Wishlist", desc: "Add 5 games to Want to Play", reward: "XP", progress: 0, total: 5, done: false, ring: null },
  { id: "want_25", title: "Eternal Backlog", desc: "Add 25 games to Want to Play", reward: "XP", progress: 0, total: 25, done: false, ring: null },
  { id: "first_review", title: "Write Your First Review", desc: "Write your first game review", reward: "XP", progress: 0, total: 1, done: false, ring: null },
  { id: "reviews_5", title: "Critic", desc: "Write 5 game reviews", reward: "XP", progress: 0, total: 5, done: false, ring: null },
  { id: "reviews_10", title: "Trusted Voice", desc: "Write 10 game reviews", reward: "8-Bit Theme", progress: 0, total: 10, done: false, ring: null },
  { id: "reviews_25", title: "The Authority", desc: "Write 25 game reviews", reward: "XP", progress: 0, total: 25, done: false, ring: null },
  { id: "genre_explorer", title: "Genre Explorer", desc: "Play games across 5 genres", reward: "RPG Theme", progress: 0, total: 5, done: false, ring: null },
  { id: "genre_master", title: "Genre Master", desc: "Play games across 10 genres", reward: "Space Theme", progress: 0, total: 10, done: false, ring: null },
  { id: "first_like", title: "You're Noticed", desc: "Get your first like", reward: "XP", progress: 0, total: 1, done: false, ring: null },
  { id: "likes_10", title: "People Like You", desc: "Get 10 likes on your posts", reward: "XP", progress: 0, total: 10, done: false, ring: null },
  { id: "first_comment", title: "Starting a Thread", desc: "Leave your first comment", reward: "XP", progress: 0, total: 1, done: false, ring: null },
  { id: "reply_first_npc", title: "Join the Conversation", desc: "Reply to an NPC", reward: "Bronze Ring", progress: 0, total: 1, done: false, ring: "bronze" },
  { id: "npc_replies_5", title: "In the Mix", desc: "Get 5 NPC replies on your posts", reward: "XP", progress: 0, total: 5, done: false, ring: null },
  { id: "follow_first_npc", title: "Meet the Locals", desc: "Follow your first NPC", reward: "XP", progress: 0, total: 1, done: false, ring: null },
  { id: "npc_follow_3", title: "Making Friends", desc: "Follow 3 NPCs", reward: "XP", progress: 0, total: 3, done: false, ring: null },
  { id: "npc_follow_all", title: "One of the Regulars", desc: "Follow 6 NPCs", reward: "NPC Friend Ring", progress: 0, total: 6, done: false, ring: "npc" },
];

export const NPCS = {
  merv: { id: "merv", name: "ShopKeep Merv", handle: "@ShopKeepMerv_NPC", avatar: "SM", isNPC: true },
  grunt: { id: "grunt", name: "Grunt #4471", handle: "@GRUNT_NPC", avatar: "G4", isNPC: true },
  villager47: { id: "villager47", name: "Villager No. 47", handle: "@VillagerNo47_NPC", avatar: "V4", isNPC: true },
  beekeeper: { id: "beekeeper", name: "BeeKeeper Nan", handle: "@BeeKeeperNan_NPC", avatar: "BN", isNPC: true },
  minion: { id: "minion", name: "Just A Minion", handle: "@JustAMinion_NPC", avatar: "JM", isNPC: true },
  oldmanquest: { id: "oldmanquest", name: "Old Man Quest", handle: "@OldManQuest_NPC", avatar: "OQ", isNPC: true },
};

export const AVATAR_SKIN_TONES = {
  s1: { skin: "#FDDBB4", shadow: "#E8B88A", lip: "#C4956A" },
  s2: { skin: "#F5C5A3", shadow: "#D4956A", lip: "#B87050" },
  s3: { skin: "#D4956A", shadow: "#B57040", lip: "#8B4513" },
  s4: { skin: "#C68642", shadow: "#9B6320", lip: "#7B4010" },
  s5: { skin: "#8D5524", shadow: "#6B3A10", lip: "#4A2008" },
  s6: { skin: "#4A2511", shadow: "#2D1508", lip: "#1A0A04" },
};

export const AVATAR_HAIR_COLORS = {
  black: "#1a1a1a", darkbrown: "#3b1f0e", brown: "#6b3a2a",
  auburn: "#8b2500", red: "#cc2200", blonde: "#d4a843",
  platinum: "#f0e6c8", white: "#f5f5f5", gray: "#888888",
  blue: "#1a4480", purple: "#5b2d8e", green: "#1a6b3a",
};

export const AVATAR_BG_COLORS = {
  navy: "#0f1923", forest: "#0d2818", purple: "#1a0d2e",
  crimson: "#2e0d0d", slate: "#1a1f2e", gold: "#2e2000",
  teal: "#0d2e2e", charcoal: "#1a1a1a",
  gradBlue: ["#0f1923", "#1a3a5c"], gradPurple: ["#1a0d2e", "#3d1a6b"],
  gradGreen: ["#0d2818", "#1a5c38"], gradGold: ["#2e2000", "#6b4400"],
};

export const AVATAR_CLASS_COLORS = {
  warrior: "#cc3300", mage: "#6633cc", rogue: "#339933",
  ranger: "#996633", healer: "#33cccc", bard: "#cc33cc",
};

export const AVATAR_CLASS_ICONS = {
  warrior: "⚔", mage: "✦", rogue: "◆", ranger: "◉", healer: "✚", bard: "♪",
};

export const AVATAR_TORSO_COLORS = {
  hoodie: { main: "#2a4a7f", shadow: "#1a3060", accent: "#3a6aaf" },
  tee: { main: "#4a4a4a", shadow: "#2a2a2a", accent: "#6a6a6a" },
  armor: { main: "#8a7a5a", shadow: "#5a4a2a", accent: "#c0a060" },
  robe: { main: "#4a2a6a", shadow: "#2a1a4a", accent: "#7a4a9a" },
  cloak: { main: "#1a1a1a", shadow: "#0a0a0a", accent: "#3a3a3a" },
  jersey: { main: "#8a1a1a", shadow: "#5a0a0a", accent: "#aa3a3a" },
};
