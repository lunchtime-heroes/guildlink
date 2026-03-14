import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

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

async function logChartEvent(gameId, eventType, userId) {
  if (!gameId || !gameId.includes('-')) return;
  const weekStart = getWeekStart();

  if (eventType === 'post') {
    // Find current post sequence for this user/game/week
    const { data: existing } = await supabase
      .from("chart_events")
      .select("post_sequence")
      .eq("game_id", gameId)
      .eq("user_id", userId)
      .eq("event_type", "post")
      .eq("week_start", weekStart)
      .order("post_sequence", { ascending: false })
      .limit(1);
    const nextSeq = existing && existing.length > 0 ? existing[0].post_sequence + 1 : 1;
    await supabase.from("chart_events").insert({
      game_id: gameId, user_id: userId, event_type: eventType,
      week_start: weekStart, post_sequence: nextSeq,
    });
  } else {
    // All other events: upsert (dedup via unique index)
    await supabase.from("chart_events").upsert({
      game_id: gameId, user_id: userId, event_type: eventType,
      week_start: weekStart, post_sequence: 1,
    }, { onConflict: "user_id,game_id,event_type,week_start", ignoreDuplicates: true });
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
    case "gamertag_request": return `wants your ${n.meta || "gamertag"}`;
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
};

const C = { ...THEMES["deep-space"] };

function applyTheme(themeId) {
  const palette = THEMES[themeId] || THEMES["deep-space"];
  Object.assign(C, palette);
}

// ─── FOUNDING / RING / QUEST DATA ────────────────────────────────────────────

const FOUNDING = {
  total: 5000,
  claimed: 4847,
};

const PROFILE_RINGS = [
  { id: "none", label: "No Ring", color: "transparent", description: "Standard member", alwaysUnlocked: true },
  { id: "founding", label: "Founding Ring", color: "#f59e0b", glow: "#f59e0b44", description: "Permanent. Earned by founding members.", icon: "⚔️", foundingOnly: true, how: "Founding Members only" },
  { id: "rpg", label: "RPG Ring", color: "#a78bfa", glow: "#a78bfa33", description: "For the devoted RPG adventurer.", icon: "📖", questId: "rpg_fan", questLabel: "Quest: RPG Fan", how: "Quest: RPG Fan" },
  { id: "platinum", label: "Platinum Ring", color: "#e2e8f0", glow: "#e2e8f033", description: "Complete 50 game reviews.", icon: "📝", questId: "the_critic", questLabel: "Quest: The Critic", how: "Quest: The Critic" },
  { id: "crimson", label: "Crimson Ring", color: "#ef4444", glow: "#ef444433", description: "Reach Top Voice on any game page.", icon: "🏆", questId: "top_of_feed", questLabel: "Quest: Top of the Feed", how: "Quest: Top of the Feed" },
  { id: "void", label: "Void Ring", color: "#7c3aed", glow: "#7c3aed33", description: "Complete 10 games to 100%.", icon: "💯", questId: "completionist", questLabel: "Quest: The Completionist", how: "Quest: The Completionist" },
  { id: "emerald", label: "Emerald Ring", color: "#10b981", glow: "#10b98133", description: "Help 100 players find a squad.", icon: "🤝", questId: "the_connector", questLabel: "Quest: The Connector", how: "Quest: The Connector" },
  { id: "celestial", label: "Celestial Ring", color: "#38bdf8", glow: "#38bdf833", description: "500 followers on GuildLink.", icon: "⭐", questId: "rising_star", questLabel: "Quest: Rising Star", how: "Quest: Rising Star" },
  { id: "onyx", label: "Onyx Ring", color: "#334155", glow: "#0f172a88", description: "1 year as a GuildLink member.", icon: "🕯️", questId: "veteran", questLabel: "Quest: Veteran", how: "Quest: Veteran" },
];

const QUESTS = [
  { id: "q1", title: "First Words", desc: "Post for the first time", reward: "10 XP", progress: 1, total: 1, done: true, ring: null },
  { id: "q2", title: "The Critic", desc: "Write 50 game reviews", reward: "Platinum Ring", progress: 32, total: 50, done: false, ring: "platinum" },
  { id: "q3", title: "Top of the Feed", desc: "Reach Top Voice status on any game page", reward: "Crimson Ring", progress: 0, total: 1, done: false, ring: "crimson" },
  { id: "q4", title: "The Completionist", desc: "Mark 10 games as 100% complete", reward: "Void Ring", progress: 3, total: 10, done: false, ring: "void" },
  { id: "q5", title: "The Connector", desc: "Have 100 players join squads you posted", reward: "Emerald Ring", progress: 14, total: 100, done: false, ring: "emerald" },
  { id: "q6", title: "Rising Star", desc: "Reach 500 followers", reward: "Celestial Ring", progress: 312, total: 500, done: false, ring: "celestial" },
  { id: "q7", title: "Veteran", desc: "Be a GuildLink member for 1 year", reward: "Onyx Ring", progress: 0, total: 12, done: false, ring: "onyx", unit: "months" },
  { id: "q8", title: "NPC Whisperer", desc: "Get 10 NPC replies on your posts", reward: "500 XP + Badge", progress: 7, total: 10, done: false, ring: null },
];

// ─── NPC DATA ─────────────────────────────────────────────────────────────────

const NPCS = {
  merv: {
    id: "merv",
    name: "ShopKeep Merv",
    handle: "@ShopKeepMerv_NPC",
    avatar: "SM",
    isNPC: true,
    universe: "Realm of Aethoria",
    universeIcon: "⚔️",
    role: "Licensed Cave Merchant · Aethoria Trade Guild",
    location: "The Fogwood Cave, Eastern Pass, Aethoria",
    status: "online",
    yearsOfService: 340,
    followers: 28400,
    connections: 12,
    bio: "I have operated this cave-based general store since the Third Age. My inventory is well-stocked. My location is findable. I am here every day. The lantern is on. I do not understand the foot traffic situation.",
    lore: "Merv took over the Fogwood Cave shop from his father, who took it over from his father, who allegedly started the business after getting lost during an adventure and never finding his way out. The family has made peace with this. The Eastern Pass sees considerable hero traffic. Merv has spoken to very few of them.",
    stats: [
      { label: "Apples Sold", value: "4,532", note: "Single-day record. Unannounced." },
      { label: "Heroes Greeted", value: "847,291", note: "Greeted. Not necessarily acknowledged." },
      { label: "Quests Overheard", value: "12,004", note: "Could have helped with most of them." },
      { label: "Years in Business", value: "340", note: "No reviews. Not on any maps." },
      { label: "Inventory Restocks", value: "∞", note: "The arrows just appear. He doesn't ask." },
      { label: "Unsolicited Advice Given", value: "0", note: "Professional." },
    ],
    games: ["Elden Ring", "Dark Souls III", "Hollow Knight"],
    posts: [
      { id: "m1", time: "3h ago", content: "Inventory update: 847 arrows, 12 health potions, one sword of unclear origin. I have been in this cave since the Third Age. Business is steady.", likes: 4821, comments: 18, liked: false },
      { id: "m2", time: "1d ago", content: "A hero came in today. Looked at my wares for 45 seconds. Said 'hm'. Left. I have been thinking about it since.", likes: 9204, comments: 47, liked: false },
      { id: "m3", time: "2d ago", content: "Updated the sign outside. It now reads SHOP in larger letters. Foot traffic unchanged. The sign looks good though.", likes: 6103, comments: 29, liked: false },
    ],
  },
  grunt: {
    id: "grunt",
    name: "Grunt #4471",
    handle: "@GRUNT_NPC",
    avatar: "G4",
    isNPC: true,
    universe: "Realm of Aethoria",
    universeIcon: "⚔️",
    role: "Eastern Gate Guard, 3rd Rotation · Royal City of Aethon",
    location: "Eastern Gate, Royal City of Aethon, Aethoria",
    status: "online",
    yearsOfService: 6,
    followers: 31200,
    connections: 8,
    bio: "I guard the Eastern Gate. I have guarded this gate for six years. I have a lot of thoughts about the people who walk through it. I am not permitted to share most of them. The knee is fine. Please stop asking about the knee.",
    lore: "Grunt #4471 enlisted in the Royal Guard at 18, motivated by a love of structure and a desire to see the world. He has seen the Eastern Gate. It is a nice gate. He has opinions about every single person who has passed through it and zero outlet for those opinions until GuildLink.",
    stats: [
      { label: "Hours Stood at Post", value: "52,560", note: "Consecutive. Mostly." },
      { label: "Travelers Greeted", value: "2.1M", note: "Response rate: 4%." },
      { label: "Threats Neutralized", value: "0", note: "Quiet gate. Good gate." },
      { label: "Times Knee Mentioned", value: "847", note: "It was one comment." },
      { label: "Unsolicited Directions Given", value: "12,004", note: "Nobody asked." },
      { label: "Naps Taken on Duty", value: "0", note: "Alleged." },
    ],
    games: ["Elden Ring", "Dark Souls III", "Skyrim"],
    posts: [
      { id: "g1", time: "5h ago", content: "Sixth year at the Eastern Gate. The sunrise is the same every morning. I have memorized it. I have given it a name. I will not be sharing the name.", likes: 7823, comments: 34, liked: false },
      { id: "g2", time: "2d ago", content: "A hero walked through the gate today without making eye contact. I said good morning. The wind took it. Another day.", likes: 11204, comments: 82, liked: false },
    ],
  },
  villager47: {
    id: "villager47",
    name: "Villager No. 47",
    handle: "@VillagerNo47_NPC",
    avatar: "V4",
    isNPC: true,
    universe: "Maplewood Valley",
    universeIcon: "🌿",
    role: "Background Resident · Maplewood Valley Homeowners Assoc.",
    location: "Plot 47, Riverside District, Maplewood Valley",
    status: "online",
    yearsOfService: 12,
    followers: 44800,
    connections: 31,
    bio: "I live at Plot 47. I have always lived at Plot 47. The river is nice. The new residents keep moving my fence. I have filed nothing. I notice everything. Have a good Tuesday.",
    lore: "Villager No. 47 has been a resident of Maplewood Valley longer than any current mayor, any current shop, and most of the trees. She remembers when the fishing spot was undiscovered. She has feelings about what happened to the fishing spot. She is processing.",
    stats: [
      { label: "Years as Resident", value: "12", note: "Predates the current mayor by 9 years." },
      { label: "Fences Moved by Others", value: "23", note: "Filed: 0 complaints." },
      { label: "Fish Witnessed Being Caught", value: "8,847", note: "Was not invited to fish." },
      { label: "Wholesome Interactions", value: "∞", note: "It's her thing." },
      { label: "Passive Aggressive Waves", value: "204", note: "Unverified. She denies this." },
      { label: "Flowers Planted", value: "1,847", note: "Near Plot 48. Intentional." },
    ],
    games: ["Stardew Valley", "Animal Crossing", "Hollow Knight"],
    posts: [
      { id: "v1", time: "2h ago", content: "A new resident moved into town today. They immediately started chopping down trees. I have filed nothing. I feel nothing. Welcome.", likes: 12847, comments: 67, liked: false },
      { id: "v2", time: "1d ago", content: "The river looked particularly nice this morning. I stood by it for a while. Nobody asked why. I appreciated that.", likes: 8921, comments: 41, liked: false },
    ],
  },
  beekeeper: {
    id: "beekeeper",
    name: "BeeKeeper Nan",
    handle: "@BeeKeeperNan_NPC",
    avatar: "BN",
    isNPC: true,
    universe: "Maplewood Valley",
    universeIcon: "🌿",
    role: "Apiarist & Unofficial Florist · Maplewood Valley",
    location: "The Meadow, North District, Maplewood Valley",
    status: "away",
    yearsOfService: 8,
    followers: 29100,
    connections: 28,
    bio: "I keep bees. The bees are fine. The flowers near plot 4 are gone and I noticed. I always notice. The honey is available at the market on Saturdays. Come early.",
    lore: "Nan arrived in Maplewood Valley eight years ago with seventeen beehives and opinions about pollinator corridors. She has expanded to forty-two hives. The opinions have also expanded.",
    stats: [
      { label: "Beehives Maintained", value: "42", note: "Up from 17. The bees chose this." },
      { label: "Honey Jars Sold", value: "9,204", note: "Saturday market. Come early." },
      { label: "Flower Losses Documented", value: "847", note: "Mentally. Not formally." },
      { label: "Bees Named", value: "3", note: "Gerald, Susan, and The Fast One." },
      { label: "Unsolicited Garden Opinions", value: "2,847", note: "Solicited: also 2,847." },
      { label: "Years of Perfect Honey", value: "8", note: "Consecutive. She will mention this." },
    ],
    games: ["Stardew Valley", "Animal Crossing"],
    posts: [],
  },
  minion: {
    id: "minion",
    name: "Just A Minion",
    handle: "@JustAMinion_NPC",
    avatar: "JM",
    isNPC: true,
    universe: "Sector Null",
    universeIcon: "🚀",
    role: "Level 1 Enemy Unit · Sector Null Defense Force",
    location: "Spawn Point 7, Sector Null Outpost",
    status: "ingame",
    yearsOfService: 3,
    followers: 52300,
    connections: 4,
    bio: "I am a Level 1 enemy unit. My job is to patrol, engage, and respawn. I am good at two of those things. I have thoughts about difficulty settings that I keep mostly to myself. The respawn is instant. The dignity takes longer.",
    lore: "Unit designation JM-0047 was deployed to Sector Null Outpost three years ago. In that time he has been defeated by heroes, speedrunners, people testing their new controller, and once by someone who appeared to be playing with their eyes closed. He has achieved a kind of peace about it.",
    stats: [
      { label: "Times Defeated", value: "14,847", note: "This season alone." },
      { label: "Respawn Time", value: "0.3s", note: "Very efficient. Small mercy." },
      { label: "Heroes Engaged", value: "14,847", note: "Correlation noted." },
      { label: "Times Avoided Entirely", value: "204", note: "Speedrunners. Rude but efficient." },
      { label: "Patrol Routes Completed", value: "2", note: "Things escalate quickly." },
      { label: "Existential Crises", value: "1", note: "Ongoing." },
    ],
    games: ["Valorant", "Overwatch 2", "Dark Souls III"],
    posts: [
      { id: "jm1", time: "4h ago", content: "Respawned 23 times today before 9am. The hero is having a productive morning. I support their goals. This is fine.", likes: 18204, comments: 94, liked: false },
    ],
  },
  oldmanquest: {
    id: "oldmanquest",
    name: "Old Man Quest",
    handle: "@OldManQuest_NPC",
    avatar: "OQ",
    isNPC: true,
    universe: "Realm of Aethoria",
    universeIcon: "⚔️",
    role: "Senior Quest Issuer · Aethoria Quest Bureau, Retired (Not Retired)",
    location: "The Old Mill, Crossroads Village, Aethoria",
    status: "online",
    yearsOfService: 200,
    followers: 38700,
    connections: 6,
    bio: "I have quests. Important quests. The fate of several villages depends on their completion. I stand at the crossroads every day. I am very visible. I have a large glowing exclamation mark above my head. The ancient evil grows stronger.",
    lore: "The Old Man has been issuing quests since before the current kingdom existed. His quest completion rate is 0.003%. He has made peace with nothing. The exclamation mark was installed 200 years ago and has never once been acknowledged.",
    stats: [
      { label: "Quests Issued", value: "847", note: "Completion rate: 0.003%." },
      { label: "Years at the Crossroads", value: "200", note: "Rain or shine." },
      { label: "Exclamation Marks Displayed", value: "1", note: "Glowing. Quite large." },
      { label: "Villages That Needed Saving", value: "12", note: "Still need saving." },
      { label: "Times Someone Stopped", value: "3", note: "Two left mid-conversation." },
      { label: "Ancient Evils Pending", value: "4", note: "Growing stronger daily." },
    ],
    games: ["Elden Ring", "Dark Souls III", "Hollow Knight"],
    posts: [
      { id: "oq1", time: "6h ago", content: "Day 73,000 at the crossroads. The ancient evil grows stronger. I have four quests available. I am wearing the exclamation mark. I don't know what else I can do.", likes: 22847, comments: 113, liked: false },
    ],
  },
};

// ─── FEED POSTS WITH COMMENTS ─────────────────────────────────────────────────



// ─── GAME DATA ────────────────────────────────────────────────────────────────

const GAMES = {
  "elden-ring": {
    id: "elden-ring", name: "Elden Ring", icon: "🗡️",
    genre: ["Action RPG", "Souls-like", "Open World"], year: 2022, developer: "FromSoftware",
    claimed: true, followers: 48200, activePlayers: 1840, completions: 12400,
    reviewScore: 9.4, reviewCount: 3821, color: "#c9a84c",
    gradient: "linear-gradient(135deg, #1a1000 0%, #3d2800 40%, #1a0a00 100%)",
    description: "A vast open-world action RPG set in the Lands Between, crafted by FromSoftware and George R.R. Martin.",
    trendingTopics: [
      { tag: "Shadow of the Erdtree", posts: 4200, reactions: 18900, trend: "🔥 Hot", delta: "+340%" },
      { tag: "Malenia Build Guide", posts: 890, reactions: 6700, trend: "📈 Rising", delta: "+89%" },
      { tag: "Patch 1.12 Changes", posts: 2100, reactions: 9400, trend: "💬 Active", delta: "+120%" },
      { tag: "Lore Deep Dive", posts: 560, reactions: 4200, trend: "📚 Steady", delta: "+12%" },
    ],
    topVoices: [
      { name: "VaatiVidya", handle: "@vaati", avatar: "VV", score: 98400, badge: "👑", posts: 284 },
      { name: "Let Me Solo Her", handle: "@letmesoloher", avatar: "LM", score: 76200, badge: "⚔️", posts: 142 },
      { name: "Jordan Park", handle: "@jpark", avatar: "JP", score: 34100, badge: "🔥", posts: 98 },
      { name: "Alex Chen", handle: "@axelstrike", avatar: "AC", score: 28900, badge: "⭐", posts: 76 },
    ],
    alsoLiked: [
      { id: "hollow-knight", name: "Hollow Knight", icon: "🦋", overlap: 78, reason: "Challenging, rewarding mastery" },
      { id: "stardew-valley", name: "Stardew Valley", icon: "🌱", overlap: 67, reason: "Fans crave a cozy contrast" },
      { id: "dark-souls", name: "Dark Souls III", icon: "🔥", overlap: 94, reason: "The natural predecessor" },
      { id: "animal-crossing", name: "Animal Crossing", icon: "🏝️", overlap: 61, reason: "\"I earned this peace\" 😂" },
    ],
    tips: [
      { title: "Bleed builds wreck everything early", author: "JP", upvotes: 2841, category: "Build" },
      { title: "Always explore caves before advancing areas", author: "AC", upvotes: 1920, category: "Exploration" },
      { title: "Torrent can access areas enemies can't follow", author: "MS", upvotes: 1540, category: "Mechanic" },
    ],
    posts: [
      { id: 1, user: { name: "Jordan Park", avatar: "JP", handle: "@jpark", status: "online" }, time: "2h ago", content: "Finally beat Malenia after 47 attempts. Bleed arcane build was the key 🗡️", likes: 284, comments: 47, liked: false },
      { id: 2, user: { name: "Maya Storm", avatar: "MS", handle: "@mayastorm", status: "ingame" }, time: "5h ago", content: "The Shadow of the Erdtree DLC lore is wild. Miquella's full story recontextualizes everything. Thread incoming 🧵", likes: 892, comments: 134, liked: true },
    ],
  },
  "hollow-knight": {
    id: "hollow-knight", name: "Hollow Knight", icon: "🦋",
    genre: ["Metroidvania", "Indie", "Platformer"], year: 2017, developer: "Team Cherry",
    claimed: false, followers: 31400, activePlayers: 920, completions: 8700,
    reviewScore: 9.7, reviewCount: 2940, color: "#7c6fff",
    gradient: "linear-gradient(135deg, #080818 0%, #1a1040 50%, #080818 100%)",
    description: "A challenging action-adventure through a vast underground kingdom of insects and heroes.",
    trendingTopics: [
      { tag: "Silksong Release", posts: 8900, reactions: 42000, trend: "🔥 Massive", delta: "+890%" },
      { tag: "Pantheon Tips", posts: 1200, reactions: 8900, trend: "📈 Rising", delta: "+45%" },
    ],
    topVoices: [
      { name: "Mossbag", handle: "@mossbag", avatar: "MB", score: 124000, badge: "👑", posts: 412 },
      { name: "Taylor Kim", handle: "@taylorplays", avatar: "TK", score: 54200, badge: "🦋", posts: 198 },
    ],
    alsoLiked: [
      { id: "elden-ring", name: "Elden Ring", icon: "🗡️", overlap: 78, reason: "Shared love of challenge & lore" },
      { id: "celeste", name: "Celeste", icon: "🏔️", overlap: 84, reason: "Precision platforming fans" },
    ],
    tips: [
      { title: "Get Mothwing Cloak before Fungal Wastes", author: "TK", upvotes: 3200, category: "Progression" },
    ],
    posts: [
      { id: 1, user: { name: "Taylor Kim", avatar: "TK", handle: "@taylorplays", status: "ingame" }, time: "1h ago", content: "Silksong is a masterpiece. 9.5/10 🦋", likes: 1203, comments: 188, liked: false },
    ],
  },
};



// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function Avatar({ initials, size = 40, status, isNPC = false, ring = null, founding = false }) {
  const statusColors = { online: C.online, away: C.gold, ingame: C.purple, offline: C.textDim };
  const ringData = ring ? PROFILE_RINGS.find(r => r.id === ring) : null;
  const showFoundingRing = founding && !ring;
  const ringColor = ringData?.color || (showFoundingRing ? C.gold : null);
  const ringGlow = ringData?.glow || (showFoundingRing ? C.goldBorder : null);
  const hasRing = ringColor && ringColor !== "transparent";
  const pad = hasRing ? 3 : 0;

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size + pad * 2, height: size + pad * 2, flexShrink: 0 }}>
      {/* Ring */}
      {hasRing && (
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: `${pad}px solid ${ringColor}`,
          boxShadow: `0 0 ${size * 0.3}px ${ringGlow || ringColor + "44"}, inset 0 0 ${size * 0.15}px ${ringGlow || ringColor + "22"}`,
          zIndex: 1, pointerEvents: "none",
        }} />
      )}
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: isNPC
          ? `linear-gradient(135deg, #3d2e00, #7a5c00)`
          : `linear-gradient(135deg, ${C.accent}cc, ${C.accent}55)`,
        border: `2px solid ${isNPC ? C.gold + "66" : hasRing ? ringColor + "44" : C.accent + "55"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35, fontWeight: 700, color: isNPC ? C.gold : "#fff",
        letterSpacing: "-0.5px", position: "relative", zIndex: 0, flexShrink: 0,
      }}>{initials}</div>
      {status && <div style={{
        position: "absolute", bottom: pad + 1, right: pad + 1,
        width: size * 0.28, height: size * 0.28, borderRadius: "50%",
        background: statusColors[status] || C.textDim,
        border: `2px solid ${C.surface}`, zIndex: 2,
      }} />}
    </div>
  );
}

function FoundingBadge() {
  return (
    <span style={{
      background: C.goldGlow, color: C.gold,
      border: `1px solid ${C.goldBorder}`,
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
      border: `1px solid ${C.goldBorder}`,
      borderRadius: 5, padding: "2px 7px",
      fontSize: 10, fontWeight: 800, letterSpacing: "0.5px",
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>⚙ NPC</span>
  );
}

function Badge({ children, color = C.accent, small }) {
  return (
    <span style={{
      background: `${color}18`, color, border: `1px solid ${color}33`,
      borderRadius: 6, padding: small ? "2px 7px" : "4px 10px",
      fontSize: small ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

// ─── FEED POST CARD WITH COMMENTS ─────────────────────────────────────────────

function FeedPostCard({ post, onLike, setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, currentUser, isGuest, onSignIn, onQuestTrigger }) {
  const [showComments, setShowComments] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liveComments, setLiveComments] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const commentInputRef = useRef(null);

  // Sync count from parent
  useEffect(() => {
    setLocalPost(prev => ({ ...prev, likes: post.likes }));
  }, [post.likes]);

  // Sync liked from parent but only if it's true — never let parent un-like what user did
  useEffect(() => {
    if (post.liked) setLocalPost(prev => ({ ...prev, liked: true }));
  }, [post.liked]);

  // Full reset only when a genuinely different post loads into this slot
  useEffect(() => {
    setLocalPost(post);
  }, [post.id]);

  useEffect(() => {
    if (replyTo) commentInputRef.current?.focus();
  }, [replyTo]);
  const [taggedGameName, setTaggedGameName] = useState(null);

  useEffect(() => {
    const gameId = post.game_tag || post.gameId;
    if (!gameId) return;
    if (GAMES[gameId]) { setTaggedGameName(GAMES[gameId].name); return; }
    // Look up from DB
    supabase.from("games").select("name").eq("id", gameId).single().then(({ data }) => {
      if (data) setTaggedGameName(data.name);
    });
  }, [post.game_tag, post.gameId]);

  const toggleLike = async () => {
    if (isGuest) { onSignIn?.("Like posts and join the conversation."); return; }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const newLiked = !localPost.liked;
    setLocalPost(p => ({ ...p, liked: newLiked }));
    if (post.id && typeof post.id === 'string' && post.id.includes('-')) {
      if (newLiked) {
        await supabase.from("post_likes").upsert({ post_id: post.id, user_id: authUser.id });
        await supabase.rpc("increment_likes", { row_id: post.id });
      } else {
        await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", authUser.id);
        await supabase.rpc("decrement_likes", { row_id: post.id });
      }
      const { data: fresh } = await supabase.from("posts").select("likes").eq("id", post.id).single();
      if (fresh) setLocalPost(p => ({ ...p, likes: fresh.likes }));
      if (newLiked && post.user_id && post.user_id !== authUser.id) {
        supabase.rpc("increment_quest_progress", { p_user_id: post.user_id, p_trigger: "like_received" }).then(() => onQuestTrigger?.());
      }
    }
  };

  const loadComments = async () => {
    if (!post.id || !post.id.includes('-')) return;
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(username, handle, avatar_initials)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    if (data) setLiveComments(data);
  };

  // Silently pre-load comments in background — count will update, expand on click
  useEffect(() => {
    if (post.id && post.id.includes('-')) loadComments();
  }, [post.id]);

  const toggleComments = () => {
    if (!showComments && liveComments === null) loadComments();
    setShowComments(s => !s);
  };

  const submitComment = async () => {
    if (isGuest) { onSignIn?.("Join the conversation and comment on posts."); return; }
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("comments").insert({
      post_id: post.id,
      user_id: authUser.id,
      content: commentText.trim(),
      reply_to_comment_id: replyTo?.id || null,
    }).select("*, profiles(username, handle, avatar_initials)").single();
    if (!error && data) {
      if (post.id && post.id.includes('-')) {
        await supabase.from("posts").update({ comment_count: (localPost.comment_count || 0) + (liveComments?.length || 0) + 1 }).eq("id", post.id);
        setLocalPost(p => ({ ...p, comment_count: (p.comment_count || 0) + 1 }));
      }
      const gameId = post.game_tag || post.gameId;
      if (gameId && gameId.includes('-') && authUser) logChartEvent(gameId, 'comment', authUser.id);
      // Quest triggers
      if (localPost.user.isNPC) {
        await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "npc_replied" });
        onQuestTrigger?.();
      }
      if (!localPost.user.isNPC && post.user_id && post.user_id !== authUser.id) {
        await supabase.rpc("increment_quest_progress", { p_user_id: post.user_id, p_trigger: "comment_received" });
        onQuestTrigger?.();
      }
      setLiveComments(prev => [...(prev || []), data]);
      setCommentText("");
      setReplyTo(null);
      setLocalPost(p => ({ ...p, commentList: [...p.commentList, data] }));
    }
    setSubmittingComment(false);
  };

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${localPost.user.isNPC ? C.goldBorder : C.border}`,
      borderRadius: 14, marginBottom: 12, overflow: "hidden",
      boxShadow: localPost.user.isNPC ? `0 0 0 1px ${C.goldGlow}` : "none",
    }}>
      <div style={{ padding: 20 }}>
        {/* Post header */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ cursor: "pointer" }}
            onClick={() => {
              if (localPost.user.isNPC) {
                if (localPost.npc_id) { setCurrentNPC(localPost.npc_id); setActivePage("npc"); }
                else { const npc = Object.values(NPCS).find(n => n.handle === localPost.user.handle); if (npc) { setCurrentNPC(npc.id); setActivePage("npc"); } }
              } else if (localPost.user_id) { setCurrentPlayer(localPost.user_id); setActivePage("player"); }
            }}>
            <Avatar initials={localPost.user.avatar} size={44} status={localPost.user.status} isNPC={localPost.user.isNPC} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 14, cursor: "pointer", color: localPost.user.isNPC ? C.gold : C.text }}
                onClick={() => {
                  if (localPost.user.isNPC) {
                    if (localPost.npc_id) { setCurrentNPC(localPost.npc_id); setActivePage("npc"); }
                    else { const npc = Object.values(NPCS).find(n => n.handle === localPost.user.handle); if (npc) { setCurrentNPC(npc.id); setActivePage("npc"); } }
                  } else if (localPost.user_id) { setCurrentPlayer(localPost.user_id); setActivePage("player"); }
                }}
              >{localPost.user.name}</span>
              {localPost.user.isNPC && <NPCBadge />}
              <span style={{ color: C.textDim, fontSize: 12 }}>{localPost.user.handle}</span>
              {(localPost.game || localPost.game_tag) && (() => {
                const gameId = localPost.gameId || localPost.game_tag;
                const displayName = taggedGameName || localPost.game;
                return displayName ? (
                  <span onClick={() => { if (gameId) { setCurrentGame(gameId); setActivePage("game"); } }}
                    style={{ cursor: gameId ? "pointer" : "default" }}>
                    <Badge small color={C.accent}>{displayName}</Badge>
                  </span>
                ) : null;
              })()}
            </div>
            <div style={{ color: C.textDim, fontSize: 12, marginTop: 2 }}>{localPost.time}</div>
          </div>
        </div>

        <p style={{ color: C.text, fontSize: 14, lineHeight: 1.65, margin: "0 0 14px", textAlign: "left" }}>{localPost.content}</p>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <button onClick={toggleLike} style={{
            background: localPost.liked ? `${C.red}18` : "transparent",
            border: `1px solid ${localPost.liked ? C.red + "44" : C.border}`,
            borderRadius: 8, padding: "5px 14px", cursor: "pointer",
            color: localPost.liked ? C.red : C.textMuted, fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s",
          }}>{localPost.liked ? "❤️" : "🤍"} {localPost.likes}</button>
          <button onClick={toggleComments} style={{
              background: showComments ? C.accentGlow : "transparent",
              border: `1px solid ${showComments ? C.accentDim : C.border}`,
              borderRadius: 8, padding: "5px 14px", cursor: "pointer",
              color: showComments ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 5,
            }}>💬 {liveComments !== null ? liveComments.length : (localPost.comment_count || localPost.comments || 0)}</button>
          {!isGuest && (
            <button onClick={() => {
              if (!showComments) {
                if (liveComments === null) loadComments();
                setShowComments(true);
              }
              setTimeout(() => commentInputRef.current?.focus(), 50);
            }} style={{
              background: "transparent", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "5px 14px", cursor: "pointer",
              color: C.textMuted, fontSize: 13, fontWeight: 600,
            }}>↩ Reply</button>
          )}
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ background: C.surfaceHover, borderTop: `1px solid ${C.border}`, padding: "14px 20px" }}>
          {(liveComments || localPost.commentList).map((comment, i) => {
            const isLive = !!comment.profiles || !!comment.npc_id;
            const npcData = comment.npc_id ? NPCS[comment.npc_id] : null;
            const isNPC = !!(comment.npc_id || (!isLive && comment.user?.isNPC));
            const author = npcData || (isLive ? comment.profiles : comment.user);
            const name = npcData ? npcData.name : (isLive ? author?.username : author?.name);
            const handle = npcData ? npcData.handle : author?.handle;
            const avatar = npcData ? npcData.avatar : (author?.avatar_initials || author?.avatar);
            const allComments = liveComments || localPost.commentList;
            // Find the comment being replied to
            const parentComment = comment.reply_to_comment_id
              ? allComments.find(c => c.id === comment.reply_to_comment_id)
              : null;
            const parentName = parentComment
              ? (NPCS[parentComment.npc_id]?.name || parentComment.profiles?.username || parentComment.user?.name || "someone")
              : null;
            const isMyComment = currentUser && comment.user_id === currentUser.id;
            return (
              <div key={comment.id} style={{ display: "flex", gap: 10, marginBottom: i < allComments.length - 1 ? 14 : 0 }}>
                <Avatar initials={avatar || "GL"} size={32} isNPC={isNPC} />
                <div style={{ flex: 1 }}>
                  <div style={{ background: C.surfaceRaised, border: `1px solid ${isNPC ? C.goldBorder : C.border}`, borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: isNPC ? C.gold : C.text }}>{name || "Gamer"}</span>
                      {isNPC && <NPCBadge />}
                      <span style={{ color: C.textDim, fontSize: 11 }}>{handle}</span>
                      <span style={{ color: C.textDim, fontSize: 11, marginLeft: "auto" }}>{timeAgo(comment.created_at) || comment.time}</span>
                    </div>
                    {parentName && (
                      <div style={{ color: C.textDim, fontSize: 11, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <span>↩</span>
                        <span style={{ color: C.accentSoft }}>@{parentName}</span>
                      </div>
                    )}
                    <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0, textAlign: "left" }}>{comment.content}</p>
                  </div>
                  {!isGuest && currentUser && (
                    <button onClick={() => { setReplyTo({ id: comment.id, name: name }); setShowComments(true); }}
                      style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: "4px 2px", marginTop: 2 }}>
                      ↩ Reply
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {/* Comment input */}
          <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            {isGuest ? (
              <div onClick={() => onSignIn?.("Join the conversation and comment on posts.")}
                style={{ flex: 1, background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.textDim, fontSize: 13, cursor: "pointer" }}>
                Sign in to join the conversation...
              </div>
            ) : currentUser ? (
              <div style={{ flex: 1 }}>
                {replyTo && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "5px 10px" }}>
                    <span style={{ color: C.accentSoft, fontSize: 12 }}>↩ Replying to <strong>{replyTo.name}</strong></span>
                    <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 14, cursor: "pointer", marginLeft: "auto", lineHeight: 1 }}>×</button>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <Avatar initials={currentUser?.avatar || "GL"} size={32} />
                  <input
                    ref={commentInputRef}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submitComment()}
                    placeholder={replyTo ? `Reply to ${replyTo.name}…` : "Write a comment…"}
                    style={{ flex: 1, background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 13, outline: "none" }}
                  />
                  <button onClick={submitComment} disabled={submittingComment || !commentText.trim()} style={{ background: commentText.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 14px", color: commentText.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {submittingComment ? "…" : "Reply"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: C.textDim, fontSize: 13 }}>Sign in to comment</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NPC PROFILE PAGE ─────────────────────────────────────────────────────────

function NPCProfilePage({ npcId, setActivePage, setCurrentNPC, setCurrentGame, setCurrentPlayer, isMobile, currentUser, onQuestTrigger }) {
  const npc = NPCS[npcId];
  const [activeTab, setActiveTab] = useState("posts");
  const [followed, setFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [liveNPC, setLiveNPC] = useState(null);
  const [npcPosts, setNpcPosts] = useState([]);

  useEffect(() => {
    loadNPCData();
    // Check if already following
    const checkFollow = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !npcId) return;
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("followed_npc_id", npcId).maybeSingle();
      setFollowed(!!data);
    };
    checkFollow();
  }, [npcId]);

  const toggleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setFollowLoading(true);
    if (followed) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_npc_id", npcId);
      setFollowed(false);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_npc_id: npcId });
      setFollowed(true);
      await supabase.rpc("increment_quest_progress", { p_user_id: user.id, p_trigger: "npc_followed" });
      onQuestTrigger?.();
    }
    setFollowLoading(false);
  };

  useEffect(() => {
    loadNPCData();
  }, [npcId]);

  const loadNPCData = async () => {
    // npcId can be a uuid (from database) or a string key like "merv" (from hardcoded)
    const isUUID = npcId && npcId.includes('-');
    let npcData = null;
    if (isUUID) {
      const { data } = await supabase.from("npcs").select("*").eq("id", npcId).single();
      npcData = data;
    } else if (npc) {
      const { data } = await supabase.from("npcs").select("*").eq("handle", npc.handle).single();
      npcData = data;
    }
    if (npcData) {
      setLiveNPC(npcData);
      const { data: posts } = await supabase
        .from("posts")
        .select("*")
        .eq("npc_id", npcData.id)
        .order("created_at", { ascending: false });
      if (posts) setNpcPosts(posts);
    }
  };

  if (!npc && !liveNPC) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.textMuted, fontSize: 14 }}>Loading...</div>
    </div>
  );

  const displayNPC = liveNPC ? {
    ...(npc || {}),
    name: liveNPC.name,
    handle: liveNPC.handle,
    bio: liveNPC.bio,
    followers: liveNPC.followers,
    role: liveNPC.role,
    location: liveNPC.location,
    avatar: liveNPC.avatar_initials || (npc?.avatar) || "NPC",
    universe: liveNPC.universe || (npc?.universe) || "Unknown",
    universeIcon: npc?.universeIcon || "⚔️",
  } : npc;

  const tabs = [
    { id: "posts", label: "📝 Posts" },
    { id: "stats", label: "📊 Stats" },
    { id: "lore", label: "📖 Lore" },
  ];

  return (
    <div style={{ paddingTop: isMobile ? 52 : 60 }}>
      {/* Gold hero header */}
      <div style={{
        background: `linear-gradient(135deg, #1a1200 0%, #2d2000 40%, #1a1200 100%)`,
        borderBottom: `1px solid ${C.goldBorder}`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 1px 1px, ${C.gold}08 1px, transparent 0)`, backgroundSize: "24px 24px" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 50%, rgba(245,158,11,0.08) 0%, transparent 60%)" }} />

        <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "24px 16px 20px" : "36px 24px 28px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 14 : 20, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            <div style={{
              width: isMobile ? 64 : 88, height: isMobile ? 64 : 88, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, #3d2e00, #7a5c00)`,
              border: `3px solid ${C.gold}66`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: isMobile ? 22 : 32, fontWeight: 800, color: C.gold, letterSpacing: "-1px",
              boxShadow: `0 0 32px ${C.gold}22`,
            }}>{displayNPC.avatar}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <h1 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? 20 : 26, color: C.gold, letterSpacing: "-0.5px" }}>{displayNPC.name}</h1>
                <NPCBadge />
                <span style={{ background: `${C.gold}18`, color: C.gold, border: `1px solid ${C.goldBorder}`, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                  {displayNPC.universeIcon} {displayNPC.universe}
                </span>
              </div>
              <div style={{ color: `${C.gold}99`, fontSize: 12, marginBottom: 4 }}>{displayNPC.handle}</div>
              <div style={{ color: `${C.gold}77`, fontSize: 12, marginBottom: isMobile ? 6 : 10 }}>{displayNPC.role}</div>
              {!isMobile && <div style={{ color: `${C.gold}55`, fontSize: 12, marginBottom: 14 }}>📍 {displayNPC.location}</div>}
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: "0 0 14px", lineHeight: 1.65 }}>{displayNPC.bio}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={toggleFollow} disabled={followLoading} style={{ background: followed ? C.goldGlow : C.gold, border: `1px solid ${C.gold}`, borderRadius: 8, padding: "7px 18px", color: followed ? C.gold : "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{followLoading ? "..." : followed ? "✓ Following" : "+ Follow"}</button>
                <button style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 14px", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>Share</button>
              </div>
            </div>

            {/* Header stats — row on mobile, column on desktop */}
            <div style={{ display: "flex", gap: 8, flexShrink: 0, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-start", flexDirection: isMobile ? "row" : "column" }}>
              {[
                { label: "Followers", value: ((displayNPC.followers || 0) / 1000).toFixed(1) + "k", color: C.gold },
                { label: "Yrs Service", value: displayNPC.yearsOfService || "—", color: "#e8d5a0" },
                { label: "Associates", value: displayNPC.connections || "—", color: C.textMuted },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${C.goldBorder}`, borderRadius: 10, padding: isMobile ? "8px 12px" : "12px 16px", textAlign: "center", flex: isMobile ? 1 : "none", minWidth: isMobile ? 0 : 90 }}>
                  <div style={{ fontWeight: 800, fontSize: isMobile ? 14 : 18, color: s.color }}>{s.value}</div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.goldBorder}`, position: "sticky", top: isMobile ? 52 : 60, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px", display: "flex", gap: 2 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              background: "transparent", border: "none",
              borderBottom: activeTab === tab.id ? `2px solid ${C.gold}` : "2px solid transparent",
              padding: isMobile ? "12px 14px" : "14px 18px", cursor: "pointer",
              color: activeTab === tab.id ? C.gold : C.textMuted,
              fontSize: isMobile ? 12 : 13, fontWeight: activeTab === tab.id ? 700 : 500,
            }}>{tab.label}</button>
          ))}
          <button onClick={() => setActivePage(isMobile ? "npcs" : "feed")} style={{ marginLeft: "auto", background: "transparent", border: "none", color: C.textDim, fontSize: 12, cursor: "pointer", padding: "12px 0" }}>← Back</button>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "16px 16px 80px" : "24px" }}>

        {/* POSTS TAB */}
        {activeTab === "posts" && (
          <div>
            {(npcPosts).map(post => {
              const isLivePost = !!post.created_at;
              const feedPost = isLivePost ? {
                id: post.id,
                npc_id: post.npc_id || liveNPC?.id,
                game_tag: post.game_tag,
                user: {
                  name: displayNPC.name,
                  handle: displayNPC.handle,
                  avatar: displayNPC.avatar,
                  status: "online",
                  isNPC: true,
                },
                content: post.content,
                time: timeAgo(post.created_at),
                likes: post.likes || 0,
                liked: post.liked || false,
                commentList: [],
              } : {
                ...post,
                user: { ...post.user, isNPC: true },
              };
              return <FeedPostCard key={post.id} post={feedPost} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={currentUser} />;
            })}
            {npcPosts.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🕯️</div>
                <div style={{ fontSize: 14 }}>No posts yet. They're thinking about it.</div>
              </div>
            )}
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === "stats" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: C.gold, fontSize: 18, marginBottom: 4 }}>In-Game Record</div>
              <div style={{ color: C.textDim, fontSize: 13 }}>Official statistics from {displayNPC.universe} records. Verified by the guild.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14 }}>
              {(npc?.stats || []).map((stat, i) => (
                <div key={i} style={{
                  background: C.surface, border: `1px solid ${C.goldBorder}`,
                  borderRadius: 14, padding: 20, position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: `radial-gradient(circle, ${C.gold}08, transparent)` }} />
                  <div style={{ fontWeight: 900, fontSize: 28, color: C.gold, marginBottom: 6, letterSpacing: "-0.5px" }}>{stat.value}</div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ color: C.textDim, fontSize: 12, fontStyle: "italic", lineHeight: 1.5 }}>{stat.note}</div>
                </div>
              ))}
            </div>

            {/* Games observed */}
            <div style={{ marginTop: 20, background: C.surface, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.gold, fontSize: 14, marginBottom: 14 }}>🎮 Games Observed</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {npc.games.map(g => (
                  <span key={g} style={{ background: C.goldGlow, color: C.gold, border: `1px solid ${C.goldBorder}`, borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600 }}>{g}</span>
                ))}
              </div>
              <div style={{ color: C.textDim, fontSize: 12, marginTop: 12 }}>These are the worlds {npc.name.split(" ")[0]} follows, comments on, and has feelings about.</div>
            </div>
          </div>
        )}

        {/* LORE TAB */}
        {activeTab === "lore" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 20 }}>
            <div>
              <div style={{ background: C.surface, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 28, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, color: C.gold, fontSize: 18, marginBottom: 4 }}>Origin</div>
                <div style={{ color: `${C.gold}66`, fontSize: 12, marginBottom: 16 }}>From the official {displayNPC.universe} lore archives</div>
                <p style={{ color: C.text, fontSize: 15, lineHeight: 1.8, margin: 0 }}>{npc?.lore || displayNPC.bio || "Lore coming soon."}</p>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 28 }}>
                <div style={{ fontWeight: 800, color: C.gold, fontSize: 16, marginBottom: 16 }}>Sample Interactions</div>
                {[
                  { context: "On an Elden Ring post", quote: "I have inventory relevant to this situation. I am available. The cave is lit." },
                  { context: "When @mentioned", quote: "I appreciate being included. This does not happen often." },
                  { context: "On a patch notes post", quote: "Nothing in this patch affects the cave economy. I note this without emotion." },
                ].map((ex, i) => (
                  <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ color: C.textDim, fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{ex.context}</div>
                    <div style={{ background: C.goldGlow, border: `1px solid ${C.goldBorder}`, borderRadius: 8, padding: "12px 14px", color: C.text, fontSize: 14, lineHeight: 1.6, fontStyle: "italic" }}>"{ex.quote}"</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ background: C.surface, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: C.gold, fontSize: 14, marginBottom: 14 }}>Universe</div>
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>{displayNPC.universeIcon}</div>
                  <div style={{ fontWeight: 800, color: C.gold, fontSize: 16 }}>{displayNPC.universe}</div>
                  <div style={{ color: C.textDim, fontSize: 12, marginTop: 6 }}>A GuildLink original universe</div>
                  <div style={{ marginTop: 14, color: C.textMuted, fontSize: 13 }}>Meet the cast:</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {Object.values(NPCS).filter(n => n.universe === npc.universe && n.id !== npc.id).map(n => (
                      <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 6, background: C.goldGlow, border: `1px solid ${C.goldBorder}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
                        <Avatar initials={n.avatar} size={22} isNPC={true} />
                        <span style={{ color: C.gold, fontSize: 11, fontWeight: 600 }}>{n.name.split(" ")[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ background: C.goldGlow, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
                <div style={{ fontWeight: 700, color: C.gold, fontSize: 14, marginBottom: 8 }}>Interested in Sponsored NPCs?</div>
                <div style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Game studios can create official character accounts tied to real game pages. Players love it.</div>
                <button style={{ background: C.gold, border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Learn More</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────

// ─── FOUNDING MEMBER PAGE ─────────────────────────────────────────────────────

function FoundingMemberPage({ setActivePage, isMobile, onSignUp }) {
  const [showInvite, setShowInvite] = useState(false);
  const pct = (FOUNDING.claimed / FOUNDING.total) * 100;
  const remaining = FOUNDING.total - FOUNDING.claimed;

  const perks = [
    { icon: "🪙", title: "The Founding Ring", desc: "A permanent gold ring on your profile avatar. Visible to everyone, forever. The only way to get it is to be here first — it can't be earned through quests." },
    { icon: "🏆", title: "Founding Member Badge", desc: "A permanent badge on your profile marking you as one of the first 5,000. If GuildLink becomes what we think it will, this badge will mean something." },
    { icon: "📊", title: "Gaming Report — Coming Soon", desc: "A monthly breakdown of your gaming life — hours played, completions, taste shifts, how you rank on GuildLink. Think Spotify Wrapped, but for games." },
    { icon: "🎯", title: "Ads Based on Games, Not You", desc: "GuildLink is free because we sell ads to game studios. If you see an ad, it's because you play that game — not because we profiled you. No behavioral targeting. No data brokers." },
    { icon: "🏰", title: "Guild Hubs — Coming Soon", desc: "Private community spaces with custom branding and member management. Founding members get first access when it launches." },
    { icon: "⚔️", title: "Invite Rewards", desc: "Bring in other gamers and earn credit for it. Invite rewards are coming — and founding members will be the first to see them." },
  ];

  return (
    <div style={{ minHeight: "100vh", paddingTop: 60, background: C.bg }}>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, #0f0a00 0%, #1f1500 40%, #0a0800 100%)`,
        borderBottom: `1px solid ${C.goldBorder}`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 1px 1px, ${C.gold}06 1px, transparent 0)`, backgroundSize: "32px 32px" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, background: `radial-gradient(circle, ${C.gold}08 0%, transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ maxWidth: 760, margin: "0 auto", padding: isMobile ? "40px 16px 32px" : "64px 24px 56px", textAlign: "center", position: "relative" }}>
          {/* Ring preview */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: 96, height: 96, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.accent}cc, ${C.accent}55)`,
                border: `3px solid ${C.gold}`,
                boxShadow: `0 0 40px ${C.gold}44, 0 0 80px ${C.gold}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, fontWeight: 800, color: "#fff",
              }}>GL</div>
              <div style={{
                position: "absolute", inset: -4, borderRadius: "50%",
                border: `3px solid ${C.gold}`,
                boxShadow: `0 0 20px ${C.gold}66`,
                animation: "pulse 2s ease-in-out infinite",
              }} />
            </div>
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.goldGlow, border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ color: C.gold, fontSize: 12, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>⚙ Founding Membership</span>
          </div>

          <h1 style={{ margin: "0 0 16px", fontWeight: 900, fontSize: isMobile ? 32 : 42, color: "#fff", letterSpacing: "-1px", lineHeight: 1.1, textAlign: "center" }}>
            The town square<br /><span style={{ color: C.gold }}>needs its first citizens.</span>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: isMobile ? 15 : 17, maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.7, textAlign: "center" }}>
            GuildLink is free. No subscription, no paywall, no catch. Founding membership is just about being here first — and getting a permanent mark to prove it.
          </p>

          {/* Progress bar */}
          <div style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: "24px 28px", maxWidth: 500, margin: "0 auto 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: C.gold, fontWeight: 800, fontSize: 22 }}>{FOUNDING.claimed.toLocaleString()}</span>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, alignSelf: "center" }}>of {FOUNDING.total.toLocaleString()} founding spots</span>
            </div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.gold}aa, ${C.gold})`, borderRadius: 5, transition: "width 1s ease" }} />
            </div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
              <span style={{ color: C.gold, fontWeight: 700 }}>{remaining.toLocaleString()} spots remaining</span> · Closes when full
            </div>
          </div>

          {/* CTA */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <button onClick={() => onSignUp?.()} style={{
              background: `linear-gradient(135deg, ${C.gold}, #d97706)`,
              border: "none", borderRadius: 12, padding: "16px 48px",
              color: "#000", fontSize: 16, fontWeight: 900, cursor: "pointer",
              boxShadow: `0 8px 32px ${C.gold}44`,
              letterSpacing: "-0.3px",
            }}>Claim Your Founding Spot — Free</button>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No credit card. No subscription. Just sign up.</div>
          </div>
        </div>
      </div>

      {/* Perks grid */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "32px 16px 80px" : "56px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontWeight: 800, color: C.text, fontSize: isMobile ? 22 : 26, marginBottom: 8 }}>What founding members get</div>
          <div style={{ color: C.textMuted, fontSize: 15 }}>All of it free, all of it permanent.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 56 }}>
          {perks.map((perk, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{perk.icon}</div>
              <div style={{ fontWeight: 700, color: C.gold, fontSize: 15, marginBottom: 8 }}>{perk.title}</div>
              <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.65 }}>{perk.desc}</div>
            </div>
          ))}
        </div>

        {/* Ring showcase */}
        <div style={{ background: C.surface, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: 32, marginBottom: 40 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 20, marginBottom: 6 }}>Profile Rings — Earn Your Mark</div>
            <div style={{ color: C.textMuted, fontSize: 14 }}>Every ring tells a story. The founding ring is the only one you can't earn through quests.</div>
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            {PROFILE_RINGS.filter(r => r.id !== "none").map(ring => (
              <div key={ring.id} style={{ textAlign: "center", width: 100 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                  <div style={{ position: "relative", width: 56, height: 56 }}>
                    <div style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `3px solid ${ring.color}`, boxShadow: `0 0 16px ${ring.glow || ring.color + "44"}` }} />
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${ring.color}22, ${ring.color}11)`, border: `2px solid ${ring.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      {ring.icon || "●"}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: ring.color, fontSize: 11, marginBottom: 3 }}>{ring.label}</div>
                <div style={{ color: C.textDim, fontSize: 10, lineHeight: 1.4 }}>{ring.how}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite CTA */}
        <div style={{ background: `linear-gradient(135deg, #0f0a00, #1f1500)`, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: isMobile ? 20 : 32, textAlign: "center" }}>
          <div style={{ fontWeight: 800, color: C.gold, fontSize: isMobile ? 17 : 20, marginBottom: 10 }}>Know a gamer who'd get it?</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
            Founding spots are limited to 5,000. Invite a friend and they'll claim one before it's gone — along with everything that comes with it. Invite rewards are coming soon.
          </div>
          <button onClick={() => setShowInvite(true)} style={{ background: `linear-gradient(135deg, ${C.gold}, #d97706)`, border: "none", borderRadius: 10, padding: "12px 36px", color: "#000", fontSize: 14, fontWeight: 900, cursor: "pointer" }}>
            Invite a Friend
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }`}</style>
    </div>
  );
}

// ─── FOUNDING BANNER ──────────────────────────────────────────────────────────

function InviteModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, maxWidth: 400, width: "100%" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>⚔️</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 6, textAlign: "center" }}>Invite a Friend</div>
        <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 24, textAlign: "center" }}>
          {FOUNDING.total - FOUNDING.claimed} founding spots left. Invite someone and they'll claim one before it's gone — along with a permanent gold founder ring.
        </div>
        {sent ? (
          <div style={{ background: `${C.green}15`, border: `1px solid ${C.green}44`, borderRadius: 12, padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✉️</div>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 14 }}>Invite sent!</div>
            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>We'll let them know you vouched for them.</div>
          </div>
        ) : (
          <>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="friend@email.com"
              type="email"
              style={{ width: "100%", background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
            />
            <button
              onClick={() => { if (email.includes("@")) setSent(true); }}
              style={{ width: "100%", background: `linear-gradient(135deg, ${C.gold}, #d97706)`, border: "none", borderRadius: 10, padding: "12px", color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 10 }}>
              Send Invite
            </button>
            <div style={{ color: C.textDim, fontSize: 11, textAlign: "center" }}>Invite rewards coming soon — you'll get credit for everyone you bring in.</div>
          </>
        )}
        <button onClick={onClose} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", color: C.textDim, fontSize: 13, cursor: "pointer" }}>
          Close
        </button>
      </div>
    </div>
  );
}

function FoundingBanner({ onDismiss, setActivePage, isGuest, isMobile, onSignUp }) {
  const [showInvite, setShowInvite] = useState(false);
  const spotsLeft = FOUNDING.total - FOUNDING.claimed;
  const pct = (FOUNDING.claimed / FOUNDING.total) * 100;

  return (
    <>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      <div style={{
        background: `linear-gradient(135deg, #1a1200, #2d2000)`,
        border: `1px solid ${C.goldBorder}`,
        borderRadius: 12, padding: isMobile ? "12px 14px" : "14px 18px", marginBottom: 14,
        display: "flex", alignItems: "center", gap: isMobile ? 10 : 16, flexWrap: isMobile ? "wrap" : "nowrap",
        boxShadow: `0 0 0 1px ${C.goldGlow}`,
        position: "relative",
      }}>
        <div style={{ fontSize: isMobile ? 20 : 24, flexShrink: 0 }}>⚔️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, color: C.gold, fontSize: isMobile ? 12 : 13 }}>
              {isGuest ? "Founding membership is free — for now." : "Founding spots are almost gone."}
            </span>
            <span style={{ background: C.goldGlow, color: C.gold, border: `1px solid ${C.goldBorder}`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>
              {spotsLeft.toLocaleString()} left
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 4, maxWidth: 280 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.gold}88, ${C.gold})`, borderRadius: 2, transition: "width 0.6s ease" }} />
          </div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: isMobile ? 10 : 11 }}>
            {isGuest
              ? "Sign up now and claim a permanent gold founder ring. No payment, no catch."
              : "Invite friends before spots run out — you'll get credit for everyone you bring in."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          {isGuest ? (
            <button onClick={() => onSignUp?.()}
              style={{ background: `linear-gradient(135deg, ${C.gold}, #d97706)`, border: "none", borderRadius: 8, padding: isMobile ? "7px 14px" : "8px 18px", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              Claim Your Spot
            </button>
          ) : (
            <>
              <button onClick={() => setShowInvite(true)}
                style={{ background: `linear-gradient(135deg, ${C.gold}, #d97706)`, border: "none", borderRadius: 8, padding: isMobile ? "7px 14px" : "8px 18px", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                Invite a Friend
              </button>
              <button onClick={() => setActivePage("founding")}
                style={{ background: "transparent", border: `1px solid ${C.goldBorder}`, borderRadius: 8, padding: isMobile ? "7px 12px" : "8px 14px", color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                Details
              </button>
            </>
          )}
          <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 18, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>×</button>
        </div>
      </div>
    </>
  );
}


// ─── SIGN IN PROMPT MODAL ─────────────────────────────────────────────────────

function SignInPrompt({ onClose, onSignIn, message }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, maxWidth: 380, width: "100%", textAlign: "center" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>⚔️</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 8, letterSpacing: "-0.5px" }}>Join the Guild</div>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {message || "Create a free account to post, review games, and build your shelf."}
        </div>
        <button onClick={onSignIn} style={{ width: "100%", background: C.accent, border: "none", borderRadius: 10, padding: "12px", color: C.accentText, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
          Create Free Account
        </button>
        <button onClick={onSignIn} style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px", color: C.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Sign In
        </button>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, fontSize: 13, cursor: "pointer", marginTop: 14 }}>
          Continue browsing
        </button>
      </div>
    </div>
  );
}


// ─── POST MODAL ───────────────────────────────────────────────────────────────

function PostModal({ postId, onClose, currentUser }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const modalInputRef = useRef(null);

  useEffect(() => {
    if (replyTo) modalInputRef.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase
        .from("posts")
        .select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials)")
        .eq("id", postId)
        .single();
      const { data: c } = await supabase
        .from("comments")
        .select("*, profiles(username, handle, avatar_initials)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (p) setPost(p);
      if (c) setComments(c);
      setLoading(false);
    };
    load();
  }, [postId]);

  const submitComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    const { data: { user: au } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: au.id,
      content: commentText.trim(),
      reply_to_comment_id: replyTo?.id || null,
    }).select("*, profiles(username, handle, avatar_initials)").single();
    if (!error && data) {
      setComments(prev => [...prev, data]);
      setCommentText("");
      setReplyTo(null);
    }
    setSubmitting(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 580, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>Post</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.textDim, fontSize: 13 }}>Loading…</div>
          ) : !post ? (
            <div style={{ padding: 40, textAlign: "center", color: C.textDim, fontSize: 13 }}>Post not found.</div>
          ) : (
            <>
              {/* The post */}
              <div style={{ padding: 20, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <Avatar initials={(post.profiles?.avatar_initials || post.profiles?.username || "?").slice(0,2).toUpperCase()} size={38} />
                  <div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{post.profiles?.username || "Unknown"}</div>
                    <div style={{ color: C.textDim, fontSize: 12 }}>{post.profiles?.handle} · {timeAgo(post.created_at)}</div>
                  </div>
                </div>
                <p style={{ color: C.text, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{post.content}</p>
                <div style={{ color: C.textDim, fontSize: 12, marginTop: 12 }}>♥ {post.likes || 0} · 💬 {comments.length}</div>
              </div>

              {/* Comments */}
              <div style={{ padding: "14px 20px" }}>
                {comments.length === 0 ? (
                  <div style={{ color: C.textDim, fontSize: 13, marginBottom: 16 }}>No comments yet. Be first.</div>
                ) : comments.map((c, i) => {
                  const npcData = c.npc_id ? NPCS[c.npc_id] : null;
                  const isNPC = !!npcData;
                  const name = npcData?.name || c.profiles?.username || "Unknown";
                  const avatar = npcData?.avatar || c.profiles?.avatar_initials || "?";
                  const parentComment = c.reply_to_comment_id ? comments.find(x => x.id === c.reply_to_comment_id) : null;
                  const parentName = parentComment ? (NPCS[parentComment.npc_id]?.name || parentComment.profiles?.username || "someone") : null;
                  return (
                    <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      <Avatar initials={avatar.slice(0,2).toUpperCase()} size={30} isNPC={isNPC} />
                      <div style={{ flex: 1 }}>
                        <div style={{ background: C.surface, border: `1px solid ${isNPC ? C.goldBorder : C.border}`, borderRadius: 10, padding: "9px 13px" }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: isNPC ? C.gold : C.text }}>{name}</span>
                            {isNPC && <NPCBadge />}
                            <span style={{ color: C.textDim, fontSize: 11, marginLeft: "auto" }}>{timeAgo(c.created_at)}</span>
                          </div>
                          {parentName && (
                            <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>↩ <span style={{ color: C.accentSoft }}>@{parentName}</span></div>
                          )}
                          <p style={{ color: C.text, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{c.content}</p>
                        </div>
                        {currentUser && (
                          <button onClick={() => setReplyTo({ id: c.id, name })}
                            style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: "4px 2px", marginTop: 2 }}>↩ Reply</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Comment input */}
        {currentUser && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            {replyTo && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "5px 10px" }}>
                <span style={{ color: C.accentSoft, fontSize: 12 }}>↩ Replying to <strong>{replyTo.name}</strong></span>
                <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 14, cursor: "pointer", marginLeft: "auto" }}>×</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <Avatar initials={currentUser.avatar || "GL"} size={32} />
              <input ref={modalInputRef} value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitComment()}
                placeholder={replyTo ? `Reply to ${replyTo.name}…` : "Write a comment…"}
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 13, outline: "none" }}
              />
              <button onClick={submitComment} disabled={submitting || !commentText.trim()}
                style={{ background: commentText.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 16px", color: commentText.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {submitting ? "…" : "Reply"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NAV BAR ──────────────────────────────────────────────────────────────────
function NavBar({ activePage, setActivePage, isMobile, signOut, currentUser, isGuest, onSignIn, onSignUp, notifications, onMarkAllRead, onClearAll, onOpenPost, setProfileDefaultTab }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = (notifications || []).filter(n => !n.read).length;
  const isAdmin = currentUser?.is_admin;
  const isWriter = currentUser?.is_admin || currentUser?.is_writer;

  const handleNavClick = (id) => {
    if (id === "reviews-nav") {
      setProfileDefaultTab?.("reviews");
      setActivePage("profile");
    } else {
      setActivePage(id);
    }
  };
  const mobileItems = [
    { id: "feed", icon: "⊞", label: "Feed" },
    { id: "games", icon: "🎮", label: "Games" },
    ...(!isGuest ? [{ id: "reviews-nav", icon: "⭐", label: "Reviews" }] : []),
    { id: "squad", icon: "⚡", label: "LFG" },
  ];
  const desktopItems = [
    { id: "feed", icon: "⊞", label: "Feed" },
    { id: "games", icon: "🎮", label: "Games" },
    ...(!isGuest ? [{ id: "reviews-nav", icon: "⭐", label: "Reviews" }] : []),
    { id: "squad", icon: "⚡", label: "LFG" },
    { id: "founding", icon: "⚔️", label: "Founding", gold: true },
    ...(isAdmin ? [{ id: "admin", icon: "⚡", label: "Admin", admin: true }] : []),
    ...(isWriter ? [{ id: "npc-studio", icon: "✍️", label: "Studio", admin: true }] : []),
  ];

  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: `${C.bg}f8`, backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.border}`,
          height: 52, display: "flex", alignItems: "center", padding: "0 16px", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setActivePage("feed")}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>G</div>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.text, letterSpacing: "-0.5px" }}>Guild<span style={{ color: C.accent }}>Link</span></span>
          </div>
          <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
            <span style={{ position: "absolute", left: 10, color: C.textDim, fontSize: 12 }}>🔍</span>
            <input placeholder="Search..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px 6px 28px", color: C.text, fontSize: 13, outline: "none" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isGuest ? (
              <button onClick={onSignIn} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "6px 14px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Sign In</button>
            ) : (
              <>
                <button style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: C.textMuted, position: "relative", padding: "4px" }}>
                  🔔<span style={{ position: "absolute", top: 0, right: 0, background: C.accent, color: C.accentText, borderRadius: "50%", width: 14, height: 14, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>4</span>
                </button>
                <div onClick={() => setActivePage("profile")} style={{ cursor: "pointer" }}>
                  <Avatar initials={currentUser?.avatar || "GL"} size={30} status="online" founding={currentUser?.isFounding} ring={currentUser?.activeRing || "none"} />
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Mobile bottom tab bar */}
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: `${C.surface}fc`, backdropFilter: "blur(20px)",
          borderTop: `1px solid ${C.border}`,
          height: 60, display: "flex", alignItems: "center",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}>
          {mobileItems.map(item => {
            const active = activePage === item.id || (item.id === "npcs" && activePage === "npc");
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id)} style={{
                color: active ? C.accentSoft : C.textDim,
              }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
                {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.accent, position: "absolute", bottom: 8 }} />}
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
      background: `${C.bg}f0`, backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${C.border}`,
      height: 60, display: "flex", alignItems: "center", padding: "0 24px", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 20, cursor: "pointer" }} onClick={() => setActivePage("feed")}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff" }}>G</div>
        <span style={{ fontWeight: 800, fontSize: 18, color: C.text, letterSpacing: "-0.5px" }}>Guild<span style={{ color: C.accent }}>Link</span></span>
      </div>
      <div style={{ flex: 1, maxWidth: 300, position: "relative", display: "flex", alignItems: "center" }}>
        <span style={{ position: "absolute", left: 12, color: C.textDim, fontSize: 13 }}>🔍</span>
        <input placeholder="Search games, players, squads..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px 7px 32px", color: C.text, fontSize: 13, outline: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
        {desktopItems.map(item => (
          <button key={item.id} onClick={() => handleNavClick(item.id)} style={{
            background: item.gold ? activePage === item.id ? C.goldGlow : "transparent" : item.admin ? activePage === item.id ? "#ef444420" : "transparent" : activePage === item.id ? C.accentGlow : "transparent",
            border: item.gold ? activePage === item.id ? `1px solid ${C.goldBorder}` : "1px solid transparent" : item.admin ? activePage === item.id ? "1px solid #ef444440" : "1px solid transparent" : activePage === item.id ? `1px solid ${C.accentDim}` : "1px solid transparent",
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
            <button onClick={onSignIn} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Sign In</button>
            <button onClick={onSignUp} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "6px 16px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Join Free</button>
          </>
        ) : (
          <>
            <div style={{ position: "relative" }}>
              <button onClick={() => { setShowNotifs(s => !s); if (!showNotifs && unreadCount > 0) onMarkAllRead?.(); }}
                style={{ background: showNotifs ? C.accentGlow : "transparent", border: `1px solid ${showNotifs ? C.accentDim : "transparent"}`, borderRadius: 8, cursor: "pointer", fontSize: 18, color: unreadCount > 0 ? C.text : C.textMuted, position: "relative", padding: "4px 8px", display: "flex", alignItems: "center" }}>
                🔔
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: 2, right: 2, background: C.accent, color: C.accentText, borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 200, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                  <div style={{ maxHeight: 420, overflowY: "auto" }}>
                    {(!notifications || notifications.length === 0) ? (
                      <div style={{ padding: 32, textAlign: "center", color: C.textDim, fontSize: 13 }}>Nothing yet.</div>
                    ) : notifications.map((n, i) => {
                      const actor = n.actor;
                      const npcData = n.npc_id ? NPCS[n.npc_id] : null;
                      const isNPC = !!npcData;
                      const isUnread = !n.read;
                      const hasPost = !!n.post_id;
                      const isGamertagRequest = n.type === "gamertag_request";
                      const avatarInitials = isNPC
                        ? (npcData.avatar || npcData.name || "NPC").slice(0,2).toUpperCase()
                        : (actor?.avatar_initials || actor?.username || "?").slice(0,2).toUpperCase();
                      return (
                        <div key={n.id}
                          onClick={() => {
                            if (hasPost) { onOpenPost?.(n.post_id); setShowNotifs(false); }
                            else if (isGamertagRequest) { setActivePage("profile"); setShowNotifs(false); }
                          }}
                          style={{ padding: "12px 16px", borderBottom: i < notifications.length - 1 ? `1px solid ${C.border}` : "none", background: isUnread ? `${C.accent}0a` : "transparent", display: "flex", gap: 10, alignItems: "flex-start", cursor: (hasPost || isGamertagRequest) ? "pointer" : "default", transition: "background 0.1s" }}
                          onMouseEnter={e => { if (hasPost || isGamertagRequest) e.currentTarget.style.background = C.surfaceHover; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isUnread ? `${C.accent}0a` : "transparent"; }}
                        >
                          <Avatar initials={avatarInitials} size={30} isNPC={isNPC} />
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
                                  <strong>{actor?.username || "Someone"}</strong> {notifLabel(n)}
                                </span>
                              )}
                            </div>
                            <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                            {isUnread && <div style={{ width: 7, height: 7, borderRadius: "50%", background: isNPC ? C.gold : C.accent }} />}
                            {(hasPost || isGamertagRequest) && <span style={{ color: C.textDim, fontSize: 11 }}>→</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div onClick={() => setActivePage("profile")} style={{ cursor: "pointer" }}>
              <Avatar initials={currentUser?.avatar || "GL"} size={34} status="online" founding={currentUser?.isFounding} ring={currentUser?.activeRing || "none"} />
            </div>
            {signOut && <button onClick={signOut} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>Sign Out</button>}
          </>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ color: C.gold, fontSize: 10, opacity: 0.7, userSelect: "none", fontWeight: 600 }}>b0307-117</span>
          <a href="https://4gbipj3w.paperform.co" target="_blank" rel="noopener noreferrer" style={{ color: C.textDim, fontSize: 10, opacity: 0.6, textDecoration: "none", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}>
            feedback
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── NPC BROWSE PAGE (mobile tab) ────────────────────────────────────────────

function NPCBrowsePage({ setActivePage, setCurrentNPC }) {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "70px 16px 80px" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 22, color: C.text }}>GuildLink NPCs</h2>
        <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>Original characters from the GuildLink universe. They're out here living their best lives.</p>
      </div>
      {Object.values(NPCS).map(npc => (
        <div key={npc.id} onClick={() => { setCurrentNPC(npc.id); setActivePage("npc"); }}
          style={{ background: C.surface, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 18, marginBottom: 12, display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }}>
          <Avatar initials={npc.avatar} size={50} isNPC={true} status={npc.status} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: C.gold, fontSize: 15 }}>{npc.name}</span>
              <NPCBadge />
            </div>
            <div style={{ color: C.textDim, fontSize: 12, marginBottom: 4 }}>{npc.handle}</div>
            <div style={{ color: C.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{npc.role}</div>
            <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
              <span style={{ color: C.textDim, fontSize: 11 }}>👥 {(npc.followers / 1000).toFixed(1)}k followers</span>
              <span style={{ color: C.textDim, fontSize: 11 }}>{npc.universeIcon} {npc.universe}</span>
            </div>
          </div>
          <span style={{ color: C.textDim, fontSize: 18 }}>→</span>
        </div>
      ))}
    </div>
  );
}

// ─── TRENDING WIDGET ──────────────────────────────────────────────────────────

function TrendingWidget({ setActivePage, setCurrentGame }) {
  const [games, setGames] = useState([]);

  useEffect(() => {
    supabase.from("games")
      .select("id, name, genre, followers")
      .order("followers", { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setGames(data); });
  }, []);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ fontWeight: 700, color: C.text, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Trending</div>
      {games.length === 0 ? (
        <div style={{ color: C.textDim, fontSize: 12 }}>Loading...</div>
      ) : games.map((g, i) => (
        <div key={g.id} onClick={() => { setCurrentGame(g.id); setActivePage("game"); }}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < games.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          <div style={{ color: C.textDim, fontSize: 11, fontWeight: 700, width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
            {g.genre && <div style={{ color: C.textDim, fontSize: 10 }}>{g.genre}</div>}
          </div>
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
        .select("status, games(id, name, genre)")
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
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < shelfGames.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
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

// ─── FEED PAGE ────────────────────────────────────────────────────────────────

// ─── CHARTS WIDGET ────────────────────────────────────────────────────────────

function ChartsWidget({ setActivePage, setCurrentGame, category, refreshKey, limit }) {
  const [charts, setCharts] = useState([]);
  const [prevCharts, setPrevCharts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Get current week start (Sunday midnight Pacific)
      const weekStart = getWeekStart();

      // Live scores from chart_events this week
      let query = supabase
        .from("chart_events")
        .select("game_id, event_type, games(id, name, category, genre)")
        .eq("week_start", weekStart);
      if (category) query = query.eq("games.category", category);

      const { data: events } = await query;

      if (events) {
        // Aggregate scores per game with decay for posts, dedup for others
        const scoreMap = {};
        const countMap = {};
        const userMap = {}; // track unique users per game

        // Group post sequences per user per game
        const postSeqs = {};
        events.forEach(e => {
          if (!e.games) return;
          const id = e.game_id;
          if (!scoreMap[id]) {
            scoreMap[id] = 0;
            countMap[id] = { game: e.games, post: 0, review: 0, shelf_playing: 0, shelf_want: 0, shelf_played: 0, comment: 0 };
            userMap[id] = new Set();
          }
          userMap[id].add(e.user_id);
          if (e.event_type === 'post') {
            // Decay: seq 1=1.0, 2=0.5, 3=0.25, 4+=0.1
            const seq = e.post_sequence || 1;
            const weight = seq === 1 ? 1.0 : seq === 2 ? 0.5 : seq === 3 ? 0.25 : 0.1;
            scoreMap[id] += weight;
            countMap[id].post++;
          } else {
            const weights = { review: 2, shelf_playing: 3, shelf_want: 1.5, shelf_played: 1, comment: 0.5 };
            scoreMap[id] += weights[e.event_type] || 0;
            if (countMap[id][e.event_type] !== undefined) countMap[id][e.event_type]++;
          }
        });

        // Apply breadth multiplier: 1 + ln(unique_users) * 0.2
        const sorted = Object.entries(scoreMap)
          .map(([id, rawScore]) => {
            const uniqueUsers = userMap[id].size;
            const finalScore = rawScore * (1 + Math.log(Math.max(uniqueUsers, 1)) * 0.2);
            return { id, rawScore, finalScore, uniqueUsers, ...countMap[id] };
          })
          .sort((a, b) => b.finalScore - a.finalScore)
          .slice(0, limit || 10)
          .map((entry, i) => ({
            rank: i + 1,
            ...entry,
            name: entry.game.name,
            dominantSignal: getDominantSignal(entry),
          }));
        setCharts(sorted);

        // Get last week's rankings for movement arrows
        const lastWeek = new Date(new Date(weekStart).setDate(new Date(weekStart).getDate() - 7)).toISOString().split('T')[0];
        const { data: history } = await supabase
          .from("chart_history")
          .select("game_id, rank")
          .eq("week_start", lastWeek);
        if (history) {
          const prev = {};
          history.forEach(h => prev[h.game_id] = h.rank);
          setPrevCharts(prev);
        }
      }
      setLoading(false);
    };
    load();
  }, [category, refreshKey]);

  const getDominantSignal = (counts) => {
    if (counts.shelf_playing > 0) return `${counts.shelf_playing} playing`;
    if (counts.review > 0) return `${counts.review} review${counts.review > 1 ? 's' : ''}`;
    if (counts.comment > 0) return `${counts.comment} comment${counts.comment > 1 ? 's' : ''}`;
    if (counts.shelf_want > 0) return `${counts.shelf_want} want to play`;
    if (counts.post > 0) return `${counts.post} post${counts.post > 1 ? 's' : ''}`;
    return null;
  };

  const getMovement = (gameId, currentRank) => {
    const prev = prevCharts[gameId];
    if (!prev) return { label: "NEW", color: C.teal };
    const diff = prev - currentRank;
    if (diff > 0) return { label: `+${diff}`, color: C.green };
    if (diff < 0) return { label: `${diff}`, color: C.red };
    return { label: "—", color: C.textDim };
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, color: C.text, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {category ? `${category} Charts` : "The Charts"}
        </div>
        <div style={{ color: C.textDim, fontSize: 10 }}>This week</div>
      </div>

      {loading ? (
        <div style={{ color: C.textDim, fontSize: 12, textAlign: "center", padding: "20px 0" }}>Loading...</div>
      ) : charts.length === 0 ? (
        <div style={{ color: C.textDim, fontSize: 12, textAlign: "center", padding: "20px 0", lineHeight: 1.6 }}>
          Charts fill up as the community posts, reviews, and plays games this week.
        </div>
      ) : (
        <div>
          {charts.map((entry, i) => {
            const mv = getMovement(entry.id, entry.rank);
            return (
              <div key={entry.id}
                onClick={() => { setCurrentGame(entry.id); setActivePage("game"); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < charts.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}>
                <div style={{ width: 18, textAlign: "center", color: i < 3 ? C.gold : C.textDim, fontWeight: 800, fontSize: i < 3 ? 13 : 11, flexShrink: 0 }}>
                  {entry.rank}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</div>
                  {entry.dominantSignal && <div style={{ color: C.textDim, fontSize: 10 }}>{entry.dominantSignal}</div>}
                </div>
                <div style={{ color: mv.color, fontSize: 11, fontWeight: 700, flexShrink: 0, minWidth: 28, textAlign: "right" }}>{mv.label}</div>
              </div>
            );
          })}
          {limit && (
            <button onClick={() => setActivePage("games")}
              style={{ width: "100%", marginTop: 10, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              See Full Charts →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CHARTS PAGE ──────────────────────────────────────────────────────────────

function ChartsPage({ setActivePage, setCurrentGame, isMobile }) {
  const [window, setWindow] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState([]);
  const [byGenre, setByGenre] = useState({});
  const [byGenreFull, setByGenreFull] = useState({});
  const [expandedGenreAll, setExpandedGenreAll] = useState(new Set());
  const [expandedOverall, setExpandedOverall] = useState(null);
  const [expandedGenre, setExpandedGenre] = useState({}); // genre -> game id
  const [sparklines, setSparklines] = useState({}); // game id -> weekly score array
  const [loadingSparkline, setLoadingSparkline] = useState({});

  const WEIGHTS = { review: 2, shelf_playing: 3, shelf_want: 1.5, shelf_played: 1, comment: 0.5 };

  const getWindowWeeks = (w) => w === "7d" ? 1 : w === "30d" ? 4 : 1;

  const getWeekStarts = (count) => {
    const starts = [];
    const base = new Date(getWeekStart());
    for (let i = 0; i < count; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i * 7);
      starts.push(d.toISOString().split("T")[0]);
    }
    return starts;
  };

  const scoreEvents = (events) => {
    const scoreMap = {}, countMap = {}, userMap = {};
    events.forEach(e => {
      if (!e.games) return;
      const id = e.game_id;
      if (!scoreMap[id]) {
        scoreMap[id] = 0;
        countMap[id] = { game: e.games, post: 0, review: 0, shelf_playing: 0, shelf_want: 0, shelf_played: 0, comment: 0 };
        userMap[id] = new Set();
      }
      userMap[id].add(e.user_id);
      if (e.event_type === "post") {
        const seq = e.post_sequence || 1;
        scoreMap[id] += seq === 1 ? 1.0 : seq === 2 ? 0.5 : seq === 3 ? 0.25 : 0.1;
        countMap[id].post++;
      } else {
        scoreMap[id] += WEIGHTS[e.event_type] || 0;
        if (countMap[id][e.event_type] !== undefined) countMap[id][e.event_type]++;
      }
    });
    return Object.entries(scoreMap).map(([id, rawScore]) => {
      const uniqueUsers = userMap[id].size;
      const finalScore = rawScore * (1 + Math.log(Math.max(uniqueUsers, 1)) * 0.2);
      const g = countMap[id].game;
      return { id, finalScore, uniqueUsers, ...countMap[id], name: g?.name, genre: g?.genre, icon: g?.icon };
    }).sort((a, b) => b.finalScore - a.finalScore);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const weeks = getWindowWeeks(window);
      const weekStarts = getWeekStarts(weeks);

      const { data: events } = await supabase
        .from("chart_events")
        .select("game_id, event_type, post_sequence, user_id, week_start, games(id, name, genre, icon)")
        .in("week_start", weekStarts);

      if (!events) { setLoading(false); return; }

      const scored = scoreEvents(events);
      setOverall(scored.slice(0, 10));

      // Group by genre — preview (top 5) and full list
      const genres = {};
      const genresFull = {};
      scored.forEach(g => {
        const primaryGenre = Array.isArray(g.genre) ? g.genre[0] : (g.genre || "Other");
        if (!genres[primaryGenre]) { genres[primaryGenre] = []; genresFull[primaryGenre] = []; }
        genresFull[primaryGenre].push(g);
        if (genres[primaryGenre].length < 5) genres[primaryGenre].push(g);
      });
      setByGenre(genres);
      setByGenreFull(genresFull);
      setExpandedGenreAll(new Set());
      setLoading(false);
    };
    load();
  }, [window]);

  const loadSparkline = async (gameId) => {
    if (sparklines[gameId]) return;
    setLoadingSparkline(prev => ({ ...prev, [gameId]: true }));
    // Get last 8 weeks of data for this game
    const weekStarts = getWeekStarts(8);
    const { data: events } = await supabase
      .from("chart_events")
      .select("event_type, post_sequence, user_id, week_start")
      .eq("game_id", gameId)
      .in("week_start", weekStarts);

    // Score per week
    const weekScores = {};
    weekStarts.forEach(w => { weekScores[w] = { score: 0, users: new Set() }; });
    (events || []).forEach(e => {
      if (!weekScores[e.week_start]) return;
      weekScores[e.week_start].users.add(e.user_id);
      if (e.event_type === "post") {
        const seq = e.post_sequence || 1;
        weekScores[e.week_start].score += seq === 1 ? 1.0 : seq === 2 ? 0.5 : seq === 3 ? 0.25 : 0.1;
      } else {
        weekScores[e.week_start].score += WEIGHTS[e.event_type] || 0;
      }
    });

    // Apply breadth multiplier and reverse so oldest is first
    const points = weekStarts.slice().reverse().map(w => {
      const { score, users } = weekScores[w];
      return score * (1 + Math.log(Math.max(users.size, 1)) * 0.2);
    });

    setSparklines(prev => ({ ...prev, [gameId]: points }));
    setLoadingSparkline(prev => ({ ...prev, [gameId]: false }));
  };

  const handleExpand = (gameId, section) => {
    if (section === "overall") {
      setExpandedOverall(prev => prev === gameId ? null : gameId);
    } else {
      setExpandedGenre(prev => ({ ...prev, [section]: prev[section] === gameId ? null : gameId }));
    }
    loadSparkline(gameId);
  };

  const Sparkline = ({ points, color = C.accent }) => {
    if (!points || points.length === 0) return null;
    const w = 260, h = 60, pad = 4;
    const max = Math.max(...points, 0.1);
    const pts = points.map((v, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${x},${y}`;
    }).join(" ");
    const areaPath = `M ${pad},${h - pad} ` +
      points.map((v, i) => {
        const x = pad + (i / (points.length - 1)) * (w - pad * 2);
        const y = h - pad - (v / max) * (h - pad * 2);
        return `L ${x},${y}`;
      }).join(" ") +
      ` L ${w - pad},${h - pad} Z`;

    const labels = ["8w", "7w", "6w", "5w", "4w", "3w", "2w", "Now"];
    return (
      <div style={{ marginTop: 8 }}>
        <svg width={w} height={h} style={{ display: "block" }}>
          <defs>
            <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#grad-${color.replace("#","")})`} />
          <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((v, i) => {
            const x = pad + (i / (points.length - 1)) * (w - pad * 2);
            const y = h - pad - (v / max) * (h - pad * 2);
            return <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 3.5 : 2} fill={color} opacity={i === points.length - 1 ? 1 : 0.5} />;
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, paddingLeft: pad, paddingRight: pad }}>
          {labels.map((l, i) => (
            <span key={i} style={{ color: C.textDim, fontSize: 9, width: w / labels.length, textAlign: "center" }}>{l}</span>
          ))}
        </div>
      </div>
    );
  };

  const getDominantSignal = (entry) => {
    if (entry.shelf_playing > 0) return `${entry.shelf_playing} playing`;
    if (entry.review > 0) return `${entry.review} review${entry.review > 1 ? "s" : ""}`;
    if (entry.comment > 0) return `${entry.comment} comment${entry.comment > 1 ? "s" : ""}`;
    if (entry.shelf_want > 0) return `${entry.shelf_want} want to play`;
    if (entry.post > 0) return `${entry.post} post${entry.post > 1 ? "s" : ""}`;
    return `${entry.uniqueUsers} player${entry.uniqueUsers > 1 ? "s" : ""}`;
  };

  const ChartRow = ({ entry, rank, showRank = true, section }) => {
    const isExpanded = section === "overall" ? expandedOverall === entry.id : expandedGenre[section] === entry.id;
    const sp = sparklines[entry.id];
    const isLoadingSp = loadingSparkline[entry.id];
    const momentum = sp ? (() => {
      const last = sp[sp.length - 1] || 0;
      const prev = sp[sp.length - 2] || 0;
      if (prev === 0) return null;
      const pct = Math.round(((last - prev) / prev) * 100);
      return { pct, up: pct >= 0 };
    })() : null;

    return (
      <div style={{ borderBottom: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div onClick={() => handleExpand(entry.id, section)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", transition: "background 0.1s", background: isExpanded ? C.accentGlow : "transparent" }}
          onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = C.surfaceHover; }}
          onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
        >
          {showRank && (
            <div style={{ width: 24, textAlign: "center", fontWeight: 800, fontSize: rank <= 3 ? 16 : 13, color: rank === 1 ? C.gold : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : C.textDim, flexShrink: 0 }}>
              {rank}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{entry.name}</div>
            <div style={{ color: C.textDim, fontSize: 11, marginTop: 1 }}>{getDominantSignal(entry)} · {entry.uniqueUsers} player{entry.uniqueUsers !== 1 ? "s" : ""}</div>
          </div>
          {momentum && (
            <div style={{ color: momentum.up ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {momentum.up ? "▲" : "▼"} {Math.abs(momentum.pct)}%
            </div>
          )}
          <div style={{ color: isExpanded ? C.accentSoft : C.textDim, fontSize: 11, flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</div>
        </div>

        {isExpanded && (
          <div style={{ padding: "4px 20px 18px", borderTop: `1px solid ${C.border}`, background: C.accentGlow }}>
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 4, marginTop: 8 }}>Momentum — last 8 weeks</div>
            {isLoadingSp ? (
              <div style={{ color: C.textDim, fontSize: 12, padding: "12px 0" }}>Loading trend…</div>
            ) : sp ? (
              <Sparkline points={sp} color={C.accent} />
            ) : (
              <div style={{ color: C.textDim, fontSize: 12, padding: "12px 0" }}>No trend data yet.</div>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
              {entry.post > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>{entry.post}</div><div style={{ color: C.textDim, fontSize: 10 }}>posts</div></div>}
              {entry.comment > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>{entry.comment}</div><div style={{ color: C.textDim, fontSize: 10 }}>comments</div></div>}
              {entry.shelf_playing > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: "#22c55e", fontSize: 16 }}>{entry.shelf_playing}</div><div style={{ color: C.textDim, fontSize: 10 }}>playing</div></div>}
              {entry.shelf_want > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.accentSoft, fontSize: 16 }}>{entry.shelf_want}</div><div style={{ color: C.textDim, fontSize: 10 }}>want to play</div></div>}
              {entry.review > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.gold, fontSize: 16 }}>{entry.review}</div><div style={{ color: C.textDim, fontSize: 10 }}>reviews</div></div>}
              <div style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
                <button onClick={e => { e.stopPropagation(); setCurrentGame(entry.id); setActivePage("game"); }}
                  style={{ background: C.accent, border: "none", borderRadius: 8, padding: "7px 16px", color: C.accentText, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  View Game →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const windowLabel = { "7d": "This Week", "30d": "This Month" };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: isMobile ? "60px 12px 80px" : "80px 24px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 800, fontSize: 28, color: C.text, letterSpacing: "-0.5px", marginBottom: 6 }}>The Charts</div>
        <div style={{ color: C.textMuted, fontSize: 14 }}>What the community is actually playing, posting, and adding to their shelves.</div>
      </div>

      {/* Time window selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {[{ id: "7d", label: "This Week" }, { id: "30d", label: "This Month" }].map(w => (
          <button key={w.id} onClick={() => { setWindow(w.id); setExpandedOverall(null); setExpandedGenre({}); setExpandedGenreAll(new Set()); }}
            style={{ background: window === w.id ? C.accentGlow : C.surface, border: `1px solid ${window === w.id ? C.accentDim : C.border}`, borderRadius: 20, padding: "6px 16px", color: window === w.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: window === w.id ? 700 : 500, cursor: "pointer" }}>
            {w.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: C.textDim, fontSize: 14, textAlign: "center", padding: 60 }}>Loading charts…</div>
      ) : overall.length === 0 ? (
        <div style={{ color: C.textDim, fontSize: 14, textAlign: "center", padding: 60, lineHeight: 1.8 }}>
          No chart data for this window yet.<br />
          <span style={{ fontSize: 12 }}>Charts fill up as the community posts, plays, and reviews games.</span>
        </div>
      ) : (
        <>
          {/* Top 10 Overall */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 32, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Top 10 Overall</div>
              <div style={{ color: C.textDim, fontSize: 12 }}>{windowLabel[window]}</div>
            </div>
            {overall.map((entry, i) => (
              <ChartRow key={entry.id} entry={entry} rank={i + 1} section="overall" />
            ))}
          </div>

          {/* Genre breakdowns — 2 columns */}
          {(() => {
            const genreEntries = Object.entries(byGenre).filter(([, games]) => games.length >= 2);
            if (genreEntries.length === 0) return null;
            return (
              <>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>By Genre</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                {genreEntries.map(([genre, games]) => {
                  const fullList = byGenreFull[genre] || games;
                  const isExpanded = expandedGenreAll.has(genre);
                  const displayList = isExpanded ? fullList : games;
                  const hasMore = fullList.length > games.length;
                  return (
                    <div key={genre} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{genre}</div>
                      </div>
                      {displayList.map((entry, i) => (
                        <ChartRow key={entry.id} entry={entry} rank={i + 1} section={genre} />
                      ))}
                      {(hasMore || isExpanded) && (
                        <button
                          onClick={() => setExpandedGenreAll(prev => {
                            const next = new Set(prev);
                            isExpanded ? next.delete(genre) : next.add(genre);
                            return next;
                          })}
                          style={{ margin: "10px 16px 14px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          {isExpanded ? `Show less` : `See all ${fullList.length} in ${genre} →`}
                        </button>
                      )}
                    </div>
                  );
                })}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

function FeedPage({ activePage, setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, isMobile, currentUser, isGuest, onSignIn, setProfileDefaultTab, onQuestTrigger }) {
  const user = currentUser;
  const [showBanner, setShowBanner] = useState(true);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [chartRefresh, setChartRefresh] = useState(0);
  const [livePosts, setLivePosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [guestFeedDone, setGuestFeedDone] = useState(false);
  const [following, setFollowing] = useState([]); // combined users + NPCs
  const [feedTab, setFeedTab] = useState("forYou");
  const [followingPosts, setFollowingPosts] = useState([]);
  const [playingGames, setPlayingGames] = useState([]);
  const [followedGames, setFollowedGames] = useState([]);
  const [suggestedGamers, setSuggestedGamers] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionResults, setMentionResults] = useState([]);
  const [taggedGames, setTaggedGames] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [dbGames, setDbGames] = useState({}); // id -> game object cache
  const textareaRef = useRef(null); // array of game ids, max 3

  const handlePostTextChange = async (e) => {
    const val = e.target.value;
    setPostText(val);
    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) {
      const query = atMatch[1].toLowerCase();
      if (query.length === 0) {
        // Show top games by followers when just @ is typed
        const { data } = await supabase.from("games").select("id, name, followers").order("followers", { ascending: false }).limit(5);
        setMentionResults(data || []);
      } else {
        const { data } = await supabase.from("games").select("id, name, followers").ilike("name", `%${query}%`).order("followers", { ascending: false }).limit(5);
        setMentionResults(data || []);
      }
      setMentionQuery(query);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
      setMentionIndex(0);
    }
  };

  const handlePostKeyDown = (e) => {
    if (mentionResults.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && mentionResults.length > 0) { e.preventDefault(); selectMention(mentionResults[mentionIndex]); }
    else if (e.key === "Escape") { setMentionResults([]); setMentionQuery(null); }
  };

  const selectMention = (game) => {
    const gameName = game.name.replace(/\s+/g, "");
    const inserted = postText.replace(/@\w*$/, "@" + gameName) + " ";
    setPostText(inserted);
    setTaggedGames(prev => {
      if (prev.includes(game.id) || prev.length >= 3) return prev;
      return [...prev, game.id];
    });
    setDbGames(prev => ({ ...prev, [game.id]: game }));
    setMentionQuery(null);
    setMentionResults([]);
    setMentionIndex(0);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const removeTaggedGame = (gameId) => {
    setTaggedGames(prev => prev.filter(id => id !== gameId));
  };
  const topPad = isMobile ? "60px 16px 0" : "80px 20px 0";
  const mainPad = isMobile ? "14px 16px 80px" : "14px 20px 40px";

  useEffect(() => {
    loadPosts();
    if (!isGuest) {
      loadFollowing();
      loadPlayingGames();
      loadFollowedGames();
      loadSuggestedGamers();
    }
  }, []);

  // Re-sync liked state and counts when returning to feed
  useEffect(() => {
    if (activePage !== "feed" || isGuest || livePosts.length === 0) return;
    const syncCounts = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const postIds = livePosts.map(p => p.id).filter(id => typeof id === 'string' && id.includes('-'));
      if (postIds.length === 0) return;
      const [{ data: myLikes }, { data: freshCounts }] = await Promise.all([
        supabase.from("post_likes").select("post_id").eq("user_id", authUser.id),
        supabase.from("posts").select("id, likes").in("id", postIds),
      ]);
      const likedIds = new Set((myLikes || []).map(l => l.post_id));
      const countMap = {};
      (freshCounts || []).forEach(p => { countMap[p.id] = p.likes ?? 0; });
      setLivePosts(prev => prev.map(p => ({
        ...p,
        liked: likedIds.has(p.id),
        likes: countMap[p.id] ?? p.likes ?? 0,
      })));
    };
    syncCounts();
  }, [activePage]);

  const loadSuggestedGamers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Get current user's shelf
    const { data: myShelf } = await supabase
      .from("user_games").select("game_id, status").eq("user_id", user.id);
    if (!myShelf || myShelf.length === 0) return;
    const myGameIds = myShelf.map(g => g.game_id);
    const statusWeight = { playing: 3, want_to_play: 2, have_played: 1 };
    // Find other users who share shelf games
    const { data: others } = await supabase
      .from("user_games")
      .select("user_id, game_id, status, profiles(id, username, handle, avatar_initials)")
      .in("game_id", myGameIds)
      .neq("user_id", user.id);
    if (!others) return;
    // Score each user by shelf overlap weight
    const scores = {};
    others.forEach(row => {
      if (!row.profiles) return;
      const uid = row.user_id;
      if (!scores[uid]) scores[uid] = { profile: row.profiles, score: 0, sharedGame: null };
      const w = statusWeight[row.status] || 1;
      if (w > (scores[uid].topWeight || 0)) {
        scores[uid].topWeight = w;
        scores[uid].sharedGame = row.game_id;
      }
      scores[uid].score += w;
    });
    // Sort by score, exclude already-followed users
    const { data: followData } = await supabase
      .from("follows").select("followed_user_id").eq("follower_id", user.id);
    const followedIds = new Set((followData || []).map(f => f.followed_user_id));
    const sorted = Object.values(scores)
      .filter(s => !followedIds.has(s.profile.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    // Resolve shared game names
    const sharedGameIds = [...new Set(sorted.map(s => s.sharedGame).filter(Boolean))];
    const { data: gameNames } = await supabase.from("games").select("id, name").in("id", sharedGameIds);
    const gameMap = {};
    (gameNames || []).forEach(g => gameMap[g.id] = g.name);
    setSuggestedGamers(sorted.map(s => ({ ...s.profile, sharedGame: gameMap[s.sharedGame] || null })));
  };

  const loadPlayingGames = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_games")
      .select("games(id, name, genre)")
      .eq("user_id", user.id)
      .eq("status", "playing");
    if (data) setPlayingGames(data.map(d => d.games).filter(Boolean));
  };

  const loadFollowedGames = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("follows")
      .select("games(id, name, genre)")
      .eq("follower_id", user.id)
      .not("followed_game_id", "is", null);
    if (data) setFollowedGames(data.map(d => d.games).filter(Boolean));
  };

  const loadFollowing = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("follows")
      .select("followed_user_id, followed_npc_id, profiles!follows_followed_user_id_fkey(id, username, handle, avatar_initials)")
      .eq("follower_id", user.id);
    if (!data) return;
    const users = data
      .filter(f => f.followed_user_id && f.profiles)
      .map(f => ({ ...f.profiles, type: "user" }));
    const npcFollows = data.filter(f => f.followed_npc_id);
    const npcs = npcFollows.map(f => {
      const npc = NPCS[f.followed_npc_id] || Object.values(NPCS).find(n => n.id === f.followed_npc_id);
      if (!npc) return null;
      return { id: f.followed_npc_id, username: npc.name, avatar_initials: npc.avatar, type: "npc" };
    }).filter(Boolean);
    setFollowing([...users, ...npcs]);
  };

  const loadFollowingPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Get all user IDs the current user follows
    const { data: followData } = await supabase
      .from("follows")
      .select("followed_user_id")
      .eq("follower_id", user.id)
      .not("followed_user_id", "is", null);
    if (!followData || followData.length === 0) { setFollowingPosts([]); return; }
    const followedIds = followData.map(f => f.followed_user_id);
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(username, handle, avatar_initials, is_founding, active_ring), comments(id)")
      .in("user_id", followedIds)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setFollowingPosts(data.map(p => ({ ...p, comment_count: p.comments?.length || 0 })));
  };

  const loadPosts = async () => {
    setFeedLoading(true);
    if (isGuest) {
      // Fetch top 2 NPC posts and top real posts separately
      const [npcResult, realResult] = await Promise.all([
        supabase.from("posts")
          .select("*, npcs(name, handle, avatar_initials, universe, role), comments(id)")
          .not("npc_id", "is", null)
          .order("likes", { ascending: false })
          .limit(2),
        supabase.from("posts")
          .select("id, content, likes, created_at, game_tag, user_id, npc_id, comments(id), profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding)")
          .is("npc_id", null)
          .order("likes", { ascending: false })
          .limit(30),
      ]);

      const npcPosts = (npcResult.data || []).map(p => ({ ...p, comment_count: p.comments?.length || 0 }));
      
      // Score real posts — keep all even if profiles join is null (RLS may block for guests)
      const now = Date.now();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const scoredReal = (realResult.data || [])
        .map(p => ({
          ...p,
          comment_count: p.comments?.length || 0,
          _score: (p.likes || 0) * 2 + (p.comments?.length || 0) * 1.5 + (now - new Date(p.created_at) < weekMs ? 10 : 0),
        }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 18);

      // Place NPC posts at positions 1 and 6 (index 0 and 5)
      const feed = [...scoredReal];
      if (npcPosts[0]) feed.splice(0, 0, npcPosts[0]);
      if (npcPosts[1]) feed.splice(5, 0, npcPosts[1]);

      setLivePosts(feed.slice(0, 20));
      setGuestFeedDone(true);
      setFeedLoading(false);
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const [postsResult, likesResult] = await Promise.all([
        supabase.from("posts")
          .select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring), npcs(name, handle, avatar_initials, universe, role), comments(id)")
          .order("created_at", { ascending: false })
          .limit(20),
        authUser
          ? supabase.from("post_likes").select("post_id").eq("user_id", authUser.id).then(r => r.error ? { data: [] } : r)
          : Promise.resolve({ data: [] }),
      ]);
      if (postsResult.error) console.error("Feed load error:", postsResult.error);
      if (postsResult.data) console.log("Feed posts:", postsResult.data.length, "NPC posts:", postsResult.data.filter(p=>p.npc_id).length, "sample NPC:", postsResult.data.find(p=>p.npc_id));
      const likedIds = new Set((likesResult.data || []).map(l => l.post_id));
      if (postsResult.data) {
        setLivePosts(postsResult.data.map(p => ({
          ...p,
          comment_count: p.comments?.length || 0,
          liked: likedIds.has(p.id),
        })));
      }
      setFeedLoading(false);
    }
  };

  const submitPost = async () => {
    if (!postText.trim() || posting) return;
    setPosting(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("posts").insert({
      user_id: authUser?.id || null,
      content: postText.trim(),
      game_tag: taggedGames[0] || null,
      likes: 0,
      comment_count: 0,
    }).select().single();
    if (!error && data) {
      if (data.game_tag) logChartEvent(data.game_tag, 'post', authUser?.id);
      const newPost = {
        ...data,
        profiles: {
          username: user?.name,
          handle: user?.handle,
          avatar_initials: user?.avatar,
          is_founding: user?.isFounding,
        }
      };
      setLivePosts(prev => [newPost, ...prev]);
      setPostText("");
      setTaggedGames([]);
      if (data.game_tag) setChartRefresh(r => r + 1);
    }
    setPosting(false);
  };

  return (
    <>
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: topPad }}>
      {showBanner && (
        <FoundingBanner
          onDismiss={() => setShowBanner(false)}
          setActivePage={setActivePage}
          isGuest={isGuest}
          isMobile={isMobile}
          onSignUp={() => onSignIn?.("Sign up free and claim your permanent founder ring.")}
        />
      )}
      {isMobile && (
        <div style={{ marginBottom: 4 }}>
          <ChartsWidget setActivePage={setActivePage} setCurrentGame={setCurrentGame} refreshKey={chartRefresh} limit={5} />
          {isGuest ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 12, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Your Shelf</div>
              <div style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6 }}>
                <span onClick={() => onSignIn?.("Sign up to build your shelf.")} style={{ color: C.accentSoft, cursor: "pointer" }}>Sign in</span> to build your shelf.
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
    <div style={{ display: "flex", gap: 20, maxWidth: 1100, margin: "0 auto", padding: mainPad }}>
      {/* Left sidebar — desktop only */}
      {!isMobile && (
      <div style={{ width: 230, flexShrink: 0 }}>
        {/* User block — real profile or guest "unclaimed" card */}
        {isGuest ? (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: 56, background: `linear-gradient(135deg, ${C.accent}22, ${C.teal}22)` }} />
            <div style={{ padding: "0 16px 18px", marginTop: -22 }}>
              {/* Question mark avatar */}
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.surfaceRaised, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontWeight: 900, fontSize: 22 }}>?</div>
              <div style={{ marginTop: 10, marginBottom: 14 }}>
                <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6 }}>This profile grid is waiting to be claimed. Will you be the proud new owner?</div>
              </div>
              <button onClick={() => onSignIn?.("Create your free account and join the guild.")}
                style={{ width: "100%", background: C.accent, border: "none", borderRadius: 8, padding: "8px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Join Free
              </button>
            </div>
          </div>
        ) : user ? (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: 56, background: `linear-gradient(135deg, ${C.accent}44, ${C.teal}44)` }} />
            <div style={{ padding: "0 16px 16px", marginTop: -22 }}>
              <Avatar initials={user.avatar} size={44} status="online" />
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{user.name}</div>
                <div style={{ color: C.textMuted, fontSize: 12 }}>{user.handle}</div>
                <div style={{ color: C.textDim, fontSize: 11, marginTop: 3 }}>{user.title}</div>
              </div>
              {/* XP + Level */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, color: C.gold, fontSize: 13 }}>Lv.{user.level}</div>
                  <div style={{ color: C.textDim, fontSize: 10 }}>{user.xp} / {user.xpNext} XP</div>
                </div>
                <div style={{ height: 4, background: C.surfaceRaised, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Math.round((user.xp / user.xpNext) * 100))}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.accent})`, borderRadius: 4, transition: "width 0.4s ease" }} />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Currently Playing</div>
            <span onClick={() => { setProfileDefaultTab("games"); setActivePage("profile"); }} style={{ color: C.accentSoft, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Manage your shelf →</span>
          </div>
          {playingGames.length === 0 ? (
            <div style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6 }}>
              Nothing on your shelf yet.{" "}
              <span onClick={() => { setProfileDefaultTab("games"); setActivePage("profile"); }} style={{ color: C.accentSoft, cursor: "pointer" }}>Add games →</span>
            </div>
          ) : playingGames.map((g, i) => (
            <div key={g.id} onClick={() => { setCurrentGame(g.id); setActivePage("game"); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < playingGames.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <span style={{ color: C.textMuted, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
              <span style={{ color: C.textDim, fontSize: 11 }}>→</span>
            </div>
          ))}
        </div>

        {/* Gamers — shelf-based suggestions */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Gamers</div>
          {suggestedGamers.length === 0 ? (
            <div style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6 }}>Add games to your shelf to find players like you.</div>
          ) : suggestedGamers.map((p, i) => (
            <div key={p.id} style={{ marginBottom: i < suggestedGamers.length - 1 ? 14 : 0 }}>
              <div onClick={() => { setCurrentPlayer(p.id); setActivePage("player"); }}
                style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <Avatar initials={(p.avatar_initials || p.username || "?").slice(0,2).toUpperCase()} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.username}</div>
                  {p.sharedGame && <div style={{ color: C.textDim, fontSize: 11 }}>Also plays {p.sharedGame}</div>}
                </div>
              </div>
              <button onClick={async () => {
                const { data: { user: au } } = await supabase.auth.getUser();
                if (!au) return;
                await supabase.from("follows").insert({ follower_id: au.id, followed_user_id: p.id });
                setSuggestedGamers(prev => prev.filter(x => x.id !== p.id));
                loadFollowing();
              }} style={{ width: "100%", background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "5px", color: C.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Follow</button>
            </div>
          ))}
        </div>

        {/* NPCs */}
        <div style={{ background: C.goldGlow, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 16, marginTop: 14 }}>
          <div style={{ fontWeight: 700, color: C.gold, fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>NPCs</div>
          {Object.values(NPCS).slice(0, 3).map((npc, i, arr) => (
            <div key={npc.id} onClick={() => { setCurrentNPC(npc.id); setActivePage("npc"); }}
              style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: i < arr.length - 1 ? 10 : 0, marginBottom: i < arr.length - 1 ? 10 : 0, borderBottom: i < arr.length - 1 ? `1px solid ${C.goldBorder}` : "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <Avatar initials={npc.avatar} size={30} isNPC={true} status={npc.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: C.gold, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{npc.name}</div>
                <div style={{ color: C.textDim, fontSize: 10 }}>{npc.role}</div>
              </div>
              <span style={{ color: C.textDim, fontSize: 11 }}>→</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Main feed */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Feed tabs — members only */}
        {!isGuest && (
          <div style={{ display: "flex", gap: 4, marginBottom: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 4 }}>
            {[{ id: "forYou", label: "For You" }, { id: "following", label: "Following" }].map(tab => (
              <button key={tab.id} onClick={() => { setFeedTab(tab.id); if (tab.id === "following") loadFollowingPosts(); }}
                style={{ flex: 1, background: feedTab === tab.id ? C.accentGlow : "transparent", border: `1px solid ${feedTab === tab.id ? C.accentDim : "transparent"}`, borderRadius: 8, padding: "7px", color: feedTab === tab.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: feedTab === tab.id ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}
        {!isGuest && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: isMobile ? 12 : 16, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <Avatar initials={user?.avatar || "GL"} size={isMobile ? 32 : 38} status="online" founding={user?.isFounding} ring={user?.activeRing} />
            <div style={{ flex: 1 }}>
              <div style={{ position: "relative" }}>
                <textarea ref={textareaRef} value={postText} onChange={handlePostTextChange} onKeyDown={handlePostKeyDown} placeholder="Share a win, review a game, find teammates... (@ to tag a game)" style={{ width: "100%", background: C.surfaceHover, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13, resize: "none", outline: "none", minHeight: isMobile ? 56 : 68, boxSizing: "border-box" }} />
                {mentionResults.length > 0 && (
                  <div style={{ position: "absolute", bottom: "100%", left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", zIndex: 50, minWidth: 200, marginBottom: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                    {mentionResults.map((game, i) => (
                      <div key={game.id} onClick={() => selectMention(game)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", background: i === mentionIndex ? C.surfaceHover : "transparent" }}
                        onMouseEnter={e => { setMentionIndex(i); }}>
                        <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{game.name}</span>
                        <span style={{ color: C.textDim, fontSize: 11, marginLeft: "auto" }}>{(game.followers / 1000).toFixed(1)}k</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, flexWrap: isMobile ? "wrap" : "nowrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {taggedGames.map(gameId => {
                    const game = dbGames[gameId] || GAMES[gameId];
                    return (
                      <span key={gameId} style={{ background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 6, padding: "3px 8px", color: C.accentSoft, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        {game?.name || gameId}
                        <span onClick={() => removeTaggedGame(gameId)} style={{ cursor: "pointer", marginLeft: 2, color: C.textDim, fontWeight: 700 }}>×</span>
                      </span>
                    );
                  })}
                  {taggedGames.length === 0 && (
                    <span style={{ color: C.textDim, fontSize: 12 }}>@ a game to tag it</span>
                  )}
                </div>
                <button onClick={submitPost} disabled={posting || !postText.trim()} style={{ background: postText.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 20px", color: postText.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: postText.trim() ? "pointer" : "default", transition: "all 0.2s" }}>{posting ? "Posting..." : "Post"}</button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* For You feed */}
        {(isGuest || feedTab === "forYou") && !feedLoading && livePosts.map(post => {
          const isNPC = !!post.npc_id;
          const author = isNPC ? post.npcs : post.profiles;
          // For NPC posts with missing join, fall back to NPCS lookup
          const npcFallback = isNPC && !author
            ? (Object.values(NPCS).find(n => n.id === post.npc_id) || { name: "NPC", handle: "@npc", avatar: "NP" })
            : null;
          // For real user posts where profiles join is null (RLS blocked for guests), show anonymous fallback
          const realFallback = !isNPC && !author ? { username: "Guildies Member", handle: "@member", avatar_initials: "GM", is_founding: false } : null;
          const displayAuthor = author || npcFallback || realFallback;
          return (
            <FeedPostCard key={post.id} post={{
              id: post.id,
              npc_id: post.npc_id,
              game_tag: post.game_tag,
              user_id: post.user_id,
              user: {
                name: displayAuthor.name || displayAuthor.username || "Gamer",
                handle: displayAuthor.handle || "@gamer",
                avatar: displayAuthor.avatar_initials || displayAuthor.avatar || "GL",
                status: "online",
                isNPC: isNPC,
                isFounding: !isNPC && (displayAuthor.is_founding || false),
              },
              content: post.content,
              time: timeAgo(post.created_at),
              likes: post.likes || 0,
              liked: post.liked || false,
              comment_count: post.comment_count || 0,
              commentList: [],
            }} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={user} isGuest={isGuest} onSignIn={onSignIn} />
          );
        })}
        {/* Loading skeleton */}
        {(isGuest || feedTab === "forYou") && feedLoading && [1,2,3].map(i => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: isMobile ? 12 : 16, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.surfaceRaised, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, width: "40%", background: C.surfaceRaised, borderRadius: 6, marginBottom: 6 }} />
                <div style={{ height: 10, width: "25%", background: C.surfaceHover, borderRadius: 6 }} />
              </div>
            </div>
            <div style={{ height: 12, width: "90%", background: C.surfaceRaised, borderRadius: 6, marginBottom: 6 }} />
            <div style={{ height: 12, width: "70%", background: C.surfaceRaised, borderRadius: 6, marginBottom: 6 }} />
            <div style={{ height: 12, width: "50%", background: C.surfaceHover, borderRadius: 6 }} />
          </div>
        ))}

        {/* Empty state once loaded */}
        {(isGuest || feedTab === "forYou") && !feedLoading && livePosts.length === 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🎮</div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 16, marginBottom: 8 }}>The feed is empty right now.</div>
            <div style={{ color: C.textMuted, fontSize: 13 }}>Be the first to post something.</div>
          </div>
        )}

        {/* Following feed */}
        {!isGuest && feedTab === "following" && (
          followingPosts.length === 0 ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>👥</div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 16, marginBottom: 8 }}>
                {following.length === 0 ? "You're not following anyone yet." : "No posts from people you follow yet."}
              </div>
              <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7, maxWidth: 300, margin: "0 auto 20px" }}>
                {following.length === 0
                  ? "Follow players from the feed or their profiles and their posts will show up here."
                  : "The people you follow haven't posted yet this week. Check back soon."}
              </div>
              {following.length === 0 && (
                <button onClick={() => setFeedTab("forYou")} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "9px 22px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Browse For You</button>
              )}
            </div>
          ) : followingPosts.map(post => {
            const author = post.profiles;
            if (!author) return null;
            return (
              <FeedPostCard key={post.id} post={{
                id: post.id,
                game_tag: post.game_tag,
                user_id: post.user_id,
                user: {
                  name: author.username || "Gamer",
                  handle: author.handle || "@gamer",
                  avatar: author.avatar_initials || "GL",
                  status: "online",
                  isNPC: false,
                  isFounding: author.is_founding || false,
                },
                content: post.content,
                time: timeAgo(post.created_at),
                likes: post.likes || 0,
                liked: post.liked || false,
                comment_count: post.comment_count || 0,
                commentList: [],
              }} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={user} isGuest={isGuest} onSignIn={onSignIn} />
            );
          })
        )}

        {/* Guest sign-up wall after feed */}
        {isGuest && guestFeedDone && (
          <div style={{ background: `linear-gradient(180deg, transparent 0%, ${C.bg} 40%)`, borderRadius: 14, padding: "40px 24px 32px", textAlign: "center", marginTop: -40, position: "relative" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚔️</div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: isMobile ? 18 : 22, marginBottom: 8, letterSpacing: "-0.5px" }}>You've seen the highlights.</div>
            <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>
              Create a free account to see the full feed, post your own takes, build your shelf, and influence The Charts.
            </div>
            <button onClick={() => onSignIn?.("Create your free account and join the guild.")}
              style={{ background: C.accent, border: "none", borderRadius: 10, padding: "12px 32px", color: C.accentText, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10, display: "block", width: "100%", maxWidth: 280, margin: "0 auto 12px" }}>
              Create Free Account
            </button>
            <button onClick={() => onSignIn?.()}
              style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 32px", color: C.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "block", width: "100%", maxWidth: 280, margin: "0 auto" }}>
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* Right sidebar — desktop only */}
      {!isMobile && (
      <div style={{ width: 210, flexShrink: 0 }}>
        <ChartsWidget setActivePage={setActivePage} setCurrentGame={setCurrentGame} refreshKey={chartRefresh} limit={5} />

        <TrendingWidget setActivePage={setActivePage} setCurrentGame={setCurrentGame} />
      </div>
      )}
    </div>
    </>
  );
}

// ─── GAMES BROWSE PAGE ────────────────────────────────────────────────────────

function GamesPage({ setActivePage, setCurrentGame, isMobile, currentUser, onSignIn }) {
  // ── Games data ──
  const [dbGames, setDbGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [userShelf, setUserShelf] = useState(new Set());

  // ── Discovery state ──
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [activeInsight, setActiveInsight] = useState(null);
  const [nameSearch, setNameSearch] = useState("");
  const [discoveryResults, setDiscoveryResults] = useState(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryLabel, setDiscoveryLabel] = useState("");

  // ── Charts data (absorbed from ChartsPage) ──
  const [chartWindow, setChartWindow] = useState("7d");
  const [chartsLoading, setChartsLoading] = useState(true);
  const [overall, setOverall] = useState([]);
  const [byGenre, setByGenre] = useState({});
  const [byGenreFull, setByGenreFull] = useState({});
  const [expandedGenreAll, setExpandedGenreAll] = useState(new Set());
  const [expandedOverall, setExpandedOverall] = useState(null);
  const [expandedGenre, setExpandedGenre] = useState({});
  const [sparklines, setSparklines] = useState({});
  const [loadingSparkline, setLoadingSparkline] = useState({});

  const COLORS = ['#0ea5e9','#f59e0b','#10b981','#ef4444','#3b82f6','#0d9488','#f97316','#38bdf8'];

  const gameVisuals = (g) => {
    const hard = Object.values(GAMES).find(h => h.name.toLowerCase() === g.name?.toLowerCase());
    if (hard) return { color: hard.color };
    const colorIndex = (g.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length;
    return { color: COLORS[colorIndex] };
  };

  const getWeekStart = () => {
    const d = new Date(); d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay()); return d.toISOString().split("T")[0];
  };
  const getWeekStarts = (count) => {
    const starts = []; const base = new Date(getWeekStart());
    for (let i = 0; i < count; i++) { const d = new Date(base); d.setDate(base.getDate() - i * 7); starts.push(d.toISOString().split("T")[0]); }
    return starts;
  };
  const getWindowWeeks = (w) => w === "7d" ? 1 : 4;

  const scoreEvents = (events) => {
    const scoreMap = {}, countMap = {}, userMap = {};
    events.forEach(e => {
      if (!e.games) return;
      const id = e.game_id;
      if (!scoreMap[id]) { scoreMap[id] = 0; countMap[id] = { game: e.games, post: 0, review: 0, shelf_playing: 0, shelf_want: 0, shelf_played: 0, comment: 0 }; userMap[id] = new Set(); }
      userMap[id].add(e.user_id);
      if (e.event_type === "post") { const seq = e.post_sequence || 1; scoreMap[id] += seq === 1 ? 1.0 : seq === 2 ? 0.5 : seq === 3 ? 0.25 : 0.1; countMap[id].post++; }
      else { scoreMap[id] += WEIGHTS[e.event_type] || 0; if (countMap[id][e.event_type] !== undefined) countMap[id][e.event_type]++; }
    });
    return Object.entries(scoreMap).map(([id, rawScore]) => {
      const uniqueUsers = userMap[id].size;
      const finalScore = rawScore * (1 + Math.log(Math.max(uniqueUsers, 1)) * 0.2);
      const g = countMap[id].game;
      return { id, finalScore, uniqueUsers, ...countMap[id], name: g?.name, genre: g?.genre, icon: g?.icon };
    }).sort((a, b) => b.finalScore - a.finalScore);
  };

  // Load games + shelf
  useEffect(() => {
    supabase.from("games").select("*").order("followers", { ascending: false }).then(({ data }) => {
      if (data) setDbGames(data);
      setGamesLoading(false);
    });
    if (currentUser?.id) {
      supabase.from("user_games").select("game_id").eq("user_id", currentUser.id).then(({ data }) => {
        if (data) setUserShelf(new Set(data.map(r => r.game_id)));
      });
    }
  }, [currentUser?.id]);

  // Load charts
  useEffect(() => {
    const load = async () => {
      setChartsLoading(true);
      const weekStarts = getWeekStarts(getWindowWeeks(chartWindow));
      const { data: events } = await supabase.from("chart_events")
        .select("game_id, event_type, post_sequence, user_id, week_start, games(id, name, genre, icon)")
        .in("week_start", weekStarts);
      if (!events) { setChartsLoading(false); return; }
      const scored = scoreEvents(events);
      setOverall(scored.slice(0, 10));
      const genres = {}, genresFull = {};
      scored.forEach(g => {
        const pg = Array.isArray(g.genre) ? g.genre[0] : (g.genre || "Other");
        if (!genres[pg]) { genres[pg] = []; genresFull[pg] = []; }
        genresFull[pg].push(g);
        if (genres[pg].length < 5) genres[pg].push(g);
      });
      setByGenre(genres); setByGenreFull(genresFull);
      setExpandedGenreAll(new Set()); setChartsLoading(false);
    };
    load();
  }, [chartWindow]);

  const loadSparkline = async (gameId) => {
    if (sparklines[gameId]) return;
    setLoadingSparkline(prev => ({ ...prev, [gameId]: true }));
    const weekStarts = getWeekStarts(8);
    const { data: events } = await supabase.from("chart_events")
      .select("event_type, post_sequence, user_id, week_start").eq("game_id", gameId).in("week_start", weekStarts);
    const weekScores = {};
    weekStarts.forEach(w => { weekScores[w] = { score: 0, users: new Set() }; });
    (events || []).forEach(e => {
      if (!weekScores[e.week_start]) return;
      weekScores[e.week_start].users.add(e.user_id);
      if (e.event_type === "post") { const seq = e.post_sequence || 1; weekScores[e.week_start].score += seq === 1 ? 1.0 : seq === 2 ? 0.5 : seq === 3 ? 0.25 : 0.1; }
      else { weekScores[e.week_start].score += WEIGHTS[e.event_type] || 0; }
    });
    const points = weekStarts.slice().reverse().map(w => { const { score, users } = weekScores[w]; return score * (1 + Math.log(Math.max(users.size, 1)) * 0.2); });
    setSparklines(prev => ({ ...prev, [gameId]: points }));
    setLoadingSparkline(prev => ({ ...prev, [gameId]: false }));
  };

  const handleExpand = (gameId, section) => {
    if (section === "overall") setExpandedOverall(prev => prev === gameId ? null : gameId);
    else setExpandedGenre(prev => ({ ...prev, [section]: prev[section] === gameId ? null : gameId }));
    loadSparkline(gameId);
  };

  // Insight definitions — each knows how to query and describe itself
  const INSIGHTS = [
    {
      id: "most_talked_about",
      label: "Most Talked About",
      desc: "Highest combined posts and comments this week",
      run: async () => {
        const weekStarts = getWeekStarts(1);
        const { data } = await supabase.from("chart_events")
          .select("game_id, event_type, games(id, name, genre)")
          .in("week_start", weekStarts)
          .in("event_type", ["post", "comment"]);
        const counts = {};
        (data || []).forEach(e => {
          if (!e.games) return;
          if (!counts[e.game_id]) counts[e.game_id] = { game: e.games, count: 0 };
          counts[e.game_id].count++;
        });
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12)
          .map(r => ({ ...r.game, _stat: `${r.count} post${r.count !== 1 ? "s" : ""} & comments` }));
      }
    },
    {
      id: "everyone_playing",
      label: "Everyone's Playing",
      desc: "Most added to playing shelves recently",
      run: async () => {
        const { data } = await supabase.from("user_games")
          .select("game_id, games(id, name, genre)")
          .eq("status", "playing");
        const counts = {};
        (data || []).forEach(r => {
          if (!r.games) return;
          if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 };
          counts[r.game_id].count++;
        });
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12)
          .map(r => ({ ...r.game, _stat: `${r.count} playing now` }));
      }
    },
    {
      id: "hidden_gems",
      label: "Hidden Gems",
      desc: "Highly reviewed but not widely followed",
      run: async () => {
        const { data } = await supabase.from("games")
          .select("id, name, genre, avg_rating, review_count, followers")
          .gte("avg_rating", 7)
          .gte("review_count", 2)
          .order("avg_rating", { ascending: false });
        return (data || [])
          .filter(g => (g.followers || 0) < 500)
          .slice(0, 12)
          .map(g => ({ ...g, _stat: `${g.avg_rating?.toFixed(1)} avg · ${g.review_count} review${g.review_count !== 1 ? "s" : ""}` }));
      }
    },
    {
      id: "blowing_up",
      label: "Blowing Up",
      desc: "Biggest week-over-week momentum spike",
      run: async () => {
        const [thisWeek, lastWeek] = [getWeekStarts(1)[0], getWeekStarts(2)[1]];
        const [thisData, lastData] = await Promise.all([
          supabase.from("chart_events").select("game_id, event_type, post_sequence, user_id, games(id, name, genre)").eq("week_start", thisWeek),
          supabase.from("chart_events").select("game_id, event_type, post_sequence, user_id").eq("week_start", lastWeek),
        ]);
        const WEIGHTS = { review: 2, shelf_playing: 3, shelf_want: 1.5, shelf_played: 1, comment: 0.5 };
        const score = (events) => {
          const s = {};
          (events || []).forEach(e => {
            if (!s[e.game_id]) s[e.game_id] = 0;
            s[e.game_id] += e.event_type === "post" ? (e.post_sequence === 1 ? 1 : 0.3) : (WEIGHTS[e.event_type] || 0);
          });
          return s;
        };
        const thisScores = score(thisData.data);
        const lastScores = score(lastData.data);
        const gameMap = {};
        (thisData.data || []).forEach(e => { if (e.games) gameMap[e.game_id] = e.games; });
        return Object.entries(thisScores)
          .map(([id, s]) => {
            const prev = lastScores[id] || 0;
            const pct = prev > 0 ? Math.round(((s - prev) / prev) * 100) : 100;
            return { id, pct, game: gameMap[id] };
          })
          .filter(r => r.game && r.pct > 0)
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 12)
          .map(r => ({ ...r.game, _stat: `+${r.pct}% this week` }));
      }
    },
    {
      id: "most_wanted",
      label: "Most Wanted",
      desc: "Highest want-to-play across the community",
      run: async () => {
        const { data } = await supabase.from("user_games")
          .select("game_id, games(id, name, genre)")
          .eq("status", "want_to_play");
        const counts = {};
        (data || []).forEach(r => {
          if (!r.games) return;
          if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 };
          counts[r.game_id].count++;
        });
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12)
          .map(r => ({ ...r.game, _stat: `${r.count} want to play` }));
      }
    },
    {
      id: "critics_choice",
      label: "Critic's Choice",
      desc: "Highest rated with meaningful review volume",
      run: async () => {
        const { data } = await supabase.from("games")
          .select("id, name, genre, avg_rating, review_count")
          .gte("review_count", 3)
          .order("avg_rating", { ascending: false })
          .limit(12);
        return (data || []).map(g => ({ ...g, _stat: `${g.avg_rating?.toFixed(1)} avg · ${g.review_count} reviews` }));
      }
    },
    ...(currentUser ? [{
      id: "your_people",
      label: "Your People Are Playing",
      desc: "On the shelves of people you follow",
      run: async () => {
        const { data: follows } = await supabase.from("follows")
          .select("followed_user_id").eq("follower_id", currentUser.id);
        if (!follows?.length) return [];
        const followIds = follows.map(f => f.followed_user_id);
        const { data } = await supabase.from("user_games")
          .select("game_id, status, games(id, name, genre)")
          .in("user_id", followIds)
          .in("status", ["playing", "have_played"]);
        const counts = {};
        (data || []).forEach(r => {
          if (!r.games || userShelf.has(r.game_id)) return;
          if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 };
          counts[r.game_id].count++;
        });
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12)
          .map(r => ({ ...r.game, _stat: `${r.count} of your people played it` }));
      }
    },
    {
      id: "not_on_shelf",
      label: "Not on Your Shelf Yet",
      desc: "Community favorites you haven't picked up",
      run: async () => {
        const { data } = await supabase.from("user_games")
          .select("game_id, games(id, name, genre)")
          .in("status", ["playing", "have_played"]);
        const counts = {};
        (data || []).forEach(r => {
          if (!r.games || userShelf.has(r.game_id)) return;
          if (!counts[r.game_id]) counts[r.game_id] = { game: r.games, count: 0 };
          counts[r.game_id].count++;
        });
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 12)
          .map(r => ({ ...r.game, _stat: `${r.count} players` }));
      }
    }] : []),
  ];

  const runInsight = async (insight) => {
    if (activeInsight === insight.id && discoveryResults !== null) {
      setActiveInsight(null); setDiscoveryResults(null); setDiscoveryLabel(""); return;
    }
    setActiveInsight(insight.id);
    setDiscoveryLoading(true);
    setDiscoveryResults(null);
    setDiscoveryLabel(insight.label);
    setNameSearch("");
    const results = await insight.run();
    setDiscoveryResults(results);
    setDiscoveryLoading(false);
  };

  const runNameSearch = async (q) => {
    if (!q.trim()) { setDiscoveryResults(null); setActiveInsight(null); setDiscoveryLabel(""); return; }
    setActiveInsight(null);
    setDiscoveryLoading(true);
    setDiscoveryLabel(`Results for "${q}"`);
    const { data } = await supabase.from("games").select("id, name, genre, avg_rating, review_count")
      .ilike("name", `%${q}%`).limit(20);
    setDiscoveryResults((data || []).map(g => ({ ...g, _stat: g.avg_rating ? `${g.avg_rating.toFixed(1)} avg rating` : g.genre || "" })));
    setDiscoveryLoading(false);
  };

  const clearDiscovery = () => {
    setActiveInsight(null); setDiscoveryResults(null);
    setDiscoveryLabel(""); setNameSearch(""); setDiscoveryOpen(false);
  };

  const Sparkline = ({ points, color = C.accent }) => {
    if (!points || points.length === 0) return null;
    const w = 260, h = 60, pad = 4;
    const max = Math.max(...points, 0.1);
    const pts = points.map((v, i) => { const x = pad + (i / (points.length - 1)) * (w - pad * 2); const y = h - pad - (v / max) * (h - pad * 2); return `${x},${y}`; }).join(" ");
    const areaPath = `M ${pad},${h - pad} ` + points.map((v, i) => { const x = pad + (i / (points.length - 1)) * (w - pad * 2); const y = h - pad - (v / max) * (h - pad * 2); return `L ${x},${y}`; }).join(" ") + ` L ${w - pad},${h - pad} Z`;
    const labels = ["8w", "7w", "6w", "5w", "4w", "3w", "2w", "Now"];
    return (
      <div style={{ marginTop: 8 }}>
        <svg width={w} height={h} style={{ display: "block" }}>
          <defs><linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
          <path d={areaPath} fill={`url(#grad-${color.replace("#","")})`} />
          <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((v, i) => { const x = pad + (i / (points.length - 1)) * (w - pad * 2); const y = h - pad - (v / max) * (h - pad * 2); return <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 3.5 : 2} fill={color} opacity={i === points.length - 1 ? 1 : 0.5} />; })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, paddingLeft: pad, paddingRight: pad }}>
          {labels.map((l, i) => <span key={i} style={{ color: C.textDim, fontSize: 9, width: w / labels.length, textAlign: "center" }}>{l}</span>)}
        </div>
      </div>
    );
  };

  const getDominantSignal = (entry) => {
    if (entry.shelf_playing > 0) return `${entry.shelf_playing} playing`;
    if (entry.review > 0) return `${entry.review} review${entry.review > 1 ? "s" : ""}`;
    if (entry.comment > 0) return `${entry.comment} comment${entry.comment > 1 ? "s" : ""}`;
    if (entry.shelf_want > 0) return `${entry.shelf_want} want to play`;
    if (entry.post > 0) return `${entry.post} post${entry.post > 1 ? "s" : ""}`;
    return `${entry.uniqueUsers} player${entry.uniqueUsers > 1 ? "s" : ""}`;
  };

  const ChartRow = ({ entry, rank, section }) => {
    const isExpanded = section === "overall" ? expandedOverall === entry.id : expandedGenre[section] === entry.id;
    const sp = sparklines[entry.id];
    const isLoadingSp = loadingSparkline[entry.id];
    const momentum = sp ? (() => { const last = sp[sp.length - 1] || 0; const prev = sp[sp.length - 2] || 0; if (prev === 0) return null; const pct = Math.round(((last - prev) / prev) * 100); return { pct, up: pct >= 0 }; })() : null;
    return (
      <div style={{ borderBottom: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div onClick={() => handleExpand(entry.id, section)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", background: isExpanded ? C.accentGlow : "transparent" }}
          onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = C.surfaceHover; }}
          onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}>
          <div style={{ width: 24, textAlign: "center", fontWeight: 800, fontSize: rank <= 3 ? 16 : 13, color: rank === 1 ? C.gold : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : C.textDim, flexShrink: 0 }}>{rank}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{entry.name}</div>
            <div style={{ color: C.textDim, fontSize: 11, marginTop: 1 }}>{getDominantSignal(entry)} · {entry.uniqueUsers} player{entry.uniqueUsers !== 1 ? "s" : ""}</div>
          </div>
          {momentum && <div style={{ color: momentum.up ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{momentum.up ? "▲" : "▼"} {Math.abs(momentum.pct)}%</div>}
          <div style={{ color: isExpanded ? C.accentSoft : C.textDim, fontSize: 11, flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</div>
        </div>
        {isExpanded && (
          <div style={{ padding: "4px 20px 18px", borderTop: `1px solid ${C.border}`, background: C.accentGlow }}>
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 4, marginTop: 8 }}>Momentum — last 8 weeks</div>
            {isLoadingSp ? <div style={{ color: C.textDim, fontSize: 12, padding: "12px 0" }}>Loading trend…</div>
              : sp ? <Sparkline points={sp} color={C.accent} />
              : <div style={{ color: C.textDim, fontSize: 12, padding: "12px 0" }}>No trend data yet.</div>}
            <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
              {entry.post > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>{entry.post}</div><div style={{ color: C.textDim, fontSize: 10 }}>posts</div></div>}
              {entry.comment > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>{entry.comment}</div><div style={{ color: C.textDim, fontSize: 10 }}>comments</div></div>}
              {entry.shelf_playing > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: "#22c55e", fontSize: 16 }}>{entry.shelf_playing}</div><div style={{ color: C.textDim, fontSize: 10 }}>playing</div></div>}
              {entry.shelf_want > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.accentSoft, fontSize: 16 }}>{entry.shelf_want}</div><div style={{ color: C.textDim, fontSize: 10 }}>want to play</div></div>}
              {entry.review > 0 && <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.gold, fontSize: 16 }}>{entry.review}</div><div style={{ color: C.textDim, fontSize: 10 }}>reviews</div></div>}
              <div style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
                <button onClick={e => { e.stopPropagation(); setCurrentGame(entry.id); setActivePage("game"); }}
                  style={{ background: C.accent, border: "none", borderRadius: 8, padding: "7px 16px", color: C.accentText, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View Game →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 24px 40px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: isMobile ? 22 : 28, color: C.text, letterSpacing: "-0.5px", marginBottom: 6 }}>Games</div>
        <div style={{ color: C.textMuted, fontSize: 14 }}>What the community is playing, reviewing, and shelving.</div>
      </div>

      {/* ── Game Discovery Card ── */}
      {!currentUser ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 32, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 4 }}>Game Discovery</div>
            <div style={{ color: C.textMuted, fontSize: 13 }}>Game discovery works when you build your game shelf.</div>
          </div>
          <button onClick={() => onSignIn?.("Build your shelf and unlock game discovery.")}
            style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 18px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            Sign Up Now
          </button>
        </div>
      ) : (
      <div style={{ background: C.surface, border: `1px solid ${discoveryOpen ? C.accentDim : C.border}`, borderRadius: 16, marginBottom: 32, overflow: "hidden", transition: "border-color 0.2s" }}>
        {/* Card header — always visible, click to expand */}
        <div onClick={() => setDiscoveryOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Game Discovery</div>
            <div style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>Find something to play based on what the community is doing.</div>
          </div>
          <div style={{ color: C.textDim, fontSize: 12, marginLeft: 16, flexShrink: 0 }}>{discoveryOpen ? "▲" : "▼"}</div>
        </div>

        {/* Expanded panel */}
        {discoveryOpen && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "20px 22px 22px" }}>
            {/* Insight pills */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Discover by</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {INSIGHTS.map(insight => (
                  <button key={insight.id} onClick={() => runInsight(insight)}
                    title={insight.desc}
                    style={{ background: activeInsight === insight.id ? C.accentGlow : C.surfaceRaised, border: `1px solid ${activeInsight === insight.id ? C.accentDim : C.border}`, borderRadius: 20, padding: "7px 16px", color: activeInsight === insight.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: activeInsight === insight.id ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                    {insight.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Name search */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ color: C.textDim, fontSize: 12, flexShrink: 0 }}>or search by name</div>
              <input value={nameSearch}
                onChange={e => { setNameSearch(e.target.value); if (!e.target.value) { setDiscoveryResults(null); setActiveInsight(null); setDiscoveryLabel(""); } }}
                onKeyDown={e => e.key === "Enter" && runNameSearch(nameSearch)}
                placeholder="Type a game name..."
                style={{ flex: 1, background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", color: C.text, fontSize: 14, outline: "none" }}
              />
              {nameSearch && (
                <button onClick={() => runNameSearch(nameSearch)}
                  style={{ background: C.accent, border: "none", borderRadius: 10, padding: "8px 16px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Search
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* ── Discovery Results ── */}
      {(discoveryResults !== null || discoveryLoading) && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>
              {discoveryLoading ? "Finding games…" : `${discoveryLabel} · ${discoveryResults?.length || 0} game${discoveryResults?.length !== 1 ? "s" : ""}`}
            </div>
            <button onClick={clearDiscovery} style={{ background: "transparent", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Clear</button>
          </div>
          {discoveryLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
              {[...Array(8)].map((_, i) => <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, height: 90 }} />)}
            </div>
          ) : discoveryResults?.length === 0 ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "40px 24px", textAlign: "center", color: C.textDim }}>
              No results found. Try a different approach.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
              {discoveryResults.map(g => {
                const v = gameVisuals(g);
                const onShelf = userShelf.has(g.id);
                return (
                  <div key={g.id} onClick={() => { setCurrentGame(g.id); setActivePage("game"); }}
                    style={{ background: C.surface, border: `1px solid ${onShelf ? C.accentDim : C.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = onShelf ? C.accent : C.borderHover}
                    onMouseLeave={e => e.currentTarget.style.borderColor = onShelf ? C.accentDim : C.border}>
                    <div style={{ width: 28, height: 4, borderRadius: 2, background: v.color, marginBottom: 10 }} />
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>{g.name}</div>
                    <div style={{ color: C.textDim, fontSize: 11 }}>{g._stat}</div>
                    {onShelf && <div style={{ fontSize: 10, color: C.accentSoft, fontWeight: 700, marginTop: 6 }}>On your shelf</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── The Charts ── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: C.text, letterSpacing: "-0.3px" }}>The Charts</div>
          <div style={{ color: C.textMuted, fontSize: 13, marginTop: 3 }}>Ranked by what the community is actually doing.</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ id: "7d", label: "This Week" }, { id: "30d", label: "This Month" }].map(w => (
            <button key={w.id} onClick={() => { setChartWindow(w.id); setExpandedOverall(null); setExpandedGenre({}); setExpandedGenreAll(new Set()); }}
              style={{ background: chartWindow === w.id ? C.accentGlow : C.surface, border: `1px solid ${chartWindow === w.id ? C.accentDim : C.border}`, borderRadius: 20, padding: "6px 16px", color: chartWindow === w.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: chartWindow === w.id ? 700 : 500, cursor: "pointer" }}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {chartsLoading ? (
        <div style={{ color: C.textDim, fontSize: 14, textAlign: "center", padding: 60 }}>Loading charts…</div>
      ) : overall.length === 0 ? (
        <div style={{ color: C.textDim, fontSize: 14, textAlign: "center", padding: 60, lineHeight: 1.8 }}>
          No chart data for this window yet.<br />
          <span style={{ fontSize: 12 }}>Charts fill up as the community posts, plays, and reviews games.</span>
        </div>
      ) : (
        <>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 32, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Top 10 Overall</div>
              <div style={{ color: C.textDim, fontSize: 12 }}>{chartWindow === "7d" ? "This Week" : "This Month"}</div>
            </div>
            {overall.map((entry, i) => <ChartRow key={entry.id} entry={entry} rank={i + 1} section="overall" />)}
          </div>

          {(() => {
            const genreEntries = Object.entries(byGenre).filter(([, games]) => games.length >= 2);
            if (genreEntries.length === 0) return null;
            return (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>By Genre</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                  {genreEntries.map(([genre, games]) => {
                    const fullList = byGenreFull[genre] || games;
                    const isExpanded = expandedGenreAll.has(genre);
                    const displayList = isExpanded ? fullList : games;
                    const hasMore = fullList.length > games.length;
                    return (
                      <div key={genre} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
                        <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{genre}</div>
                        </div>
                        {displayList.map((entry, i) => <ChartRow key={entry.id} entry={entry} rank={i + 1} section={genre} />)}
                        {(hasMore || isExpanded) && (
                          <button onClick={() => setExpandedGenreAll(prev => { const n = new Set(prev); isExpanded ? n.delete(genre) : n.add(genre); return n; })}
                            style={{ margin: "10px 16px 14px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", width: "calc(100% - 32px)" }}>
                            {isExpanded ? "Show less" : `See all ${fullList.length} in ${genre} →`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ─── GAME PAGE ────────────────────────────────────────────────────────────────

function GamePage({ gameId, setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, isMobile, currentUser, isGuest, onSignIn }) {
  const hardcoded = GAMES[gameId];
  const [activeTab, setActiveTab] = useState("pulse");
  const [followed, setFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [dbGame, setDbGame] = useState(null);
  const [gamePosts, setGamePosts] = useState([]);
  const [topVoices, setTopVoices] = useState([]);
  const [latestReviews, setLatestReviews] = useState([]);
  const [chartsData, setChartsData] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, headline: "", time_played: "", completed: false, loved: "", didnt_love: "", content: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const load = async () => {
      let query = supabase.from("games").select("*");
      if (gameId && gameId.includes('-')) {
        query = query.eq("id", gameId);
      } else if (hardcoded) {
        query = query.ilike("name", hardcoded.name);
      } else return;
      const { data } = await query.single();
      if (!data) return;
      setDbGame(data);
      const dbId = data.id;

      // Posts
      const { data: posts } = await supabase
        .from("posts")
        .select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials)")
        .eq("game_tag", dbId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (posts) setGamePosts(posts);

      // Top Voices — users with most likes on posts for this game
      const { data: voicePosts } = await supabase
        .from("posts")
        .select("user_id, likes, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding)")
        .eq("game_tag", dbId)
        .not("user_id", "is", null);
      if (voicePosts) {
        const byUser = {};
        voicePosts.forEach(p => {
          if (!p.user_id || !p.profiles) return;
          if (!byUser[p.user_id]) byUser[p.user_id] = { ...p.profiles, user_id: p.user_id, totalLikes: 0, postCount: 0 };
          byUser[p.user_id].totalLikes += (p.likes || 0);
          byUser[p.user_id].postCount += 1;
        });
        const sorted = Object.values(byUser).sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 5);
        setTopVoices(sorted);
      }

      // Latest reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("*, profiles(username, handle, avatar_initials)")
        .eq("game_id", dbId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (reviews) setLatestReviews(reviews);

      // Charts data — rank by weekly posts + reviews
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: weeklyPosts } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("game_tag", dbId)
        .gte("created_at", oneWeekAgo);
      const { count: weeklyReviews } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("game_id", dbId)
        .gte("created_at", oneWeekAgo);
      const { data: avgData } = await supabase
        .from("reviews")
        .select("rating")
        .eq("game_id", dbId);
      const avgRating = avgData && avgData.length > 0
        ? (avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length).toFixed(1)
        : null;
      setChartsData({ weeklyPosts: weeklyPosts || 0, weeklyReviews: weeklyReviews || 0, avgRating, totalReviews: avgData?.length || 0 });
    };
    load();
  }, [gameId]);

  useEffect(() => {
    const checkFollow = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !dbGame) return;
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("followed_game_id", dbGame.id).maybeSingle();
      setFollowed(!!data);
    };
    if (dbGame) checkFollow();
  }, [dbGame]);

  const toggleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !dbGame) return;
    setFollowLoading(true);
    if (followed) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_game_id", dbGame.id);
      setFollowed(false);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_game_id: dbGame.id });
      setFollowed(true);
    }
    setFollowLoading(false);
  };

  const submitReview = async () => {
    if (!reviewForm.rating || submittingReview) return;
    setSubmittingReview(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || !dbGame) { setSubmittingReview(false); return; }
    const { error } = await supabase.from("reviews").upsert({
      user_id: authUser.id,
      game_id: dbGame.id,
      rating: reviewForm.rating,
      headline: reviewForm.headline || null,
      time_played: reviewForm.time_played ? parseInt(reviewForm.time_played) : null,
      completed: reviewForm.completed,
      loved: reviewForm.loved || null,
      didnt_love: reviewForm.didnt_love || null,
      content: reviewForm.content || null,
    });
    if (!error) {
      logChartEvent(dbGame.id, 'review', authUser.id); // fire-and-forget
      supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "review_written" }).then(() => onQuestComplete?.());
      // Refresh reviews and charts
      const { data: reviews } = await supabase.from("reviews").select("*, profiles(username, handle, avatar_initials)").eq("game_id", dbGame.id).order("created_at", { ascending: false }).limit(5);
      if (reviews) setLatestReviews(reviews);
      const { data: avgData } = await supabase.from("reviews").select("rating").eq("game_id", dbGame.id);
      const avgRating = avgData && avgData.length > 0 ? (avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length).toFixed(1) : null;
      setChartsData(prev => ({ ...prev, avgRating, totalReviews: avgData?.length || 0 }));
      setShowReviewForm(false);
      setReviewForm({ rating: 0, headline: "", time_played: "", completed: false, loved: "", didnt_love: "", content: "" });
    }
    setSubmittingReview(false);
  };

  const game = dbGame ? {
    trendingTopics: [],
    topVoices: [],
    alsoLiked: [],
    tips: [],
    posts: [],
    activePlayers: 0,
    completions: 0,
    reviewScore: chartsData?.avgRating || null,
    reviewCount: chartsData?.totalReviews || 0,
    year: null,
    ...(hardcoded || {}),
    name: dbGame.name,
    developer: dbGame.developer,
    description: dbGame.description,
    followers: dbGame.followers,
    genre: dbGame.genre ? [dbGame.genre] : (hardcoded?.genre || []),
    color: hardcoded?.color || (() => { const COLORS = ['#0ea5e9','#f59e0b','#10b981','#ef4444','#3b82f6','#0d9488','#f97316','#38bdf8']; return COLORS[(dbGame.name || '').split('').reduce((a,c)=>a+c.charCodeAt(0),0) % COLORS.length]; })(),
    gradient: hardcoded?.gradient || (() => { const COLORS = ['#0ea5e9','#f59e0b','#10b981','#ef4444','#3b82f6','#0d9488','#f97316','#38bdf8']; const c = COLORS[(dbGame.name || '').split('').reduce((a,ch)=>a+ch.charCodeAt(0),0) % COLORS.length]; return `linear-gradient(135deg, ${c}22 0%, #080e1a 100%)`; })(),
    icon: hardcoded?.icon || { 'MMO':'🌐','MOBA':'⚔️','Battle Royale':'🎯','Action RPG':'🗡️','RPG':'📖','Roguelike':'🎲','Tactical Shooter':'🔫','Hero Shooter':'🦸','Looter Shooter':'💥','Soulslike':'💀','Fighting':'🥊','Farming Sim':'🌱','Life Simulation':'🏡','City Builder':'🏙️','Sandbox Survival':'⛏️','Survival':'🪓','Racing':'🏎️','Sports':'⚽','Platformer':'🕹️','Auto Battler':'♟️','RTS':'🏰','Turn-Based Strategy':'🎖️' }[dbGame.genre] || '🎮',
    claimed: dbGame.is_claimed,
    id: gameId,
  } : hardcoded;

  if (!game) return (
    <div style={{ maxWidth: 800, margin: "100px auto", textAlign: "center", color: C.textMuted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>Loading...</div>
      <button onClick={() => setActivePage("games")} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "10px 24px", color: C.accentText, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>Browse Games</button>
    </div>
  );

  const tabs = [{ id: "pulse", label: "🔥 Pulse" }, { id: "community", label: "👥 Community" }, { id: "tips", label: "💡 Tips" }, { id: "posts", label: "📝 Posts" }, { id: "developer", label: "🏢 Developer" }];

  return (
    <div style={{ paddingTop: isMobile ? 52 : 60 }}>
      <div style={{ background: game.gradient, borderBottom: `1px solid ${game.color}33` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "24px 16px 20px" : "36px 24px 28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 14 : 20, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            <div style={{ width: isMobile ? 56 : 80, height: isMobile ? 56 : 80, borderRadius: 16, fontSize: isMobile ? 30 : 44, background: `${game.color}22`, border: `2px solid ${game.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{game.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? 20 : 28, color: "#fff" }}>{game.name}</h1>
                {game.claimed && <Badge color={C.teal}>✓ Dev Claimed</Badge>}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: isMobile ? 8 : 10 }}>{game.developer} · {game.year}</div>
              {!isMobile && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: "0 0 16px", maxWidth: 540, lineHeight: 1.6 }}>{game.description}</p>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: isMobile ? 12 : 0 }}>
                <button onClick={toggleFollow} disabled={followLoading} style={{ background: followed ? `${game.color}33` : game.color, border: `1px solid ${game.color}`, borderRadius: 8, padding: "7px 18px", color: followed ? game.color : "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{followLoading ? "..." : followed ? "✓ Following" : "+ Follow"}</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-start" }}>
              {[{ label: "Followers", value: (game.followers / 1000).toFixed(1) + "k", color: game.color }, { label: "Active", value: (game.activePlayers || 0).toLocaleString(), color: C.online }, { label: "Score", value: game.reviewScore ? "★ " + game.reviewScore : "—", color: C.gold }].map(s => (
                <div key={s.label} style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: isMobile ? "8px 12px" : "12px 16px", textAlign: "center", flex: isMobile ? 1 : "none", minWidth: isMobile ? 0 : 80 }}>
                  <div style={{ fontWeight: 800, fontSize: isMobile ? 14 : 17, color: s.color }}>{s.value}</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: isMobile ? 52 : 60, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px", display: "flex", overflowX: "auto" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: "transparent", border: "none", borderBottom: activeTab === tab.id ? `2px solid ${game.color}` : "2px solid transparent", padding: isMobile ? "12px 14px" : "14px 18px", cursor: "pointer", color: activeTab === tab.id ? "#fff" : C.textMuted, fontSize: isMobile ? 12 : 13, fontWeight: activeTab === tab.id ? 700 : 500, whiteSpace: "nowrap" }}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "16px 16px 80px" : "24px" }}>
        {activeTab === "pulse" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 20 }}>
            <div>
              {/* The Charts card */}
              <div style={{ background: C.surface, border: `1px solid ${game.color}44`, borderRadius: 14, padding: 22, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>The Charts</div>
                  <span style={{ color: C.textDim, fontSize: 12 }}>This week</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Posts This Week", value: chartsData?.weeklyPosts ?? "—", color: game.color },
                    { label: "New Reviews", value: chartsData?.weeklyReviews ?? "—", color: C.teal },
                    { label: "Avg Rating", value: chartsData?.avgRating ? `${chartsData.avgRating}/10` : "—", color: C.gold },
                  ].map(s => (
                    <div key={s.label} style={{ background: C.surfaceRaised, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ fontWeight: 800, fontSize: 20, color: s.color }}>{s.value}</div>
                      <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {chartsData?.weeklyPosts === 0 && (
                  <div style={{ textAlign: "center", color: C.textDim, fontSize: 13, marginTop: 14 }}>
                    Be the first to post about {game.name} and get on The Charts.
                  </div>
                )}
              </div>

              {/* Latest Reviews */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>⭐ Latest Reviews</div>
                  <button onClick={() => setShowReviewForm(true)} style={{ background: game.color, border: "none", borderRadius: 7, padding: "5px 12px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Write Review</button>
                </div>
                {showReviewForm && (
                  <div style={{ background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 14 }}>Your Review of {game.name}</div>
                    {/* Star rating */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Rating (required)</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))}
                            style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${reviewForm.rating >= n ? C.gold : C.border}`, background: reviewForm.rating >= n ? C.goldDim : C.surfaceRaised, color: reviewForm.rating >= n ? C.gold : C.textDim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{n}</button>
                        ))}
                      </div>
                    </div>
                    <input value={reviewForm.headline} onChange={e => setReviewForm(f => ({ ...f, headline: e.target.value }))} placeholder="Headline (e.g. 'A masterpiece that respects your time')" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                      <input value={reviewForm.time_played} onChange={e => setReviewForm(f => ({ ...f, time_played: e.target.value }))} placeholder="Hours played" type="number" style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted, fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" checked={reviewForm.completed} onChange={e => setReviewForm(f => ({ ...f, completed: e.target.checked }))} />
                        Completed
                      </label>
                    </div>
                    <input value={reviewForm.loved} onChange={e => setReviewForm(f => ({ ...f, loved: e.target.value }))} placeholder="What you loved..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
                    <input value={reviewForm.didnt_love} onChange={e => setReviewForm(f => ({ ...f, didnt_love: e.target.value }))} placeholder="What you didn't love..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
                    <textarea value={reviewForm.content} onChange={e => setReviewForm(f => ({ ...f, content: e.target.value }))} placeholder="Full thoughts (optional)..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", resize: "none", minHeight: 80, marginBottom: 12, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => setShowReviewForm(false)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                      <button onClick={submitReview} disabled={!reviewForm.rating || submittingReview} style={{ background: reviewForm.rating ? game.color : C.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 18px", color: reviewForm.rating ? "#000" : C.textDim, fontSize: 13, fontWeight: 700, cursor: reviewForm.rating ? "pointer" : "default" }}>{submittingReview ? "Saving..." : "Submit Review"}</button>
                    </div>
                  </div>
                )}
                {latestReviews.length > 0 ? latestReviews.map((review, i) => (
                  <div key={review.id} style={{ padding: "14px 0", borderBottom: i < latestReviews.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <Avatar initials={review.profiles?.avatar_initials || "GL"} size={30} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{review.profiles?.username || "Gamer"}</div>
                        <div style={{ color: C.textDim, fontSize: 11 }}>{timeAgo(review.created_at)}{review.time_played ? ` · ${review.time_played}h played` : ""}{review.completed ? " · ✓ Completed" : ""}</div>
                      </div>
                      <div style={{ background: C.goldDim, border: `1px solid ${C.gold}44`, borderRadius: 8, padding: "4px 10px", color: C.gold, fontWeight: 800, fontSize: 14 }}>{review.rating}/10</div>
                    </div>
                    {review.headline && <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 6 }}>{review.headline}</div>}
                    {review.loved && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>✅ {review.loved}</div>}
                    {review.didnt_love && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>⚠️ {review.didnt_love}</div>}
                    {review.content && <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{review.content}</p>}
                  </div>
                )) : (
                  <div style={{ textAlign: "center", padding: "30px 0", color: C.textDim }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
                    <div style={{ fontSize: 13 }}>No reviews yet. Be the first.</div>
                  </div>
                )}
              </div>

              {/* Also liked — keep for hardcoded games, hide for DB-only */}
              {game.alsoLiked.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 16, marginBottom: 4 }}>🎲 Players Who Like {game.name} Also Love...</div>
                  <div style={{ color: C.textDim, fontSize: 12, marginBottom: 16 }}>Based on follows, reviews & completions</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                    {game.alsoLiked.map(g2 => (
                      <div key={g2.id} onClick={() => { setCurrentGame(g2.id); setActiveTab("pulse"); }}
                        style={{ background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 22 }}>{g2.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{g2.name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <div style={{ height: 4, width: 50, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${g2.overlap}%`, background: game.color, borderRadius: 2 }} />
                              </div>
                              <span style={{ color: game.color, fontSize: 11, fontWeight: 700 }}>{g2.overlap}%</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ color: C.textDim, fontSize: 12, fontStyle: "italic" }}>{g2.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar — Top Voices */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, alignSelf: "start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontWeight: 800, color: C.text, fontSize: 15 }}>🏆 Top Voices</div>
                <span style={{ color: C.textDim, fontSize: 12 }}>By likes earned</span>
              </div>
              {topVoices.length > 0 ? topVoices.map((voice, i) => (
                <div key={voice.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < topVoices.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: i === 0 ? C.goldDim : C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: i === 0 ? C.gold : C.textDim, fontSize: 11 }}>#{i + 1}</div>
                  <Avatar initials={voice.avatar_initials || "GL"} size={34} color={i === 0 ? C.gold : C.accent} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{voice.username || "Gamer"}</div>
                    <div style={{ color: C.textDim, fontSize: 11 }}>{voice.totalLikes} likes · {voice.postCount} posts</div>
                  </div>
                </div>
              )) : (
                // Fallback to hardcoded for games that have it
                game.topVoices.length > 0 ? game.topVoices.map((voice, i) => (
                  <div key={voice.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < game.topVoices.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: i === 0 ? C.goldDim : C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: i === 0 ? C.gold : C.textDim, fontSize: 11 }}>#{i + 1}</div>
                    <Avatar initials={voice.avatar} size={34} color={i === 0 ? C.gold : C.accent} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{voice.name} {voice.badge}</div>
                      <div style={{ color: C.textDim, fontSize: 11 }}>{(voice.score / 1000).toFixed(1)}k pts</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: "center", padding: "30px 0", color: C.textDim }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                    <div style={{ fontSize: 13 }}>Post about {game.name} to appear here.</div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {activeTab === "community" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, gridColumn: "span 2" }}>
              <div style={{ fontWeight: 800, color: C.text, fontSize: 16, marginBottom: 4 }}>🏁 Completion Board</div>
              <div style={{ color: C.textDim, fontSize: 13, marginBottom: 20 }}>{(game.completions || 0).toLocaleString()} GuildLink members have completed this game</div>
              {[{ label: "Any% Complete", count: game.completions, pct: 100, color: C.green }, { label: "True Ending", count: Math.floor((game.completions || 0) * 0.64), pct: 64, color: C.teal }, { label: "New Game+", count: Math.floor((game.completions || 0) * 0.41), pct: 41, color: C.accent }, { label: "100% / Platinum", count: Math.floor((game.completions || 0) * 0.18), pct: 18, color: C.gold }, { label: "Speedrun (sub 2hr)", count: Math.floor((game.completions || 0) * 0.04), pct: 4, color: C.red }].map(row => (
                <div key={row.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: C.textMuted, fontSize: 13 }}>{row.label}</span>
                    <span style={{ color: row.color, fontSize: 13, fontWeight: 700 }}>{row.count.toLocaleString()} <span style={{ color: C.textDim, fontWeight: 400 }}>({row.pct}%)</span></span>
                  </div>
                  <div style={{ height: 6, background: C.surfaceRaised, borderRadius: 3 }}>
                    <div style={{ height: "100%", width: `${row.pct}%`, background: row.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
              <div style={{ fontWeight: 800, color: C.text, fontSize: 16, marginBottom: 16 }}>⭐ Community Score</div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 56, fontWeight: 900, color: C.gold }}>{game.reviewScore}</div>
                <div style={{ color: C.textDim, fontSize: 13, marginTop: 6 }}>Based on {(game.reviewCount || 0).toLocaleString()} reviews</div>
              </div>
              <button style={{ width: "100%", background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "8px", color: C.accentSoft, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Write a Review</button>
            </div>
          </div>
        )}

        {activeTab === "tips" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            {game.tips.map((tip, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: C.goldDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💡</div>
                  <div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 8 }}>{tip.title}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Badge small color={C.teal}>{tip.category}</Badge>
                      <span style={{ color: C.textDim, fontSize: 12 }}>by {tip.author}</span>
                      <span style={{ color: C.gold, fontSize: 12, fontWeight: 700, marginLeft: "auto" }}>▲ {tip.upvotes.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "posts" && (
          <div style={{ maxWidth: 680 }}>
            {gamePosts.length > 0 ? gamePosts.map(post => {
              const author = post.profiles || {};
              const isNPC = !!post.npc_id;
              return (
                <FeedPostCard key={post.id} post={{
                  id: post.id,
                  npc_id: post.npc_id,
                  game_tag: post.game_tag,
                  user_id: post.user_id,
                  user: {
                    name: author.username || "Gamer",
                    handle: author.handle || "@gamer",
                    avatar: author.avatar_initials || "GL",
                    status: "online",
                    isNPC,
                    isFounding: author.is_founding || false,
                  },
                  content: post.content,
                  time: timeAgo(post.created_at),
                  likes: post.likes || 0,
                  liked: post.liked || false,
                  comment_count: post.comment_count || 0,
                  commentList: [],
                }} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={currentUser} isGuest={isGuest} onSignIn={onSignIn} />
              );
            }) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎮</div>
                <div style={{ fontSize: 14 }}>No posts yet. Be the first to post about {game.name}.</div>
              </div>
            )}
          </div>
        )}

        {activeTab === "developer" && (
          <div>
            {game.claimed ? (
              <div style={{ background: C.surface, border: `1px solid ${C.teal}33`, borderRadius: 14, padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.teal}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏢</div>
                  <div>
                    <div style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>{game.developer}</div>
                    <Badge color={C.teal}>✓ Verified Developer</Badge>
                  </div>
                </div>
                <div style={{ background: C.surfaceRaised, borderRadius: 12, padding: 20 }}>
                  <div style={{ fontWeight: 700, color: C.teal, fontSize: 14, marginBottom: 8 }}>📢 Official Announcement</div>
                  <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, margin: 0 }}>Patch 1.12 is now live. Balance changes to Colosseum fights, new shard farm locations, and several boss hitbox fixes.</p>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 40px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
                <div style={{ fontWeight: 800, color: C.text, fontSize: 20, marginBottom: 8 }}>Are you the developer?</div>
                <p style={{ color: C.textMuted, fontSize: 14, maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.7 }}>Claim this page to access community insights and post official announcements — without controlling the conversation.</p>
                <button style={{ background: C.teal, border: "none", borderRadius: 10, padding: "12px 32px", color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Claim This Page</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────

function ProfilePage({ setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, isMobile, currentUser, isGuest, onSignIn, defaultTab, onProfileSaved, onThemeChange, onQuestComplete }) {
  const user = currentUser;
  if (!user) return null;
  const [activeTab, setActiveTab] = useState(defaultTab || "posts");

  // Re-sync if parent changes the default tab (e.g. from quest banner)
  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);
  const [editing, setEditing] = useState(false);
  const [previewThemeId, setPreviewThemeId] = useState(null);
  const [editForm, setEditForm] = useState({ username: "", bio: "", games: "" });
  const [saving, setSaving] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [gameLibrary, setGameLibrary] = useState([]);
  const [postCount, setPostCount] = useState(0);
  const [postGameNames, setPostGameNames] = useState({});
  const [userShelf, setUserShelf] = useState({ want_to_play: [], playing: [], have_played: [] });
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [mobileMoveCard, setMobileMoveCard] = useState(null);
  const [addingGame, setAddingGame] = useState(false);
  const [gameSearch, setGameSearch] = useState("");
  const [gameSearchResults, setGameSearchResults] = useState([]);
  // Quest state
  const [userQuests, setUserQuests] = useState([]);
  const [userRewards, setUserRewards] = useState([]);
  const [questsLoaded, setQuestsLoaded] = useState(false);
  const [profileFollowing, setProfileFollowing] = useState([]);
  const [gamertags, setGamertags] = useState([]);
  const [gamertagForm, setGamertagForm] = useState({ platform: "", tag: "" });
  const [addingTag, setAddingTag] = useState(false);
  const [tagSaving, setTagSaving] = useState(false);
  const PLATFORMS = [
    { id: "xbox", label: "Xbox", color: "#107C10" },
    { id: "psn", label: "PlayStation", color: "#003087" },
    { id: "steam", label: "Steam", color: "#1b2838" },
    { id: "nintendo", label: "Nintendo", color: "#E4000F" },
    { id: "battlenet", label: "Battle.net", color: "#148EFF" },
  ];
  const isAdult = getAge(user.date_of_birth) >= 18;

  // DOB management — separate from main profile edit
  const [editingDob, setEditingDob] = useState(false);
  const [dobForm, setDobForm] = useState({ month: "", day: "", year: "" });
  const [dobSaving, setDobSaving] = useState(false);
  const [dobError, setDobError] = useState("");
  const canChangeDob = (user.dob_changes || 0) < 1;
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const formatDob = (dob) => {
    if (!dob) return null;
    const d = new Date(dob + "T00:00:00"); // force local parse
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const saveDob = async () => {
    setDobError("");
    const m = parseInt(dobForm.month), d = parseInt(dobForm.day), y = parseInt(dobForm.year);
    if (!m || !d || !y || isNaN(m) || isNaN(d) || isNaN(y)) { setDobError("Please fill in all fields."); return; }
    if (y < 1900 || y > new Date().getFullYear() - 5) { setDobError("Please enter a valid year."); return; }
    if (m < 1 || m > 12) { setDobError("Please enter a valid month."); return; }
    if (d < 1 || d > 31) { setDobError("Please enter a valid day."); return; }
    const dateStr = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const test = new Date(dateStr);
    if (isNaN(test.getTime())) { setDobError("That date doesn't look right."); return; }
    setDobSaving(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const newChanges = (user.dob_changes || 0) + (user.date_of_birth ? 1 : 0);
    const { error } = await supabase.from("profiles").update({
      date_of_birth: dateStr,
      dob_changes: newChanges,
    }).eq("id", authUser.id);
    if (!error) {
      setEditingDob(false);
      setDobForm({ month: "", day: "", year: "" });
      onProfileSaved?.();
      loadIncomingRequests();
      loadApprovedConnections();
      loadGamertags();
    } else {
      setDobError("Something went wrong. Please try again.");
    }
    setDobSaving(false);
  };

  const loadGamertags = async () => {
    const { data } = await supabase.from("gamertags").select("*").eq("user_id", user.id);
    if (data) setGamertags(data);
  };

  const saveGamertag = async () => {
    if (!gamertagForm.platform || !gamertagForm.tag.trim() || tagSaving) return;
    setTagSaving(true);
    await supabase.from("gamertags").upsert({
      user_id: user.id,
      platform: gamertagForm.platform,
      tag: gamertagForm.tag.trim(),
    }, { onConflict: "user_id,platform" });
    setGamertagForm({ platform: "", tag: "" });
    setAddingTag(false);
    setTagSaving(false);
    loadGamertags();
  };

  const deleteGamertag = async (platform) => {
    await supabase.from("gamertags").delete().eq("user_id", user.id).eq("platform", platform);
    setGamertags(prev => prev.filter(t => t.platform !== platform));
  };

  // Incoming gamertag requests
  const [incomingRequests, setIncomingRequests] = useState([]);

  const loadIncomingRequests = async () => {
    if (!isAdult) return;
    const { data } = await supabase
      .from("gamertag_requests")
      .select("*, profiles!gamertag_requests_requester_id_fkey(id, username, handle, avatar_initials)")
      .eq("target_id", user.id)
      .eq("status", "pending");
    if (data) setIncomingRequests(data);
  };

  const respondToRequest = async (requestId, newStatus) => {
    await supabase.from("gamertag_requests").update({ status: newStatus }).eq("id", requestId);
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  // Approved connections (for revoke UI)
  const [approvedConnections, setApprovedConnections] = useState([]);

  const loadApprovedConnections = async () => {
    if (!isAdult) return;
    const { data } = await supabase
      .from("gamertag_requests")
      .select("*, profiles!gamertag_requests_requester_id_fkey(id, username, handle, avatar_initials)")
      .eq("target_id", user.id)
      .eq("status", "approved");
    if (data) setApprovedConnections(data);
  };

  const revokeConnection = async (requestId) => {
    await supabase.from("gamertag_requests").update({ status: "revoked" }).eq("id", requestId);
    setApprovedConnections(prev => prev.filter(r => r.id !== requestId));
  };

  const loadQuests = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: quests } = await supabase.rpc("get_user_quests", { p_user_id: authUser.id });
    if (quests) {
      setUserQuests(quests);
      setQuestsLoaded(true);
    }
    const { data: rewards } = await supabase
      .from("user_rewards")
      .select("*, quest_rewards(*)")
      .eq("user_id", authUser.id);
    if (rewards) setUserRewards(rewards);
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Real posts + liked state
      const [postsResult, likesResult] = await Promise.all([
        supabase.from("posts")
          .select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials)")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("post_likes").select("post_id").eq("user_id", authUser.id).then(r => r.error ? { data: [] } : r),
      ]);
      const likedIds = new Set((likesResult.data || []).map(l => l.post_id));
      const posts = postsResult.data;
      if (postsResult.error) console.error("Profile posts error:", postsResult.error);
      if (posts) {
        setUserPosts(posts.map(p => ({ ...p, liked: likedIds.has(p.id), likes: p.likes ?? 0 })));
        setPostCount(posts.length);
        // Build names map from posts that have game_tag, fetch in one query
        const gameIds = [...new Set(posts.filter(p => p.game_tag && p.game_tag.includes('-')).map(p => p.game_tag.trim()))];
        if (gameIds.length > 0) {
          const { data: games } = await supabase.from("games").select("id, name").in("id", gameIds);
          if (games) {
            const namesMap = {};
            games.forEach(g => { namesMap[g.id] = g.name; });
            setPostGameNames(namesMap);
          }
        }
      }

      // Reviews with game info
      const { data: reviews } = await supabase
        .from("reviews")
        .select("*, games(id, name, developer, genre)")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false });
      if (reviews) setUserReviews(reviews);

      // Game shelf from user_games table
      const { data: shelfData } = await supabase
        .from("user_games")
        .select("*, games(id, name, developer, genre)")
        .eq("user_id", authUser.id);
      if (shelfData) {
        const shelf = { want_to_play: [], playing: [], have_played: [] };
        shelfData.forEach(entry => {
          if (shelf[entry.status]) shelf[entry.status].push(entry);
        });
        setUserShelf(shelf);
      }

      // Game library — from reviews + shelf
      const gamesMap = {};
      if (reviews) reviews.forEach(r => { if (r.games) gamesMap[r.game_id] = r.games; });
      if (shelfData) shelfData.forEach(s => { if (s.games) gamesMap[s.game_id] = s.games; });
      if (posts) {
        const postGameIds = posts.filter(p => p.game_tag && p.game_tag.includes('-')).map(p => p.game_tag).filter(id => !gamesMap[id]);
        if (postGameIds.length > 0) {
          const { data: games } = await supabase.from("games").select("id, name, developer, genre, followers").in("id", postGameIds);
          if (games) games.forEach(g => gamesMap[g.id] = g);
        }
      }
      setGameLibrary(Object.values(gamesMap));

      // Following — users and NPCs
      const { data: followData } = await supabase
        .from("follows")
        .select("followed_user_id, followed_npc_id, profiles!follows_followed_user_id_fkey(id, username, handle, avatar_initials)")
        .eq("follower_id", authUser.id);
      if (followData) {
        const users = followData.filter(f => f.followed_user_id && f.profiles).map(f => ({
          id: f.followed_user_id,
          username: f.profiles.username,
          handle: f.profiles.handle,
          avatar_initials: f.profiles.avatar_initials,
          type: "user"
        }));
        const npcs = followData.filter(f => f.followed_npc_id).map(f => {
          const npc = Object.values(NPCS).find(n => n.id === f.followed_npc_id) || null;
          return npc ? { id: f.followed_npc_id, username: npc.name, handle: npc.handle, avatar_initials: npc.avatar, type: "npc" } : null;
        }).filter(Boolean);
        setProfileFollowing([...users, ...npcs]);
      }
    };
    load();
    loadGamertags();
    loadIncomingRequests();
    loadApprovedConnections();
    loadQuests();
  }, []);

  const startEdit = () => {
    setEditForm({
      username: user.name || "",
      bio: user.bio || "",
      games: Array.isArray(user.games) ? user.games.join(", ") : user.games || "",
      theme: user.theme || "deep-space",
      activeRing: user.activeRing || "none",
    });
    setPreviewThemeId(user.theme || "deep-space");
    setEditing(true);
  };

  const cancelEdit = () => {
    // Revert live preview back to saved theme
    applyTheme(user.theme || "deep-space");
    setPreviewThemeId(null);
    setEditing(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const updates = {
      username: editForm.username.trim(),
      handle: "@" + editForm.username.trim().toLowerCase().replace(/\s+/g, "_"),
      bio: editForm.bio.trim(),
      games: editForm.games.trim(),
      avatar_initials: editForm.username.trim().slice(0, 2).toUpperCase(),
      theme: editForm.theme || "deep-space",
    };
    const { error } = await supabase.from("profiles").update(updates).eq("id", authUser.id);
    if (!error) {
      onThemeChange?.(editForm.theme || "deep-space");
      setEditing(false);
      onProfileSaved?.();
      loadIncomingRequests();
      loadApprovedConnections();
      loadGamertags();
    }
    setSaving(false);
  };

  const moveGame = async (gameId, fromStatus, toStatus) => {
    if (fromStatus === toStatus) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("user_games").upsert({
      user_id: authUser.id,
      game_id: gameId,
      status: toStatus,
      updated_at: new Date().toISOString(),
    });
    const eventMap = { playing: 'shelf_playing', want_to_play: 'shelf_want', have_played: 'shelf_played' };
    if (eventMap[toStatus]) logChartEvent(gameId, eventMap[toStatus], authUser.id);
    // Quest triggers — only fire for the destination status
    if (toStatus === "have_played") await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "have_played" });
    if (toStatus === "want_to_play") await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "want_to_play" });
    checkShelfGenres(authUser.id);
    onQuestComplete?.();
    setUserShelf(prev => {
      const entry = prev[fromStatus].find(e => e.game_id === gameId);
      if (!entry) return prev;
      return {
        ...prev,
        [fromStatus]: prev[fromStatus].filter(e => e.game_id !== gameId),
        [toStatus]: [...prev[toStatus], { ...entry, status: toStatus }],
      };
    });
  };

  const addToShelf = async (game, status = "want_to_play") => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { error } = await supabase.from("user_games").upsert({
      user_id: authUser.id,
      game_id: game.id,
      status,
      updated_at: new Date().toISOString(),
    });
    if (!error) {
      const eventMap = { playing: 'shelf_playing', want_to_play: 'shelf_want', have_played: 'shelf_played' };
      if (eventMap[status]) logChartEvent(game.id, eventMap[status], authUser.id);
      // Quest triggers
      await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "shelf_add" });
      if (status === "have_played") await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "have_played" });
      if (status === "want_to_play") await supabase.rpc("increment_quest_progress", { p_user_id: authUser.id, p_trigger: "want_to_play" });
      checkShelfGenres(authUser.id);
      onQuestComplete?.();
      setUserShelf(prev => {
        const cleaned = {
          want_to_play: prev.want_to_play.filter(e => e.game_id !== game.id),
          playing: prev.playing.filter(e => e.game_id !== game.id),
          have_played: prev.have_played.filter(e => e.game_id !== game.id),
        };
        return { ...cleaned, [status]: [...cleaned[status], { game_id: game.id, status, games: game }] };
      });
      setGameLibrary(prev => prev.find(g => g.id === game.id) ? prev : [...prev, game]);
      setAddingGame(false);
      setGameSearch("");
      setGameSearchResults([]);
    }
  };

  const removeFromShelf = async (gameId, status) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("user_games").delete().eq("user_id", authUser.id).eq("game_id", gameId);
    setUserShelf(prev => ({ ...prev, [status]: prev[status].filter(e => e.game_id !== gameId) }));
  };

  const equipRing = async (ringId) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("profiles").update({ active_ring: ringId }).eq("id", authUser.id);
    onProfileSaved?.();
  };

  const checkShelfGenres = async (authUserId) => {
    const { data } = await supabase.from("user_games").select("games(genre)").eq("user_id", authUserId);
    if (!data) return;
    const genreCount = new Set(data.map(e => e.games?.genre).filter(Boolean)).size;
    if (genreCount > 0) {
      await supabase.from("user_quests").upsert(
        { user_id: authUserId, quest_id: "genre_explorer", progress: genreCount, completed: genreCount >= 5, completed_at: genreCount >= 5 ? new Date().toISOString() : null },
        { onConflict: "user_id,quest_id" }
      );
      await supabase.from("user_quests").upsert(
        { user_id: authUserId, quest_id: "genre_master", progress: genreCount, completed: genreCount >= 10, completed_at: genreCount >= 10 ? new Date().toISOString() : null },
        { onConflict: "user_id,quest_id" }
      );
      onQuestComplete?.();
    }
  };

  const searchGames = async (q) => {
    setGameSearch(q);
    if (q.length < 2) { setGameSearchResults([]); return; }
    const { data } = await supabase.from("games").select("id, name, developer, genre").ilike("name", `%${q}%`).limit(6);
    setGameSearchResults(data || []);
  };

  const handleDragStart = (gameId, fromStatus) => setDragging({ gameId, fromStatus });
  const handleDragOver = (e, status) => { e.preventDefault(); setDragOver(status); };
  const handleDrop = (e, toStatus) => {
    e.preventDefault();
    if (dragging) moveGame(dragging.gameId, dragging.fromStatus, toStatus);
    setDragging(null);
    setDragOver(null);
  };

  const SHELF_COLUMNS = [
    { id: "want_to_play", label: "Want to Play", color: C.accent, emptyText: "Games you're eyeing" },
    { id: "playing", label: "Playing Now", color: C.green, emptyText: "What are you playing?" },
    { id: "have_played", label: "Have Played", color: C.gold, emptyText: "Your completed games" },
  ];

  const shelfCount = userShelf.want_to_play.length + userShelf.playing.length + userShelf.have_played.length;
  const tabs = [
    { id: "posts", label: `Posts${postCount > 0 ? ` (${postCount})` : ""}` },
    { id: "reviews", label: `Reviews${userReviews.length > 0 ? ` (${userReviews.length})` : ""}` },
    { id: "games", label: `Games${shelfCount > 0 ? ` (${shelfCount})` : ""}` },
    { id: "following", label: `Following${profileFollowing.length > 0 ? ` (${profileFollowing.length})` : ""}` },
    { id: "groups", label: "Groups" },
    { id: "quests", label: "Quests" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>
      {/* Header card */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ height: 150, background: `linear-gradient(135deg, #1a1040 0%, ${C.accent}66 50%, #0a2040 100%)`, position: "relative" }}>
          <div style={{ position: "absolute", bottom: -36, left: 28 }}>
            <Avatar initials={user.avatar} size={84} status="online" founding={user.isFounding} ring={user.activeRing} />
          </div>
          {user.isFounding && (
            <div style={{ position: "absolute", top: 16, right: 16 }}>
              <span style={{ background: C.goldGlow, color: C.gold, border: `1px solid ${C.goldBorder}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 800 }}>⚔️ Founding Member</span>
            </div>
          )}
        </div>
        <div style={{ padding: "48px 28px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontWeight: 800, color: C.text, fontSize: 22 }}>{user.name}</h1>
                <Badge color={C.gold}>Lv.{user.level || 1}</Badge>
                {user.isFounding && <FoundingBadge />}
              </div>
              <div style={{ color: C.textMuted, fontSize: 13, margin: "4px 0" }}>{user.handle}</div>
              <p style={{ color: C.textMuted, fontSize: 13, margin: "8px 0 0", maxWidth: 480, lineHeight: 1.6 }}>{user.bio || "No bio yet."}</p>
            </div>
            {editing ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveProfile} disabled={saving} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 22px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save Changes"}</button>
                <button onClick={cancelEdit} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            ) : (
              <button onClick={startEdit} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 22px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Edit Profile</button>
            )}
          </div>

          {editing && (
            <div style={{ marginTop: 20, background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 16 }}>Edit Profile</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 4 }}>Display Name</div>
                <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 4 }}>Bio</div>
                <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell people who you are..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", resize: "none", minHeight: 72, boxSizing: "border-box" }} />
              </div>

              {/* Theme picker */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>Theme</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { id: "deep-space", label: "Deep Space", bg: "#080e1a", accent: "#0ea5e9" },
                    { id: "light", label: "Light", bg: "#f4f6fa", accent: "#0284c7" },
                    { id: "high-contrast", label: "High Contrast", bg: "#000000", accent: "#ffffff" },
                    { id: "colorblind", label: "Colorblind Safe", bg: "#0f0a00", accent: "#f97316" },
                  ].map(theme => {
                    const isActive = (editForm.theme || "deep-space") === theme.id;
                    return (
                      <button key={theme.id} onClick={() => { setEditForm(f => ({ ...f, theme: theme.id })); applyTheme(theme.id); setPreviewThemeId(theme.id); }}
                        title={theme.label}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: theme.bg, border: isActive ? `2px solid ${C.accent}` : `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isActive ? `0 0 0 2px ${C.accentDim}` : "none", transition: "all 0.15s" }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, background: theme.accent }} />
                        </div>
                        <span style={{ color: isActive ? C.accentSoft : C.textDim, fontSize: 10, fontWeight: isActive ? 700 : 400, whiteSpace: "nowrap" }}>{theme.label}</span>
                      </button>
                    );
                  })}
                  {/* Quest-unlocked themes */}
                  {userRewards.filter(r => r.quest_rewards?.type === "theme").map(r => {
                    const tid = r.quest_rewards.value;
                    const palette = THEMES[tid];
                    if (!palette) return null;
                    const isActive = (editForm.theme || "deep-space") === tid;
                    return (
                      <button key={tid} onClick={() => { setEditForm(f => ({ ...f, theme: tid })); applyTheme(tid); setPreviewThemeId(tid); }}
                        title={r.quest_rewards.label}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: palette.bg, border: isActive ? `2px solid ${C.accent}` : `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isActive ? `0 0 0 2px ${C.accentDim}` : "none", transition: "all 0.15s" }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, background: palette.accent }} />
                        </div>
                        <span style={{ color: isActive ? C.accentSoft : C.textDim, fontSize: 10, fontWeight: isActive ? 700 : 400, whiteSpace: "nowrap" }}>{r.quest_rewards.label}</span>
                      </button>
                    );
                  })}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: C.surface, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 16 }}>🔒</span>
                    </div>
                    <span style={{ color: C.textDim, fontSize: 10, whiteSpace: "nowrap" }}>More via quests</span>
                  </div>
                </div>
              </div>

              {/* Ring picker — full catalog, founding-page style */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 12 }}>Profile Ring</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {PROFILE_RINGS.filter(r => r.id !== "none").map(ring => {
                    const isFoundingUnlocked = ring.foundingOnly && user.isFounding;
                    const isAlwaysUnlocked = ring.alwaysUnlocked;
                    const isQuestUnlocked = userRewards.some(r => r.quest_rewards?.value === ring.id);
                    const isUnlocked = isAlwaysUnlocked || isFoundingUnlocked || isQuestUnlocked;
                    const isActive = (editForm.activeRing || user.activeRing || "none") === ring.id;

                    return (
                      <div key={ring.id} style={{ textAlign: "center", width: 80, opacity: isUnlocked ? 1 : 0.5 }}>
                        <button
                          onClick={() => { if (!isUnlocked) return; setEditForm(f => ({ ...f, activeRing: ring.id })); equipRing(ring.id); }}
                          title={isUnlocked ? (isActive ? `${ring.label} — equipped` : `Equip ${ring.label}`) : `Locked — ${ring.how}`}
                          style={{ background: "none", border: "none", cursor: isUnlocked ? "pointer" : "default", padding: 0, display: "flex", justifyContent: "center", marginBottom: 8 }}>
                          <div style={{ position: "relative", width: 56, height: 56 }}>
                            {/* Outer glow ring */}
                            <div style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `3px solid ${isUnlocked ? ring.color : C.border}`, boxShadow: isActive && isUnlocked ? `0 0 16px ${ring.glow || ring.color + "44"}` : "none", transition: "all 0.15s" }} />
                            {/* Inner circle */}
                            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${ring.color}22, ${ring.color}11)`, border: `2px solid ${isUnlocked ? ring.color + "44" : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, position: "relative" }}>
                              {!isUnlocked
                                ? <span style={{ fontSize: 18 }}>🔒</span>
                                : ring.icon || "●"
                              }
                              {isActive && isUnlocked && (
                                <div style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: ring.color, border: `2px solid ${C.surface}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <span style={{ fontSize: 8, color: "#000", fontWeight: 900 }}>✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                        <div style={{ fontWeight: isActive ? 700 : 400, color: isActive && isUnlocked ? ring.color : isUnlocked ? C.textMuted : C.textDim, fontSize: 10, lineHeight: 1.3, marginBottom: 2 }}>{ring.label}</div>
                        <div style={{ color: C.textDim, fontSize: 9, lineHeight: 1.3 }}>{isUnlocked ? ring.description : ring.how}</div>
                      </div>
                    );
                  })}
                  {/* No ring option */}
                  <div style={{ textAlign: "center", width: 80 }}>
                    <button onClick={() => { setEditForm(f => ({ ...f, activeRing: "none" })); equipRing("none"); }}
                      title="Remove ring"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", justifyContent: "center", marginBottom: 8 }}>
                      <div style={{ position: "relative", width: 56, height: 56 }}>
                        <div style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `3px dashed ${C.border}`, boxShadow: "none" }} />
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.surfaceRaised, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: C.textDim }}>✕</div>
                      </div>
                    </button>
                    <div style={{ color: (editForm.activeRing || user.activeRing || "none") === "none" ? C.accentSoft : C.textDim, fontSize: 10, lineHeight: 1.3, fontWeight: (editForm.activeRing || user.activeRing || "none") === "none" ? 700 : 400 }}>No Ring</div>
                    <div style={{ color: C.textDim, fontSize: 9 }}>Remove ring</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveProfile} disabled={saving} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 20px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save Changes"}</button>
                <button onClick={cancelEdit} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 20px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Birthday / DOB Section — only visible while editing */}
          {editing && (
          <div style={{ marginTop: 12, background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: user.date_of_birth || editingDob ? 12 : 0 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>Birthday</div>
              {user.date_of_birth && !editingDob && canChangeDob && (
                <button onClick={() => { setEditingDob(true); setDobError(""); }} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 12px", color: C.textDim, fontSize: 11, cursor: "pointer" }}>Change</button>
              )}
            </div>

            {!user.date_of_birth && !editingDob && (
              <div>
                <div style={{ color: C.textDim, fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
                  Add your birthday to unlock gamertag sharing and LFG at 18+.
                </div>
                <button onClick={() => { setEditingDob(true); setDobError(""); }}
                  style={{ background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "6px 14px", color: C.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Add Birthday
                </button>
              </div>
            )}

            {user.date_of_birth && !editingDob && (
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{formatDob(user.date_of_birth)}</div>
                {!canChangeDob ? (
                  <div style={{ color: C.textDim, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
                    Need to correct this?{" "}
                    <a href="https://4gbipj3w.paperform.co" target="_blank" rel="noopener noreferrer"
                      style={{ color: C.accentSoft, textDecoration: "none", fontWeight: 600 }}>Message a mod →</a>
                  </div>
                ) : (
                  <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>You can change this once if you made a mistake.</div>
                )}
              </div>
            )}

            {editingDob && (
              <div>
                <div style={{ color: C.textDim, fontSize: 11, marginBottom: 10, lineHeight: 1.5 }}>
                  {user.date_of_birth
                    ? "This is your one allowed change. After this, contact a mod."
                    : "Never shown publicly. Used only for age-based features and birthday celebrations."}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <div style={{ flex: "0 0 110px" }}>
                    <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>Month</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <input value={dobForm.month} onChange={e => setDobForm(f => ({ ...f, month: e.target.value }))}
                        placeholder="1–12" maxLength={2}
                        style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ flex: "0 0 80px" }}>
                    <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>Day</div>
                    <input value={dobForm.day} onChange={e => setDobForm(f => ({ ...f, day: e.target.value }))}
                      placeholder="1–31" maxLength={2}
                      style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: "0 0 90px" }}>
                    <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>Year</div>
                    <input value={dobForm.year} onChange={e => setDobForm(f => ({ ...f, year: e.target.value }))}
                      placeholder="e.g. 1990" maxLength={4}
                      style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                {dobError && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{dobError}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveDob} disabled={dobSaving}
                    style={{ background: C.accent, border: "none", borderRadius: 8, padding: "7px 18px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {dobSaving ? "Saving…" : "Save Birthday"}
                  </button>
                  <button onClick={() => { setEditingDob(false); setDobForm({ month: "", day: "", year: "" }); setDobError(""); }}
                    style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 14px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          )} {/* end editing Birthday section */}

          {/* Gamertag Management */}
          <div style={{ marginTop: 12, background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: gamertags.length > 0 || addingTag ? 14 : 0 }}>
              <div>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>Gamertags</div>
                {!user.date_of_birth && (
                  <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>Add your birthday in Edit Profile to enable gamertag sharing.</div>
                )}
                {user.date_of_birth && !isAdult && (
                  <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>Gamertag sharing is available at 18.</div>
                )}
              </div>
              {isAdult && gamertags.length < 5 && !addingTag && (
                <button onClick={() => setAddingTag(true)} style={{ background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "5px 14px", color: C.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
              )}
            </div>

            {/* Existing tags */}
            {gamertags.map(t => {
              const plat = PLATFORMS.find(p => p.id === t.platform);
              return (
                <div key={t.platform} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: plat?.color || C.textDim, flexShrink: 0 }} />
                  <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, width: 90, flexShrink: 0 }}>{plat?.label || t.platform}</span>
                  <span style={{ color: C.text, fontSize: 13, flex: 1 }}>{t.tag}</span>
                  <button onClick={() => deleteGamertag(t.platform)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px" }} title="Remove">×</button>
                </div>
              );
            })}

            {/* Add tag form */}
            {addingTag && isAdult && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ color: C.textDim, fontSize: 11, marginBottom: 8 }}>Platform</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {PLATFORMS.filter(p => !gamertags.find(t => t.platform === p.id)).map(p => (
                      <button key={p.id} onClick={() => setGamertagForm(f => ({ ...f, platform: p.id }))}
                        style={{ background: gamertagForm.platform === p.id ? C.accentGlow : C.surface, border: `1px solid ${gamertagForm.platform === p.id ? C.accentDim : C.border}`, borderRadius: 8, padding: "6px 14px", color: gamertagForm.platform === p.id ? C.accentSoft : C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>Gamertag</div>
                  <input value={gamertagForm.tag} onChange={e => setGamertagForm(f => ({ ...f, tag: e.target.value }))}
                    placeholder="Your tag on this platform"
                    style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <button onClick={saveGamertag} disabled={!gamertagForm.platform || !gamertagForm.tag.trim() || tagSaving}
                  style={{ background: gamertagForm.platform && gamertagForm.tag.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 16px", color: gamertagForm.platform && gamertagForm.tag.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {tagSaving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setAddingTag(false); setGamertagForm({ platform: "", tag: "" }); }}
                  style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 14px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>
                  Cancel
                </button>
                </div>
              </div>
            )}

            {isAdult && gamertags.length === 0 && !addingTag && (
              <div style={{ color: C.textDim, fontSize: 12, marginTop: 4 }}>No gamertags added yet. Tags are only visible to approved followers.</div>
            )}
          </div>

          {/* Incoming gamertag requests */}
          {isAdult && incomingRequests.length > 0 && (
            <div style={{ marginTop: 12, background: C.surfaceRaised, border: `1px solid ${C.accentDim}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 12 }}>
                Gamertag Requests <span style={{ background: C.accent, color: C.accentText, borderRadius: 10, padding: "2px 8px", fontSize: 11, marginLeft: 6 }}>{incomingRequests.length}</span>
              </div>
              {incomingRequests.map(req => {
                const plat = PLATFORMS.find(p => p.id === req.platform);
                const requester = req.profiles;
                return (
                  <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <Avatar initials={(requester?.avatar_initials || "?").slice(0, 2).toUpperCase()} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{requester?.username || "Someone"}</span>
                      <span style={{ color: C.textDim, fontSize: 12 }}> wants your </span>
                      <span style={{ fontWeight: 600, color: plat?.color || C.textMuted, fontSize: 12 }}>{plat?.label || req.platform}</span>
                      <span style={{ color: C.textDim, fontSize: 12 }}> gamertag</span>
                    </div>
                    <button onClick={() => respondToRequest(req.id, "approved")}
                      style={{ background: C.accent, border: "none", borderRadius: 7, padding: "5px 14px", color: C.accentText, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      Approve
                    </button>
                    <button onClick={() => respondToRequest(req.id, "denied")}
                      style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 12px", color: C.textDim, fontSize: 12, cursor: "pointer" }}>
                      Deny
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Approved connections — revoke UI */}
          {isAdult && approvedConnections.length > 0 && (
            <div style={{ marginTop: 12, background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 12 }}>Shared Gamertags</div>
              {approvedConnections.map(req => {
                const plat = PLATFORMS.find(p => p.id === req.platform);
                const requester = req.profiles;
                return (
                  <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <Avatar initials={(requester?.avatar_initials || "?").slice(0, 2).toUpperCase()} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{requester?.username || "Someone"}</span>
                      <span style={{ color: C.textDim, fontSize: 12 }}> · </span>
                      <span style={{ fontWeight: 600, color: plat?.color || C.textMuted, fontSize: 12 }}>{plat?.label || req.platform}</span>
                    </div>
                    <button onClick={() => revokeConnection(req.id)}
                      style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 12px", color: C.textDim, fontSize: 11, cursor: "pointer" }}
                      title="Revoke access — permanent">
                      Revoke
                    </button>
                  </div>
                );
              })}
              <div style={{ color: C.textDim, fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>Revoking is permanent and cannot be undone by either party.</div>
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: "flex", gap: 24, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}`, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: "Posts", val: postCount || 0, color: C.accent, tab: "posts" },
              { label: "Reviews", val: userReviews.length, color: C.teal, tab: "reviews" },
              { label: "Games", val: shelfCount || 0, color: C.gold, tab: "games" },
              { label: "Groups", val: 0, color: C.purple, tab: "groups" },
            ].map(s => (
              <div key={s.label} onClick={() => setActiveTab(s.tab)}
                style={{ cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <div style={{ fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
                <div style={{ color: activeTab === s.tab ? s.color : C.textDim, fontSize: 12, fontWeight: activeTab === s.tab ? 700 : 400 }}>{s.label}</div>
              </div>
            ))}
            <div style={{ marginLeft: "auto", minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>XP Progress</span>
                <span style={{ color: C.textDim, fontSize: 11 }}>{user.xp?.toLocaleString() || 0} / {user.xpNext?.toLocaleString() || 1000}</span>
              </div>
              <div style={{ height: 8, background: C.surfaceHover, borderRadius: 4 }}>
                <div style={{ height: "100%", width: `${Math.min(((user.xp || 0) / (user.xpNext || 1000)) * 100, 100)}%`, background: `linear-gradient(90deg, ${C.gold}, #f97316)`, borderRadius: 4 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto" }}>
        {tabs.map(tab => (
          <button key={tab.id} data-tour={`${tab.id}-tab`} onClick={() => setActiveTab(tab.id)} style={{ background: activeTab === tab.id ? C.accentGlow : "transparent", border: activeTab === tab.id ? `1px solid ${C.accentDim}` : "1px solid transparent", borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: activeTab === tab.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{tab.label}</button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === "posts" && (
        <div>
          {userPosts.length > 0 ? userPosts.map(post => {
            const npc = post.npc_id ? Object.values(NPCS).find(n => n.id === post.npc_id) : null;
            return (
            <FeedPostCard key={post.id} post={{
              id: post.id,
              npc_id: post.npc_id,
              game_tag: post.game_tag,
              user_id: post.user_id || user.id,
              liked: post.liked || false,
              user: npc ? {
                name: npc.name, handle: npc.handle, avatar: npc.avatar, status: npc.status, isNPC: true, isFounding: false,
              } : {
                name: user.name || user.username,
                handle: user.handle,
                avatar: user.avatar,
                status: "online",
                isNPC: false,
                isFounding: user.is_founding || false,
              },
              content: post.content,
              time: timeAgo(post.created_at),
              likes: post.likes || 0,
              comment_count: post.comment_count || 0,
              commentList: [],
            }} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={currentUser} isGuest={isGuest} onSignIn={onSignIn} />
            );
          }) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 14 }}>No posts yet. Share what you're playing.</div>
            </div>
          )}
        </div>
      )}

      {/* Games tab */}
      {activeTab === "games" && (
        <div>
          {/* Add game bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: C.textDim, fontSize: 13 }}>Drag games between columns to update status.</div>
            <button data-tour="add-game-btn" onClick={() => setAddingGame(a => !a)} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "7px 16px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Game</button>
          </div>

          {/* Search to add */}
          {addingGame && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16, position: "relative" }}>
              <input
                autoFocus
                value={gameSearch}
                onChange={e => {
                  setGameSearch(e.target.value);
                  const m = e.target.value.match(/@(\w*)$/);
                  if (m) {
                    const q = m[1].toLowerCase();
                    const query = q.length === 0
                      ? supabase.from("games").select("id, name, developer, genre").order("followers", { ascending: false }).limit(6)
                      : supabase.from("games").select("id, name, developer, genre").ilike("name", `%${q}%`).limit(6);
                    query.then(({ data }) => setGameSearchResults(data || []));
                  } else if (e.target.value.length >= 2) {
                    supabase.from("games").select("id, name, developer, genre").ilike("name", `%${e.target.value}%`).limit(6).then(({ data }) => setGameSearchResults(data || []));
                  } else {
                    setGameSearchResults([]);
                  }
                }}
                placeholder="@ to tag a game, or just type to search..."
                style={{ width: "100%", background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
              {gameSearchResults.length > 0 && (
                <div style={{ marginTop: 8, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  {gameSearchResults.map(game => (
                    <div key={game.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: C.surfaceRaised, borderBottom: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{game.name}</div>
                        <div style={{ color: C.textDim, fontSize: 11 }}>{game.developer}{game.genre ? " · " + game.genre : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {SHELF_COLUMNS.map(col => (
                          <button key={col.id} onClick={() => addToShelf(game, col.id)}
                            style={{ background: "transparent", border: `1px solid ${col.color}44`, borderRadius: 6, padding: "4px 8px", color: col.color, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                            {col.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

                  {/* Kanban board */}
          <div data-tour="shelf-columns" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
            {SHELF_COLUMNS.map(col => (
              <div key={col.id}
                onDragOver={e => handleDragOver(e, col.id)}
                onDrop={e => handleDrop(e, col.id)}
                style={{ background: dragOver === col.id ? `${col.color}11` : C.surface, border: `1px solid ${dragOver === col.id ? col.color + "66" : col.color + "33"}`, borderRadius: 14, padding: 14, minHeight: isMobile ? 80 : 200, transition: "all 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, color: col.color, fontSize: 13 }}>{col.label}</div>
                  <div style={{ background: `${col.color}22`, color: col.color, borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{userShelf[col.id].length}</div>
                </div>
                {userShelf[col.id].length > 0 ? userShelf[col.id].map(entry => {
                  const game = entry.games;
                  if (!game) return null;
                  const review = userReviews.find(r => r.game_id === game.id);
                  const isMoving = mobileMoveCard?.gameId === entry.game_id;
                  return (
                    <div key={entry.game_id}>
                      <div
                        draggable={!isMobile}
                        onDragStart={!isMobile ? () => handleDragStart(entry.game_id, col.id) : undefined}
                        onClick={() => {
                          if (isMobile) {
                            if (isMoving) { setMobileMoveCard(null); }
                            else { setMobileMoveCard({ gameId: entry.game_id, fromStatus: col.id }); }
                          } else {
                            setCurrentGame(game.id); setActivePage("game");
                          }
                        }}
                        style={{ background: isMoving ? `${col.color}22` : C.surfaceRaised, border: `1px solid ${isMoving ? col.color + "66" : C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: isMoving ? 4 : 8, cursor: isMobile ? "pointer" : "grab", userSelect: "none", opacity: dragging?.gameId === entry.game_id ? 0.5 : 1, transition: "all 0.15s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                            <div style={{ color: C.textDim, fontSize: 11 }}>{game.genre}</div>
                          </div>
                          {review && <span style={{ background: C.goldDim, color: C.gold, borderRadius: 5, padding: "1px 6px", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{review.rating}/10</span>}
                          {isMobile && <span style={{ color: C.textDim, fontSize: 11 }}>{isMoving ? "▲" : "⇄"}</span>}
                        </div>
                      </div>
                      {/* Mobile move picker */}
                      {isMoving && (
                        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                          {SHELF_COLUMNS.filter(c => c.id !== col.id).map(target => (
                            <button key={target.id} onClick={() => { moveGame(entry.game_id, col.id, target.id); setMobileMoveCard(null); }}
                              style={{ flex: 1, background: `${target.color}22`, border: `1px solid ${target.color}66`, borderRadius: 8, padding: "6px 8px", color: target.color, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              → {target.label}
                            </button>
                          ))}
                          <button onClick={() => { removeFromShelf(entry.game_id, col.id); setMobileMoveCard(null); }}
                            style={{ background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 8px", color: C.textDim, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div style={{ textAlign: "center", padding: isMobile ? "12px 10px" : "30px 10px", color: C.textDim, fontSize: 12, borderRadius: 8, border: `1px dashed ${col.color}33` }}>
                    {col.emptyText}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews tab */}
      {activeTab === "reviews" && (
        <div>
          {userReviews.length > 0 ? userReviews.map(review => (
            <div key={review.id} onClick={() => review.games && (setCurrentGame(review.game_id), setActivePage("game"))}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12, cursor: review.games ? "pointer" : "default" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.surfaceRaised, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, color: C.textDim, fontSize: 11 }}>{(review.games?.name || "?").slice(0,2).toUpperCase()}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{review.games?.name || "Unknown Game"}</div>
                  <div style={{ color: C.textDim, fontSize: 12 }}>{review.games?.developer}{review.time_played ? ` · ${review.time_played}h played` : ""}{review.completed ? " · ✓ Completed" : ""}</div>
                </div>
                <div style={{ background: C.goldDim, border: `1px solid ${C.gold}44`, borderRadius: 8, padding: "6px 12px", color: C.gold, fontWeight: 800, fontSize: 16 }}>{review.rating}/10</div>
              </div>
              {review.headline && <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 8 }}>{review.headline}</div>}
              {review.loved && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>✅ {review.loved}</div>}
              {review.didnt_love && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>⚠️ {review.didnt_love}</div>}
              {review.content && <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: "8px 0 0" }}>{review.content}</p>}
              <div style={{ color: C.textDim, fontSize: 11, marginTop: 10 }}>{timeAgo(review.created_at)}</div>
            </div>
          )) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
              <div style={{ fontSize: 14 }}>No reviews yet. Visit a game page to write your first.</div>
            </div>
          )}
        </div>
      )}

      {/* Groups */}
      {activeTab === "following" && (
        <div>
          {profileFollowing.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Not following anyone yet</div>
              <div style={{ fontSize: 14 }}>Follow players and NPCs from the feed to see them here.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              {profileFollowing.map(p => (
                <div key={p.id} onClick={() => { if (p.type === "npc") { setCurrentNPC?.(p.id); setActivePage("npc"); } else { setCurrentPlayer?.(p.id); setActivePage("player"); } }}
                  style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.accentDim}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <Avatar initials={(p.avatar_initials || p.username || "?").slice(0,2).toUpperCase()} size={36} isNPC={p.type === "npc"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: p.type === "npc" ? C.gold : C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.username}</div>
                    <div style={{ color: C.textDim, fontSize: 11 }}>{p.handle}{p.type === "npc" ? " · NPC" : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "groups" && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Groups coming soon</div>
          <div style={{ fontSize: 14 }}>Join guilds, clans, and communities built around the games you love.</div>
        </div>
      )}

      {/* Quests */}
      {activeTab === "quests" && (
        <div>
          {!questsLoaded ? (
            <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 14 }}>Loading quests…</div>
          ) : userQuests.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No quests yet</div>
              <div style={{ color: C.textMuted, fontSize: 13 }}>Start playing, reviewing, and exploring to unlock quests.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Completed quests first */}
              {userQuests.filter(q => q.completed).length > 0 && (
                <div style={{ color: C.green, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4, paddingLeft: 4 }}>
                  Completed — {userQuests.filter(q => q.completed).length}
                </div>
              )}
              {[...userQuests].sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? -1 : 1;
                return a.sort_order - b.sort_order;
              }).map(quest => {
                const pct = Math.min((quest.progress / quest.threshold) * 100, 100);
                const rewardColor = quest.reward_type === "ring" ? C.gold : quest.reward_type === "theme" ? C.accent : C.teal;
                return (
                  <div key={quest.quest_id} style={{
                    background: C.surface,
                    border: `1px solid ${quest.completed ? C.green + "44" : C.border}`,
                    borderRadius: 14, padding: "16px 20px",
                    display: "flex", gap: 16, alignItems: "center",
                    opacity: quest.completed ? 0.85 : 1,
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: quest.completed ? `${C.green}18` : C.surfaceRaised, border: `1px solid ${quest.completed ? C.green + "33" : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                      {quest.completed ? "✓" : quest.is_onboarding ? "🗺️" : "🎯"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: quest.completed ? C.green : C.text, fontSize: 14 }}>{quest.title}</span>
                        {quest.is_onboarding && !quest.completed && <span style={{ background: C.accentGlow, color: C.accentSoft, border: `1px solid ${C.accentDim}`, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>INTRO</span>}
                        {quest.reward_id && <span style={{ background: rewardColor + "18", color: rewardColor, border: `1px solid ${rewardColor}33`, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{quest.reward_label}</span>}
                      </div>
                      <div style={{ color: C.textMuted, fontSize: 12, marginBottom: quest.completed ? 0 : 8 }}>{quest.description}</div>
                      {!quest.completed && (
                        <>
                          <div style={{ height: 4, background: C.surfaceRaised, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: C.accent, borderRadius: 2, transition: "width 0.3s" }} />
                          </div>
                          <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>{quest.progress} / {quest.threshold}</div>
                        </>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>+{quest.xp_reward} XP</div>
                      {quest.completed && <div style={{ color: C.green, fontSize: 11, marginTop: 2 }}>Earned ✓</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────

const ADMIN_USER_IDS = []; // Populated at runtime from session

function AdminPage({ isMobile, currentUser, setActivePage, setCurrentPlayer }) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [chartEvents, setChartEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Check if this user has is_admin flag in profiles
      const { data: profile } = await supabase.from("profiles").select("is_admin, is_writer, username").eq("id", user.id).single();
      if (profile?.is_admin) {
        setAuthorized(true);
        loadAll();
      } else {
        setAuthorized(false);
        setLoading(false);
      }
    };
    check();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [usersRes, postsRes, reviewsRes, chartRes, weekPostsRes, dayPostsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, handle, created_at, is_founding, is_admin").order("created_at", { ascending: false }).limit(50),
      supabase.from("posts").select("*, profiles!posts_user_id_fkey(username, handle), npcs(name)").order("created_at", { ascending: false }).limit(30),
      supabase.from("reviews").select("*, profiles(username), games(name)").order("created_at", { ascending: false }).limit(20),
      supabase.from("chart_events").select("game_id, event_type, games(name)").gte("created_at", oneWeekAgo),
      supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo),
      supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", oneDayAgo),
    ]);

    if (usersRes.data) setUsers(usersRes.data);
    if (postsRes.data) setPosts(postsRes.data);
    if (reviewsRes.data) setReviews(reviewsRes.data);

    // Aggregate chart events by game
    if (chartRes.data) {
      const byGame = {};
      chartRes.data.forEach(e => {
        const name = e.games?.name || e.game_id;
        if (!byGame[name]) byGame[name] = { name, total: 0, types: {} };
        byGame[name].total++;
        byGame[name].types[e.event_type] = (byGame[name].types[e.event_type] || 0) + 1;
      });
      setChartEvents(Object.values(byGame).sort((a, b) => b.total - a.total).slice(0, 15));
    }

    const newUsersWeek = usersRes.data?.filter(u => new Date(u.created_at) > new Date(oneWeekAgo)).length || 0;
    setStats({
      totalUsers: usersRes.data?.length || 0,
      newUsersWeek,
      postsWeek: weekPostsRes.count || 0,
      postsToday: dayPostsRes.count || 0,
      totalReviews: reviewsRes.data?.length || 0,
    });
    setLoading(false);
  };

  if (loading) return <div style={{ maxWidth: 900, margin: "0 auto", padding: "100px 20px", textAlign: "center", color: C.textMuted }}>Loading admin data...</div>;

  if (!authorized) return (
    <div style={{ maxWidth: 500, margin: "100px auto", textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontWeight: 800, color: C.text, fontSize: 20, marginBottom: 8 }}>Access Denied</div>
      <div style={{ color: C.textMuted, fontSize: 14, marginBottom: 24 }}>You need admin privileges to view this page.</div>
      <button onClick={() => setActivePage("feed")} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "10px 24px", color: C.accentText, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Back to Feed</button>
    </div>
  );

  const tabs = [
    { id: "overview", label: "📊 Overview" },
    { id: "users", label: "👤 Users" },
    { id: "posts", label: "📝 Posts" },
    { id: "charts", label: "🏆 Chart Activity" },
    { id: "reviews", label: "⭐ Reviews" },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: isMobile ? 20 : 26, color: C.text }}>Admin Dashboard</h2>
          <div style={{ color: C.textDim, fontSize: 13 }}>GuildLink Activity Monitor</div>
        </div>
        <button onClick={loadAll} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>↻ Refresh</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? C.accentGlow : C.surface, border: `1px solid ${tab === t.id ? C.accentDim : C.border}`, borderRadius: 8, padding: "7px 14px", color: tab === t.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: tab === t.id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && stats && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
            {[
              { label: "Total Users", value: stats.totalUsers, color: C.accent, icon: "👤" },
              { label: "New This Week", value: stats.newUsersWeek, color: C.online, icon: "🆕" },
              { label: "Posts This Week", value: stats.postsWeek, color: C.accentSoft, icon: "📝" },
              { label: "Posts Today", value: stats.postsToday, color: C.gold, icon: "🔥" },
              { label: "Reviews", value: stats.totalReviews, color: "#0d9488", icon: "⭐" },
            ].map(s => (
              <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 26, color: s.color, marginBottom: 4 }}>{s.value}</div>
                <div style={{ color: C.textDim, fontSize: 11 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent signups preview */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>Recent Signups</div>
            {users.slice(0, 5).map(u => (
              <div key={u.id} onClick={() => { setCurrentPlayer(u.id); setActivePage("player"); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <Avatar initials={(u.username || "?").slice(0,2).toUpperCase()} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{u.username || "—"} <span style={{ color: C.textDim, fontWeight: 400 }}>{u.handle}</span></div>
                  <div style={{ color: C.textDim, fontSize: 11 }}>{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                {u.is_founding && <Badge small color={C.gold}>⚔️ Founding</Badge>}
                {u.is_admin && <Badge small color={C.accent}>Admin</Badge>}
              </div>
            ))}
            <button onClick={() => setTab("users")} style={{ background: "none", border: "none", color: C.accentSoft, fontSize: 13, cursor: "pointer", marginTop: 10, padding: 0 }}>View all users →</button>
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.text, fontSize: 13 }}>
            {users.length} users (most recent first)
          </div>
          {users.map((u, i) => (
            <div key={u.id} onClick={() => { setCurrentPlayer(u.id); setActivePage("player"); }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ color: C.textDim, fontSize: 12, width: 24, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
              <Avatar initials={(u.username || "?").slice(0,2).toUpperCase()} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{u.username || "—"} <span style={{ color: C.textDim, fontWeight: 400, fontSize: 12 }}>{u.handle}</span></div>
                <div style={{ color: C.textDim, fontSize: 11 }}>Joined {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {u.is_founding && <Badge small color={C.gold}>⚔️</Badge>}
                {u.is_admin && <Badge small color={C.accent}>Admin</Badge>}
              </div>
              <div style={{ color: C.textDim, fontSize: 12, flexShrink: 0 }}>→</div>
            </div>
          ))}
        </div>
      )}

      {/* Posts tab */}
      {tab === "posts" && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.text, fontSize: 13 }}>
            Last 30 posts
          </div>
          {posts.map((p, i) => {
            const author = p.profiles?.username || p.npcs?.name || "Unknown";
            const isNPC = !!p.npc_id;
            return (
              <div key={p.id} style={{ padding: "12px 20px", borderBottom: i < posts.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: isNPC ? C.gold : C.accent, fontSize: 12, fontWeight: 600 }}>{author}</span>
                  {isNPC && <Badge small color={C.gold}>NPC</Badge>}
                  <span style={{ color: C.textDim, fontSize: 11, marginLeft: "auto" }}>{timeAgo(p.created_at)}</span>
                  <span style={{ color: C.red, fontSize: 12 }}>♥ {p.likes || 0}</span>
                </div>
                <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.content}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart Activity tab */}
      {tab === "charts" && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.text, fontSize: 13 }}>
            Chart events this week — top 15 games
          </div>
          {chartEvents.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No chart events yet this week.</div>}
          {chartEvents.map((g, i) => (
            <div key={g.name} style={{ padding: "12px 20px", borderBottom: i < chartEvents.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ color: C.textDim, fontSize: 12, width: 20 }}>#{i + 1}</span>
                <span style={{ color: C.text, fontSize: 13, fontWeight: 600, flex: 1 }}>{g.name}</span>
                <span style={{ color: C.accent, fontSize: 13, fontWeight: 700 }}>{g.total} events</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: 30 }}>
                {Object.entries(g.types).map(([type, count]) => (
                  <span key={type} style={{ background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: C.textMuted }}>{type}: {count}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reviews tab */}
      {tab === "reviews" && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.text, fontSize: 13 }}>
            Last 20 reviews
          </div>
          {reviews.map((r, i) => (
            <div key={r.id} style={{ padding: "12px 20px", borderBottom: i < reviews.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: C.accent, fontSize: 12, fontWeight: 600 }}>{r.profiles?.username || "—"}</span>
                <span style={{ color: C.textDim, fontSize: 12 }}>reviewed</span>
                <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{r.games?.name || "—"}</span>
                <span style={{ color: C.gold, fontSize: 12, marginLeft: "auto" }}>{"★".repeat(r.rating || 0)}</span>
                <span style={{ color: C.textDim, fontSize: 11 }}>{timeAgo(r.created_at)}</span>
              </div>
              {r.headline && <div style={{ color: C.textMuted, fontSize: 13, fontStyle: "italic" }}>"{r.headline}"</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NPC STUDIO ───────────────────────────────────────────────────────────────

function NPCStudioPage({ isMobile, currentUser }) {
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [mode, setMode] = useState("respond");
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [replyToComment, setReplyToComment] = useState(null); // { id, name } for reply threading
  const [expandedComments, setExpandedComments] = useState({}); // postId -> comments[]
  const [loadingComments, setLoadingComments] = useState({});
  const [composeText, setComposeText] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [queue, setQueue] = useState([]);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [closedThreads, setClosedThreads] = useState(new Set());
  const [closedCandidates, setClosedCandidates] = useState(new Set());

  const npcList = Object.values(NPCS);
  const [npcUUIDs, setNpcUUIDs] = useState({}); // localId -> supabase UUID

  useEffect(() => {
    supabase.from("npcs").select("id, handle, name").then(({ data, error }) => {
      console.log("NPCs in DB:", JSON.stringify(data));
      if (data) {
        const map = {};
        data.forEach(row => {
          // Try matching by handle first, then by name
          let local = npcList.find(n => n.handle === row.handle);
          if (!local) local = npcList.find(n => n.name === row.name);
          if (!local) local = npcList.find(n => row.name?.toLowerCase().includes(n.name?.split(" ")[0]?.toLowerCase()));
          if (local) map[local.id] = row.id;
        });
        console.log("Resolved npcUUIDs:", map);
        setNpcUUIDs(map);
      }
    });
  }, []);

  const loadPostComments = async (postId) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(username, handle, avatar_initials)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setExpandedComments(prev => ({ ...prev, [postId]: data || [] }));
    setLoadingComments(prev => ({ ...prev, [postId]: false }));
  };

  const togglePostComments = (postId) => {
    if (expandedComments[postId] !== undefined) {
      setExpandedComments(prev => { const n = { ...prev }; delete n[postId]; return n; });
    } else {
      loadPostComments(postId);
    }
  };

  const loadCandidates = async () => {
    setLoadingCandidates(true);
    // Fetch recent posts with author info, likes, comments
    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, created_at, likes, user_id, game_tag, profiles!posts_user_id_fkey(username, handle, avatar_initials, created_at)")
      .is("npc_id", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!posts) { setLoadingCandidates(false); return; }

    // Fetch comment counts
    const postIds = posts.map(p => p.id);
    const { data: comments } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);
    const commentCounts = {};
    (comments || []).forEach(c => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });

    // Fetch NPC-replied post IDs — keep in list but score lower
    const { data: npcReplies } = await supabase
      .from("comments")
      .select("post_id")
      .not("npc_id", "is", null);
    const npcRepliedIds = new Set((npcReplies || []).map(r => r.post_id));

    // Fetch posts that have replies (someone replied to someone) — engagement signal
    const { data: replyComments } = await supabase
      .from("comments")
      .select("post_id")
      .not("reply_to_comment_id", "is", null);
    const replyThreadCounts = {};
    (replyComments || []).forEach(c => { replyThreadCounts[c.post_id] = (replyThreadCounts[c.post_id] || 0) + 1; });

    // Fetch last comment per post to detect if user replied after NPC
    const { data: lastComments } = await supabase
      .from("comments")
      .select("post_id, npc_id, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: false });
    // For each post, find the most recent comment
    const lastCommentByPost = {};
    (lastComments || []).forEach(c => {
      if (!lastCommentByPost[c.post_id]) lastCommentByPost[c.post_id] = c;
    });

    const now = Date.now();
    const scored = posts
      .map(p => {
        const profile = p.profiles;
        const ageHours = (now - new Date(p.created_at).getTime()) / 3600000;
        const recencyScore = Math.max(0, 1 - ageHours / 72);
        const engagementScore = Math.min(1, ((p.likes || 0) + (commentCounts[p.id] || 0) * 1.5) / 50);
        const threadScore = Math.min(1, (replyThreadCounts[p.id] || 0) / 5);
        const accountAgeDays = profile?.created_at
          ? (now - new Date(profile.created_at).getTime()) / 86400000
          : 999;
        const newUserBonus = accountAgeDays < 7 ? 1 : 0;
        const npcReplied = npcRepliedIds.has(p.id);
        const lastComment = lastCommentByPost[p.id];
        // "Needs Reply" = NPC has engaged but user replied since — highest priority
        const needsReply = npcReplied && lastComment && !lastComment.npc_id;
        const baseScore = newUserBonus * 0.35 + engagementScore * 0.30 + threadScore * 0.20 + recencyScore * 0.15;
        // needsReply: boost to top. npcReplied but last was NPC: de-prioritise. fresh: normal score.
        const score = needsReply ? 0.8 + baseScore * 0.2 : npcReplied ? baseScore * 0.3 : baseScore;
        return { ...p, commentCount: commentCounts[p.id] || 0, newUser: accountAgeDays < 7, hasThread: (replyThreadCounts[p.id] || 0) > 0, npcReplied, needsReply, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    setCandidates(scored);
    setLoadingCandidates(false);
  };

  useEffect(() => {
    if (selectedNPC && mode === "respond") loadCandidates();
    if (selectedNPC && mode === "threads") loadThreads();
  }, [selectedNPC, mode]);

  const loadThreads = async () => {
    setLoadingThreads(true);
    const npcUUID = npcUUIDs[selectedNPC] || selectedNPC;

    // Find posts where this NPC has commented OR is the author
    const [commentedRes, authoredRes] = await Promise.all([
      supabase.from("comments").select("post_id").eq("npc_id", npcUUID),
      supabase.from("posts").select("id").eq("npc_id", npcUUID),
    ]);

    const commentedIds = (commentedRes.data || []).map(c => c.post_id);
    const authoredIds = (authoredRes.data || []).map(p => p.id);
    const postIds = [...new Set([...commentedIds, ...authoredIds])];

    if (postIds.length === 0) { setThreads([]); setLoadingThreads(false); return; }

    // Fetch those posts with author info
    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, created_at, likes, user_id, npc_id, profiles!posts_user_id_fkey(username, handle, avatar_initials), npcs(name, handle, avatar_initials)")
      .in("id", postIds)
      .order("created_at", { ascending: false });

    // Fetch all comments for those posts
    const { data: allComments } = await supabase
      .from("comments")
      .select("*, profiles(username, handle, avatar_initials), npcs(name, handle, avatar_initials)")
      .in("post_id", postIds)
      .order("created_at", { ascending: true });

    const commentsByPost = {};
    (allComments || []).forEach(c => {
      if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
      commentsByPost[c.post_id].push(c);
    });

    const enriched = (posts || []).map(p => {
      const comments = commentsByPost[p.id] || [];
      const lastComment = comments[comments.length - 1];
      // Needs reply if last comment was from a user (not this NPC)
      const needsReply = comments.length === 0 || lastComment?.npc_id !== npcUUID;
      return { ...p, comments, needsReply };
    }).sort((a, b) => {
      if (a.needsReply && !b.needsReply) return -1;
      if (!a.needsReply && b.needsReply) return 1;
      const aLast = a.comments[a.comments.length - 1]?.created_at || a.created_at;
      const bLast = b.comments[b.comments.length - 1]?.created_at || b.created_at;
      return new Date(bLast) - new Date(aLast);
    });

    setThreads(enriched);
    setLoadingThreads(false);
  };

  // Load scheduled queue
  const loadQueue = async () => {
    const { data } = await supabase
      .from("npc_scheduled_posts")
      .select("*")
      .order("scheduled_for", { ascending: true });
    if (data) setQueue(data);
  };
  useEffect(() => { loadQueue(); }, []);

  const handleSend = async () => {
    if (!composeText.trim() || !selectedNPC) return;
    setSending(true);
    const { data: { user: writerUser } } = await supabase.auth.getUser();
    const npcUUID = npcUUIDs[selectedNPC] || selectedNPC; // fall back to selectedNPC if already UUID

    if (scheduleMode && scheduleDate && scheduleTime) {
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      await supabase.from("npc_scheduled_posts").insert({
        npc_id: npcUUID,
        content: composeText.trim(),
        reply_to_post_id: selectedPost?.id || null,
        scheduled_for: scheduledFor,
        status: "scheduled",
      });
      await loadQueue();
    } else {
      if (mode === "respond" && selectedPost) {
        // Insert as comment — use writer's user_id so RLS passes, npc_id marks it as NPC
        const { error } = await supabase.from("comments").insert({
          post_id: selectedPost.id,
          content: composeText.trim(),
          npc_id: npcUUID,
          user_id: writerUser.id,
          reply_to_comment_id: replyToComment?.id || null,
        });
        if (!error) {
          // Update comment_count on the post
          const newCount = (selectedPost.commentCount || 0) + 1;
          await supabase.from("posts")
            .update({ comment_count: newCount })
            .eq("id", selectedPost.id);
          // Mark this candidate as NPC-replied so it drops off the list
          setCandidates(prev => prev.filter(p => p.id !== selectedPost.id));
          // Refresh comments if expanded
          if (expandedComments[selectedPost.id] !== undefined) {
            loadPostComments(selectedPost.id);
          }
        }
      } else {
        const { data: insertData, error: insertError } = await supabase.from("posts").insert({
          content: composeText.trim(),
          npc_id: npcUUID,
          user_id: writerUser.id,
        });
        console.log("NPC post insert — npcUUID:", npcUUID, "result:", insertData, "error:", insertError);
      }
    }

    setComposeText("");
    setSelectedPost(null);
    setReplyToComment(null);
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  const deleteScheduled = async (id) => {
    await supabase.from("npc_scheduled_posts").delete().eq("id", id);
    loadQueue();
  };

  const C2 = C; // alias
  const pad = isMobile ? "60px 12px 80px" : "80px 24px 40px";

  if (!selectedNPC) {
    // NPC picker screen
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: pad }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: C2.text, letterSpacing: "-0.5px", marginBottom: 6 }}>NPC Studio</div>
          <div style={{ color: C2.textMuted, fontSize: 14 }}>Choose a character to write as.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 14 }}>
          {npcList.map(npc => (
            <div key={npc.id} onClick={() => setSelectedNPC(npc.id)}
              style={{ background: C2.surface, border: `1px solid ${C2.border}`, borderRadius: 16, padding: 20, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C2.goldBorder; e.currentTarget.style.background = C2.goldGlow; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C2.border; e.currentTarget.style.background = C2.surface; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Avatar initials={npc.avatar} size={40} isNPC={true} status={npc.status} />
                <div>
                  <div style={{ fontWeight: 700, color: C2.text, fontSize: 14 }}>{npc.name}</div>
                  <div style={{ color: C2.textDim, fontSize: 11 }}>{npc.handle}</div>
                </div>
              </div>
              <div style={{ color: C2.textMuted, fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>{npc.bio.slice(0, 100)}…</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {npc.games.slice(0, 2).map(g => (
                  <span key={g} style={{ background: C2.surfaceRaised, border: `1px solid ${C2.border}`, borderRadius: 6, padding: "2px 8px", color: C2.textDim, fontSize: 11 }}>{g}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Scheduled queue */}
        {queue.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontWeight: 700, color: C2.text, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Scheduled Posts</div>
            {queue.map(item => {
              const npc = NPCS[item.npc_id];
              return (
                <div key={item.id} style={{ background: C2.surface, border: `1px solid ${C2.border}`, borderRadius: 12, padding: 14, marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <Avatar initials={npc?.avatar || "?"} size={32} isNPC={true} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: C2.gold, fontSize: 13 }}>{npc?.name}</span>
                      <span style={{ color: C2.textDim, fontSize: 11 }}>{new Date(item.scheduled_for).toLocaleString()}</span>
                    </div>
                    <div style={{ color: C2.textMuted, fontSize: 13, lineHeight: 1.5 }}>{item.content}</div>
                    {item.reply_to_post_id && <div style={{ color: C2.textDim, fontSize: 11, marginTop: 4 }}>↩ reply to post</div>}
                  </div>
                  <button onClick={() => deleteScheduled(item.id)} style={{ background: "none", border: "none", color: C2.textDim, fontSize: 16, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const npc = NPCS[selectedNPC];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: pad }}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* Character sidebar */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <button onClick={() => { setSelectedNPC(null); setSelectedPost(null); setComposeText(""); }}
            style={{ background: "none", border: "none", color: C2.textDim, fontSize: 13, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
            ← All characters
          </button>

          {/* NPC card */}
          <div style={{ background: C2.goldGlow, border: `1px solid ${C2.goldBorder}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Avatar initials={npc.avatar} size={44} isNPC={true} status={npc.status} />
              <div>
                <div style={{ fontWeight: 800, color: C2.gold, fontSize: 15 }}>{npc.name}</div>
                <div style={{ color: C2.textDim, fontSize: 11 }}>{npc.handle}</div>
              </div>
            </div>

            <div style={{ color: C2.textMuted, fontSize: 12, lineHeight: 1.7, marginBottom: 14, borderBottom: `1px solid ${C2.goldBorder}`, paddingBottom: 14 }}>{npc.bio}</div>

            <div style={{ marginBottom: 14, borderBottom: `1px solid ${C2.goldBorder}`, paddingBottom: 14 }}>
              <div style={{ color: C2.gold, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Background</div>
              <div style={{ color: C2.textMuted, fontSize: 12, lineHeight: 1.7 }}>{npc.lore}</div>
            </div>

            <div style={{ marginBottom: 14, borderBottom: `1px solid ${C2.goldBorder}`, paddingBottom: 14 }}>
              <div style={{ color: C2.gold, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Role</div>
              <div style={{ color: C2.textMuted, fontSize: 12 }}>{npc.role}</div>
              <div style={{ color: C2.textDim, fontSize: 11, marginTop: 2 }}>{npc.location}</div>
            </div>

            <div style={{ marginBottom: 14, borderBottom: `1px solid ${C2.goldBorder}`, paddingBottom: 14 }}>
              <div style={{ color: C2.gold, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Universe</div>
              <div style={{ color: C2.textMuted, fontSize: 12 }}>{npc.universeIcon} {npc.universe}</div>
            </div>

            <div>
              <div style={{ color: C2.gold, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Games</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {npc.games.map(g => (
                  <span key={g} style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${C2.goldBorder}`, borderRadius: 6, padding: "2px 8px", color: C2.gold, fontSize: 11 }}>{g}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ background: C2.surface, border: `1px solid ${C2.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ color: C2.textDim, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Stats</div>
            {npc.stats.map(s => (
              <div key={s.label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C2.textMuted, fontSize: 12 }}>{s.label}</span>
                  <span style={{ color: C2.text, fontSize: 12, fontWeight: 700 }}>{s.value}</span>
                </div>
                <div style={{ color: C2.textDim, fontSize: 10, marginTop: 1 }}>{s.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C2.surface, border: `1px solid ${C2.border}`, borderRadius: 12, padding: 4 }}>
            {[{ id: "respond", label: "Respond" }, { id: "threads", label: "Threads" }, { id: "post", label: "Post" }].map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setSelectedPost(null); setReplyToComment(null); setComposeText(""); }}
                style={{ flex: 1, background: mode === m.id ? C2.accentGlow : "transparent", border: `1px solid ${mode === m.id ? C2.accentDim : "transparent"}`, borderRadius: 8, padding: "8px", color: mode === m.id ? C2.accentSoft : C2.textMuted, fontSize: 14, fontWeight: mode === m.id ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Respond mode */}
          {mode === "respond" && (
            <div>
              {loadingCandidates ? (
                <div style={{ color: C2.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>Loading candidate posts…</div>
              ) : candidates.filter(p => !closedCandidates.has(p.id)).length === 0 ? (
                <div style={{ color: C2.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>No new candidates right now.</div>
              ) : (
                candidates.filter(p => !closedCandidates.has(p.id)).map(post => {
                  const isSelected = selectedPost?.id === post.id;
                  const postComments = expandedComments[post.id];
                  const commentsExpanded = postComments !== undefined;
                  const isLoading = loadingComments[post.id];

                  // Derive status from comment data
                  const npcComments = (postComments || []).filter(c => c.npc_id);
                  const hasNpcReply = npcComments.length > 0;
                  const lastComment = postComments?.length > 0 ? postComments[postComments.length - 1] : null;
                  const lastIsUser = lastComment && !lastComment.npc_id;
                  const status = hasNpcReply
                    ? (lastIsUser ? "needs_reply" : "replied")
                    : "fresh";

                  const statusStyles = {
                    fresh:       { bg: `${C2.accent}18`, border: `${C2.accentDim}`, label: "Fresh", color: C2.accentSoft },
                    replied:     { bg: `#22c55e18`,      border: `#22c55e44`,       label: "Replied",      color: "#22c55e" },
                    needs_reply: { bg: `#f59e0b18`,      border: `#f59e0b44`,       label: "Needs Reply",  color: C2.gold },
                  };
                  const st = statusStyles[status];

                  return (
                    <div key={post.id} style={{ background: isSelected ? C2.accentGlow : C2.surface, border: `1px solid ${isSelected ? C2.accentDim : C2.border}`, borderRadius: 14, marginBottom: 12, overflow: "hidden", transition: "all 0.15s" }}>
                      <div style={{ padding: 16 }}>
                        {/* Post header with status */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Avatar initials={(post.profiles?.avatar_initials || post.profiles?.username || "?").slice(0,2).toUpperCase()} size={30} />
                            <div>
                              <span style={{ fontWeight: 600, color: C2.text, fontSize: 13 }}>{post.profiles?.username || "Unknown"}</span>
                              <span style={{ color: C2.textDim, fontSize: 11, marginLeft: 8 }}>{post.profiles?.handle}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {/* Status pill */}
                            <span style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 6, padding: "2px 8px", color: st.color, fontSize: 10, fontWeight: 700 }}>{st.label}</span>
                            {post.newUser && <span style={{ background: `${C2.accent}22`, border: `1px solid ${C2.accentDim}`, borderRadius: 6, padding: "2px 7px", color: C2.accentSoft, fontSize: 10, fontWeight: 700 }}>NEW USER</span>}
                            {post.hasThread && <span style={{ background: `#f59e0b22`, border: `1px solid #f59e0b44`, borderRadius: 6, padding: "2px 7px", color: C2.gold, fontSize: 10, fontWeight: 700 }}>THREAD</span>}
                            <button onClick={e => { e.stopPropagation(); setClosedCandidates(prev => new Set([...prev, post.id])); if (selectedPost?.id === post.id) { setSelectedPost(null); setReplyToComment(null); setComposeText(""); } }}
                              style={{ background: C2.surfaceRaised, border: `1px solid ${C2.border}`, borderRadius: 6, padding: "2px 10px", color: C2.textDim, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                              Close ✓
                            </button>
                          </div>
                        </div>

                        <div style={{ color: C2.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{post.content}</div>

                        {/* Action row */}
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ color: C2.textDim, fontSize: 11 }}>♥ {post.likes || 0}</span>
                          <button onClick={() => togglePostComments(post.id)}
                            style={{ background: commentsExpanded ? C2.surfaceRaised : "none", border: `1px solid ${commentsExpanded ? C2.border : "transparent"}`, borderRadius: 6, padding: "3px 10px", color: commentsExpanded ? C2.text : C2.textDim, fontSize: 11, cursor: "pointer" }}>
                            💬 {post.commentCount} {isLoading ? "…" : commentsExpanded ? "▲" : "▼"}
                          </button>
                          <div style={{ marginLeft: "auto" }}>
                            {!isSelected && (
                              <button onClick={() => { setSelectedPost(post); setComposeText(""); if (!commentsExpanded) loadPostComments(post.id); }}
                                style={{ background: C2.accentGlow, border: `1px solid ${C2.accentDim}`, borderRadius: 8, padding: "5px 14px", color: C2.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                Reply as {npc.name.split(" ")[0]}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded comments */}
                      {commentsExpanded && (
                        <div style={{ background: C2.surfaceHover, borderTop: `1px solid ${C2.border}`, padding: "12px 16px" }}>
                          {postComments.length === 0 ? (
                            <div style={{ color: C2.textDim, fontSize: 12 }}>No comments yet.</div>
                          ) : postComments.map((c, i) => {
                            const npcData = c.npc_id ? NPCS[c.npc_id] : null;
                            const isNPC = !!npcData;
                            const name = npcData?.name || c.profiles?.username || "Unknown";
                            const avatar = npcData?.avatar || c.profiles?.avatar_initials || "?";
                            const isReplyTarget = replyToComment?.id === c.id;
                            return (
                              <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: i < postComments.length - 1 ? 10 : 0 }}>
                                <Avatar initials={avatar.slice(0,2).toUpperCase()} size={26} isNPC={isNPC} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ background: isReplyTarget ? C2.accentGlow : C2.surfaceRaised, border: `1px solid ${isReplyTarget ? C2.accentDim : isNPC ? C2.goldBorder : C2.border}`, borderRadius: 8, padding: "7px 12px" }}>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                                      <span style={{ fontWeight: 700, fontSize: 12, color: isNPC ? C2.gold : C2.text }}>{name}</span>
                                      {isNPC && <NPCBadge />}
                                      <span style={{ color: C2.textDim, fontSize: 10, marginLeft: "auto" }}>{timeAgo(c.created_at)}</span>
                                    </div>
                                    <p style={{ color: C2.text, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{c.content}</p>
                                  </div>
                                  {!isNPC && isSelected && (
                                    <button onClick={() => setReplyToComment(isReplyTarget ? null : { id: c.id, name })}
                                      style={{ background: "none", border: "none", color: isReplyTarget ? C2.accentSoft : C2.textDim, fontSize: 11, cursor: "pointer", padding: "3px 2px", marginTop: 2 }}>
                                      {isReplyTarget ? "↩ Replying…" : "↩ Reply to this"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Inline composer when selected */}
                      {isSelected && (
                        <div style={{ borderTop: `1px solid ${C2.accentDim}`, padding: "12px 16px", background: C2.accentGlow }}>
                          {replyToComment && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, background: C2.surfaceRaised, border: `1px solid ${C2.border}`, borderRadius: 8, padding: "5px 10px" }}>
                              <span style={{ color: C2.accentSoft, fontSize: 12 }}>↩ Replying to <strong>{replyToComment.name}</strong></span>
                              <button onClick={() => setReplyToComment(null)} style={{ background: "none", border: "none", color: C2.textDim, fontSize: 14, cursor: "pointer", marginLeft: "auto", padding: 0 }}>×</button>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            <Avatar initials={npc.avatar} size={28} isNPC={true} />
                            <textarea value={composeText} onChange={e => setComposeText(e.target.value)}
                              placeholder={replyToComment ? `Reply to ${replyToComment.name} as ${npc.name}…` : `Reply as ${npc.name}…`}
                              style={{ flex: 1, background: C2.bg, border: `1px solid ${C2.border}`, borderRadius: 8, padding: "8px 12px", color: C2.text, fontSize: 13, resize: "none", outline: "none", minHeight: 80 }}
                              autoFocus
                            />
                          </div>
                          {renderScheduler()}
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button onClick={() => { setSelectedPost(null); setReplyToComment(null); setComposeText(""); setScheduleMode(false); }}
                              style={{ background: "none", border: `1px solid ${C2.border}`, borderRadius: 8, padding: "7px 16px", color: C2.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleSend} disabled={!composeText.trim() || sending}
                              style={{ background: composeText.trim() ? C2.accent : C2.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 20px", color: composeText.trim() ? "#fff" : C2.textDim, fontSize: 13, fontWeight: 700, cursor: composeText.trim() ? "pointer" : "default" }}>
                              {sending ? "Sending…" : sent ? "✓ Sent" : scheduleMode ? "Schedule" : "Reply Now"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Threads mode */}
          {mode === "threads" && (
            <div>
              {loadingThreads ? (
                <div style={{ color: C2.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>Loading threads…</div>
              ) : threads.filter(t => !closedThreads.has(t.id)).length === 0 ? (
                <div style={{ color: C2.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>
                  {closedThreads.size > 0 ? `All ${closedThreads.size} thread${closedThreads.size > 1 ? "s" : ""} closed. ` : ""}
                  {npc.name.split(" ")[0]} hasn't engaged any posts yet.
                </div>
              ) : threads.filter(t => !closedThreads.has(t.id)).map(thread => {
                const lastComment = thread.comments[thread.comments.length - 1];
                const statusLabel = thread.needsReply ? "Needs Reply" : "Replied";
                const statusColor = thread.needsReply ? C2.gold : "#22c55e";
                const statusBg = thread.needsReply ? "#f59e0b18" : "#22c55e18";
                const statusBorder = thread.needsReply ? "#f59e0b44" : "#22c55e44";
                const isSelected = selectedPost?.id === thread.id;
                return (
                  <div key={thread.id} style={{ background: C2.surface, border: `1px solid ${thread.needsReply ? "#f59e0b44" : C2.border}`, borderRadius: 14, marginBottom: 14, overflow: "hidden" }}>
                    {/* Thread header */}
                    <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C2.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Avatar initials={((thread.npc_id ? thread.npcs?.avatar_initials : thread.profiles?.avatar_initials) || "?").slice(0,2).toUpperCase()} size={28} isNPC={!!thread.npc_id} />
                          <div>
                            <span style={{ fontWeight: 600, color: C2.text, fontSize: 13 }}>{thread.npc_id ? (thread.npcs?.name || "NPC") : thread.profiles?.username}</span>
                            <span style={{ color: C2.textDim, fontSize: 11, marginLeft: 8 }}>{timeAgo(thread.created_at)}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ background: statusBg, border: `1px solid ${statusBorder}`, borderRadius: 6, padding: "2px 8px", color: statusColor, fontSize: 10, fontWeight: 700 }}>{statusLabel}</span>
                          <button onClick={() => setClosedThreads(prev => new Set([...prev, thread.id]))}
                            style={{ background: C2.surfaceRaised, border: `1px solid ${C2.border}`, borderRadius: 6, padding: "2px 10px", color: C2.textDim, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                            Close ✓
                          </button>
                        </div>
                      </div>
                      <p style={{ color: C2.textMuted, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{thread.content}</p>
                    </div>

                    {/* Full comment thread */}
                    <div style={{ padding: "12px 16px", background: C2.surfaceHover }}>
                      {thread.comments.map((c, i) => {
                        const npcCommentData = c.npc_id ? (c.npcs || Object.values(NPCS).find(n => n.id === c.npc_id)) : null;
                        const isNPC = !!c.npc_id;
                        const name = npcCommentData?.name || c.profiles?.username || "Unknown";
                        const avatar = npcCommentData?.avatar_initials || npcCommentData?.avatar || c.profiles?.avatar_initials || "?";
                        const parentComment = c.reply_to_comment_id ? thread.comments.find(x => x.id === c.reply_to_comment_id) : null;
                        const parentNpcData = parentComment?.npc_id ? (parentComment.npcs || Object.values(NPCS).find(n => n.id === parentComment.npc_id)) : null;
                        const parentName = parentComment ? (parentNpcData?.name || parentComment.profiles?.username) : null;
                        const isReplyTarget = replyToComment?.id === c.id;
                        return (
                          <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: i < thread.comments.length - 1 ? 10 : 0 }}>
                            <Avatar initials={avatar.slice(0,2).toUpperCase()} size={26} isNPC={isNPC} />
                            <div style={{ flex: 1 }}>
                              <div style={{ background: isReplyTarget ? C2.accentGlow : C2.surfaceRaised, border: `1px solid ${isReplyTarget ? C2.accentDim : isNPC ? C2.goldBorder : C2.border}`, borderRadius: 8, padding: "7px 12px" }}>
                                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                                  <span style={{ fontWeight: 700, fontSize: 12, color: isNPC ? C2.gold : C2.text }}>{name}</span>
                                  {isNPC && <NPCBadge />}
                                  <span style={{ color: C2.textDim, fontSize: 10, marginLeft: "auto" }}>{timeAgo(c.created_at)}</span>
                                </div>
                                {parentName && <div style={{ color: C2.textDim, fontSize: 11, marginBottom: 3 }}>↩ <span style={{ color: C2.accentSoft }}>{parentName}</span></div>}
                                <p style={{ color: C2.text, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{c.content}</p>
                              </div>
                              {!isNPC && (
                                <button onClick={() => { setSelectedPost(thread); setReplyToComment(isReplyTarget ? null : { id: c.id, name }); if (!isSelected) setComposeText(""); }}
                                  style={{ background: "none", border: "none", color: isReplyTarget ? C2.accentSoft : C2.textDim, fontSize: 11, cursor: "pointer", padding: "3px 2px", marginTop: 2 }}>
                                  {isReplyTarget ? "↩ Replying…" : "↩ Reply to this"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Inline composer */}
                    {isSelected && (
                      <div style={{ borderTop: `1px solid ${C2.accentDim}`, padding: "12px 16px", background: C2.accentGlow }}>
                        {replyToComment && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, background: C2.surfaceRaised, border: `1px solid ${C2.border}`, borderRadius: 8, padding: "5px 10px" }}>
                            <span style={{ color: C2.accentSoft, fontSize: 12 }}>↩ Replying to <strong>{replyToComment.name}</strong></span>
                            <button onClick={() => setReplyToComment(null)} style={{ background: "none", border: "none", color: C2.textDim, fontSize: 14, cursor: "pointer", marginLeft: "auto", padding: 0 }}>×</button>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                          <Avatar initials={npc.avatar} size={28} isNPC={true} />
                          <textarea value={composeText} onChange={e => setComposeText(e.target.value)}
                            placeholder={replyToComment ? `Reply to ${replyToComment.name} as ${npc.name}…` : `Reply as ${npc.name}…`}
                            style={{ flex: 1, background: C2.bg, border: `1px solid ${C2.border}`, borderRadius: 8, padding: "8px 12px", color: C2.text, fontSize: 13, resize: "none", outline: "none", minHeight: 70 }}
                            autoFocus
                          />
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button onClick={() => { setSelectedPost(null); setReplyToComment(null); setComposeText(""); }}
                            style={{ background: "none", border: `1px solid ${C2.border}`, borderRadius: 8, padding: "7px 16px", color: C2.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                          <button onClick={async () => {
                            if (!composeText.trim()) return;
                            setSending(true);
                            const { data: { user: writerUser } } = await supabase.auth.getUser();
                            const npcUUID = npcUUIDs[selectedNPC] || selectedNPC;
                            await supabase.from("comments").insert({
                              post_id: thread.id,
                              content: composeText.trim(),
                              npc_id: npcUUID,
                              user_id: writerUser.id,
                              reply_to_comment_id: replyToComment?.id || null,
                            });
                            setComposeText(""); setReplyToComment(null); setSelectedPost(null); setSending(false);
                            setSent(true); setTimeout(() => setSent(false), 2000);
                            loadThreads();
                          }} disabled={!composeText.trim() || sending}
                            style={{ background: composeText.trim() ? C2.accent : C2.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 20px", color: composeText.trim() ? "#fff" : C2.textDim, fontSize: 13, fontWeight: 700, cursor: composeText.trim() ? "pointer" : "default" }}>
                            {sending ? "Sending…" : sent ? "✓ Sent" : "Reply Now"}
                          </button>
                        </div>
                      </div>
                    )}
                    {!isSelected && (
                      <div style={{ padding: "10px 16px", borderTop: `1px solid ${C2.border}` }}>
                        <button onClick={() => { setSelectedPost(thread); setComposeText(""); setReplyToComment(null); }}
                          style={{ background: C2.accentGlow, border: `1px solid ${C2.accentDim}`, borderRadius: 8, padding: "6px 16px", color: C2.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Reply as {npc.name.split(" ")[0]}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Post mode */}
          {mode === "post" && (
            <div style={{ background: C2.surface, border: `1px solid ${C2.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <Avatar initials={npc.avatar} size={38} isNPC={true} status={npc.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: C2.text, fontSize: 14 }}>{npc.name}</div>
                  <div style={{ color: C2.textDim, fontSize: 12 }}>{npc.handle}</div>
                </div>
              </div>
              <textarea value={composeText} onChange={e => setComposeText(e.target.value)}
                placeholder={`What's ${npc.name.split(" ")[0]} thinking?`}
                style={{ width: "100%", background: C2.surfaceHover, border: `1px solid ${C2.border}`, borderRadius: 10, padding: "12px 16px", color: C2.text, fontSize: 14, resize: "none", outline: "none", minHeight: 120, boxSizing: "border-box", lineHeight: 1.6 }}
              />
              <div style={{ color: C2.textDim, fontSize: 11, textAlign: "right", marginTop: 4, marginBottom: 14 }}>{composeText.length} chars</div>
              {renderScheduler()}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => setComposeText("")}
                  style={{ background: "none", border: `1px solid ${C2.border}`, borderRadius: 8, padding: "8px 18px", color: C2.textMuted, fontSize: 13, cursor: "pointer" }}>Clear</button>
                <button onClick={handleSend} disabled={!composeText.trim() || sending}
                  style={{ background: composeText.trim() ? C2.accent : C2.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 24px", color: composeText.trim() ? "#fff" : C2.textDim, fontSize: 14, fontWeight: 700, cursor: composeText.trim() ? "pointer" : "default" }}>
                  {sending ? "Sending…" : sent ? "✓ Posted" : scheduleMode ? "Schedule" : "Post Now"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function renderScheduler() {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: scheduleMode ? 10 : 0 }}>
          <input type="checkbox" checked={scheduleMode} onChange={e => setScheduleMode(e.target.checked)}
            style={{ accentColor: C2.accent }} />
          <span style={{ color: C2.textMuted, fontSize: 13 }}>Schedule for later</span>
        </label>
        {scheduleMode && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
              style={{ background: C2.surfaceHover, border: `1px solid ${C2.border}`, borderRadius: 8, padding: "6px 10px", color: C2.text, fontSize: 13, outline: "none", flex: 1 }} />
            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
              style={{ background: C2.surfaceHover, border: `1px solid ${C2.border}`, borderRadius: 8, padding: "6px 10px", color: C2.text, fontSize: 13, outline: "none", flex: 1 }} />
          </div>
        )}
      </div>
    );
  }
}



function LFGPage({ isMobile, currentUser, setCurrentPlayer, setActivePage }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameFilter, setGameFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [filterGames, setFilterGames] = useState([]);
  const [myGamertags, setMyGamertags] = useState([]); // platforms this user has entered
  const [exclusions, setExclusions] = useState([]); // user_ids who have denied/revoked viewer
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ game_id: "", looking_for: "", play_style: "", rank: "", note: "", tags: "" });
  const [gameSearch, setGameSearch] = useState("");
  const [gameResults, setGameResults] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);

  const PLATFORMS = [
    { id: "xbox", label: "Xbox", color: "#107C10" },
    { id: "psn", label: "PlayStation", color: "#003087" },
    { id: "steam", label: "Steam", color: "#1b2838" },
    { id: "nintendo", label: "Nintendo", color: "#E4000F" },
    { id: "battlenet", label: "Battle.net", color: "#148EFF" },
  ];

  const isAdult = getAge(currentUser?.date_of_birth) >= 18;

  // Load viewer's own gamertags and exclusion list
  const loadViewerContext = async () => {
    if (!currentUser?.id) return;
    const [{ data: tags }, { data: excl }] = await Promise.all([
      supabase.from("gamertags").select("platform").eq("user_id", currentUser.id),
      supabase.from("my_lfg_exclusions").select("excluded_user_id"),
    ]);
    if (tags) setMyGamertags(tags.map(t => t.platform));
    if (excl) setExclusions(excl.map(e => e.excluded_user_id));
  };

  const loadPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("lfg_posts")
      .select("*, profiles(id, username, handle, avatar_initials, is_founding, active_ring), games(id, name, genre)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (gameFilter !== "all") query = query.eq("game_id", gameFilter);
    const { data } = await query;
    if (data) {
      // Filter out excluded users client-side (exclusions list is personal, can't do in RLS easily)
      const filtered = data.filter(p => !exclusions.includes(p.profiles?.id));
      // Apply platform filter if set
      const platFiltered = platformFilter === "all" ? filtered : filtered.filter(p => p.platforms?.includes(platformFilter));
      setPosts(platFiltered);
      // Build game filter list from unfiltered results (so game tabs don't disappear when platform filtered)
      const seen = {};
      filtered.forEach(p => { if (p.games && !seen[p.games.id]) seen[p.games.id] = p.games; });
      setFilterGames(Object.values(seen));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadViewerContext();
  }, [currentUser?.id]);

  useEffect(() => {
    loadPosts();
  }, [gameFilter, platformFilter, exclusions]);

  const searchGames = async (q) => {
    setGameSearch(q);
    if (!q.trim()) { setGameResults([]); return; }
    const { data } = await supabase.from("games").select("id, name, genre").ilike("name", `%${q}%`).limit(6);
    setGameResults(data || []);
  };

  const submitPost = async () => {
    if (!selectedGame || !form.looking_for.trim() || submitting) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    await supabase.from("lfg_posts").insert({
      user_id: user.id,
      game_id: selectedGame.id,
      looking_for: form.looking_for.trim(),
      play_style: form.play_style.trim() || null,
      rank: form.rank.trim() || null,
      note: form.note.trim() || null,
      tags,
    });
    setForm({ game_id: "", looking_for: "", play_style: "", rank: "", note: "", tags: "" });
    setSelectedGame(null);
    setGameSearch("");
    setGameResults([]);
    setShowForm(false);
    setSubmitting(false);
    loadPosts();
  };

  const deletePost = async (id) => {
    await supabase.from("lfg_posts").delete().eq("id", id);
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const inputStyle = { width: "100%", background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: isMobile ? 20 : 26, color: C.text, letterSpacing: "-0.5px" }}>Looking for Group</h2>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>Find players who match your style, game, and schedule.</p>
        </div>
        {currentUser && myGamertags.length > 0 && (
          <button onClick={() => setShowForm(f => !f)} style={{ background: showForm ? C.surfaceRaised : C.accent, border: `1px solid ${showForm ? C.border : "transparent"}`, borderRadius: 10, padding: "9px 20px", color: showForm ? C.textMuted : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {showForm ? "Cancel" : "+ Post LFG"}
          </button>
        )}
      </div>

      {/* Post LFG form */}
      {showForm && (
        <div style={{ background: C.surface, border: `1px solid ${C.accentDim}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 16 }}>Post a Looking for Group</div>

          {/* Game search */}
          <div style={{ marginBottom: 12, position: "relative" }}>
            <div style={{ color: C.textDim, fontSize: 12, marginBottom: 6 }}>Game *</div>
            {selectedGame ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ color: C.accentSoft, fontWeight: 600, fontSize: 13 }}>{selectedGame.name}</span>
                <button onClick={() => { setSelectedGame(null); setGameSearch(""); }} style={{ marginLeft: "auto", background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            ) : (
              <>
                <input value={gameSearch} onChange={e => searchGames(e.target.value)} placeholder="Search for a game..." style={inputStyle} autoFocus />
                {gameResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, zIndex: 50, overflow: "hidden", marginTop: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                    {gameResults.map(g => (
                      <div key={g.id} onClick={() => { setSelectedGame(g); setGameSearch(g.name); setGameResults([]); }}
                        style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{g.name}</span>
                        {g.genre && <span style={{ color: C.textDim, fontSize: 11, marginLeft: 8 }}>{g.genre}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ color: C.textDim, fontSize: 12, marginBottom: 6 }}>Looking for *</div>
              <input value={form.looking_for} onChange={e => setForm(f => ({ ...f, looking_for: e.target.value }))} placeholder="e.g. 2 players, Full team" style={inputStyle} />
            </div>
            <div>
              <div style={{ color: C.textDim, fontSize: 12, marginBottom: 6 }}>Play style</div>
              <input value={form.play_style} onChange={e => setForm(f => ({ ...f, play_style: e.target.value }))} placeholder="e.g. Competitive, Casual" style={inputStyle} />
            </div>
            <div>
              <div style={{ color: C.textDim, fontSize: 12, marginBottom: 6 }}>Rank / Skill</div>
              <input value={form.rank} onChange={e => setForm(f => ({ ...f, rank: e.target.value }))} placeholder="e.g. Diamond II, NG+3" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ color: C.textDim, fontSize: 12, marginBottom: 6 }}>Tags <span style={{ color: C.textDim, fontWeight: 400 }}>(comma separated)</span></div>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. Evenings PST, 18+, Voice chat" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.textDim, fontSize: 12, marginBottom: 6 }}>Note</div>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Anything else players should know..." style={{ ...inputStyle, resize: "none", minHeight: 60 }} />
          </div>

          <button onClick={submitPost} disabled={!selectedGame || !form.looking_for.trim() || submitting}
            style={{ background: selectedGame && form.looking_for.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 10, padding: "10px 24px", color: selectedGame && form.looking_for.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {submitting ? "Posting…" : "Post LFG"}
          </button>
        </div>
      )}

      {/* Locked state — no gamertags entered */}
      {currentUser && !loading && myGamertags.length === 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 32, textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 16, marginBottom: 8 }}>Add a gamertag to unlock LFG</div>
          <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, maxWidth: 400, margin: "0 auto 16px" }}>
            LFG is built around mutual platform sharing. Add at least one gamertag to your profile to browse and post.
            {!isAdult && <span style={{ display: "block", marginTop: 6, color: C.textDim, fontSize: 12 }}>You'll need to add your birth year first — gamertag sharing is available at 18.</span>}
          </div>
          <button onClick={() => setActivePage("profile")}
            style={{ background: C.accent, border: "none", borderRadius: 10, padding: "9px 24px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Go to Profile →
          </button>
        </div>
      )}

      {/* Platform filters — only platforms the viewer has */}
      {currentUser && myGamertags.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button onClick={() => setPlatformFilter("all")} style={{ background: platformFilter === "all" ? C.accentGlow : C.surface, border: `1px solid ${platformFilter === "all" ? C.accentDim : C.border}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: platformFilter === "all" ? C.accentSoft : C.textMuted, fontSize: 12, fontWeight: 600 }}>All Platforms</button>
          {PLATFORMS.filter(p => myGamertags.includes(p.id)).map(p => (
            <button key={p.id} onClick={() => setPlatformFilter(p.id)}
              style={{ background: platformFilter === p.id ? `${p.color}22` : C.surface, border: `1px solid ${platformFilter === p.id ? p.color : C.border}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: platformFilter === p.id ? p.color : C.textMuted, fontSize: 12, fontWeight: 600 }}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Game filters */}
      {filterGames.length > 0 && myGamertags.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => setGameFilter("all")} style={{ background: gameFilter === "all" ? C.accentGlow : C.surface, border: `1px solid ${gameFilter === "all" ? C.accentDim : C.border}`, borderRadius: 8, padding: "7px 16px", cursor: "pointer", color: gameFilter === "all" ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: 600 }}>All Games</button>
          {filterGames.map(g => (
            <button key={g.id} onClick={() => setGameFilter(g.id)} style={{ background: gameFilter === g.id ? C.accentGlow : C.surface, border: `1px solid ${gameFilter === g.id ? C.accentDim : C.border}`, borderRadius: 8, padding: "7px 16px", cursor: "pointer", color: gameFilter === g.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: 600 }}>{g.name}</button>
          ))}
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>Loading…</div>
      ) : !currentUser ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Sign in to see LFG posts</div>
          <div style={{ fontSize: 14 }}>LFG is available to members with gamertags on file.</div>
        </div>
      ) : myGamertags.length > 0 && posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>No LFG posts yet</div>
          <div style={{ fontSize: 14 }}>Be the first to post.</div>
        </div>
      ) : myGamertags.length > 0 ? posts.map(post => {
        const profile = post.profiles;
        const game = post.games;
        const isOwn = currentUser?.id === profile?.id;
        return (
          <div key={post.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: "flex", gap: 16, marginBottom: 12, alignItems: "flex-start" }}>
            <Avatar initials={(profile?.avatar_initials || "?").slice(0, 2).toUpperCase()} size={44} founding={profile?.is_founding} ring={profile?.active_ring} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: C.text, fontSize: 15, cursor: "pointer" }}
                  onClick={() => { setCurrentPlayer(profile?.id); setActivePage("player"); }}
                >{profile?.username || "Gamer"}</span>
                {game && <Badge color={C.accent}>{game.name}</Badge>}
                {post.rank && <Badge color={C.textMuted} small>{post.rank}</Badge>}
                <span style={{ color: C.textDim, fontSize: 12, marginLeft: "auto" }}>{timeAgo(post.created_at)}</span>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: post.tags?.length || post.note ? 10 : 0, flexWrap: "wrap" }}>
                <span style={{ color: C.textDim, fontSize: 13 }}>Looking for <strong style={{ color: C.text }}>{post.looking_for}</strong></span>
                {post.play_style && <span style={{ color: C.textDim, fontSize: 13 }}>Style: <strong style={{ color: C.text }}>{post.play_style}</strong></span>}
              </div>
              {post.note && <p style={{ color: C.textMuted, fontSize: 13, margin: "0 0 10px", lineHeight: 1.5 }}>{post.note}</p>}
              {post.tags?.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {post.tags.map(tag => <Badge key={tag} small color={C.textMuted}>{tag}</Badge>)}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
              {!isOwn && (
                <button onClick={() => { setCurrentPlayer(profile?.id); setActivePage("player"); }}
                  style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 18px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Profile
                </button>
              )}
              {isOwn && (
                <button onClick={() => deletePost(post.id)}
                  style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 18px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        );
      }) : null}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

function AuthPage({ onBack, defaultMode = "login" }) {
  const [mode, setMode] = useState(defaultMode);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const currentYear = new Date().getFullYear();
  const fakeEmail = (u) => `${u.trim().toLowerCase().replace(/\s+/g, "_")}@guildlink.gg`;

  const handle = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    if (!username.trim()) { setError("Username is required."); setLoading(false); return; }
    if (!password) { setError("Password is required."); setLoading(false); return; }
    const email = fakeEmail(username);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Fall back: if username looks like a real email, try it directly
        // (supports accounts created before the username-only auth change)
        if (username.includes("@") && username.includes(".")) {
          const { error: error2 } = await supabase.auth.signInWithPassword({ email: username.trim(), password });
          if (error2) { setError("Username or password incorrect."); }
        } else {
          setError("Username or password incorrect.");
        }
      }
    } else {
      let dobStr = null;
      const hasAnyDob = dobMonth || dobDay || dobYear;
      if (hasAnyDob) {
        const m = parseInt(dobMonth), d = parseInt(dobDay), y = parseInt(dobYear);
        if (!m || !d || !y || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > currentYear - 5) {
          setError("Please enter a valid birthday, or leave all fields blank to set later.");
          setLoading(false);
          return;
        }
        dobStr = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      if (data?.user) {
        const profileUpdates = {
          username: username.trim(),
          handle: "@" + username.trim().toLowerCase().replace(/\s+/g, "_"),
          avatar_initials: username.trim().slice(0, 2).toUpperCase(),
        };
        if (dobStr) profileUpdates.date_of_birth = dobStr;
        await supabase.from("profiles").update(profileUpdates).eq("id", data.user.id);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,900&display=swap'); * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }"}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, " + C.accent + ", " + C.teal + ")", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, fontWeight: 900, color: "#fff" }}>GL</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.text }}>GuildLink</div>
          <div style={{ color: C.textMuted, fontSize: 14, marginTop: 4 }}>The town square for gamers</div>
        </div>
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: 32 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: mode === m ? C.accent : C.surfaceRaised, color: mode === m ? "#fff" : C.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{m === "login" ? "Log In" : "Sign Up"}</button>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>{mode === "login" ? "Username or Email" : "Username"}</div>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder={mode === "login" ? "YourGamerName or email" : "YourGamerName"} style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
          </div>
          <div style={{ marginBottom: mode === "signup" ? 16 : 24 }}>
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Password</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} onKeyDown={e => e.key === "Enter" && handle()} />
          </div>
          {mode === "signup" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Birthday <span style={{ color: C.textDim, fontWeight: 400 }}>(optional)</span></div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={dobMonth} onChange={e => setDobMonth(e.target.value)} placeholder="MM" maxLength={2} style={{ width: 56, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 10px", color: C.text, fontSize: 14, outline: "none", textAlign: "center" }} />
                <input value={dobDay} onChange={e => setDobDay(e.target.value)} placeholder="DD" maxLength={2} style={{ width: 56, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 10px", color: C.text, fontSize: 14, outline: "none", textAlign: "center" }} />
                <input value={dobYear} onChange={e => setDobYear(e.target.value)} placeholder="YYYY" maxLength={4} style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
              </div>
              <div style={{ color: C.textDim, fontSize: 11, marginTop: 5, lineHeight: 1.5 }}>Unlocks gamertag sharing and LFG at 18+. You can add this later in your profile.</div>
            </div>
          )}
          {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          {message && <div style={{ color: C.green, fontSize: 13, marginBottom: 16 }}>{message}</div>}
          <button onClick={handle} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: C.accent, color: C.accentText, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            {loading ? "..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
          {onBack && (
            <button onClick={onBack} style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 10, border: "none", background: "transparent", color: C.textDim, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              ← Continue browsing without account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PLAYER PROFILE PAGE ──────────────────────────────────────────────────────

function PlayerProfilePage({ userId, setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, isMobile, currentUser, isGuest, onSignIn }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [shelf, setShelf] = useState({ want_to_play: [], playing: [], have_played: [] });
  const [postGameNames, setPostGameNames] = useState({});
  const [activeTab, setActiveTab] = useState("posts");
  const [compatibility, setCompatibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  // Gamertag request state
  const [gamertagVisibility, setGamertagVisibility] = useState([]); // from get_gamertag_visibility()
  const [requestLoading, setRequestLoading] = useState({});
  const PLATFORMS = [
    { id: "xbox", label: "Xbox", color: "#107C10" },
    { id: "psn", label: "PlayStation", color: "#003087" },
    { id: "steam", label: "Steam", color: "#1b2838" },
    { id: "nintendo", label: "Nintendo", color: "#E4000F" },
    { id: "battlenet", label: "Battle.net", color: "#148EFF" },
  ];

  // Incoming gamertag requests — belongs on ProfilePage, not here, but loaded via useEffect
  const loadGamertagVisibility = async () => {
    if (!currentUser || !userId || currentUser.id === userId) return;
    const { data, error } = await supabase.rpc("get_gamertag_visibility", { target_user_id: userId });
    if (!error && data) setGamertagVisibility(data);
  };

  const sendRequest = async (platform) => {
    setRequestLoading(r => ({ ...r, [platform]: true }));
    await supabase.from("gamertag_requests").insert({
      requester_id: currentUser.id,
      target_id: userId,
      platform,
    });
    // Notify the target
    await supabase.from("notifications").insert({
      user_id: userId,
      actor_id: currentUser.id,
      type: "gamertag_request",
      meta: platform,
    });
    loadGamertagVisibility();
    setRequestLoading(r => ({ ...r, [platform]: false }));
  };

  const cancelRequest = async (platform) => {
    setRequestLoading(r => ({ ...r, [platform]: true }));
    await supabase.from("gamertag_requests")
      .update({ status: "cancelled" })
      .eq("requester_id", currentUser.id)
      .eq("target_id", userId)
      .eq("platform", platform)
      .eq("status", "pending");
    loadGamertagVisibility();
    setRequestLoading(r => ({ ...r, [platform]: false }));
  };

  useEffect(() => {
    if (!userId) return;
    // Check follow status
    const checkFollow = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === userId) return;
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("followed_user_id", userId).maybeSingle();
      setFollowed(!!data);
    };
    checkFollow();
    loadGamertagVisibility();
    const load = async () => {
      setLoading(true);
      try {
      // Profile
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (prof) setProfile(prof);

      // Posts + liked state
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const [{ data: userPosts }, likesRes] = await Promise.all([
        supabase.from("posts").select("*").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(20),
        authUser
          ? supabase.from("post_likes").select("post_id").eq("user_id", authUser.id).then(r => r.error ? { data: [] } : r)
          : Promise.resolve({ data: [] }),
      ]);
      const likedIds = new Set((likesRes.data || []).map(l => l.post_id));
      if (userPosts) {
        setPosts(userPosts.map(p => ({ ...p, liked: likedIds.has(p.id), likes: p.likes ?? 0 })));
        const gameIds = [...new Set(userPosts.filter(p => p.game_tag?.includes('-')).map(p => p.game_tag))];
        if (gameIds.length > 0) {
          const { data: games } = await supabase.from("games").select("id, name").in("id", gameIds);
          if (games) { const m = {}; games.forEach(g => m[g.id] = g.name); setPostGameNames(m); }
        }
      }

      // Reviews
      const { data: userReviews } = await supabase
        .from("reviews").select("*, games(id, name, developer)")
        .eq("user_id", userId).order("created_at", { ascending: false });
      if (userReviews) setReviews(userReviews);

      // Shelf
      const { data: shelfData } = await supabase
        .from("user_games").select("*, games(id, name, developer, genre)")
        .eq("user_id", userId);
      if (shelfData) {
        const s = { want_to_play: [], playing: [], have_played: [] };
        shelfData.forEach(e => { if (s[e.status]) s[e.status].push(e); });
        setShelf(s);

        // Compatibility — compare with current user's shelf
        if (currentUser) {
          const { data: myShelf } = await supabase
            .from("user_games").select("game_id, status, games(name)")
            .eq("user_id", currentUser.id);
          if (myShelf && myShelf.length > 0) {
            // Priority: playing match > want_to_play match > have_played match
            const theirPlaying = shelfData.filter(e => e.status === "playing").map(e => ({ id: e.game_id, name: e.games?.name }));
            const theirWant = shelfData.filter(e => e.status === "want_to_play").map(e => ({ id: e.game_id, name: e.games?.name }));
            const theirPlayed = shelfData.filter(e => e.status === "have_played").map(e => ({ id: e.game_id, name: e.games?.name }));
            const myGameIds = new Set(myShelf.map(e => e.game_id));

            const playingMatch = theirPlaying.find(g => myGameIds.has(g.id));
            if (playingMatch) { setCompatibility({ type: "playing", gameName: playingMatch.name }); }
            else {
              const wantMatch = theirWant.find(g => myGameIds.has(g.id));
              if (wantMatch) { setCompatibility({ type: "want", gameName: wantMatch.name }); }
              else {
                const playedMatch = theirPlayed.find(g => myGameIds.has(g.id));
                if (playedMatch) { setCompatibility({ type: "played", gameName: playedMatch.name }); }
              }
            }
          }
        }
      }

      setLoading(false);
      } catch(e) {
        console.error("PlayerProfilePage load error:", e);
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const toggleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setFollowLoading(true);
    if (followed) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_user_id", userId);
      setFollowed(false);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_user_id: userId });
      setFollowed(true);
    }
    setFollowLoading(false);
  };

  const SHELF_COLUMNS = [
    { id: "want_to_play", label: "Want to Play", color: C.accent },
    { id: "playing", label: "Playing Now", color: C.green },
    { id: "have_played", label: "Have Played", color: C.gold },
  ];

  const compatibilityText = compatibility ? {
    playing: `Also playing ${compatibility.gameName}`,
    want: `Also wants to play ${compatibility.gameName}`,
    played: `Also played ${compatibility.gameName}`,
  }[compatibility.type] : null;

  if (loading) return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px" : "80px 20px", textAlign: "center", color: C.textDim, paddingTop: 120 }}>
      Loading profile...
    </div>
  );

  if (!profile) return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px" : "80px 20px", textAlign: "center", color: C.textDim, paddingTop: 120 }}>
      Player not found.
    </div>
  );

  const totalGames = shelf.want_to_play.length + shelf.playing.length + shelf.have_played.length;
  const tabs = [
    { id: "posts", label: `Posts${posts.length > 0 ? ` (${posts.length})` : ""}` },
    { id: "games", label: `Games${totalGames > 0 ? ` (${totalGames})` : ""}` },
    { id: "reviews", label: `Reviews${reviews.length > 0 ? ` (${reviews.length})` : ""}` },
  ];

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>
      {/* Header card */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ height: isMobile ? 100 : 150, background: `linear-gradient(135deg, #1a1040 0%, ${C.accent}66 50%, #0a2040 100%)`, position: "relative" }}>
          <div style={{ position: "absolute", bottom: isMobile ? -28 : -36, left: isMobile ? 16 : 28 }}>
            <Avatar initials={profile.avatar_initials || profile.username?.slice(0,2).toUpperCase() || "??"} size={isMobile ? 64 : 84} status="online" />
          </div>
        </div>
        <div style={{ padding: isMobile ? "40px 16px 20px" : "48px 28px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontWeight: 800, color: C.text, fontSize: isMobile ? 18 : 22 }}>{profile.username}</h1>
                {profile.level && <Badge color={C.gold}>Lv.{profile.level}</Badge>}
              </div>
              <div style={{ color: C.textMuted, fontSize: 13, margin: "4px 0" }}>{profile.handle}</div>
              {profile.bio && <p style={{ color: C.textMuted, fontSize: 13, margin: "8px 0 0", maxWidth: 480, lineHeight: 1.6 }}>{profile.bio}</p>}
            </div>
            <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "flex-end", gap: 8, width: isMobile ? "100%" : "auto" }}>
              {!isOwnProfile && (
                <button onClick={toggleFollow} disabled={followLoading} style={{ background: followed ? C.accentGlow : C.accent, border: `1px solid ${followed ? C.accentDim : C.accent}`, borderRadius: 8, padding: "8px 22px", color: followed ? C.accentSoft : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flex: isMobile ? 1 : "none" }}>
                  {followLoading ? "..." : followed ? "✓ Following" : "Follow"}
                </button>
              )}
              {compatibilityText && (
                <div style={{ background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "6px 12px", color: C.accentSoft, fontSize: 12, fontWeight: 600, flex: isMobile ? 1 : "none", textAlign: "center" }}>
                  {compatibilityText}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 24, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            {[
              { label: "Posts", val: posts.length, color: C.accent },
              { label: "Reviews", val: reviews.length, color: C.teal },
              { label: "Games", val: totalGames, color: C.gold },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
                <div style={{ color: C.textDim, fontSize: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Gamertag requests — only shown to 18+ followers who have tags themselves */}
          {gamertagVisibility.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <div style={{ color: C.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10, fontWeight: 600 }}>Gamertags</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {gamertagVisibility.map(({ platform, request_status, tag }) => {
                  const plat = PLATFORMS.find(p => p.id === platform);
                  return (
                    <div key={platform} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: plat?.color || C.textDim, flexShrink: 0 }} />
                      <span style={{ color: C.textMuted, fontSize: 13, fontWeight: 600, width: 100, flexShrink: 0 }}>{plat?.label || platform}</span>
                      {request_status === "approved" && tag ? (
                        <span style={{ color: C.text, fontSize: 13, fontFamily: "monospace" }}>{tag}</span>
                      ) : request_status === "pending" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: C.textDim, fontSize: 12 }}>Request sent</span>
                          <button onClick={() => cancelRequest(platform)} disabled={requestLoading[platform]}
                            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 10px", color: C.textDim, fontSize: 11, cursor: "pointer" }}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => sendRequest(platform)} disabled={requestLoading[platform]}
                          style={{ background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "5px 14px", color: C.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          {requestLoading[platform] ? "…" : "Request gamertag"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ background: activeTab === tab.id ? C.accentGlow : "transparent", border: activeTab === tab.id ? `1px solid ${C.accentDim}` : "1px solid transparent", borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: activeTab === tab.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {activeTab === "posts" && (
        <div>
          {posts.length > 0 ? posts.map(post => {
            const npc = post.npc_id ? Object.values(NPCS).find(n => n.id === post.npc_id) : null;
            return (
            <FeedPostCard key={post.id} post={{
              id: post.id,
              npc_id: post.npc_id,
              game_tag: post.game_tag,
              user_id: post.user_id || userId,
              liked: post.liked || false,
              user: npc ? {
                name: npc.name, handle: npc.handle, avatar: npc.avatar, status: npc.status, isNPC: true, isFounding: false,
              } : {
                name: profile?.username || "Gamer",
                handle: profile?.handle || "@gamer",
                avatar: profile?.avatar_initials || "GL",
                status: "online",
                isNPC: false,
                isFounding: profile?.is_founding || false,
              },
              content: post.content,
              time: timeAgo(post.created_at),
              likes: post.likes || 0,
              comment_count: post.comment_count || 0,
              commentList: [],
            }} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC || (() => {})} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={currentUser} isGuest={isGuest} onSignIn={onSignIn} />
            );
          }) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
              <div style={{ fontSize: 13 }}>No posts yet.</div>
            </div>
          )}
        </div>
      )}

      {/* Games — read-only kanban */}
      {activeTab === "games" && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
          {SHELF_COLUMNS.map(col => (
            <div key={col.id} style={{ background: C.surface, border: `1px solid ${col.color}33`, borderRadius: 14, padding: 14, minHeight: 160 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, color: col.color, fontSize: 13 }}>{col.label}</div>
                <div style={{ background: `${col.color}22`, color: col.color, borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{shelf[col.id].length}</div>
              </div>
              {shelf[col.id].length > 0 ? shelf[col.id].map(entry => {
                const game = entry.games;
                if (!game) return null;
                const review = reviews.find(r => r.game_id === entry.game_id);
                return (
                  <div key={entry.game_id}
                    onClick={() => { setCurrentGame(game.id); setActivePage("game"); }}
                    style={{ background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                        <div style={{ color: C.textDim, fontSize: 11 }}>{game.genre}</div>
                      </div>
                      {review && <span style={{ background: C.goldDim, color: C.gold, borderRadius: 5, padding: "1px 6px", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{review.rating}/10</span>}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ textAlign: "center", padding: "20px 10px", color: C.textDim, fontSize: 12, borderRadius: 8, border: `1px dashed ${col.color}33` }}>
                  Nothing here yet
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reviews */}
      {activeTab === "reviews" && (
        <div>
          {reviews.length > 0 ? reviews.map(review => (
            <div key={review.id} onClick={() => review.games && (setCurrentGame(review.game_id), setActivePage("game"))}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.surfaceRaised, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, color: C.textDim, fontSize: 11 }}>{(review.games?.name || "?").slice(0,2).toUpperCase()}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{review.games?.name || "Unknown Game"}</div>
                  <div style={{ color: C.textDim, fontSize: 12 }}>{review.games?.developer}{review.time_played ? ` · ${review.time_played}h played` : ""}{review.completed ? " · Completed" : ""}</div>
                </div>
                <div style={{ background: C.goldDim, border: `1px solid ${C.gold}44`, borderRadius: 8, padding: "6px 12px", color: C.gold, fontWeight: 800, fontSize: 16 }}>{review.rating}/10</div>
              </div>
              {review.headline && <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 8 }}>{review.headline}</div>}
              {review.loved && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>✅ {review.loved}</div>}
              {review.didnt_love && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>⚠️ {review.didnt_love}</div>}
              {review.content && <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: "8px 0 0" }}>{review.content}</p>}
              <div style={{ color: C.textDim, fontSize: 11, marginTop: 10 }}>{timeAgo(review.created_at)}</div>
            </div>
          )) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
              <div style={{ fontSize: 13 }}>No reviews yet.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ONBOARDING TUTORIAL ──────────────────────────────────────────────────────

function OnboardingModal({ currentUser, isMobile, onComplete, setActivePage, setProfileDefaultTab }) {
  const [step, setStep] = useState(0);
  const [addedGames, setAddedGames] = useState([]);
  const [questPopped, setQuestPopped] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Each step: what to say, which element to spotlight (by data-tour attr), cta label
  const STEPS = [
    {
      speaker: "deckard",
      heading: "Welcome. I'm Deckard.",
      body: "I'll be your guide for the next couple minutes. No cheat codes needed — GuildLink is built to be figured out. But a little tour never hurt anyone.",
      cta: "Let's do it",
      spotlight: null,
    },
    {
      speaker: "deckard",
      heading: "Everything starts with your shelf.",
      body: "See that Games tab up there? That's your shelf. What you've played, what you're playing now, what's waiting in the queue. It's your gaming identity — and it's what makes everything else on this platform work.",
      cta: "Makes sense",
      spotlight: "games-tab",
    },
    {
      speaker: "deckard",
      heading: "Your shelf is your signal.",
      body: "GuildLink doesn't know your age, location, or browsing habits. It only knows what you play. The more honest your shelf is, the better your feed gets — for you and for everyone whose taste overlaps with yours.",
      cta: "That's refreshing",
      spotlight: "games-tab",
    },
    {
      speaker: "deckard",
      heading: "The overlap is where the magic happens.",
      body: "When your shelf overlaps with someone else's, you both get a signal. They might be playing something you haven't heard of yet. That's discovery — not an algorithm, just taste.",
      cta: "Got it",
      spotlight: null,
    },
    {
      speaker: "deckard",
      heading: "Add your first game right now.",
      body: "Start with whatever you launched last week. Don't overthink it — one game is enough to start the engine.",
      cta: null,
      spotlight: "shelf-columns",
      showSearch: true,
    },
    {
      speaker: "deckard",
      heading: "There it is. ✨",
      body: "Your shelf just got its first entry. And you just completed your first quest.",
      cta: "See my quests →",
      spotlight: "quests-tab",
      questPop: true,
    },
    {
      speaker: "deckard",
      heading: "Quests reward how you use the platform.",
      body: "Reviews, posts, follows — every action that builds your taste profile earns you something. Rings, themes, profile unlocks. Check your Quests tab anytime to see what's next.",
      cta: "Got it",
      spotlight: "quests-tab",
    },
    {
      speaker: "deckard",
      heading: "One more thing — the feed.",
      body: "Posts tagged to games you play show up in your feed. The more games on your shelf, the richer it gets. Go add a few more games, then head to the feed and see what's waiting.",
      cta: "Take me to my feed →",
      spotlight: null,
      last: true,
    },
  ];

  const current = STEPS[step] || STEPS[STEPS.length - 1];
  const progress = ((step) / (STEPS.length - 1)) * 100;

  const addGame = async (game) => {
    if (addedGames.find(g => g.id === game.id)) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("user_games").upsert({ user_id: authUser.id, game_id: game.id, status: "playing", updated_at: new Date().toISOString() });
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

  // @ mention tagging — mirrors post composer behavior
  const [atText, setAtText] = useState("");
  const [atResults, setAtResults] = useState([]);
  const [atIndex, setAtIndex] = useState(0);
  const atInputRef = useRef(null);

  const handleAtInput = async (e) => {
    const val = e.target.value;
    setAtText(val);
    const m = val.match(/@(\w*)$/);
    if (m) {
      const q = m[1].toLowerCase();
      if (q.length === 0) {
        const { data } = await supabase.from("games").select("id, name, developer, genre, followers").order("followers", { ascending: false }).limit(6);
        setAtResults(data || []);
      } else {
        const { data } = await supabase.from("games").select("id, name, developer, genre, followers").ilike("name", `%${q}%`).order("followers", { ascending: false }).limit(6);
        setAtResults(data || []);
      }
    } else {
      setAtResults([]);
    }
  };

  const handleAtKeyDown = (e) => {
    if (atResults.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setAtIndex(i => Math.min(i + 1, atResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAtIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); selectAtGame(atResults[atIndex]); }
    else if (e.key === "Escape") { setAtResults([]); }
  };

  const selectAtGame = async (game) => {
    if (addedGames.find(g => g.id === game.id)) { setAtResults([]); setAtText(""); return; }
    const replaced = atText.replace(/@\w*$/, `@${game.name.replace(/\s+/g, "")} `);
    setAtText(replaced);
    setAtResults([]);
    setAtIndex(0);
    await addGame(game);
    setTimeout(() => atInputRef.current?.focus(), 0);
  };

  // Spotlight: always-bottom banner — scroll the PAGE so the element is in the upper portion
  const BANNER_CLEARANCE = isMobile ? 220 : 200; // px reserved for banner at bottom
  const [spotRect, setSpotRect] = useState(null);
  const spotlightKey = current.spotlight;

  const measureSpot = useCallback(() => {
    if (!spotlightKey) { setSpotRect(null); return; }
    const el = document.querySelector(`[data-tour="${spotlightKey}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      setSpotRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      setSpotRect(null);
    }
  }, [spotlightKey]);

  useEffect(() => {
    if (!spotlightKey) { setSpotRect(null); return; }
    const el = document.querySelector(`[data-tour="${spotlightKey}"]`);
    if (!el) { setSpotRect(null); return; }

    // Target: element should sit near top of viewport, well above the banner
    const r = el.getBoundingClientRect();
    const safeZoneBottom = window.innerHeight - BANNER_CLEARANCE - 20;
    const idealTop = 80; // put element near the top, just below nav
    const needsScroll = r.top < 60 || r.top > safeZoneBottom || r.bottom > safeZoneBottom;
    if (needsScroll) {
      window.scrollTo({ top: window.scrollY + r.top - idealTop, behavior: "smooth" });
      setTimeout(measureSpot, 400);
    } else {
      measureSpot();
    }

    window.addEventListener("scroll", measureSpot, { passive: true });
    window.addEventListener("resize", measureSpot, { passive: true });
    return () => {
      window.removeEventListener("scroll", measureSpot);
      window.removeEventListener("resize", measureSpot);
    };
  }, [spotlightKey, measureSpot]);

  const DECKARD_COLOR = "#a78bfa";

  return (
    <>
      {/* Spotlight overlay */}
      {spotRect && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9990, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: Math.max(0, spotRect.top - 8), background: "#00000077" }} />
          <div style={{ position: "absolute", top: spotRect.top + spotRect.height + 8, left: 0, right: 0, bottom: 0, background: "#00000077" }} />
          <div style={{ position: "absolute", top: spotRect.top - 8, left: 0, width: Math.max(0, spotRect.left - 8), height: spotRect.height + 16, background: "#00000077" }} />
          <div style={{ position: "absolute", top: spotRect.top - 8, left: spotRect.left + spotRect.width + 8, right: 0, height: spotRect.height + 16, background: "#00000077" }} />
          <div style={{
            position: "absolute",
            top: spotRect.top - 6, left: spotRect.left - 6,
            width: spotRect.width + 12, height: spotRect.height + 12,
            borderRadius: 12,
            border: `2px solid ${C.accent}`,
            boxShadow: `0 0 0 4px ${C.accent}22, 0 0 20px ${C.accent}44`,
            animation: "tourPulse 1.5s ease-in-out infinite",
          }} />
        </div>
      )}

      {/* Banner — always anchored to bottom, page scrolls around it */}
      <div style={{
        position: "fixed", bottom: isMobile ? 68 : 24, top: "auto",
        left: "50%", transform: "translateX(-50%)",
        width: isMobile ? "calc(100vw - 24px)" : 560,
        zIndex: 9999,
        background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surfaceRaised} 100%)`,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${DECKARD_COLOR}`,
        borderRadius: 16,
        boxShadow: "0 -4px 40px #00000077, 0 8px 32px #00000055",
        overflow: "hidden",
        opacity: transitioning ? 0 : 1,
        transform: `translateX(-50%) translateY(${transitioning ? "8px" : "0"})`,
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}>
        {/* Progress bar */}
        <div style={{ height: 2, background: C.surfaceRaised }}>
          <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${DECKARD_COLOR}, ${C.accent})`, transition: "width 0.4s ease" }} />
        </div>

        <div style={{ padding: isMobile ? "16px 18px" : "20px 24px" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            {/* Deckard portrait */}
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: isMobile ? 44 : 52, height: isMobile ? 44 : 52,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${DECKARD_COLOR}33, ${DECKARD_COLOR}11)`,
                border: `2px solid ${DECKARD_COLOR}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isMobile ? 22 : 26,
                boxShadow: `0 0 16px ${DECKARD_COLOR}33`,
              }}>🧙</div>
              <div style={{ color: DECKARD_COLOR, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>DECKARD</div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Quest pop */}
              {current.questPop && (
                <div style={{
                  background: `${C.green}15`, border: `1px solid ${C.green}44`,
                  borderRadius: 8, padding: "8px 12px", marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 10,
                  animation: "slideUp 0.3s ease",
                }}>
                  <span style={{ fontSize: 18 }}>🎯</span>
                  <div>
                    <div style={{ color: C.green, fontWeight: 800, fontSize: 12 }}>Quest Complete — First Game Added</div>
                    <div style={{ color: C.gold, fontSize: 11 }}>+50 XP earned</div>
                  </div>
                </div>
              )}

              <div style={{ fontWeight: 800, color: C.text, fontSize: isMobile ? 14 : 16, marginBottom: 5, lineHeight: 1.3 }}>
                {current.heading}
              </div>
              <div style={{ color: C.textMuted, fontSize: isMobile ? 12 : 13, lineHeight: 1.6, marginBottom: current.showSearch ? 12 : 0 }}>
                {current.body}
              </div>

              {/* @ game tagging */}
              {current.showSearch && (
                <div style={{ marginTop: 10, position: "relative" }}>
                  <div style={{ position: "relative" }}>
                    <input
                      ref={atInputRef}
                      value={atText}
                      onChange={handleAtInput}
                      onKeyDown={handleAtKeyDown}
                      placeholder="Type @ to tag a game, like tagging a friend"
                      autoFocus
                      style={{ width: "100%", background: C.surfaceRaised, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                    />
                  </div>
                  {atResults.length > 0 && (
                    <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", zIndex: 10001, boxShadow: "0 -8px 24px #00000066" }}>
                      {atResults.map((game, idx) => (
                        <div key={game.id} onClick={() => selectAtGame(game)}
                          style={{ padding: "10px 12px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: idx === atIndex ? C.surfaceRaised : "transparent" }}
                          onMouseEnter={() => setAtIndex(idx)}>
                          <div>
                            <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>@{game.name.replace(/\s+/g, "")}</div>
                            <div style={{ color: C.textDim, fontSize: 11 }}>{game.developer} · {game.genre}</div>
                          </div>
                          <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>+ Add</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {addedGames.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {addedGames.map(g => (
                        <div key={g.id} style={{ background: `${C.accent}18`, border: `1px solid ${C.accentDim}`, borderRadius: 6, padding: "3px 10px", color: C.accentSoft, fontSize: 11, fontWeight: 700 }}>✓ @{g.name.replace(/\s+/g, "")}</div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => advance(6)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", padding: "6px 0 0", display: "block" }}>
                    Skip for now →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CTA row */}
          {current.cta && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={current.last ? finish : () => advance()}
                style={{ background: `linear-gradient(135deg, ${DECKARD_COLOR}, ${C.accent})`, border: "none", borderRadius: 8, padding: isMobile ? "9px 18px" : "10px 22px", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                {current.cta}
              </button>
              <button onClick={skip} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer" }}>
                Skip tutorial
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes tourPulse {
          0%, 100% { box-shadow: 0 0 0 4px ${C.accent}22, 0 0 20px ${C.accent}33; }
          50% { box-shadow: 0 0 0 6px ${C.accent}33, 0 0 32px ${C.accent}55; }
        }
      `}</style>
    </>
  );
}

export default function GuildLink() {
  const [activePage, setActivePage] = useState("feed");
  const [currentGame, setCurrentGame] = useState("elden-ring");
  const [currentNPC, setCurrentNPC] = useState("merv");

  const [currentPlayer, setCurrentPlayer] = useState(null);
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
      // Grant reward to user_rewards if this quest has one
      if (uq.quests?.reward_id) {
        await supabase.from("user_rewards").upsert(
          { user_id: userId, reward_id: uq.quests.reward_id },
          { onConflict: "user_id,reward_id" }
        );
      }
      setQuestBanner({
        quest_id: uq.quest_id,
        title: uq.quests?.title || "Quest Complete",
        xp_reward: uq.quests?.xp_reward || 0,
        reward_label: uq.quests?.quest_rewards?.label || null,
      });
      // Mark as notified
      await supabase.rpc("mark_quest_notified", { p_user_id: userId, p_quest_id: uq.quest_id });
    }
  };

  const backfillQuestRewards = async (userId) => {
    // Grant rewards for any completed quests that have a reward_id but aren't in user_rewards yet
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
  };

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile(data);
      if (data.theme) applyAndSetTheme(data.theme);
      if (!data.onboarded) {
        setActivePage("profile");
        setProfileDefaultTab("games");
        setShowOnboarding(true);
      }
    }
    fetchNotifications(userId);
    backfillQuestRewards(userId);
    checkQuestCompletions(userId);
  };

  const fetchNotifications = async (userId) => {
    const { data } = await supabase
      .from("notifications")
      .select("*, npc_id, actor:profiles!notifications_actor_id_fkey(username, handle, avatar_initials)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setNotifications(data);
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
  } : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
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
          border: `1px solid ${C.green}44`, borderRadius: 16,
          padding: "16px 20px", boxShadow: `0 8px 32px #00000066, 0 0 0 1px ${C.green}22`,
          display: "flex", alignItems: "center", gap: 16,
          animation: "slideUp 0.3s ease",
        }}>
          <style>{`@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.green}18`, border: `1px solid ${C.green}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎯</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 13, marginBottom: 2 }}>Quest Complete!</div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{questBanner.title}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>+{questBanner.xp_reward} XP</span>
              {questBanner.reward_label && <span style={{ color: C.accentSoft, fontSize: 12 }}>· {questBanner.reward_label} unlocked</span>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <button onClick={() => { setQuestBanner(null); setActivePage("profile"); setProfileDefaultTab("quests"); }}
              style={{ background: C.green, border: "none", borderRadius: 8, padding: "6px 12px", color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              View Quests
            </button>
            <button onClick={() => setQuestBanner(null)}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 12px", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
      {showOnboarding && liveUser && (
        <OnboardingModal
          currentUser={liveUser}
          isMobile={isMobile}
          setActivePage={setActivePage}
          setProfileDefaultTab={setProfileDefaultTab}
          onComplete={() => {
            setShowOnboarding(false);
            setActivePage("feed");
            session?.user?.id && fetchProfile(session.user.id);
          }}
        />
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
      <NavBar activePage={activePage} setActivePage={setActivePage} isMobile={isMobile} signOut={signOut} currentUser={liveUser} isGuest={isGuest} onSignIn={() => openSignIn()} onSignUp={openSignUp} notifications={notifications} onMarkAllRead={() => markAllRead(session?.user?.id)} onClearAll={() => clearAllNotifications(session?.user?.id)} onOpenPost={(postId) => setPostModal(postId)} setProfileDefaultTab={setProfileDefaultTab} />
      {postModal && <PostModal postId={postModal} onClose={() => setPostModal(null)} currentUser={liveUser} />}
      {activePage === "admin" && liveUser?.is_admin && <AdminPage isMobile={isMobile} currentUser={liveUser} setActivePage={setActivePage} setCurrentPlayer={setCurrentPlayer} />}
      {activePage === "npc-studio" && (liveUser?.is_admin || liveUser?.is_writer) && <NPCStudioPage isMobile={isMobile} currentUser={liveUser} />}
      {activePage === "charts" && <GamesPage setActivePage={setActivePage} setCurrentGame={setCurrentGame} isMobile={isMobile} currentUser={liveUser} onSignIn={openSignIn} />}
      {activePage === "feed" && <FeedPage activePage={activePage} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={liveUser} isGuest={isGuest} onSignIn={openSignIn} setProfileDefaultTab={setProfileDefaultTab} onQuestTrigger={() => session?.user?.id && checkQuestCompletions(session.user.id)} />}
      {activePage === "games" && <GamesPage setActivePage={setActivePage} setCurrentGame={setCurrentGame} isMobile={isMobile} currentUser={liveUser} onSignIn={openSignIn} />}
      {activePage === "game" && <GamePage gameId={currentGame} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={liveUser} isGuest={isGuest} onSignIn={openSignIn} />}
      {activePage === "npc" && <NPCProfilePage npcId={currentNPC} setActivePage={setActivePage} setCurrentNPC={setCurrentNPC} setCurrentGame={setCurrentGame} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={liveUser} onQuestTrigger={() => session?.user?.id && checkQuestCompletions(session.user.id)} />}
      {activePage === "npcs" && <NPCBrowsePage setActivePage={setActivePage} setCurrentNPC={setCurrentNPC} />}
      {activePage === "profile" && (isGuest ? (openSignIn("Create an account to build your profile and game shelf."), setActivePage("feed"), null) : <ProfilePage setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={liveUser} isGuest={isGuest} onSignIn={openSignIn} defaultTab={profileDefaultTab} onProfileSaved={() => session && fetchProfile(session.user.id)} onThemeChange={applyAndSetTheme} onQuestComplete={() => session?.user?.id && checkQuestCompletions(session.user.id)} />)}
      {activePage === "player" && <PlayerProfilePage userId={currentPlayer} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={liveUser} isGuest={isGuest} onSignIn={openSignIn} />}
      {activePage === "squad" && <LFGPage isMobile={isMobile} currentUser={liveUser} setCurrentPlayer={setCurrentPlayer} setActivePage={setActivePage} />}
      {activePage === "founding" && <FoundingMemberPage setActivePage={setActivePage} isMobile={isMobile} onSignUp={openSignUp} />}
    </div>
  );
}
