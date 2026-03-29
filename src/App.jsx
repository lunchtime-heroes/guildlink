import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import LFGPage from "./pages/LFGPage.jsx";
import GuildPortal from "./pages/GuildPortal.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import FeedPage from "./pages/FeedPage.jsx";
import GamePage from "./pages/GamePage.jsx";
import GamesPage from "./pages/GamesPage.jsx";
import NPCStudioPage from "./pages/NPCStudioPage.jsx";
import PlayerProfilePage from "./pages/PlayerPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import { Avatar, AvatarPixel } from "./components/Avatar.jsx";
import { ChartsWidget } from "./components/Charts.jsx";
import { FeedPostCard } from "./components/FeedPostCard.jsx";
import { FoundingBadge, Badge, NPCBadge } from "./components/FoundingBadge.jsx";
import { LinkPreviewFetcher, ExitModal } from "./components/LinkPreview.jsx";
import { ShelfPulseCard, ReviewSpotlightCard } from "./components/PulseCards.jsx";

const supabase = createClient(
  "https://zpalkpcqihxamedymnwe.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYWxrcGNxaWh4YW1lZHltbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NDc3MTQsImV4cCI6MjA4ODQyMzcxNH0.8V9MEXpcCH8dibm65PVtaPZseDbPvYCwSPJQ-9Cu-Zo"
);

// Week start helper — Sunday 12:00am Pacific time
// Uses a fixed UTC offset: Pacific is UTC-8 (PST) or UTC-7 (PDT)
// We detect DST automatically via Intl
function getWeekStart() {
  const now = new Date();
  // Get current Pacific offset in minutes
  const pacificOffset = -new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "shortOffset" })
    .match(/GMT([+-]\d+)/)?.[1] * 60 || -480;
  // Shift now to Pacific time
  const pacificNow = new Date(now.getTime() + (pacificOffset + now.getTimezoneOffset()) * 60000);
  // Roll back to the most recent Sunday
  const dayOfWeek = pacificNow.getDay(); // 0 = Sunday
  const sunday = new Date(pacificNow);
  sunday.setDate(pacificNow.getDate() - dayOfWeek);
  // Return as YYYY-MM-DD using Pacific date components
  const y = sunday.getFullYear();
  const m = String(sunday.getMonth() + 1).padStart(2, '0');
  const d = String(sunday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function logAnalytics(userId, eventType, page, metadata = {}) {
  if (!userId) return;
  try {
    await supabase.from("analytics_events").insert({
      user_id: userId, event_type: eventType, page, metadata,
    });
  } catch(e) { /* non-fatal */ }
}

async function logChartEvent(gameId, eventType, userId) {
  if (!gameId || !gameId.includes('-')) return;
  const weekStart = getWeekStart();
  const today = new Date();
  const pacificOffset = -new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "shortOffset" })
    .match(/GMT([+-]\d+)/)?.[1] * 60 || -480;
  const pacificNow = new Date(today.getTime() + (pacificOffset + today.getTimezoneOffset()) * 60000);
  const todayDate = `${pacificNow.getFullYear()}-${String(pacificNow.getMonth() + 1).padStart(2, "0")}-${String(pacificNow.getDate()).padStart(2, "0")}`;

  if (eventType === 'post') {
    const { data: existing } = await supabase
      .from("chart_events")
      .select("post_sequence")
      .eq("game_id", gameId)
      .eq("user_id", userId)
      .eq("event_type", "post")
      .eq("date", todayDate)
      .order("post_sequence", { ascending: false })
      .limit(1);
    const nextSeq = existing && existing.length > 0 ? existing[0].post_sequence + 1 : 1;
    await supabase.from("chart_events").insert({
      game_id: gameId, user_id: userId, event_type: eventType,
      week_start: weekStart, date: todayDate, post_sequence: nextSeq,
    });
  } else {
    // Dedup per user/game/event_type per day
    const { data: existing } = await supabase
      .from("chart_events")
      .select("id")
      .eq("game_id", gameId)
      .eq("user_id", userId)
      .eq("event_type", eventType)
      .eq("date", todayDate)
      .limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from("chart_events").insert({
        game_id: gameId, user_id: userId, event_type: eventType,
        week_start: weekStart, date: todayDate, post_sequence: 1,
      });
    }
  }
}

// Returns age in years from a date string, or null if not set
function getAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function timeAgo(timestamp) {
  if (!timestamp) return "Just now";
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function notifLabel(n) {
  switch (n.type) {
    case "like":             return "liked your post";
    case "comment":          return "commented on your post";
    case "reply":            return "replied to your comment";
    case "follow":           return "started following you";
    default:                 return "interacted with you";
  }
}

function useWindowSize() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}

const THEMES = {
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
  // ── Quest-unlocked themes ──────────────────────────────────────────────────
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

// Theme catalog for quest-unlock display
const QUEST_THEMES = [
  { id: "theme_rpg",   label: "RPG",     icon: "📖", questLabel: "Genre Explorer",  rewardId: "theme_rpg" },
  { id: "theme_space", label: "Space",   icon: "🚀", questLabel: "Genre Master",    rewardId: "theme_space" },
  { id: "theme_retro", label: "Retro",   icon: "🕹️", questLabel: "Road Warrior",    rewardId: "theme_retro" },
  { id: "theme_8bit",  label: "8-Bit",   icon: "👾", questLabel: "Trusted Voice",   rewardId: "theme_8bit" },
];

const C = { ...THEMES["deep-space"] };

function applyTheme(themeId) {
  const palette = THEMES[themeId] || THEMES["deep-space"];
  Object.assign(C, palette);
  document.body.style.background = palette.bg;
  document.documentElement.style.background = palette.bg;
}

// ─── FOUNDING / RING / QUEST DATA ────────────────────────────────────────────

const FOUNDING = {
  total: 5000,
  claimed: 4847,
};

const PROFILE_RINGS = [
  { id: "none", label: "No Ring", color: "transparent", description: "Standard member", alwaysUnlocked: true },
  { id: "founding", label: "Founding Ring", color: "#f59e0b", glow: "#f59e0b44", description: "Permanent. Earned by founding members.", icon: "⚔️", foundingOnly: true, how: "Founding Members only", double: true },
  { id: "bronze", label: "Bronze Ring", color: "#a0522d", glow: "#a0522d33", description: "A simple bronze frame. Everyone starts somewhere.", icon: "🥉", questId: "reply_first_npc", how: "Quest: Join the Conversation" },
  { id: "silver", label: "Silver Ring", color: "#c0c0c0", glow: "#c0c0c033", description: "You're finding your groove.", icon: "🥈", questId: "shelf_25", how: "Quest: Committed" },
  { id: "gold", label: "Gold Ring", color: "#f59e0b", glow: "#f59e0b44", description: "A seasoned player. Your shelf speaks for itself.", icon: "🥇", questId: "shelf_100", how: "Quest: Legendary Library" },
  { id: "npc", label: "NPC Friend Ring", color: "#a78bfa", glow: "#a78bfa33", description: "You talk to NPCs. Enough said.", icon: "🤝", questId: "npc_follow_all", how: "Quest: One of the Regulars" },
];

const QUESTS = [
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

// ─── NPC DATA ─────────────────────────────────────────────────────────────────

const NPCS = {
  merv: { id: "merv", name: "ShopKeep Merv", handle: "@ShopKeepMerv_NPC", avatar: "SM", isNPC: true },
  grunt: { id: "grunt", name: "Grunt #4471", handle: "@GRUNT_NPC", avatar: "G4", isNPC: true },
  villager47: { id: "villager47", name: "Villager No. 47", handle: "@VillagerNo47_NPC", avatar: "V4", isNPC: true },
  beekeeper: { id: "beekeeper", name: "BeeKeeper Nan", handle: "@BeeKeeperNan_NPC", avatar: "BN", isNPC: true },
  minion: { id: "minion", name: "Just A Minion", handle: "@JustAMinion_NPC", avatar: "JM", isNPC: true },
  oldmanquest: { id: "oldmanquest", name: "Old Man Quest", handle: "@OldManQuest_NPC", avatar: "OQ", isNPC: true },
};

// ─── FEED POSTS WITH COMMENTS ─────────────────────────────────────────────────



// ─── GAME DATA ────────────────────────────────────────────────────────────────



// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────


// ─── AVATAR ENGINE ────────────────────────────────────────────────────────────

const AVATAR_SKIN_TONES = {
  s1: { skin: "#FDDBB4", shadow: "#E8B88A", lip: "#C4956A" },
  s2: { skin: "#F5C5A3", shadow: "#D4956A", lip: "#B87050" },
  s3: { skin: "#D4956A", shadow: "#B57040", lip: "#8B4513" },
  s4: { skin: "#C68642", shadow: "#9B6320", lip: "#7B4010" },
  s5: { skin: "#8D5524", shadow: "#6B3A10", lip: "#4A2008" },
  s6: { skin: "#4A2511", shadow: "#2D1508", lip: "#1A0A04" },
};
const AVATAR_HAIR_COLORS = {
  black: "#1a1a1a", darkbrown: "#3b1f0e", brown: "#6b3a2a",
  auburn: "#8b2500", red: "#cc2200", blonde: "#d4a843",
  platinum: "#f0e6c8", white: "#f5f5f5", gray: "#888888",
  blue: "#1a4480", purple: "#5b2d8e", green: "#1a6b3a",
};
const AVATAR_BG_COLORS = {
  navy: "#0f1923", forest: "#0d2818", purple: "#1a0d2e",
  crimson: "#2e0d0d", slate: "#1a1f2e", gold: "#2e2000",
  teal: "#0d2e2e", charcoal: "#1a1a1a",
  gradBlue: ["#0f1923", "#1a3a5c"], gradPurple: ["#1a0d2e", "#3d1a6b"],
  gradGreen: ["#0d2818", "#1a5c38"], gradGold: ["#2e2000", "#6b4400"],
};
const AVATAR_CLASS_COLORS = {
  warrior: "#cc3300", mage: "#6633cc", rogue: "#339933",
  ranger: "#996633", healer: "#33cccc", bard: "#cc33cc",
};
const AVATAR_CLASS_ICONS = {
  warrior: "⚔", mage: "✦", rogue: "◆", ranger: "◉", healer: "✚", bard: "♪",
};
const AVATAR_TORSO_COLORS = {
  hoodie: { main: "#2a4a7f", shadow: "#1a3060", accent: "#3a6aaf" },
  tee: { main: "#4a4a4a", shadow: "#2a2a2a", accent: "#6a6a6a" },
  armor: { main: "#8a7a5a", shadow: "#5a4a2a", accent: "#c0a060" },
  robe: { main: "#4a2a6a", shadow: "#2a1a4a", accent: "#7a4a9a" },
  cloak: { main: "#1a1a1a", shadow: "#0a0a0a", accent: "#3a3a3a" },
  jersey: { main: "#8a1a1a", shadow: "#5a0a0a", accent: "#aa3a3a" },
};


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

function SteamImportModal({ currentUser, onClose, onImportComplete }) {
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [steamData, setSteamData] = React.useState(null);
  const [selectedGames, setSelectedGames] = React.useState(new Set());
  const [importing, setImporting] = React.useState(false);
  const [importDone, setImportDone] = React.useState(false);
  const [statusOverrides, setStatusOverrides] = React.useState({});
  const [importProgress, setImportProgress] = React.useState(0);

  const fetchSteam = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(null); setSteamData(null);
    try {
      const res = await fetch("/api/steam", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setSteamData(data);
      // Pre-select all games
      setSelectedGames(new Set(data.games.map(g => g.appid)));
      // Init status overrides from suggestions
      const overrides = {};
      data.games.forEach(g => { overrides[g.appid] = g.suggested_status; });
      setStatusOverrides(overrides);
    } catch (e) {
      setError("Failed to connect to Steam. Please try again.");
    }
    setLoading(false);
  };

  const toggleGame = (appid) => {
    setSelectedGames(prev => {
      const next = new Set(prev);
      next.has(appid) ? next.delete(appid) : next.add(appid);
      return next;
    });
  };

  const doImport = async () => {
    if (!steamData || selectedGames.size === 0) return;
    setImporting(true); setImportProgress(0);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setImporting(false); return; }

    const toImport = steamData.games.filter(g => selectedGames.has(g.appid));
    let done = 0;

    for (const game of toImport) {
      // Search for matching game in DB or IGDB
      const { data: existing } = await supabase
        .from("games").select("id, name").ilike("name", game.name).limit(1).single();

      let gameId = existing?.id;

      if (!gameId) {
        // Try IGDB match
        try {
          const igdbRes = await fetch("/api/igdb", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: game.name }),
          });
          const { games: igdbGames } = await igdbRes.json();
          const match = igdbGames?.find(g => g.name.toLowerCase() === game.name.toLowerCase()) || igdbGames?.[0];
          if (match) {
            const { data: inserted } = await supabase.from("games").insert({
              name: match.name, genre: match.genre, summary: match.summary,
              cover_url: match.cover_url, igdb_id: match.igdb_id,
              first_release_date: match.first_release_date, followers: 0,
              platforms: match.platforms || null,
            }).select().single();
            gameId = inserted?.id;
          }
        } catch { /* IGDB unavailable */ }
      }

      if (!gameId) {
        // Insert as basic game entry
        const { data: inserted } = await supabase.from("games").insert({
          name: game.name, followers: 0,
        }).select().single();
        gameId = inserted?.id;
      }

      if (gameId) {
        const status = statusOverrides[game.appid] || "have_played";
        await supabase.from("user_games").upsert({
          user_id: authUser.id, game_id: gameId, status,
          time_played: game.playtime_hours || null,
        }, { onConflict: "user_id,game_id" });

        // Log chart event
        await supabase.from("chart_events").insert({
          game_id: gameId, user_id: authUser.id,
          event_type: status === "playing" ? "shelf_playing" : status === "have_played" ? "shelf_played" : "shelf_want",
          date: new Date().toISOString().slice(0, 10),
          week_start: new Date(Date.now() - new Date().getDay() * 86400000).toISOString().slice(0, 10),
        }).select();
      }

      done++;
      setImportProgress(Math.round((done / toImport.length) * 100));
    }

    setImporting(false);
    setImportDone(true);
  };

  const statusColors = { playing: C.accent, have_played: C.teal, want_to_play: C.gold };
  const statusLabels = { playing: "Playing", have_played: "Played", want_to_play: "Want" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, border: "1px solid #4a9eda44", borderRadius: 20, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1b2838" }}>
          <div>
            <div style={{ fontWeight: 800, color: "#4a9eda", fontSize: 18 }}>Import from Steam</div>
            <div style={{ color: "#7aa6c2", fontSize: 12 }}>Add your Steam library to your shelf</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#7aa6c2", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {importDone ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 16 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18 }}>Import complete!</div>
            <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center" }}>
              {selectedGames.size} games added to your shelf.
            </div>
            <button onClick={onImportComplete} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "10px 28px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
              View My Shelf
            </button>
          </div>
        ) : importing ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 16 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>Importing {selectedGames.size} games…</div>
            <div style={{ width: "100%", maxWidth: 300, height: 8, background: C.surfaceRaised, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: importProgress + "%", background: "#4a9eda", borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <div style={{ color: C.textDim, fontSize: 13 }}>{importProgress}%</div>
          </div>
        ) : !steamData ? (
          <div style={{ padding: 24 }}>
            <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>
              Enter your Steam profile URL, Steam ID, or username. Your profile must be set to public.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchSteam()}
                placeholder="steamcommunity.com/id/username or Steam64 ID"
                style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none" }}
              />
              <button onClick={fetchSteam} disabled={loading || !input.trim()}
                style={{ background: "#4a9eda", border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                {loading ? "Loading…" : "Connect"}
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#ef444418", border: "1px solid #ef444444", borderRadius: 8, color: "#ef4444", fontSize: 13 }}>
                {error}
              </div>
            )}
            <div style={{ marginTop: 16, color: C.textDim, fontSize: 12 }}>
              To make your profile public: Steam → Settings → Privacy → Profile Status → Public
            </div>
          </div>
        ) : (
          <>
            {/* Steam profile summary */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 12, background: "#1b283880" }}>
              {steamData.avatar && <img src={steamData.avatar} alt="" style={{ width: 40, height: 40, borderRadius: 6 }} />}
              <div>
                <div style={{ fontWeight: 700, color: "#4a9eda", fontSize: 14 }}>{steamData.playerName}</div>
                <div style={{ color: C.textDim, fontSize: 12 }}>{steamData.playedGames} played games · {steamData.games.filter(g => g.recently_played).length} played recently</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => setSelectedGames(new Set(steamData.games.map(g => g.appid)))}
                  style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 6, padding: "4px 10px", color: C.textMuted, fontSize: 11, cursor: "pointer" }}>All</button>
                <button onClick={() => setSelectedGames(new Set())}
                  style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 6, padding: "4px 10px", color: C.textMuted, fontSize: 11, cursor: "pointer" }}>None</button>
              </div>
            </div>

            {/* Game list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {steamData.games.map(game => {
                const selected = selectedGames.has(game.appid);
                const status = statusOverrides[game.appid] || "have_played";
                return (
                  <div key={game.appid} onClick={() => toggleGame(game.appid)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid " + C.border, cursor: "pointer", background: selected ? C.accentGlow : "transparent", opacity: selected ? 1 : 0.4 }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.opacity = "0.7"; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.opacity = "0.4"; }}>
                    {/* Checkbox */}
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (selected ? C.accent : C.border), background: selected ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {selected && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </div>
                    {/* Game icon */}
                    {game.img_icon
                      ? <img src={game.img_icon} alt="" style={{ width: 32, height: 32, borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
                      : <div style={{ width: 32, height: 32, borderRadius: 4, background: C.surfaceRaised, flexShrink: 0 }} />
                    }
                    {/* Name + playtime */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                      <div style={{ color: C.textDim, fontSize: 11 }}>
                        {game.playtime_hours}h played
                        {game.recently_played && <span style={{ color: "#4a9eda", marginLeft: 6 }}>● Recent</span>}
                      </div>
                    </div>
                    {/* Status selector */}
                    {selected && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {["playing","have_played","want_to_play"].map(s => (
                          <button key={s} onClick={() => setStatusOverrides(prev => ({ ...prev, [game.appid]: s }))}
                            style={{ padding: "2px 7px", borderRadius: 5, border: "1px solid " + (status === s ? statusColors[s] : C.border), background: status === s ? statusColors[s] + "22" : "transparent", color: status === s ? statusColors[s] : C.textDim, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                            {statusLabels[s]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ color: C.textDim, fontSize: 12 }}>{selectedGames.size} games selected</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onClose} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={doImport} disabled={selectedGames.size === 0}
                  style={{ background: "#4a9eda", border: "none", borderRadius: 8, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: selectedGames.size > 0 ? "pointer" : "default", opacity: selectedGames.size > 0 ? 1 : 0.5 }}>
                  Import {selectedGames.size} Games
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


// ─── ONBOARDING TUTORIAL ──────────────────────────────────────────────────────

class OnboardingErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return null; // silently dismiss onboarding on error — user can still use the app
    }
    return this.props.children;
  }
}

function OnboardingModal({ currentUser, isMobile, onComplete, setActivePage, setProfileDefaultTab }) {
  const [step, setStep] = useState(0);
  const [addedGames, setAddedGames] = useState([]);
  const [questPopped, setQuestPopped] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const username = currentUser?.name || currentUser?.handle?.replace("@", "") || "friend";

  const STEPS = [
    {
      heading: "Welcome to GuildLink. I'm Bizmond.",
      body: "I'll be your guide for the next few minutes. When I'm not enchanting scrolls or vanquishing magical beasts, I help gamers find their way around GuildLink.",
      cta: `Hi Bizmond, I'm ${username}!`,
      highlight: null,
    },
    {
      heading: `Good to meet you, ${username}!`,
      body: "Now that we're best friends, I'm going to tell you a secret: GuildLink's source of power comes from your shelf. What you've played, what you're playing now, and what's waiting in your queue make up your gaming lineage. And it's the key to helping you find your next favorite game.",
      cta: "I'll keep it a secret.",
      highlight: "shelf",
    },
    {
      heading: "I think you're ready…",
      body: "Go ahead and add one game you're playing to your shelf.",
      cta: null,
      highlight: null,
      showSearch: true,
    },
    {
      heading: "Every time you complete a quest, a unicorn gets its wings.",
      body: "Your shelf just got its first entry! And you just completed your first quest. Whenever you want to check your quests, check the quests tab in your profile.",
      cta: "Quest accepted",
      highlight: "quests",
      questPop: true,
    },
    {
      heading: "Now to meet some new friends.",
      body: "The main feed is where the conversation happens. Tag a game like you would a friend, follow games and gamers, and say hello to your favorite NPCs. Yep, we're here too! Ok, have fun!",
      cta: "Take me to the feed!",
      highlight: null,
      last: true,
    },
  ];

  const current = STEPS[step] || STEPS[STEPS.length - 1];
  const progress = (step / (STEPS.length - 1)) * 100;

  const addGame = async (game) => {
    if (addedGames.find(g => g.id === game.id)) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("user_games").upsert({ user_id: authUser.id, game_id: game.id, status: "playing", updated_at: new Date().toISOString() }, { onConflict: "user_id,game_id" });
    await supabase.from("user_games_history").insert({ user_id: authUser.id, game_id: game.id, from_status: null, to_status: "playing" });
    logChartEvent(game.id, 'shelf_playing', authUser.id);
    await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "shelf_add" });
    await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "have_played" });
    setAddedGames(prev => [...prev, game]);
    setQuestPopped(prev => {
      if (!prev) setTimeout(() => advance(5), 600);
      return true;
    });
  };

  const advance = (toStep) => {
    setTransitioning(true);
    setTimeout(() => { setStep(toStep !== undefined ? toStep : s => s + 1); setTransitioning(false); }, 200);
  };

  const finish = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) await supabase.from("profiles").update({ onboarded: true }).eq("id", authUser.id);
    setProfileDefaultTab?.("games");
    onComplete();
  };

  const skip = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) await supabase.from("profiles").update({ onboarded: true }).eq("id", authUser.id);
    onComplete();
  };

  // Game search for step 4
  const [atText, setAtText] = useState("");
  const [atResults, setAtResults] = useState([]);
  const [atIndex, setAtIndex] = useState(0);
  const atInputRef = useRef(null);

  const handleAtInput = async (e) => {
    const val = e.target.value;
    setAtText(val);
    const q = val.startsWith("@") ? val.slice(1) : val;
    if (q.length >= 2) {
      const [localRes, igdbRes] = await Promise.allSettled([
        supabase.from("games").select("id, name, genre, cover_url").ilike("name", `%${q}%`).limit(4),
        fetch("/api/igdb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) }).then(r => r.json()).catch(() => ({ games: [] })),
      ]);
      const local = localRes.status === "fulfilled" ? (localRes.value.data || []) : [];
      const igdb = igdbRes.status === "fulfilled" ? (igdbRes.value.games || []) : [];
      const localNames = new Set(local.map(g => g.name.toLowerCase()));
      const fromIGDB = igdb.filter(g => !localNames.has(g.name.toLowerCase())).map(g => ({ ...g, _fromIGDB: true }));
      setAtResults([...local, ...fromIGDB].slice(0, 6));
    } else {
      setAtResults([]);
    }
  };

  const selectAtGame = async (game) => {
    if (game._fromIGDB) {
      const { data: inserted } = await supabase.from("games").insert({
        name: game.name, genre: game.genre, summary: game.summary,
        cover_url: game.cover_url, igdb_id: game.igdb_id, followers: 0,
        platforms: game.platforms || null,
      }).select().single();
      if (inserted) await addGame(inserted);
    } else {
      await addGame(game);
    }
    setAtResults([]);
    setAtText("");
    setTimeout(() => atInputRef.current?.focus(), 0);
  };

  const BIZMOND_COLOR = "#a78bfa";

  return (
    <>
      {/* Nav highlight pulse — no position math needed */}
      {current.highlight && (
        <style>{`
          [data-tour="${current.highlight === "shelf" ? "games-tab" : "quests-tab"}"] {
            animation: navPulse 1s ease-in-out infinite !important;
          }
          @keyframes navPulse {
            0%, 100% { color: ${C.gold} !important; text-shadow: none; }
            50% { color: ${C.gold} !important; text-shadow: 0 0 12px ${C.gold}, 0 0 24px ${C.gold}88; }
          }
        `}</style>
      )}

      {/* Drop-from-top panel */}
      <div style={{
        position: "fixed",
        top: isMobile ? 52 : 60,
        left: "50%",
        transform: `translateX(-50%) translateY(${transitioning ? "-8px" : "0"})`,
        width: isMobile ? "calc(100vw - 24px)" : 540,
        zIndex: 9999,
        background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surfaceRaised} 100%)`,
        border: "1px solid " + C.border,
        borderBottom: `3px solid ${BIZMOND_COLOR}`,
        borderRadius: "0 0 18px 18px",
        boxShadow: "0 8px 40px #00000088",
        opacity: transitioning ? 0 : 1,
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: C.surfaceRaised }}>
          <div style={{ height: "100%", width: progress + "%", background: `linear-gradient(90deg, ${BIZMOND_COLOR}, ${C.accent})`, transition: "width 0.4s ease" }} />
        </div>

        <div style={{ padding: isMobile ? "14px 16px 16px" : "18px 22px 20px" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            {/* Bizmond */}
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: isMobile ? 44 : 52, height: isMobile ? 44 : 52,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${BIZMOND_COLOR}33, ${BIZMOND_COLOR}11)`,
                border: `2px solid ${BIZMOND_COLOR}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isMobile ? 22 : 26,
                boxShadow: `0 0 16px ${BIZMOND_COLOR}33`,
              }}>🧙</div>
              <div style={{ color: C.gold, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>BIZMOND</div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Quest pop */}
              {current.questPop && (
                <div style={{
                  background: C.green + "15", border: "1px solid " + C.green + "44",
                  borderRadius: 8, padding: "7px 12px", marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 16 }}>🎯</span>
                  <div>
                    <div style={{ color: C.green, fontWeight: 800, fontSize: 11 }}>Quest Complete — First Game Added</div>
                    <div style={{ color: C.gold, fontSize: 10 }}>+50 XP earned</div>
                  </div>
                </div>
              )}

              <div style={{ fontWeight: 800, color: C.text, fontSize: isMobile ? 13 : 15, marginBottom: 5, lineHeight: 1.3 }}>
                {current.heading}
              </div>
              <div style={{ color: C.textMuted, fontSize: isMobile ? 12 : 13, lineHeight: 1.6 }}>
                {current.body}
              </div>

              {/* Game search */}
              {current.showSearch && (
                <div style={{ marginTop: 12, position: "relative" }}>
                  <input
                    ref={atInputRef}
                    value={atText}
                    onChange={handleAtInput}
                    placeholder="Search for a game..."
                    autoFocus
                    style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                  {atResults.length > 0 && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: 8, overflow: "hidden", zIndex: 10001, boxShadow: "0 8px 24px #00000066", maxHeight: 240, overflowY: "auto" }}>
                      {atResults.map((game, idx) => (
                        <div key={game.id || game.igdb_id} onClick={() => selectAtGame(game)}
                          style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 10, background: idx === atIndex ? C.surfaceRaised : "transparent" }}
                          onMouseEnter={() => setAtIndex(idx)}>
                          {game.cover_url && <img src={game.cover_url} alt="" style={{ width: 22, height: 29, borderRadius: 3, objectFit: "cover", flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: C.text, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                            {game.genre && <div style={{ color: C.textDim, fontSize: 10 }}>{game.genre}</div>}
                          </div>
                          {game._fromIGDB && <span style={{ color: C.teal, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>+ Add</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {addedGames.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {addedGames.map(g => (
                        <div key={g.id} style={{ background: C.accent + "18", border: "1px solid " + C.accentDim, borderRadius: 6, padding: "3px 10px", color: C.accentSoft, fontSize: 11, fontWeight: 700 }}>✓ {g.name}</div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => advance(5)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: "6px 0 0", display: "block" }}>
                    Skip for now →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CTA row */}
          {current.cta && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: "1px solid " + C.border }}>
              <button
                onClick={current.last ? finish : () => advance()}
                style={{ background: `linear-gradient(135deg, ${BIZMOND_COLOR}, ${C.accent})`, border: "none", borderRadius: 8, padding: isMobile ? "9px 18px" : "9px 20px", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                {current.cta}
              </button>
              <button onClick={skip} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer" }}>
                Skip tutorial
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{``}</style>
    </>
  );
}

function NavBar({ activePage, setActivePage, isMobile, signOut, currentUser, isGuest, onSignIn, onSignUp, notifications, onMarkAllRead, onClearAll, onOpenPost, setProfileDefaultTab, setCurrentGame, setCurrentPlayer }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = (notifications || []).filter(n => !n.read).length;
  const isAdmin = currentUser?.is_admin;
  const isWriter = currentUser?.is_admin || currentUser?.is_writer;

  const handleNavClick = (id) => {
    if (id === "reviews-nav") {
      setActivePage("reviews");
    } else {
      setActivePage(id);
    }
  };
  const mobileItems = [
    { id: "feed", icon: "⊞", label: "Feed" },
    { id: "games", icon: "🎮", label: "Games" },
    { id: "reviews-nav", icon: "⭐", label: "Reviews" },
    { id: "squad", icon: "🛡️", label: "Guild" },
    { id: "feedback", icon: "💬", label: "Feedback" },
  ];
  const desktopItems = [
    { id: "feed", icon: "⊞", label: "Feed" },
    { id: "games", icon: "🎮", label: "Games" },
    { id: "reviews-nav", icon: "⭐", label: "Reviews" },
    { id: "squad", icon: "🛡️", label: "Guild" },
    { id: "founding", icon: "⚔️", label: "About", gold: true },
    { id: "feedback", icon: "💬", label: "Feedback" },
    ...(isAdmin ? [{ id: "admin", icon: "⚡", label: "Admin", admin: true }] : []),
    ...(isWriter ? [{ id: "npc-studio", icon: "✍️", label: "Studio", admin: true }] : []),
  ];

  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: C.bg + "f8", backdropFilter: "blur(20px)",
          borderBottom: "1px solid " + C.border,
          height: 52, display: "flex", alignItems: "center", padding: "0 16px", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setActivePage("feed")}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>G</div>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.text, letterSpacing: "-0.5px" }}>Guild<span style={{ color: C.accent }}>Link</span></span>
          </div>
          <div style={{ flex: 1 }}>
            <NavSearch setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentPlayer={setCurrentPlayer} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isGuest ? (
              <>
                <button onClick={onSignIn} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "6px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Sign Up</button>
              </>
            ) : (
              <>
                <button onClick={(e) => { e.stopPropagation(); setShowNotifs(s => !s); if (!showNotifs && notifications.filter(n => !n.read).length > 0) onMarkAllRead?.(); }}
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, color: C.textMuted, position: "relative", padding: "8px 6px", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
                  🔔
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span style={{ position: "absolute", top: 0, right: 0, background: C.accent, color: "#fff", borderRadius: "50%", width: 15, height: 15, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                {showNotifs && (
                  <div style={{ position: "fixed", top: 52, left: 0, right: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: "0 0 14px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 200, overflow: "hidden", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>Notifications</span>
                      <button onClick={() => setShowNotifs(false)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 18, cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ overflowY: "auto", flex: 1 }}>
                      {(!notifications || notifications.length === 0) ? (
                        <div style={{ padding: 32, textAlign: "center", color: C.textDim, fontSize: 13 }}>Nothing yet.</div>
                      ) : notifications.map((n, i) => {
                        const actor = n.actor;
                        const npcData = n.npc || null;
                        const isNPC = !!npcData;
                        const hasPost = !!n.post_id;
                        const avatarInitials = isNPC
                          ? (npcData.avatar_initials || npcData.name || "NPC").slice(0,2).toUpperCase()
                          : (actor?.avatar_initials || actor?.username || "?").slice(0,2).toUpperCase();
                        const notifAvatarConfig = !isNPC ? (actor?.avatar_config || null) : null;
                        const notifText = n.type === "comment" ? "commented on your post" : n.type === "reply" ? "replied to your comment" : n.type === "follow" ? "started following you" : "mentioned you";
                        return (
                          <div key={n.id} onClick={() => { if (hasPost) { onOpenPost?.(n.post_id); setShowNotifs(false); } }}
                            style={{ padding: "12px 16px", borderBottom: i < notifications.length - 1 ? "1px solid " + C.border : "none", background: !n.read ? C.accent + "0a" : "transparent", display: "flex", gap: 10, alignItems: "flex-start", cursor: hasPost ? "pointer" : "default" }}>
                            <Avatar initials={avatarInitials} size={30} isNPC={isNPC} avatarConfig={notifAvatarConfig} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                                {isNPC ? (
                                  <><strong style={{ color: C.gold }}>{npcData.name}</strong> <span style={{ color: C.gold }}>{notifText}</span></>
                                ) : (
                                  <span style={{ color: C.text }}><strong>{actor?.username || "Someone"}</strong> {notifText}</span>
                                )}
                              </div>
                              <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                            </div>
                            {hasPost && <span style={{ color: C.textDim, fontSize: 11 }}>→</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div onClick={() => setActivePage("profile")} style={{ cursor: "pointer" }}>
                  <Avatar initials={currentUser?.avatar || "GL"} size={28} ring={currentUser?.activeRing || "none"} avatarConfig={currentUser?.avatarConfig} />
                </div>
                <button onClick={signOut} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "5px 10px", color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Sign Out</button>
              </>
            )}
          </div>
        </nav>

        {/* Mobile bottom tab bar */}
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: C.surface + "fc", backdropFilter: "blur(20px)",
          borderTop: "1px solid " + C.border,
          display: "flex", alignItems: "stretch",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          minHeight: 56,
        }}>
          {mobileItems.map(item => {
            const active = activePage === item.id || (item.id === "reviews-nav" && activePage === "reviews");
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id)} style={{
                flex: 1,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 3,
                background: "transparent", border: "none", cursor: "pointer",
                color: active ? C.accentSoft : C.textDim,
                position: "relative",
                padding: "6px 0 4px",
              }}>
                {active && <div style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: 2, background: C.accent, borderRadius: "0 0 2px 2px" }} />}
                <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.01em" }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </>
    );
  }

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: C.bg + "f0", backdropFilter: "blur(20px)",
      borderBottom: "1px solid " + C.border,
      height: 60, display: "flex", alignItems: "center", padding: "0 24px", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 20, cursor: "pointer" }} onClick={() => setActivePage("feed")}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff" }}>G</div>
        <span style={{ fontWeight: 800, fontSize: 18, color: C.text, letterSpacing: "-0.5px" }}>Guild<span style={{ color: C.accent }}>Link</span></span>
      </div>
      <NavSearch setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentPlayer={setCurrentPlayer} />
      <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
        {desktopItems.map(item => (
          <button key={item.id} onClick={() => handleNavClick(item.id)} style={{
            background: item.gold ? activePage === item.id ? C.goldGlow : "transparent" : item.admin ? activePage === item.id ? "#ef444420" : "transparent" : activePage === item.id ? C.accentGlow : "transparent",
            border: item.gold ? activePage === item.id ? "1px solid " + C.goldBorder : "1px solid transparent" : item.admin ? activePage === item.id ? "1px solid #ef444440" : "1px solid transparent" : activePage === item.id ? "1px solid " + C.accentDim : "1px solid transparent",
            borderRadius: 8, padding: "6px 14px",
            color: item.gold ? activePage === item.id ? C.gold : C.gold + "99" : item.admin ? "#ef4444" : activePage === item.id ? C.accentSoft : C.textMuted,
            cursor: "pointer", fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 5,
          }}>{item.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 10 }}>
        {isGuest ? (
          <>
            <button onClick={onSignIn} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "6px 14px", color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Sign In</button>
            <button onClick={onSignUp} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "6px 16px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Join Free</button>
          </>
        ) : (
          <>
            <div style={{ position: "relative" }}>
              <button onClick={(e) => { e.stopPropagation(); setShowNotifs(s => !s); if (!showNotifs && unreadCount > 0) onMarkAllRead?.(); }}
                style={{ background: showNotifs ? C.accentGlow : "transparent", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 18, color: unreadCount > 0 ? C.text : C.textMuted, position: "relative", padding: "8px 12px", display: "flex", alignItems: "center", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
                🔔
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: 2, right: 2, background: C.accent, color: C.accentText, borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div style={{ position: "fixed", top: isMobile ? 56 : "auto", right: isMobile ? 0 : 0, left: isMobile ? 0 : "auto", marginTop: isMobile ? 0 : 8, width: isMobile ? "100%" : 340, background: C.surface, border: "1px solid " + C.border, borderRadius: isMobile ? "0 0 14px 14px" : 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 200, overflow: "hidden", maxHeight: isMobile ? "70vh" : "auto" }}>
                  <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>Notifications</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {notifications?.length > 0 && (
                        <button onClick={() => { onClearAll?.(); }}
                          style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: 0 }}>
                          Clear all
                        </button>
                      )}
                      <button onClick={() => setShowNotifs(false)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
                    </div>
                  </div>
                  <div style={{ maxHeight: isMobile ? "calc(70vh - 60px)" : 420, overflowY: "auto" }}>
                    {(!notifications || notifications.length === 0) ? (
                      <div style={{ padding: 32, textAlign: "center", color: C.textDim, fontSize: 13 }}>Nothing yet.</div>
                    ) : notifications.map((n, i) => {
                      const actor = n.actor;
                      const npcData = n.npc || null;
                      const isNPC = !!npcData;
                      const isUnread = !n.read;
                      const hasPost = !!n.post_id;
                      const avatarInitials = isNPC
                        ? (npcData.avatar_initials || npcData.name || "NPC").slice(0,2).toUpperCase()
                        : (actor?.avatar_initials || actor?.username || "?").slice(0,2).toUpperCase();
                      const mobileNotifAvatarConfig = !isNPC ? (actor?.avatar_config || null) : null;
                      return (
                        <div key={n.id}
                          onClick={() => {
                            if (hasPost) { onOpenPost?.(n.post_id); setShowNotifs(false); }
                            else if (isGamertagRequest) { setActivePage("profile"); setShowNotifs(false); }
                          }}
                          style={{ padding: "12px 16px", borderBottom: i < notifications.length - 1 ? "1px solid " + C.border : "none", background: isUnread ? C.accent + "0a" : "transparent", display: "flex", gap: 10, alignItems: "flex-start", cursor: (hasPost) ? "pointer" : "default", transition: "background 0.1s" }}
                          onMouseEnter={e => { if (hasPost) e.currentTarget.style.background = C.surfaceHover; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isUnread ? C.accent + "0a" : "transparent"; }}
                        >
                          <Avatar initials={avatarInitials} size={30} isNPC={isNPC} avatarConfig={mobileNotifAvatarConfig} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                              {isNPC ? (
                                <>
                                  <strong style={{ color: C.gold }}>{npcData.name}</strong>
                                  {" "}<NPCBadge />{" "}
                                  <span style={{ color: C.gold }}>{notifLabel(n)}</span>
                                </>
                              ) : (
                                <span style={{ color: C.text }}>
                                  <strong
                                    onClick={e => { e.stopPropagation(); if (actor?.handle) { setCurrentPlayer?.(actor.id); setActivePage("player"); setShowNotifs(false); } }}
                                    style={{ cursor: actor?.handle ? "pointer" : "default", color: actor?.handle ? C.accentSoft : C.text }}
                                  >{actor?.username || "Someone"}</strong> {notifLabel(n)}
                                </span>
                              )}
                            </div>
                            <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                            {isUnread && <div style={{ width: 7, height: 7, borderRadius: "50%", background: isNPC ? C.gold : C.accent }} />}
                            {(hasPost) && <span style={{ color: C.textDim, fontSize: 11 }}>→</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div onClick={() => setActivePage("profile")} style={{ cursor: "pointer" }}>
              <Avatar initials={currentUser?.avatar || "GL"} size={34} status="online" founding={currentUser?.isFounding} ring={currentUser?.activeRing || "none"} avatarConfig={currentUser?.avatarConfig} />
            </div>
            {signOut && <button onClick={signOut} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "5px 10px", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>Sign Out</button>}
          </>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ color: C.gold, fontSize: 10, opacity: 0.7, userSelect: "none", fontWeight: 600 }}>b0326-370</span>
        </div>
      </div>
    </nav>
  );
}

// ─── NPC BROWSE PAGE (mobile tab) ────────────────────────────────────────────

function NPCBrowsePage({ setActivePage, setCurrentNPC }) {
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("npcs").select("*").eq("is_active", true).order("name")
      .then(({ data }) => { if (data) setNpcs(data); setLoading(false); });
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "70px 16px 80px" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 22, color: C.text }}>GuildLink NPCs</h2>
        <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>Original characters from the GuildLink universe. They're out here living their best lives.</p>
      </div>
      {loading ? (
        <div style={{ color: C.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>Loading characters…</div>
      ) : npcs.map(npc => (
        <div key={npc.id} onClick={() => { setCurrentNPC(npc.id); setActivePage("npc"); }}
          style={{ background: C.surface, border: "1px solid " + C.goldBorder, borderRadius: 14, padding: 18, marginBottom: 12, display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }}>
          <Avatar initials={npc.avatar_initials || "?"} size={50} isNPC={true} status={npc.status} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: C.gold, fontSize: 15 }}>{npc.name}</span>
              <NPCBadge />
            </div>
            <div style={{ color: C.textDim, fontSize: 12, marginBottom: 4 }}>{npc.handle}</div>
            <div style={{ color: C.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{npc.role}</div>
            <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
              {npc.followers && <span style={{ color: C.textDim, fontSize: 11 }}>👥 {((npc.followers || 0) / 1000).toFixed(1)}k followers</span>}
              {npc.universe && <span style={{ color: C.textDim, fontSize: 11 }}>{npc.universe_icon || "⚔️"} {npc.universe}</span>}
            </div>
          </div>
          <span style={{ color: C.textDim, fontSize: 18 }}>→</span>
        </div>
      ))}
    </div>
  );
}

// ─── SHELF SIDEBAR WIDGET ─────────────────────────────────────────────────────

function ShelfSidebarWidget({ setActivePage, setCurrentGame, setProfileDefaultTab }) {
  const [shelfGames, setShelfGames] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("user_games")
        .select("status, games(id, name, genre, cover_url)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(6)
        .then(({ data }) => {
          if (data) setShelfGames(data.map(d => ({ ...d.games, status: d.status })).filter(Boolean));
        });
    });
  }, []);

  const STATUS_LABEL = { playing: "Playing", want_to_play: "Want to Play", have_played: "Played" };
  const STATUS_COLOR = { playing: C.green, want_to_play: C.accent, have_played: C.gold };

  if (shelfGames.length === 0) return (
    <div style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6 }}>
      Nothing on your shelf yet.{" "}
      <span onClick={() => { setProfileDefaultTab("games"); setActivePage("profile"); }} style={{ color: C.accentSoft, cursor: "pointer" }}>Add games →</span>
    </div>
  );

  return (
    <div>
      {shelfGames.map((g, i) => (
        <div key={g.id} onClick={() => { setCurrentGame(g.id); setActivePage("game"); }}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < shelfGames.length - 1 ? "1px solid " + C.border : "none", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
            <div style={{ color: STATUS_COLOR[g.status] || C.textDim, fontSize: 10, fontWeight: 600 }}>{STATUS_LABEL[g.status] || g.status}</div>
          </div>
          <span style={{ color: C.textDim, fontSize: 11 }}>→</span>
        </div>
      ))}
    </div>
  );
}


export default function GuildLink() {
  const [activePage, setActivePage] = useState("feed");
  const [currentGame, setCurrentGame] = useState(null);
  const [currentNPC, setCurrentNPC] = useState("merv");
  const [gameDefaultTab, setGameDefaultTab] = useState(null);

  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentGuild, setCurrentGuild] = useState(null);
  const [profileDefaultTab, setProfileDefaultTab] = useState("posts");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showAuth, setShowAuth] = useState(false);
  const [signInPromptMsg, setSignInPromptMsg] = useState(null);
  const [themeKey, setThemeKey] = useState("deep-space");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const width = useWindowSize();
  const isMobile = width < 768;

  // Prevent mobile zoom on tap/login
  useEffect(() => {
    let tag = document.querySelector("meta[name=viewport]");
    if (!tag) { tag = document.createElement("meta"); tag.name = "viewport"; document.head.appendChild(tag); }
    tag.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
    // Lock body background so iOS Safari never shows white behind content
    document.body.style.background = "#080e1a";
    document.body.style.overscrollBehaviorY = "none";
  }, []);

  // ── URL routing ───────────────────────────────────────────────────────────
  const parsePath = (path) => {
    const p = path.replace(/^\//, "");
    if (!p || p === "feed") return { page: "feed" };
    if (p === "games") return { page: "games" };
    if (p === "reviews") return { page: "reviews" };
    if (p === "about") return { page: "founding" };
    if (p === "profile") return { page: "profile" };
    if (p === "npcs") return { page: "npcs" };
    if (p.startsWith("game/")) return { page: "game", gameId: p.slice(5) };
    if (p.startsWith("player/")) return { page: "player", playerHandle: p.slice(7) };
    if (p.startsWith("npc/")) return { page: "npc", npcId: p.slice(4) };
    if (p.startsWith("guild/")) return { page: "guild", guildId: p.slice(6) };
    return { page: "feed" };
  };

  // Browser back/forward — only listener needed
  useEffect(() => {
    const onPop = async (e) => {
      const state = e.state;
      if (!state) { setActivePage("feed"); setCurrentGame(null); setCurrentPlayer(null); return; }
      if (state.gameId) {
        setCurrentGame(state.gameId);
      } else {
        setCurrentGame(null);
      }
      if (state.guildId) {
        setCurrentGuild(state.guildId);
      } else {
        setCurrentGuild(null);
      }
      if (state.playerId) {
        setCurrentPlayer(state.playerId);
      } else if (state.playerHandle) {
        const { data } = await supabase.from("profiles").select("id").eq("handle", `@${state.playerHandle}`).maybeSingle();
        if (data) setCurrentPlayer(data.id);
        else setCurrentPlayer(null);
      } else {
        setCurrentPlayer(null);
      }
      setActivePage(state.page || "feed");
    };
    window.addEventListener("popstate", onPop);
    // Seed initial history state so back works from first page
    const { page, gameId, playerHandle } = parsePath(window.location.pathname);
    window.history.replaceState({ page, gameId, playerHandle }, "", window.location.pathname);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const applyAndSetTheme = (themeId) => {
    applyTheme(themeId);
    setThemeKey(themeId);
    try { localStorage.setItem("gl-theme", themeId); } catch(e) {}
  };

  useEffect(() => {
    // Apply any locally saved theme immediately on load
    try { const saved = localStorage.getItem("gl-theme"); if (saved) applyAndSetTheme(saved); } catch(e) {}
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) fetchProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) { fetchProfile(session.user.id); setShowAuth(false); setSignInPromptMsg(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Poll for quest completions every 30s while logged in
  useEffect(() => {
    if (!session?.user?.id) return;
    const interval = setInterval(() => checkQuestCompletions(session.user.id), 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  const checkQuestCompletions = async (userId) => {
    const { data } = await supabase
      .from("user_quests")
      .select("*, quests(title, xp_reward, reward_id, quest_rewards(label, type, value))")
      .eq("user_id", userId)
      .eq("completed", true)
      .eq("notified", false)
      .order("completed_at", { ascending: true })
      .limit(1);
    if (data && data.length > 0) {
      const uq = data[0];
      setQuestBanner({
        quest_id: uq.quest_id,
        title: uq.quests?.title || "Quest Complete",
        xp_reward: uq.quests?.xp_reward || 0,
        reward_label: uq.quests?.quest_rewards?.label || null,
      });
      // Mark as notified
      await supabase.rpc("mark_quest_notified", { p_user_id: userId, p_quest_id: uq.quest_id });
      // Re-fetch profile to update XP and level display
      fetchProfile(userId);
    }
  };

  const backfillQuestRewards = async (userId) => {
    try {
      const { data: completed } = await supabase
        .from("user_quests")
        .select("quest_id, quests(reward_id)")
        .eq("user_id", userId)
        .eq("completed", true)
        .not("quests.reward_id", "is", null);
      if (!completed?.length) return;
      const rewardIds = completed.map(r => r.quests?.reward_id).filter(Boolean);
      if (!rewardIds.length) return;
      await supabase.from("user_rewards").upsert(
        rewardIds.map(rid => ({ user_id: userId, reward_id: rid })),
        { onConflict: "user_id,reward_id" }
      );
    } catch (e) {
      // user_rewards may have RLS restrictions — non-fatal
    }
  };

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile(data);
      if (data.theme) applyAndSetTheme(data.theme);
      if (!data.onboarded) {
        setActivePage("feed");
        setShowOnboarding(true);
      }
    }
    fetchNotifications(userId);
    checkQuestCompletions(userId);
  };

  const fetchNotifications = async (userId) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error || !data) return;
    // Enrich with actor profiles
    const actorIds = [...new Set(data.filter(n => n.actor_id).map(n => n.actor_id))];
    const npcIds = [...new Set(data.filter(n => n.npc_id).map(n => n.npc_id))];
    let actorMap = {}, npcMap = {};
    if (actorIds.length > 0) {
      const { data: actors } = await supabase.from("profiles").select("id, username, handle, avatar_initials, avatar_config").in("id", actorIds);
      if (actors) actors.forEach(a => { actorMap[a.id] = a; });
    }
    if (npcIds.length > 0) {
      const { data: npcs } = await supabase.from("npcs").select("id, name, handle, avatar_initials").in("id", npcIds);
      if (npcs) npcs.forEach(n => { npcMap[n.id] = n; });
    }
    setNotifications(data.map(n => ({
      ...n,
      actor: n.actor_id ? actorMap[n.actor_id] || null : null,
      npc: n.npc_id ? npcMap[n.npc_id] || null : null,
    })));
  };

  const markAllRead = async (userId) => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = async (userId) => {
    await supabase.from("notifications").delete().eq("user_id", userId);
    setNotifications([]);
  };

  const [postModal, setPostModal] = useState(null); // post_id to show in modal
  const [exitModalUrl, setExitModalUrl] = useState(null);
  const [questBanner, setQuestBanner] = useState(null); // { quest_id, title, xp_reward, reward_label }

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setNotifications([]);
  };

  const openSignIn = (msg) => {
    setSignInPromptMsg(msg || null);
    setShowAuth("login");
  };

  const openSignUp = () => setShowAuth("signup");

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.textMuted, fontSize: 14 }}>Loading...</div>
    </div>
  );

  // Show full auth page if explicitly requested
  if (showAuth) return <AuthPage onBack={() => setShowAuth(false)} defaultMode={showAuth === "signup" ? "signup" : "login"} />;

  const isGuest = !session;

  // XP thresholds: cumulative XP needed to reach each level
  const XP_LEVELS = [0, 100, 250, 450, 750, 1150, 1650, 2250, 3000, 3900];
  const MAX_LEVEL = 10;
  const getLevel = (xp) => {
    let level = 1;
    for (let i = 1; i < XP_LEVELS.length; i++) {
      if (xp >= XP_LEVELS[i]) level = i + 1;
      else break;
    }
    return Math.min(level, MAX_LEVEL);
  };
  const getXpNext = (level) => {
    if (level >= MAX_LEVEL) return XP_LEVELS[XP_LEVELS.length - 1];
    return XP_LEVELS[level]; // XP_LEVELS[level] is the threshold for level+1
  };

  // URL-aware navigation — plain functions, no hooks
  const navToGame = (gameId) => {
    setCurrentGame(gameId);
    setActivePage("game");
    window.history.pushState({ page: "game", gameId }, "", `/game/${gameId}`);
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) logAnalytics(user.id, "page_view", "game", { gameId }); });
  };

  const navToPlayer = async (playerId) => {
    setCurrentPlayer(playerId);
    setActivePage("player");
    const { data } = await supabase.from("profiles").select("handle").eq("id", playerId).maybeSingle();
    const handle = data?.handle?.replace("@", "") || playerId;
    window.history.pushState({ page: "player", playerId, playerHandle: handle }, "", `/player/${handle}`);
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) logAnalytics(user.id, "page_view", "player"); });
  };

  const navToGuild = (guildId) => {
    setCurrentGuild(guildId);
    setActivePage("guild");
    window.history.pushState({ page: "guild", guildId }, "", "/guild/" + guildId);
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) logAnalytics(user.id, "page_view", "guild", { guildId }); });
  };

  const navToPage = (page) => {
    setActivePage(page);
    const path = page === "founding" ? "/about" : `/${page}`;
    window.history.pushState({ page }, "", path);
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) logAnalytics(user.id, "page_view", page); });
  };

  const liveUser = profile ? {
    id: profile.id,
    name: profile.username || "Gamer",
    handle: profile.handle || "@gamer",
    avatar: profile.avatar_initials || "GL",
    level: getLevel(profile.xp || 0),
    xp: profile.xp || 0,
    xpNext: getXpNext(getLevel(profile.xp || 0)),
    title: profile.bio || "New to GuildLink",
    location: "",
    connections: 0,
    followers: 0,
    bio: profile.bio || "",
    games: profile.games ? profile.games.split(",") : [],
    status: "online",
    isFounding: profile.is_founding || false,
    activeRing: profile.active_ring || "none",
    is_admin: profile.is_admin || false,
    is_writer: profile.is_writer || false,
    birth_year: profile.birth_year || null,
    date_of_birth: profile.date_of_birth || null,
    dob_changes: profile.dob_changes || 0,
    theme: profile.theme || "deep-space",
    avatarConfig: profile.avatar_config || null,
    player_tags: profile.player_tags || {},
  } : null;



  return (
    <div style={{ minHeight: "100vh", background: C.bg, backgroundImage: C.bgPattern || "none", color: C.text }}>
      {signInPromptMsg !== null && (
        <SignInPrompt
          message={signInPromptMsg || undefined}
          onClose={() => setSignInPromptMsg(null)}
          onSignIn={() => { setSignInPromptMsg(null); setShowAuth("login"); }}
        />
      )}

      {/* Quest completion banner */}
      {questBanner && (
        <div style={{
          position: "fixed", bottom: isMobile ? 72 : 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, width: isMobile ? "calc(100vw - 32px)" : 420,
          background: `linear-gradient(135deg, ${C.surface}, ${C.surfaceRaised})`,
          border: "1px solid " + C.green + "44", borderRadius: 16,
          padding: "16px 20px", boxShadow: `0 8px 32px #00000066, 0 0 0 1px ${C.green}22`,
          display: "flex", alignItems: "center", gap: 16,
          animation: "slideUp 0.3s ease",
        }}>
          <style>{`@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.green + "18", border: "1px solid " + C.green + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎯</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 13, marginBottom: 2 }}>Quest Complete!</div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{questBanner.title}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>+{questBanner.xp_reward} XP</span>
              {questBanner.reward_label && <span style={{ color: C.accentSoft, fontSize: 12 }}>· {questBanner.reward_label} unlocked</span>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <button onClick={() => { setQuestBanner(null); navToPage("profile"); setProfileDefaultTab("quests"); }}
              style={{ background: C.green, border: "none", borderRadius: 8, padding: "6px 12px", color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              View Quests
            </button>
            <button onClick={() => setQuestBanner(null)}
              style={{ background: "none", border: "1px solid " + C.border, borderRadius: 8, padding: "5px 12px", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
      {showOnboarding && liveUser && (
        <OnboardingErrorBoundary>
          <OnboardingModal
            currentUser={liveUser}
            isMobile={isMobile}
            setActivePage={setActivePage}
            setProfileDefaultTab={setProfileDefaultTab}
            onComplete={() => {
              setShowOnboarding(false);
              navToPage("feed");
              session?.user?.id && fetchProfile(session.user.id);
            }}
          />
        </OnboardingErrorBoundary>
      )}
      <style>{`
        * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #080e1a; }
        ::-webkit-scrollbar-thumb { background: #252836; border-radius: 3px; }
        button { font-family: 'DM Sans', sans-serif; transition: opacity 0.15s; }
        button:hover { opacity: 0.85; }
        input, textarea { font-family: 'DM Sans', sans-serif !important; }
        textarea::placeholder, input::placeholder { color: #4a4d63; }
        @keyframes pulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
        ::-webkit-scrollbar { display: ${isMobile ? "none" : "block"}; }
      `}</style>
      <NavBar activePage={activePage} setActivePage={navToPage} isMobile={isMobile} signOut={signOut} currentUser={liveUser} isGuest={isGuest} onSignIn={() => openSignIn()} onSignUp={openSignUp} notifications={notifications} onMarkAllRead={() => markAllRead(session?.user?.id)} onClearAll={() => clearAllNotifications(session?.user?.id)} onOpenPost={(postId) => setPostModal(postId)} setProfileDefaultTab={setProfileDefaultTab} setCurrentGame={navToGame} setCurrentPlayer={navToPlayer} />
      {postModal && <PostModal postId={postModal} onClose={() => setPostModal(null)} currentUser={liveUser} onNavigateToPlayer={(userId) => { setPostModal(null); navToPlayer(userId); setActivePage("player"); }} />}
      {exitModalUrl && <ExitModal url={exitModalUrl} onClose={() => setExitModalUrl(null)} />}
      {activePage === "admin" && liveUser?.is_admin && <AdminPage isMobile={isMobile} currentUser={liveUser} setActivePage={navToPage} setCurrentPlayer={navToPlayer} />}
      {activePage === "npc-studio" && (liveUser?.is_admin || liveUser?.is_writer) && <NPCStudioPage isMobile={isMobile} currentUser={liveUser} setActivePage={navToPage} setCurrentNPC={setCurrentNPC} />}
      {activePage === "charts" && <GamesPage setActivePage={navToPage} setCurrentGame={navToGame} isMobile={isMobile} currentUser={liveUser} onSignIn={openSignIn} />}
      {activePage === "feed" && <FeedPage activePage={activePage} setActivePage={navToPage} setCurrentGame={navToGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={navToPlayer} isMobile={isMobile} currentUser={liveUser} isGuest={isGuest} onSignIn={openSignIn} setProfileDefaultTab={setProfileDefaultTab} onQuestTrigger={() => session?.user?.id && checkQuestCompletions(session.user.id)} onExit={url => setExitModalUrl(url)} />}
      {activePage === "reviews" && <ReviewsPage isMobile={isMobile} currentUser={liveUser} setActivePage={navToPage} setCurrentGame={navToGame} setCurrentPlayer={navToPlayer} setGameDefaultTab={setGameDefaultTab} />}
      {activePage === "games" && <GamesPage setActivePage={navToPage} setCurrentGame={navToGame} isMobile={isMobile} currentUser={liveUser} onSignIn={openSignIn} />}
      {activePage === "game" && <GamePage gameId={currentGame} setActivePage={navToPage} setCurrentGame={navToGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={navToPlayer} isMobile={isMobile} currentUser={liveUser} isGuest={isGuest} onSignIn={openSignIn} defaultTab={gameDefaultTab} onTabConsumed={() => setGameDefaultTab(null)} onQuestComplete={() => session?.user?.id && checkQuestCompletions(session.user.id)} />}
      {activePage === "npc" && <NPCProfilePage npcId={currentNPC} setActivePage={navToPage} setCurrentNPC={setCurrentNPC} setCurrentGame={navToGame} setCurrentPlayer={navToPlayer} isMobile={isMobile} currentUser={liveUser} onQuestTrigger={() => session?.user?.id && checkQuestCompletions(session.user.id)} />}
      {activePage === "npcs" && <NPCBrowsePage setActivePage={navToPage} setCurrentNPC={setCurrentNPC} />}
      {activePage === "profile" && (isGuest ? (openSignIn("Create an account to build your profile and game shelf."), setActivePage("feed"), null) : <ProfilePage setActivePage={navToPage} setCurrentGame={navToGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={navToPlayer} isMobile={isMobile} currentUser={liveUser} isGuest={isGuest} onSignIn={openSignIn} defaultTab={profileDefaultTab} onProfileSaved={() => session && fetchProfile(session.user.id)} onThemeChange={applyAndSetTheme} onQuestComplete={() => session?.user?.id && checkQuestCompletions(session.user.id)} />)}
      {activePage === "player" && <PlayerProfilePage userId={currentPlayer} setActivePage={navToPage} setCurrentGame={navToGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={navToPlayer} isMobile={isMobile} currentUser={liveUser} isGuest={isGuest} onSignIn={openSignIn} setGameDefaultTab={setGameDefaultTab} />}
      {activePage === "squad" && <LFGPage isMobile={isMobile} currentUser={liveUser} setCurrentPlayer={navToPlayer} setActivePage={navToPage} setCurrentGuild={navToGuild} />}
      {activePage === "guild" && <GuildPortal guildId={currentGuild} isMobile={isMobile} currentUser={liveUser} setActivePage={navToPage} setCurrentPlayer={navToPlayer} />}
      {activePage === "founding" && <FoundingMemberPage setActivePage={navToPage} isMobile={isMobile} onSignUp={openSignUp} />}
      {activePage === "feedback" && <FeedbackPage currentUser={liveUser} isMobile={isMobile} setActivePage={navToPage} />}
    </div>
  );
}
