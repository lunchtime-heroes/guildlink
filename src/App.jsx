import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://zpalkpcqihxamedymnwe.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYWxrcGNxaWh4YW1lZHltbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NDc3MTQsImV4cCI6MjA4ODQyMzcxNH0.8V9MEXpcCH8dibm65PVtaPZseDbPvYCwSPJQ-9Cu-Zo"
);

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

function useWindowSize() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}

const C = {
  bg: "#0a0c12",
  surface: "#13161f",
  surfaceHover: "#1a1d2a",
  surfaceRaised: "#1e2130",
  border: "#252836",
  borderHover: "#353849",
  accent: "#6c63ff",
  accentGlow: "#6c63ff22",
  accentSoft: "#9b94ff",
  accentDim: "#6c63ff44",
  green: "#22c55e",
  gold: "#f59e0b",
  goldDim: "#f59e0b22",
  goldBorder: "#f59e0b33",
  goldGlow: "#f59e0b15",
  red: "#ef4444",
  teal: "#06b6d4",
  purple: "#a855f7",
  text: "#e8eaf2",
  textMuted: "#8b8fa8",
  textDim: "#4a4d63",
  online: "#22c55e",
};

// ─── FOUNDING / RING / QUEST DATA ────────────────────────────────────────────

const FOUNDING = {
  total: 10000,
  claimed: 4847,
  price: 5,
  closeDate: "Dec 31, 2025",
};

const PROFILE_RINGS = [
  { id: "none", label: "No Ring", color: "transparent", border: C?.border, description: "Standard member", unlocked: true, how: "Default" },
  { id: "founding", label: "Founding Ring", color: "#f59e0b", glow: "#f59e0b44", description: "Permanent. Earned by founding members.", unlocked: true, how: "Become a Founding Member", special: true },
  { id: "platinum", label: "Platinum Ring", color: "#e2e8f0", glow: "#e2e8f022", description: "Complete 50 game reviews", unlocked: false, how: "Quest: The Critic" },
  { id: "crimson", label: "Crimson Ring", color: "#ef4444", glow: "#ef444433", description: "Reach Top Voice on any game page", unlocked: false, how: "Quest: Top of the Feed" },
  { id: "void", label: "Void Ring", color: "#7c3aed", glow: "#7c3aed33", description: "Complete 10 games to 100%", unlocked: false, how: "Quest: The Completionist" },
  { id: "emerald", label: "Emerald Ring", color: "#10b981", glow: "#10b98133", description: "Help 100 players find a squad", unlocked: false, how: "Quest: The Connector" },
  { id: "celestial", label: "Celestial Ring", color: "#38bdf8", glow: "#38bdf833", description: "500 followers on GuildLink", unlocked: false, how: "Quest: Rising Star" },
  { id: "onyx", label: "Onyx Ring", color: "#1e293b", glow: "#94a3b833", description: "1 year as a GuildLink member", unlocked: false, how: "Quest: Veteran" },
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

const FEED_POSTS = [
  {
    id: 1,
    user: { name: "Jordan Park", handle: "@jpark_gamer", avatar: "JP", status: "online", isNPC: false },
    time: "2h ago", game: "Elden Ring", gameId: "elden-ring", gameIcon: "🗡️",
    content: "Finally beat Malenia after 47 attempts. The feeling when she finally went down... absolutely unreal. If anyone's struggling, happy to share my build — bleed arcane was the key 🗡️",
    likes: 284, comments: 4, shares: 12, liked: false,
    commentList: [
      { id: "c1", user: { name: "ShopKeep Merv", handle: "@ShopKeepMerv_NPC", avatar: "SM", isNPC: true }, time: "1h ago", content: "I sell Preserving Boluses from a cave 40 feet from her arena. I have Preserving Boluses in stock at all times. Nobody has ever asked.", likes: 1847 },
      { id: "c2", user: { name: "Grunt #4471", handle: "@GRUNT_NPC", avatar: "G4", isNPC: true }, time: "1h ago", content: "I stood outside that arena for 6 years. Not one person said hello. Congratulations on your victory. Sincerely.", likes: 2104 },
      { id: "c3", user: { name: "Sam Rivera", handle: "@sam_fps", avatar: "SR", isNPC: false }, time: "58m ago", content: "wait are you two in the same game?? 😭", likes: 847 },
      { id: "c4", user: { name: "ShopKeep Merv", handle: "@ShopKeepMerv_NPC", avatar: "SM", isNPC: true }, time: "55m ago", content: "We met at a trade guild mixer. It was sparsely attended. There were refreshments. Merv brought the arrows.", likes: 3921 },
    ],
  },
  {
    id: 2,
    user: { name: "ShopKeep Merv", handle: "@ShopKeepMerv_NPC", avatar: "SM", status: "online", isNPC: true },
    time: "3h ago", game: null, gameId: null, gameIcon: null,
    content: "Inventory update: 847 arrows, 12 health potions, one sword of unclear origin. I have been in this cave since the Third Age. Business is steady. The lantern is on.",
    likes: 4821, comments: 5, shares: 892, liked: false,
    commentList: [
      { id: "c5", user: { name: "Old Man Quest", handle: "@OldManQuest_NPC", avatar: "OQ", isNPC: true }, time: "2h ago", content: "I have a quest that requires 400 arrows. I have mentioned this to no one.", likes: 5204 },
      { id: "c6", user: { name: "Grunt #4471", handle: "@GRUNT_NPC", avatar: "G4", isNPC: true }, time: "2h ago", content: "I could have told people about the quest. I stand near the entrance to this entire region.", likes: 2847 },
      { id: "c7", user: { name: "Old Man Quest", handle: "@OldManQuest_NPC", avatar: "OQ", isNPC: true }, time: "1h ago", content: "Why didn't you?", likes: 1923 },
      { id: "c8", user: { name: "Grunt #4471", handle: "@GRUNT_NPC", avatar: "G4", isNPC: true }, time: "1h ago", content: "Nobody asks me anything. I mentioned the knee situation once and they all walked past.", likes: 8847 },
      { id: "c9", user: { name: "Priya Nair", handle: "@priya_plays", avatar: "PN", isNPC: false }, time: "45m ago", content: "I am genuinely losing my mind at this thread. I came here to talk about games.", likes: 4102 },
    ],
  },
  {
    id: 3,
    user: { name: "Taylor Kim", handle: "@taylorplays", avatar: "TK", status: "ingame", isNPC: false },
    time: "4h ago", game: "Stardew Valley", gameId: null, gameIcon: "🌱",
    content: "just cried because my favorite villager said something nice to me in Stardew 🌱 I need help. I am a grown adult.",
    likes: 3847, comments: 4, shares: 204, liked: true,
    commentList: [
      { id: "c10", user: { name: "Villager No. 47", handle: "@VillagerNo47_NPC", avatar: "V4", isNPC: true }, time: "3h ago", content: "We notice everything. We just don't always say it. You're doing great out there. Genuinely.", likes: 6847 },
      { id: "c11", user: { name: "Alex Chen", handle: "@axelstrike", avatar: "AC", isNPC: false }, time: "3h ago", content: "this reply just made it worse im crying harder what is happening", likes: 2904 },
      { id: "c12", user: { name: "Villager No. 47", handle: "@VillagerNo47_NPC", avatar: "V4", isNPC: true }, time: "2h ago", content: "That was the intended outcome. Have a good Tuesday.", likes: 11203 },
      { id: "c13", user: { name: "BeeKeeper Nan", handle: "@BeeKeeperNan_NPC", avatar: "BN", isNPC: true }, time: "2h ago", content: "The flowers near Plot 4 are also doing well, for what it's worth. It's worth something.", likes: 3847 },
    ],
  },
  {
    id: 4,
    user: { name: "Villager No. 47", handle: "@VillagerNo47_NPC", avatar: "V4", status: "online", isNPC: true },
    time: "5h ago", game: null, gameId: null, gameIcon: null,
    content: "A new resident moved into town today. They immediately started chopping down trees. I have filed nothing. I feel nothing. Welcome.",
    likes: 12847, comments: 4, shares: 1847, liked: false,
    commentList: [
      { id: "c14", user: { name: "BeeKeeper Nan", handle: "@BeeKeeperNan_NPC", avatar: "BN", isNPC: true }, time: "4h ago", content: "The flowers near plot 4 are gone. I noticed. I have been noticing.", likes: 4821 },
      { id: "c15", user: { name: "Villager No. 47", handle: "@VillagerNo47_NPC", avatar: "V4", isNPC: true }, time: "4h ago", content: "We all noticed, Nan.", likes: 7203 },
      { id: "c16", user: { name: "Mayor Whistle", handle: "@MayorWhistle_NPC", avatar: "MW", isNPC: true }, time: "3h ago", content: "I've received 3 formal complaints and 47 informal ones. I am handling it. Please stop sending complaints. I am one person.", likes: 9847 },
      { id: "c17", user: { name: "Jordan Park", handle: "@jpark_gamer", avatar: "JP", isNPC: false }, time: "2h ago", content: "the maplewood valley lore is getting DEEP and I am here for every second of it", likes: 5204 },
    ],
  },
  {
    id: 5,
    user: { name: "Sam Rivera", handle: "@sam_fps", avatar: "SR", status: "away", isNPC: false },
    time: "6h ago", game: "Valorant", gameId: null, gameIcon: "🎯",
    content: "lost 8 ranked games in a row. I am cooked. genuinely considering touching grass for the first time in weeks 💀",
    likes: 521, comments: 3, shares: 31, liked: false,
    commentList: [
      { id: "c18", user: { name: "Just A Minion", handle: "@JustAMinion_NPC", avatar: "JM", isNPC: true }, time: "5h ago", content: "I have died 14,847 times this season. Ranked or casual, the result is the same. You respawn. You try again. This is the way. Also the grass is fine.", likes: 8204 },
      { id: "c19", user: { name: "Sam Rivera", handle: "@sam_fps", avatar: "SR", isNPC: false }, time: "5h ago", content: "a level 1 minion just gave me better life advice than my actual therapist. incredible platform.", likes: 6847 },
      { id: "c20", user: { name: "Just A Minion", handle: "@JustAMinion_NPC", avatar: "JM", isNPC: true }, time: "4h ago", content: "I charge nothing. My rates are very competitive. I am also available to be defeated if that would help.", likes: 12903 },
    ],
  },
  {
    id: 6,
    user: { name: "Alex Chen", handle: "@axelstrike", avatar: "AC", status: "online", isNPC: false },
    time: "8h ago", game: "Hollow Knight", gameId: "hollow-knight", gameIcon: "🦋",
    content: "Silksong just dropped and I have cleared my entire weekend. Family has been notified. The fridge is stocked. I am ready.",
    likes: 2104, comments: 3, shares: 847, liked: false,
    commentList: [
      { id: "c21", user: { name: "Old Man Quest", handle: "@OldManQuest_NPC", avatar: "OQ", isNPC: true }, time: "7h ago", content: "I have a quest in a kingdom very similar to this one. It has been pending for 200 years. No rush. Enjoy your weekend.", likes: 7821 },
      { id: "c22", user: { name: "ShopKeep Merv", handle: "@ShopKeepMerv_NPC", avatar: "SM", isNPC: true }, time: "7h ago", content: "I have supplies available if needed. I am near the Eastern Pass. I am always near the Eastern Pass.", likes: 3204 },
      { id: "c23", user: { name: "Taylor Kim", handle: "@taylorplays", avatar: "TK", isNPC: false }, time: "6h ago", content: "same. my out of office is on. I have no regrets.", likes: 1847 },
    ],
  },
];

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

const BROWSE_GAMES = [
  { id: "elden-ring", name: "Elden Ring", icon: "🗡️", followers: 48200, genre: "Action RPG", hot: true },
  { id: "hollow-knight", name: "Hollow Knight", icon: "🦋", followers: 31400, genre: "Metroidvania", hot: true },
  { id: "valorant", name: "Valorant", icon: "🎯", followers: 92100, genre: "FPS", hot: false },
  { id: "stardew-valley", name: "Stardew Valley", icon: "🌱", followers: 28900, genre: "Simulation", hot: false },
  { id: "overwatch", name: "Overwatch 2", icon: "🦸", followers: 61200, genre: "Hero Shooter", hot: false },
  { id: "dark-souls", name: "Dark Souls III", icon: "🔥", followers: 39400, genre: "Souls-like", hot: false },
  { id: "animal-crossing", name: "Animal Crossing", icon: "🏝️", followers: 44800, genre: "Life Sim", hot: false },
  { id: "celeste", name: "Celeste", icon: "🏔️", followers: 18200, genre: "Platformer", hot: false },
];

const mockUser = {
  name: "Alex Chen", handle: "@axelstrike", avatar: "AC",
  level: 47, xp: 82400, xpNext: 90000,
  title: "Apex Predator · FPS Specialist",
  location: "San Francisco, CA",
  connections: 312, followers: 1840,
  bio: "Competitive FPS player & indie game enthusiast. Top 500 Overwatch. Always looking for serious teammates.",
  games: ["Arc Raiders", "Elden Ring", "Hollow Knight", "Valorant"],
  status: "online",
  isFounding: true,
  activeRing: "founding",
};

const squadPosts = [
  { id: 1, user: { name: "Morgan Lee", avatar: "ML" }, game: "Valorant", gameIcon: "🎯", rank: "Diamond II", looking: "2 players", style: "Competitive", time: "10m ago", tags: ["Evenings PST", "18+", "Chill vibes"] },
  { id: 2, user: { name: "Chris Wang", avatar: "CW" }, game: "Overwatch 2", gameIcon: "🦸", rank: "Platinum", looking: "Full team", style: "Casual", time: "1h ago", tags: ["Weekends", "Voice chat", "Learning"] },
  { id: 3, user: { name: "Priya Nair", avatar: "PN" }, game: "Elden Ring", gameIcon: "🗡️", rank: "NG+3", looking: "1 player", style: "Co-op", time: "3h ago", tags: ["Bosses only", "No summons", "Patient"] },
];

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

function FeedPostCard({ post, onLike, setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, currentUser }) {
  const [showComments, setShowComments] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liveComments, setLiveComments] = useState(null);
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
    const newLiked = !localPost.liked;
    const newLikes = newLiked ? localPost.likes + 1 : localPost.likes - 1;
    setLocalPost(p => ({ ...p, liked: newLiked, likes: newLikes }));
    if (post.id && typeof post.id === 'string' && post.id.includes('-')) {
      await supabase.from("posts").update({ likes: newLikes }).eq("id", post.id);
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

  const toggleComments = () => {
    if (!showComments && liveComments === null) loadComments();
    setShowComments(s => !s);
  };

  const submitComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("comments").insert({
      post_id: post.id,
      user_id: authUser.id,
      content: commentText.trim(),
    }).select("*, profiles(username, handle, avatar_initials)").single();
    if (!error && data) {
      setLiveComments(prev => [...(prev || []), data]);
      setCommentText("");
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
              } else if (localPost.user_id) {
                setCurrentPlayer(localPost.user_id); setActivePage("player");
              }
            }}>
            <Avatar initials={localPost.user.avatar} size={44} status={localPost.user.status} isNPC={localPost.user.isNPC} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                color: localPost.user.isNPC ? C.gold : C.text,
              }}
                onClick={() => {
                  if (localPost.user.isNPC) {
                    if (localPost.npc_id) { setCurrentNPC(localPost.npc_id); setActivePage("npc"); }
                    else { const npc = Object.values(NPCS).find(n => n.handle === localPost.user.handle); if (npc) { setCurrentNPC(npc.id); setActivePage("npc"); } }
                  } else if (localPost.user_id) {
                    setCurrentPlayer(localPost.user_id); setActivePage("player");
                  }
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
        <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
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
          }}>💬 {liveComments !== null ? liveComments.length : localPost.commentList.length} {showComments ? "▲" : "▼"}</button>
          <button style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 14px", cursor: "pointer", color: C.textMuted, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>↗ {localPost.shares || 0}</button>
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ background: C.surfaceHover, borderTop: `1px solid ${C.border}`, padding: "14px 20px" }}>
          {(liveComments || localPost.commentList).map((comment, i) => {
            const isLive = !!comment.profiles;
            const author = isLive ? comment.profiles : comment.user;
            const name = isLive ? author.username : author.name;
            const handle = isLive ? author.handle : author.handle;
            const avatar = isLive ? author.avatar_initials : author.avatar;
            const isNPC = !isLive && comment.user.isNPC;
            const allComments = liveComments || localPost.commentList;
            return (
              <div key={comment.id} style={{
                display: "flex", gap: 10, marginBottom: i < allComments.length - 1 ? 14 : 0,
              }}>
                <Avatar initials={avatar || "GL"} size={32} isNPC={isNPC} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    background: C.surfaceRaised,
                    border: `1px solid ${isNPC ? C.goldBorder : C.border}`,
                    borderRadius: 10, padding: "10px 14px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: isNPC ? C.gold : C.text }}>{name || "Gamer"}</span>
                      {isNPC && <NPCBadge />}
                      <span style={{ color: C.textDim, fontSize: 11 }}>{handle}</span>
                      <span style={{ color: C.textDim, fontSize: 11, marginLeft: "auto" }}>{timeAgo(comment.created_at) || comment.time}</span>
                    </div>
                    <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0, textAlign: "left" }}>{comment.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Comment input */}
          <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            {currentUser ? (<>
              <Avatar initials={currentUser?.avatar || "GL"} size={32} />
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitComment()}
                placeholder="Write a comment..."
                style={{ flex: 1, background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 13, outline: "none" }}
              />
              <button onClick={submitComment} disabled={submittingComment || !commentText.trim()} style={{ background: commentText.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 14px", color: commentText.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {submittingComment ? "..." : "Reply"}
              </button>
            </>) : (
              <div style={{ color: C.textDim, fontSize: 13 }}>Sign in to comment</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NPC PROFILE PAGE ─────────────────────────────────────────────────────────

function NPCProfilePage({ npcId, setActivePage, setCurrentNPC, setCurrentGame, setCurrentPlayer, isMobile, currentUser }) {
  const npc = NPCS[npcId];
  const [activeTab, setActiveTab] = useState("posts");
  const [followed, setFollowed] = useState(false);
  const [liveNPC, setLiveNPC] = useState(null);
  const [npcPosts, setNpcPosts] = useState([]);

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
                <button onClick={() => setFollowed(!followed)} style={{ background: followed ? C.goldGlow : C.gold, border: `1px solid ${C.gold}`, borderRadius: 8, padding: "7px 18px", color: followed ? C.gold : "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{followed ? "✓ Following" : "+ Follow"}</button>
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
            {(npcPosts.length > 0 ? npcPosts : (npc?.posts || [])).map(post => {
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
                commentList: [],
              } : {
                ...post,
                user: { ...post.user, isNPC: true },
              };
              return <FeedPostCard key={post.id} post={feedPost} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={currentUser} />;
            })}
            {npcPosts.length === 0 && (npc?.posts || []).length === 0 && (
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

function FoundingMemberPage({ setActivePage, isMobile }) {
  const [joined, setJoined] = useState(false);
  const pct = (FOUNDING.claimed / FOUNDING.total) * 100;
  const remaining = FOUNDING.total - FOUNDING.claimed;

  const perks = [
    { icon: "⚔️", title: "GuildLink Pro — $5/mo. Forever.", desc: "Pro launches publicly at $9.99/mo. Founding members pay $5/mo for life. You're not getting a discount — you're locking in a price before it exists." },
    { icon: "🏰", title: "Guild Hubs", desc: "Run your own private community space with custom branding, member management, and events. Included in Pro. Launch price for everyone else: $9.99/mo." },
    { icon: "🎮", title: "Achievement Sync — Coming Soon", desc: "Connect your Xbox, PlayStation, and Steam accounts. Your real achievements populate your profile automatically. Verified bragging rights." },
    { icon: "📊", title: "Gaming Report — Coming Soon", desc: "A monthly breakdown of your gaming life — hours played, completions, taste shifts, how you rank on GuildLink. Think Spotify Wrapped, but for games." },
    { icon: "🔒", title: "Your Data Stays Yours", desc: "GuildLink never sells your personal data. Not now, not ever. If you see an ad, it's because you play that game — not because we built a profile on you." },
    { icon: "🎯", title: "Ads Based on Games, Not You", desc: "We show game-relevant ads based on what you play, nothing else. No behavioral tracking, no demographic targeting, no data brokers. Just: you like Elden Ring, here's a FromSoftware ad." },
  ];

  return (
    <div style={{ minHeight: "100vh", paddingTop: 60, background: C.bg }}>
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

          <h1 style={{ margin: "0 0 16px", fontWeight: 900, fontSize: 42, color: "#fff", letterSpacing: "-1px", lineHeight: 1.1, textAlign: "center" }}>
            The town square<br /><span style={{ color: C.gold }}>needs its first citizens.</span>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 17, maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.7, textAlign: "center" }}>
            GuildLink is the town square for gamers. No personal data sold. No behavioral targeting. If you see an ad, it's because you play that game — full stop. Founding members lock in $5/mo forever for everything Pro includes, now and in the future.
          </p>

          {/* Progress bar */}
          <div style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: "24px 28px", marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: C.gold, fontWeight: 800, fontSize: 22 }}>{FOUNDING.claimed.toLocaleString()}</span>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, alignSelf: "center" }}>of {FOUNDING.total.toLocaleString()} spots</span>
            </div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: `linear-gradient(90deg, ${C.gold}aa, ${C.gold})`,
                borderRadius: 5, transition: "width 1s ease",
              }} />
            </div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
              <span style={{ color: C.gold, fontWeight: 700 }}>{remaining.toLocaleString()} spots remaining</span> · Closes {FOUNDING.closeDate} or when full
            </div>
          </div>

          {/* CTA */}
          {!joined ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <button onClick={() => setJoined(true)} style={{
                background: `linear-gradient(135deg, ${C.gold}, #d97706)`,
                border: "none", borderRadius: 12, padding: "16px 48px",
                color: "#000", fontSize: 16, fontWeight: 900, cursor: "pointer",
                boxShadow: `0 8px 32px ${C.gold}44`,
                letterSpacing: "-0.3px",
              }}>Become a Founding Member — $5/mo</button>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Cancel anytime. No tricks. No dark patterns.</div>
            </div>
          ) : (
            <div style={{ background: C.goldGlow, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: "20px 32px", display: "inline-block" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
              <div style={{ fontWeight: 800, color: C.gold, fontSize: 18 }}>Welcome, Founding Member!</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 6 }}>Your gold ring is active. You're #{FOUNDING.claimed + 1} of {FOUNDING.total.toLocaleString()}.</div>
            </div>
          )}
        </div>
      </div>

      {/* Perks grid */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "32px 16px 80px" : "56px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontWeight: 800, color: C.text, fontSize: isMobile ? 22 : 26, marginBottom: 8 }}>What founding members get</div>
          <div style={{ color: C.textMuted, fontSize: 15 }}>$5/mo locks in everything Pro includes — now and as it grows.</div>
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
            <div style={{ color: C.textMuted, fontSize: 14 }}>Every ring tells a story. Founding rings are the only ones you can't earn through quests.</div>
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            {PROFILE_RINGS.filter(r => r.id !== "none").map(ring => (
              <div key={ring.id} style={{ textAlign: "center", width: 100 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                  <div style={{ position: "relative", width: 56, height: 56 }}>
                    <div style={{
                      position: "absolute", inset: -3, borderRadius: "50%",
                      border: `3px solid ${ring.color}`,
                      boxShadow: `0 0 16px ${ring.glow || ring.color + "44"}`,
                    }} />
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${ring.color}22, ${ring.color}11)`,
                      border: `2px solid ${ring.color}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20,
                    }}>
                      {ring.id === "founding" ? "⚔️" : ring.id === "platinum" ? "📝" : ring.id === "crimson" ? "🏆" : ring.id === "void" ? "💯" : ring.id === "emerald" ? "🤝" : ring.id === "celestial" ? "⭐" : "🕯️"}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: ring.color, fontSize: 11, marginBottom: 3 }}>{ring.label}</div>
                <div style={{ color: C.textDim, fontSize: 10, lineHeight: 1.4 }}>{ring.how}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing clarity */}
        <div style={{ background: `linear-gradient(135deg, #0f0a00, #1f1500)`, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: isMobile ? 20 : 32, textAlign: "center" }}>
          <div style={{ fontWeight: 800, color: C.gold, fontSize: isMobile ? 17 : 20, marginBottom: 20 }}>How the pricing works. No surprises.</div>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "center", gap: isMobile ? 10 : 0, maxWidth: 600, margin: "0 auto 24px" }}>
            {[
              { label: "Founding Membership", price: "$5/mo", color: C.gold, desc: "Everything Pro includes, forever" },
              { label: "GuildLink Pro (public)", price: "$9.99/mo", color: C.accentSoft, desc: "Standard price at launch" },
              { label: "You save", price: "$4.99/mo", color: C.green, desc: "Every month. Forever." },
            ].map((tier, i) => (
              <div key={i} style={{
                flex: 1, padding: isMobile ? "14px 16px" : "20px 16px",
                background: "rgba(0,0,0,0.3)",
                border: `1px solid ${tier.color}33`,
                borderRadius: isMobile ? 10 : i === 0 ? "10px 0 0 10px" : i === 2 ? "0 10px 10px 0" : 0,
                borderLeft: !isMobile && i !== 0 ? "none" : `1px solid ${tier.color}33`,
                borderRight: !isMobile && i !== 2 ? "none" : `1px solid ${tier.color}33`,
              }}>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{tier.label}</div>
                <div style={{ fontWeight: 900, color: tier.color, fontSize: isMobile ? 22 : 26, marginBottom: 6 }}>{tier.price}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{tier.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, lineHeight: 1.7 }}>
            GuildLink Pro launches publicly at $9.99/mo — guild hubs, achievement sync, gaming reports, and everything that follows.<br />
            Founding members pay $5/mo forever. Your personal data is never sold. Ads are targeted by game, not by you. The founding ring is yours even if you cancel.
          </div>
          {!joined && (
            <button onClick={() => setJoined(true)} style={{ marginTop: 24, background: `linear-gradient(135deg, ${C.gold}, #d97706)`, border: "none", borderRadius: 10, padding: "12px 36px", color: "#000", fontSize: 14, fontWeight: 900, cursor: "pointer" }}>
              Claim Your Spot — $5/mo
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }`}</style>
    </div>
  );
}

// ─── FOUNDING BANNER ──────────────────────────────────────────────────────────

function FoundingBanner({ onDismiss, setActivePage }) {
  const pct = (FOUNDING.claimed / FOUNDING.total) * 100;
  return (
    <div style={{
      background: `linear-gradient(135deg, #1a1200, #2d2000)`,
      border: `1px solid ${C.goldBorder}`,
      borderRadius: 12, padding: "14px 18px", marginBottom: 14,
      display: "flex", alignItems: "center", gap: 16,
      boxShadow: `0 0 0 1px ${C.goldGlow}`,
    }}>
      <div style={{ fontSize: 24, flexShrink: 0 }}>⚔️</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ fontWeight: 800, color: C.gold, fontSize: 13 }}>Founding Membership is open</span>
          <span style={{ background: C.goldGlow, color: C.gold, border: `1px solid ${C.goldBorder}`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>{FOUNDING.total - FOUNDING.claimed} spots left</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 5, maxWidth: 300 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.gold}88, ${C.gold})`, borderRadius: 2 }} />
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>$5/mo forever · Guild hubs at launch · No personal data sold · Gold ring permanent</div>
      </div>
      <button onClick={() => setActivePage("founding")} style={{ background: `linear-gradient(135deg, ${C.gold}, #d97706)`, border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
        Learn More
      </button>
      <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 18, cursor: "pointer", padding: "0 4px", flexShrink: 0, lineHeight: 1 }}>×</button>
    </div>
  );
}


function NavBar({ activePage, setActivePage, isMobile, signOut, currentUser }) {
  const mobileItems = [
    { id: "feed", icon: "⊞", label: "Feed" },
    { id: "games", icon: "🎮", label: "Games" },
    { id: "squad", icon: "⚡", label: "Squad" },
    { id: "npcs", icon: "⚙", label: "NPCs" },
  ];
  const desktopItems = [
    { id: "feed", icon: "⊞", label: "Feed" },
    { id: "games", icon: "🎮", label: "Games" },
    { id: "profile", icon: "◉", label: "Profile" },
    { id: "squad", icon: "⚡", label: "Squad" },
    { id: "founding", icon: "⚔️", label: "Founding", gold: true },
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
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${C.accent}, #a855f7)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>G</div>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.text, letterSpacing: "-0.5px" }}>Guild<span style={{ color: C.accent }}>Link</span></span>
          </div>
          <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
            <span style={{ position: "absolute", left: 10, color: C.textDim, fontSize: 12 }}>🔍</span>
            <input placeholder="Search..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px 6px 28px", color: C.text, fontSize: 13, outline: "none" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: C.textMuted, position: "relative", padding: "4px" }}>
              🔔<span style={{ position: "absolute", top: 0, right: 0, background: C.accent, color: "#fff", borderRadius: "50%", width: 14, height: 14, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>4</span>
            </button>
            <div onClick={() => setActivePage("profile")} style={{ cursor: "pointer" }}>
              <Avatar initials={currentUser?.avatar || "GL"} size={30} status="online" founding={currentUser?.isFounding} ring={currentUser?.activeRing || "none"} />
            </div>
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
              <button key={item.id} onClick={() => setActivePage(item.id)} style={{
                flex: 1, background: "transparent", border: "none",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 3, cursor: "pointer", padding: "8px 0",
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
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, #a855f7)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff" }}>G</div>
        <span style={{ fontWeight: 800, fontSize: 18, color: C.text, letterSpacing: "-0.5px" }}>Guild<span style={{ color: C.accent }}>Link</span></span>
      </div>
      <div style={{ flex: 1, maxWidth: 300, position: "relative", display: "flex", alignItems: "center" }}>
        <span style={{ position: "absolute", left: 12, color: C.textDim, fontSize: 13 }}>🔍</span>
        <input placeholder="Search games, players, squads..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px 7px 32px", color: C.text, fontSize: 13, outline: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
        {desktopItems.map(item => (
          <button key={item.id} onClick={() => setActivePage(item.id)} style={{
            background: item.gold ? activePage === item.id ? C.goldGlow : "transparent" : activePage === item.id ? C.accentGlow : "transparent",
            border: item.gold ? activePage === item.id ? `1px solid ${C.goldBorder}` : "1px solid transparent" : activePage === item.id ? `1px solid ${C.accentDim}` : "1px solid transparent",
            borderRadius: 8, padding: "6px 14px",
            color: item.gold ? activePage === item.id ? C.gold : C.gold + "99" : activePage === item.id ? C.accentSoft : C.textMuted,
            cursor: "pointer", fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 5,
          }}><span>{item.icon}</span>{item.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 10 }}>
        <button style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: C.textMuted, position: "relative", padding: "4px 6px" }}>
          🔔<span style={{ position: "absolute", top: 0, right: 0, background: C.accent, color: "#fff", borderRadius: "50%", width: 15, height: 15, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>4</span>
        </button>
        <div onClick={() => setActivePage("profile")} style={{ cursor: "pointer" }}>
          <Avatar initials={currentUser?.avatar || "GL"} size={34} status="online" founding={currentUser?.isFounding} ring={currentUser?.activeRing || "none"} />
        </div>
        {signOut && <button onClick={signOut} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>Sign Out</button>}
        <span style={{ color: C.textDim, fontSize: 10, opacity: 0.5, userSelect: "none" }}>b0307-5</span>
      </div>
    </nav>
  );
}

// ─── NPC BROWSE PAGE (mobile tab) ────────────────────────────────────────────

function NPCBrowsePage({ setActivePage, setCurrentNPC }) {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "70px 16px 80px" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 22, color: C.text }}>⚙ GuildLink NPCs</h2>
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

// ─── FEED PAGE ────────────────────────────────────────────────────────────────

function FeedPage({ setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, isMobile, currentUser }) {
  const user = currentUser || mockUser;
  const [showBanner, setShowBanner] = useState(true);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [livePosts, setLivePosts] = useState([]);
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
  }, []);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(username, handle, avatar_initials, is_founding, active_ring), npcs(name, handle, avatar_initials, universe, role)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setLivePosts(data);
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
      const newPost = {
        ...data,
        profiles: {
          username: user.name,
          handle: user.handle,
          avatar_initials: user.avatar,
          is_founding: user.isFounding,
        }
      };
      setLivePosts(prev => [newPost, ...prev]);
      setPostText("");
      setTaggedGames([]);
    }
    setPosting(false);
  };

  return (
    <>
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: topPad }}>
      {showBanner && <FoundingBanner onDismiss={() => setShowBanner(false)} setActivePage={setActivePage} />}
      {isMobile && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 4 }}>
          {[
            { tag: "SilksongRelease", icon: "🦋", hot: true },
            { tag: "MaleniaBuild", icon: "🗡️", hot: true },
            { tag: "ValoBugReport", icon: "🎯", hot: false },
            { tag: "StardewUpdate", icon: "🌱", hot: false },
            { tag: "SoulslikeOfTheYear", icon: "🎮", hot: false },
          ].map(t => (
            <div key={t.tag} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 12px", whiteSpace: "nowrap", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <span style={{ fontSize: 12 }}>{t.icon}</span>
              <span style={{ color: C.accentSoft, fontSize: 12, fontWeight: 600 }}>#{t.tag}</span>
              {t.hot && <span style={{ fontSize: 10 }}>🔥</span>}
            </div>
          ))}
        </div>
      )}
    </div>
    <div style={{ display: "flex", gap: 20, maxWidth: 1100, margin: "0 auto", padding: mainPad }}>
      {/* Left sidebar — desktop only */}
      {!isMobile && (
      <div style={{ width: 230, flexShrink: 0 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ height: 56, background: `linear-gradient(135deg, ${C.accent}44, #a855f744)` }} />
          <div style={{ padding: "0 16px 16px", marginTop: -22 }}>
            <Avatar initials={user.avatar} size={44} status="online" />
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{user.name}</div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>{user.handle}</div>
              <div style={{ color: C.textDim, fontSize: 11, marginTop: 3 }}>{user.title}</div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.accent, fontSize: 14 }}>{user.connections}</div><div style={{ color: C.textDim, fontSize: 10 }}>Connections</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.accent, fontSize: 14 }}>{(user.followers / 1000).toFixed(1)}k</div><div style={{ color: C.textDim, fontSize: 10 }}>Followers</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, color: C.gold, fontSize: 14 }}>Lv.{user.level}</div><div style={{ color: C.textDim, fontSize: 10 }}>Level</div></div>
            </div>
          </div>
        </div>

        {/* NPC Spotlight */}
        <div style={{ background: C.goldGlow, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: C.gold, fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>⚙ NPC Spotlight</div>
          {Object.values(NPCS).slice(0, 3).map(npc => (
            <div key={npc.id} onClick={() => { setCurrentNPC(npc.id); setActivePage("npc"); }}
              style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, cursor: "pointer" }}>
              <Avatar initials={npc.avatar} size={32} isNPC={true} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: C.gold, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{npc.name}</div>
                <div style={{ color: C.textDim, fontSize: 11 }}>{(npc.followers / 1000).toFixed(1)}k followers</div>
              </div>
            </div>
          ))}
          <button style={{ width: "100%", background: "transparent", border: `1px solid ${C.goldBorder}`, borderRadius: 8, padding: "6px", color: C.gold, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>View All NPCs</button>
        </div>

        {/* Data promise */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>🔒 Our Promise</div>
          <div style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6 }}>Your personal data is never sold. Ads are based on games you play — nothing else.</div>
        </div>

        {/* Your games */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 12, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Your Games</div>
          {user.games.map(g => {
            const gData = Object.values(GAMES).find(x => x.name === g);
            return (
              <div key={g} onClick={() => { if (gData) { setCurrentGame(gData.id); setActivePage("game"); } }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", cursor: gData ? "pointer" : "default", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 15 }}>{gData?.icon || "🎮"}</span>
                <span style={{ color: C.textMuted, fontSize: 13 }}>{g}</span>
                {gData && <span style={{ marginLeft: "auto", color: C.textDim, fontSize: 11 }}>→</span>}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Main feed */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Composer */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: isMobile ? 12 : 16, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <Avatar initials={user.avatar} size={isMobile ? 32 : 38} status="online" founding={user.isFounding} ring={user.activeRing} />
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
                  {(isMobile ? ["⭐", "⚡"] : ["⭐ Review", "⚡ LFG"]).map((tag, i) => (
                    <button key={i} style={{ background: C.surfaceHover, border: `1px solid ${C.border}`, borderRadius: 6, padding: isMobile ? "6px 10px" : "4px 10px", color: C.textMuted, fontSize: isMobile ? 16 : 12, cursor: "pointer" }}>{tag}</button>
                  ))}
                </div>
                <button onClick={submitPost} disabled={posting || !postText.trim()} style={{ background: postText.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 20px", color: postText.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: postText.trim() ? "pointer" : "default", transition: "all 0.2s" }}>{posting ? "Posting..." : "Post"}</button>
              </div>
            </div>
          </div>
        </div>

        {livePosts.map(post => {
          const isNPC = !!post.npc_id;
          const author = isNPC ? post.npcs : post.profiles;
          if (!author) return null;
          return (
            <FeedPostCard key={post.id} post={{
              id: post.id,
              npc_id: post.npc_id,
              game_tag: post.game_tag,
              user: {
                name: author.name || author.username || "Gamer",
                handle: author.handle || "@gamer",
                avatar: author.avatar_initials || "GL",
                status: "online",
                isNPC: isNPC,
                isFounding: !isNPC && (author.is_founding || false),
              },
              content: post.content,
              time: timeAgo(post.created_at),
              likes: post.likes || 0,
              commentList: [],
            }} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={user} />
          );
        })}
        {FEED_POSTS.map(post => (
          <FeedPostCard key={post.id} post={post} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={user} />
        ))}
      </div>

      {/* Right sidebar — desktop only */}
      {!isMobile && (
      <div style={{ width: 210, flexShrink: 0 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Connect</div>
          {[
            { name: "Kai Nakamura", handle: "@kai_pro", avatar: "KN", mutual: 8, game: "Valorant" },
            { name: "Zoe Patel", handle: "@zoeplays", avatar: "ZP", mutual: 3, game: "Hollow Knight" },
            { name: "Dev Santos", handle: "@dev_games", avatar: "DS", mutual: 12, game: "Elden Ring" },
          ].map(p => (
            <div key={p.name} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <Avatar initials={p.avatar} size={34} />
                <div><div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{p.name}</div><div style={{ color: C.textDim, fontSize: 11 }}>{p.mutual} mutual · {p.game}</div></div>
              </div>
              <button style={{ width: "100%", background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "5px", color: C.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Connect</button>
            </div>
          ))}
        </div>

        {/* Trending across GuildLink */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>🔥 Trending</div>
          {[
            { tag: "SilksongRelease", game: "Hollow Knight", gameIcon: "🦋", posts: 8900, hot: true },
            { tag: "MaleniaBuild", game: "Elden Ring", gameIcon: "🗡️", posts: 4200, hot: true },
            { tag: "ValoBugReport", game: "Valorant", gameIcon: "🎯", posts: 2100, hot: false },
            { tag: "StardewUpdate", game: "Stardew Valley", gameIcon: "🌱", posts: 1840, hot: false },
            { tag: "SoulslikeOfTheYear", game: "All Games", gameIcon: "🎮", posts: 1200, hot: false },
          ].map((t, i) => (
            <div key={t.tag} style={{ paddingBottom: i < 4 ? 12 : 0, marginBottom: i < 4 ? 12 : 0, borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                <span style={{ color: C.accentSoft, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>#{t.tag}</span>
                {t.hot && <span style={{ fontSize: 10, color: C.red }}>🔥</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.textDim, fontSize: 11 }}>{t.gameIcon} {t.game}</span>
                <span style={{ color: C.textDim, fontSize: 11 }}>{(t.posts / 1000).toFixed(1)}k posts</span>
              </div>
            </div>
          ))}
        </div>

        {/* Active NPCs */}
        <div style={{ background: C.goldGlow, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 700, color: C.gold, fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>⚙ NPCs Online</div>
          {Object.values(NPCS).filter(n => n.status === "online").slice(0, 3).map(npc => (
            <div key={npc.id} onClick={() => { setCurrentNPC(npc.id); setActivePage("npc"); }}
              style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, cursor: "pointer" }}>
              <Avatar initials={npc.avatar} size={30} isNPC={true} status={npc.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: C.gold, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{npc.name}</div>
                <div style={{ color: C.textDim, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{npc.posts[0]?.content.slice(0, 30)}...</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
    </>
  );
}

// ─── GAMES BROWSE PAGE ────────────────────────────────────────────────────────

function GamesPage({ setActivePage, setCurrentGame, isMobile }) {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 6px", fontWeight: 800, fontSize: isMobile ? 20 : 26, color: C.text, letterSpacing: "-0.5px" }}>🎮 Game Communities</h2>
        <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>Find your people. Every game has a home here.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 32 }}>
        {Object.values(GAMES).map(game => (
          <div key={game.id} onClick={() => { setCurrentGame(game.id); setActivePage("game"); }}
            style={{ background: game.gradient, border: `1px solid ${game.color}33`, borderRadius: 16, padding: 24, cursor: "pointer", position: "relative", overflow: "hidden" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = game.color + "88"}
            onMouseLeave={e => e.currentTarget.style.borderColor = game.color + "33"}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>{game.icon}</div>
            <div style={{ fontWeight: 800, color: "#fff", fontSize: 20, marginBottom: 4 }}>{game.name}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 16 }}>{game.genre.join(" · ")}{game.year ? " · " + game.year : ""}</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div><div style={{ fontWeight: 700, color: game.color, fontSize: 15 }}>{(game.followers / 1000).toFixed(1)}k</div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Followers</div></div>
              <div><div style={{ fontWeight: 700, color: C.online, fontSize: 15 }}>{(game.activePlayers || 0).toLocaleString()}</div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Active today</div></div>
              <div><div style={{ fontWeight: 700, color: C.gold, fontSize: 15 }}>{game.reviewScore ? "★ " + game.reviewScore : "—"}</div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Score</div></div>
            </div>
            {game.claimed && <div style={{ position: "absolute", top: 16, right: 16 }}><Badge small color={C.teal}>✓ Dev Claimed</Badge></div>}
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 700, color: C.text, fontSize: 16, marginBottom: 14 }}>All Games</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10 }}>
        {BROWSE_GAMES.map(g => (
          <div key={g.id} onClick={() => { if (GAMES[g.id]) { setCurrentGame(g.id); setActivePage("game"); } }}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{g.icon}</div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 4 }}>{g.name}</div>
            <div style={{ color: C.textDim, fontSize: 11, marginBottom: 8 }}>{g.genre}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.textMuted, fontSize: 11 }}>{(g.followers / 1000).toFixed(1)}k</span>
              {g.hot && <Badge small color={C.red}>🔥 Hot</Badge>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GAME PAGE ────────────────────────────────────────────────────────────────

function GamePage({ gameId, setActivePage, setCurrentGame, isMobile }) {
  const hardcoded = GAMES[gameId];
  const [activeTab, setActiveTab] = useState("pulse");
  const [followed, setFollowed] = useState(false);
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
      }
      const { data } = await query.single();
      if (!data) return;
      setDbGame(data);
      const dbId = data.id;

      // Posts
      const { data: posts } = await supabase
        .from("posts")
        .select("*, profiles(username, handle, avatar_initials)")
        .eq("game_tag", dbId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (posts) setGamePosts(posts);

      // Top Voices — users with most likes on posts for this game
      const { data: voicePosts } = await supabase
        .from("posts")
        .select("user_id, likes, profiles(username, handle, avatar_initials, is_founding)")
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
    color: hardcoded?.color || C.accent,
    gradient: hardcoded?.gradient || `linear-gradient(135deg, #0a0c12 0%, #1a1c2e 100%)`,
    icon: hardcoded?.icon || "🎮",
    claimed: dbGame.is_claimed,
    id: gameId,
  } : hardcoded;

  if (!game) return (
    <div style={{ maxWidth: 800, margin: "100px auto", textAlign: "center", color: C.textMuted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>Loading...</div>
      <button onClick={() => setActivePage("games")} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>Browse Games</button>
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
                <button onClick={() => setFollowed(!followed)} style={{ background: followed ? `${game.color}33` : game.color, border: `1px solid ${game.color}`, borderRadius: 8, padding: "7px 18px", color: followed ? game.color : "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{followed ? "✓ Following" : "+ Follow"}</button>
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
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>📊 The Charts</div>
                  <span style={{ color: C.textDim, fontSize: 12 }}>This week</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
              return (
                <div key={post.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <Avatar initials={author.avatar_initials || "GL"} size={42} />
                    <div>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{author.username || "Gamer"}</div>
                      <div style={{ color: C.textDim, fontSize: 12 }}>{timeAgo(post.created_at)}</div>
                    </div>
                  </div>
                  <p style={{ color: C.text, fontSize: 14, lineHeight: 1.65, margin: 0 }}>{post.content}</p>
                </div>
              );
            }) : game.posts.length > 0 ? game.posts.map(post => (
              <div key={post.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <Avatar initials={post.user.avatar} size={42} status={post.user.status} />
                  <div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{post.user.name}</div>
                    <div style={{ color: C.textDim, fontSize: 12 }}>{post.time}</div>
                  </div>
                </div>
                <p style={{ color: C.text, fontSize: 14, lineHeight: 1.65, margin: 0 }}>{post.content}</p>
              </div>
            )) : (
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

function ProfilePage({ setActivePage, setCurrentGame, isMobile, currentUser }) {
  const user = currentUser || mockUser;
  const [activeTab, setActiveTab] = useState("posts");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", bio: "", games: "" });
  const [saving, setSaving] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [gameLibrary, setGameLibrary] = useState([]);
  const [postCount, setPostCount] = useState(0);
  const [postGameNames, setPostGameNames] = useState({});
  const [userShelf, setUserShelf] = useState({ want_to_play: [], playing: [], have_played: [] });
  const [dragging, setDragging] = useState(null); // { gameId, fromStatus }
  const [dragOver, setDragOver] = useState(null); // status column being hovered
  const [addingGame, setAddingGame] = useState(false);
  const [gameSearch, setGameSearch] = useState("");
  const [gameSearchResults, setGameSearchResults] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Real posts
      const { data: posts } = await supabase
        .from("posts")
        .select("*, profiles(username, handle, avatar_initials)")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (posts) {
        setUserPosts(posts);
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
    };
    load();
  }, []);

  const startEdit = () => {
    setEditForm({
      username: user.name || "",
      bio: user.bio || "",
      games: Array.isArray(user.games) ? user.games.join(", ") : user.games || "",
    });
    setEditing(true);
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
    };
    const { error } = await supabase.from("profiles").update(updates).eq("id", authUser.id);
    if (!error) { setEditing(false); window.location.reload(); }
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
      setUserShelf(prev => {
        // Remove from any existing status first
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

  const achievements = [
    { icon: "🏆", name: "Top 500", desc: "Overwatch 2 Season 12", color: C.gold },
    { icon: "💎", name: "Radiant", desc: "Valorant Act 3", color: C.purple },
    { icon: "🔥", name: "Elden Lord", desc: "Elden Ring NG+5", color: C.red },
    { icon: "⭐", name: "Speedrunner", desc: "Hollow Knight sub-30m", color: C.green },
    { icon: "🎯", name: "Sharpshooter", desc: "95%+ HS rate", color: C.accent },
    { icon: "⚡", name: "Early Adopter", desc: "GuildLink Beta", color: C.teal },
  ];

  const tabs = [
    { id: "posts", label: `Posts${postCount > 0 ? ` (${postCount})` : ""}` },
    { id: "games", label: `Games${gameLibrary.length > 0 ? ` (${gameLibrary.length})` : ""}` },
    { id: "reviews", label: `Reviews${userReviews.length > 0 ? ` (${userReviews.length})` : ""}` },
    { id: "achievements", label: "Achievements" },
    { id: "quests", label: "Quests" },
    { id: "rings", label: "Rings" },
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
            <button onClick={startEdit} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 22px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Edit Profile</button>
          </div>

          {editing && (
            <div style={{ marginTop: 20, background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 16 }}>Edit Profile</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 4 }}>Display Name</div>
                <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 4 }}>Bio</div>
                <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell people who you are..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", resize: "none", minHeight: 72, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveProfile} disabled={saving} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => setEditing(false)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 20px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: "flex", gap: 24, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}`, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: "Posts", val: postCount || 0, color: C.accent },
              { label: "Reviews", val: userReviews.length, color: C.teal },
              { label: "Games", val: userShelf.want_to_play.length + userShelf.playing.length + userShelf.have_played.length || gameLibrary.length, color: C.gold },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
                <div style={{ color: C.textDim, fontSize: 12 }}>{s.label}</div>
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
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: activeTab === tab.id ? C.accentGlow : "transparent", border: activeTab === tab.id ? `1px solid ${C.accentDim}` : "1px solid transparent", borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: activeTab === tab.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{tab.label}</button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === "posts" && (
        <div>
          {userPosts.length > 0 ? userPosts.map(post => (
            <div key={post.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
              <p style={{ color: C.text, fontSize: 14, lineHeight: 1.65, margin: "0 0 10px", textAlign: "left" }}>{post.content}</p>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {post.game_tag && (
                  <span style={{ color: C.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer" }} onClick={() => { setCurrentGame(post.game_tag); setActivePage("game"); }}>
                    {postGameNames[post.game_tag] || gameLibrary.find(g => g.id === post.game_tag)?.name || "Tagged game"}
                  </span>
                )}
                <span style={{ color: C.textDim, fontSize: 12 }}>❤️ {post.likes || 0} · {timeAgo(post.created_at)}</span>
              </div>
            </div>
          )) : (
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
            <button onClick={() => setAddingGame(a => !a)} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "7px 16px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Game</button>
          </div>

          {/* Search to add */}
          {addingGame && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16, position: "relative" }}>
              <input
                autoFocus
                value={gameSearch}
                onChange={e => searchGames(e.target.value)}
                placeholder="Search for a game to add..."
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
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
            {SHELF_COLUMNS.map(col => (
              <div key={col.id}
                onDragOver={e => handleDragOver(e, col.id)}
                onDrop={e => handleDrop(e, col.id)}
                style={{ background: dragOver === col.id ? `${col.color}11` : C.surface, border: `1px solid ${dragOver === col.id ? col.color + "66" : col.color + "33"}`, borderRadius: 14, padding: 14, minHeight: 200, transition: "all 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, color: col.color, fontSize: 13 }}>{col.label}</div>
                  <div style={{ background: `${col.color}22`, color: col.color, borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{userShelf[col.id].length}</div>
                </div>
                {userShelf[col.id].length > 0 ? userShelf[col.id].map(entry => {
                  const game = entry.games;
                  if (!game) return null;
                  const hardcoded = GAMES[game.id] || Object.values(GAMES).find(g => g.name === game.name);
                  const review = userReviews.find(r => r.game_id === game.id);
                  return (
                    <div key={entry.game_id}
                      draggable
                      onDragStart={() => handleDragStart(entry.game_id, col.id)}
                      onClick={() => { setCurrentGame(game.id); setActivePage("game"); }}
                      style={{ background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "grab", userSelect: "none", opacity: dragging?.gameId === entry.game_id ? 0.5 : 1 }}>
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
                  <div style={{ textAlign: "center", padding: "30px 10px", color: C.textDim, fontSize: 12, borderRadius: 8, border: `1px dashed ${col.color}33` }}>
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

      {/* Achievements */}
      {activeTab === "achievements" && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14 }}>
          {achievements.map(a => (
            <div key={a.name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{a.icon}</div>
              <div style={{ fontWeight: 700, color: a.color, fontSize: 14 }}>{a.name}</div>
              <div style={{ color: C.textDim, fontSize: 12, marginTop: 4 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quests */}
      {activeTab === "quests" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {QUESTS.map(quest => (
            <div key={quest.id} style={{ background: C.surface, border: `1px solid ${quest.done ? C.green + "44" : C.border}`, borderRadius: 14, padding: 20, display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: quest.done ? `${C.green}22` : C.surfaceRaised, border: `1px solid ${quest.done ? C.green + "44" : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {quest.done ? "✓" : "🎯"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontWeight: 700, color: quest.done ? C.green : C.text, fontSize: 14 }}>{quest.title}</span>
                  {quest.ring && <span style={{ background: PROFILE_RINGS.find(r => r.id === quest.ring)?.color + "22", color: PROFILE_RINGS.find(r => r.id === quest.ring)?.color, border: `1px solid ${PROFILE_RINGS.find(r => r.id === quest.ring)?.color}44`, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>RING</span>}
                </div>
                <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>{quest.desc}</div>
                <div style={{ height: 5, background: C.surfaceRaised, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min((quest.progress / quest.total) * 100, 100)}%`, background: quest.done ? C.green : C.accent, borderRadius: 3 }} />
                </div>
                <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>{quest.progress}{quest.unit ? " " + quest.unit : ""} / {quest.total}{quest.unit ? " " + quest.unit : ""}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ color: quest.done ? C.green : C.textMuted, fontSize: 12, fontWeight: 700 }}>{quest.reward}</div>
                {quest.done && <div style={{ color: C.green, fontSize: 11, marginTop: 4 }}>Claimed ✓</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rings */}
      {activeTab === "rings" && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 4 }}>Active Ring</div>
            <div style={{ color: C.textDim, fontSize: 13, marginBottom: 16 }}>Your ring shows on your avatar everywhere on GuildLink.</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar initials={user.avatar} size={56} founding={user.isFounding} ring={user.activeRing} />
              <div>
                <div style={{ fontWeight: 700, color: C.gold, fontSize: 15 }}>{PROFILE_RINGS.find(r => r.id === user.activeRing)?.label}</div>
                <div style={{ color: C.textDim, fontSize: 13 }}>{PROFILE_RINGS.find(r => r.id === user.activeRing)?.description}</div>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12 }}>
            {PROFILE_RINGS.map(ring => (
              <div key={ring.id} style={{ background: C.surface, border: `1px solid ${ring.unlocked ? ring.color + "44" : C.border}`, borderRadius: 14, padding: 18, opacity: ring.unlocked ? 1 : 0.6, position: "relative" }}>
                {ring.special && <div style={{ position: "absolute", top: 12, right: 12 }}><Badge small color={C.gold}>Exclusive</Badge></div>}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <div style={{ position: "relative", width: 44, height: 44 }}>
                    {ring.id !== "none" && <div style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `3px solid ${ring.color}`, boxShadow: `0 0 12px ${ring.glow || ring.color + "44"}` }} />}
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${ring.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      {ring.id === "none" ? "○" : ring.id === "founding" ? "⚔️" : ring.id === "platinum" ? "📝" : ring.id === "crimson" ? "🏆" : ring.id === "void" ? "💯" : ring.id === "emerald" ? "🤝" : ring.id === "celestial" ? "⭐" : "🕯️"}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: ring.unlocked ? ring.color : C.textMuted, fontSize: 13, marginBottom: 4, textAlign: "center" }}>{ring.label}</div>
                <div style={{ color: C.textDim, fontSize: 11, textAlign: "center", lineHeight: 1.5 }}>{ring.unlocked ? ring.description : ring.how}</div>
                {ring.unlocked && ring.id !== "none" && (
                  <button style={{ width: "100%", marginTop: 10, background: ring.id === user.activeRing ? `${ring.color}22` : "transparent", border: `1px solid ${ring.color}44`, borderRadius: 8, padding: "6px", color: ring.id === user.activeRing ? ring.color : C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {ring.id === user.activeRing ? "Active ✓" : "Equip"}
                  </button>
                )}
                {!ring.unlocked && <div style={{ marginTop: 10, textAlign: "center", color: C.textDim, fontSize: 11 }}>🔒 Locked</div>}
              </div>
            ))}
          </div>
          {!user.isFounding && (
            <div style={{ marginTop: 16, background: C.goldGlow, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, color: C.gold, fontSize: 14, marginBottom: 4 }}>Want the Founding Ring?</div>
                <div style={{ color: C.textDim, fontSize: 13 }}>The only ring you can't earn through quests. Founding members only.</div>
              </div>
              <button onClick={() => setActivePage("founding")} style={{ background: `linear-gradient(135deg, ${C.gold}, #d97706)`, border: "none", borderRadius: 8, padding: "8px 18px", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>Become a Founding Member</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SQUAD PAGE ───────────────────────────────────────────────────────────────

function SquadPage({ isMobile }) {
  const [filter, setFilter] = useState("All");
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>
      <h2 style={{ margin: "0 0 6px", fontWeight: 800, fontSize: isMobile ? 20 : 24, color: C.text }}>⚡ Find Your Squad</h2>
      <p style={{ margin: "0 0 20px", color: C.textMuted, fontSize: 14 }}>Connect with players who match your style and rank.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["All", "Valorant", "Overwatch 2", "Elden Ring"].map(g => (
          <button key={g} onClick={() => setFilter(g)} style={{ background: filter === g ? C.accentGlow : C.surface, border: `1px solid ${filter === g ? C.accentDim : C.border}`, borderRadius: 8, padding: "7px 16px", cursor: "pointer", color: filter === g ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: 600 }}>{g}</button>
        ))}
        <button style={{ marginLeft: "auto", background: C.accent, border: "none", borderRadius: 8, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Post LFG</button>
      </div>
      {squadPosts.filter(p => filter === "All" || p.game === filter).map(post => (
        <div key={post.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, display: "flex", gap: 18, marginBottom: 12 }}>
          <Avatar initials={post.user.avatar} size={46} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{post.user.name}</span>
              <Badge color={C.accent}>{post.gameIcon} {post.game}</Badge>
              <Badge color={C.textMuted} small>{post.rank}</Badge>
              <span style={{ color: C.textDim, fontSize: 12, marginLeft: "auto" }}>{post.time}</span>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
              <span style={{ color: C.textDim, fontSize: 13 }}>Looking for <strong style={{ color: C.text }}>{post.looking}</strong></span>
              <span style={{ color: C.textDim, fontSize: 13 }}>Style: <strong style={{ color: C.text }}>{post.style}</strong></span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {post.tags.map(tag => <Badge key={tag} small color={C.textMuted}>{tag}</Badge>)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Join</button>
            <button style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 20px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Profile</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handle = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account, then log in.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,900&display=swap'); * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }"}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #6c63ff, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, fontWeight: 900, color: "#fff" }}>GL</div>
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
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Email</div>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Password</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} onKeyDown={e => e.key === "Enter" && handle()} />
          </div>
          {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          {message && <div style={{ color: C.green, fontSize: 13, marginBottom: 16 }}>{message}</div>}
          <button onClick={handle} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            {loading ? "..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PLAYER PROFILE PAGE ──────────────────────────────────────────────────────

function PlayerProfilePage({ userId, setActivePage, setCurrentGame, setCurrentPlayer, isMobile, currentUser }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [shelf, setShelf] = useState({ want_to_play: [], playing: [], have_played: [] });
  const [postGameNames, setPostGameNames] = useState({});
  const [activeTab, setActiveTab] = useState("posts");
  const [compatibility, setCompatibility] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);

      // Profile
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (prof) setProfile(prof);

      // Posts
      const { data: userPosts } = await supabase
        .from("posts").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(20);
      if (userPosts) {
        setPosts(userPosts);
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
    };
    load();
  }, [userId]);

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
        <div style={{ height: 150, background: `linear-gradient(135deg, #1a1040 0%, ${C.accent}66 50%, #0a2040 100%)`, position: "relative" }}>
          <div style={{ position: "absolute", bottom: -36, left: 28 }}>
            <Avatar initials={profile.avatar_initials || profile.username?.slice(0,2).toUpperCase() || "??"} size={84} status="online" />
          </div>
        </div>
        <div style={{ padding: "48px 28px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontWeight: 800, color: C.text, fontSize: 22 }}>{profile.username}</h1>
                {profile.level && <Badge color={C.gold}>Lv.{profile.level}</Badge>}
              </div>
              <div style={{ color: C.textMuted, fontSize: 13, margin: "4px 0" }}>{profile.handle}</div>
              {profile.bio && <p style={{ color: C.textMuted, fontSize: 13, margin: "8px 0 0", maxWidth: 480, lineHeight: 1.6 }}>{profile.bio}</p>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              {!isOwnProfile && (
                <button style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 22px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Follow
                </button>
              )}
              {compatibilityText && (
                <div style={{ background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: "6px 12px", color: C.accentSoft, fontSize: 12, fontWeight: 600, maxWidth: 240, textAlign: "right" }}>
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
          {posts.length > 0 ? posts.map(post => (
            <div key={post.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
              <p style={{ color: C.text, fontSize: 14, lineHeight: 1.65, margin: "0 0 10px", textAlign: "left" }}>{post.content}</p>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {post.game_tag && (
                  <span style={{ color: C.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    onClick={() => { setCurrentGame(post.game_tag); setActivePage("game"); }}>
                    {postGameNames[post.game_tag] || "Tagged game"}
                  </span>
                )}
                <span style={{ color: C.textDim, fontSize: 12 }}>❤️ {post.likes || 0} · {timeAgo(post.created_at)}</span>
              </div>
            </div>
          )) : (
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


export default function GuildLink() {
  const [activePage, setActivePage] = useState("feed");
  const [currentGame, setCurrentGame] = useState("elden-ring");
  const [currentNPC, setCurrentNPC] = useState("merv");
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const width = useWindowSize();
  const isMobile = width < 768;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) fetchProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.textMuted, fontSize: 14 }}>Loading...</div>
    </div>
  );

  if (!session) return <AuthPage />;

  const liveUser = profile ? {
    name: profile.username || "Gamer",
    handle: profile.handle || "@gamer",
    avatar: profile.avatar_initials || "GL",
    level: profile.level || 1,
    xp: profile.xp || 0,
    xpNext: 1000,
    title: profile.bio || "New to GuildLink",
    location: "",
    connections: 0,
    followers: 0,
    bio: profile.bio || "",
    games: profile.games ? profile.games.split(",") : [],
    status: "online",
    isFounding: profile.is_founding || false,
    activeRing: profile.active_ring || "none",
  } : mockUser;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&display=swap');
        * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0a0c12; }
        ::-webkit-scrollbar-thumb { background: #252836; border-radius: 3px; }
        button { font-family: 'DM Sans', sans-serif; transition: opacity 0.15s; }
        button:hover { opacity: 0.85; }
        input, textarea { font-family: 'DM Sans', sans-serif !important; }
        textarea::placeholder, input::placeholder { color: #4a4d63; }
        @keyframes pulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
        ::-webkit-scrollbar { display: ${isMobile ? "none" : "block"}; }
      `}</style>
      <NavBar activePage={activePage} setActivePage={setActivePage} isMobile={isMobile} signOut={signOut} currentUser={liveUser} />
      {activePage === "feed" && <FeedPage setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={liveUser} />}
      {activePage === "games" && <GamesPage setActivePage={setActivePage} setCurrentGame={setCurrentGame} isMobile={isMobile} />}
      {activePage === "game" && <GamePage gameId={currentGame} setActivePage={setActivePage} setCurrentGame={setCurrentGame} isMobile={isMobile} />}
      {activePage === "npc" && <NPCProfilePage npcId={currentNPC} setActivePage={setActivePage} setCurrentNPC={setCurrentNPC} setCurrentGame={setCurrentGame} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={liveUser} />}
      {activePage === "npcs" && <NPCBrowsePage setActivePage={setActivePage} setCurrentNPC={setCurrentNPC} />}
      {activePage === "profile" && <ProfilePage setActivePage={setActivePage} setCurrentGame={setCurrentGame} isMobile={isMobile} currentUser={liveUser} />}
      {activePage === "player" && <PlayerProfilePage userId={currentPlayer} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={liveUser} />}
      {activePage === "squad" && <SquadPage isMobile={isMobile} />}
      {activePage === "founding" && <FoundingMemberPage setActivePage={setActivePage} isMobile={isMobile} />}
    </div>
  );
}
