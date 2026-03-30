import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, NPCS, FOUNDING } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo, logChartEvent } from "../utils.js";
import { Avatar } from "../components/Avatar.jsx";
import { FeedPostCard, renderPostContent } from "../components/FeedPostCard.jsx";
import { ShelfPulseCard, ReviewSpotlightCard } from "../components/PulseCards.jsx";
import { ChartsWidget } from "../components/Charts.jsx";

function decodeHtml(str) {
  if (!str) return str;
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

function InviteModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 20, padding: 32, maxWidth: 400, width: "100%" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>⚔️</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 6, textAlign: "center" }}>Invite a Friend</div>
        <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 24, textAlign: "center" }}>
          {FOUNDING.total - FOUNDING.claimed} founding spots left. Invite someone and they'll claim one before it's gone — along with a permanent gold founder ring.
        </div>
        {sent ? (
          <div style={{ background: C.green + "15", border: "1px solid " + C.green + "44", borderRadius: 12, padding: "16px", textAlign: "center" }}>
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
              style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
            />
            <button
              onClick={() => { if (email.includes("@")) setSent(true); }}
              style={{ width: "100%", background: "linear-gradient(135deg, " + C.gold + ", #d97706)", border: "none", borderRadius: 10, padding: "12px", color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 10 }}>
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
        background: "linear-gradient(135deg, #1a1200, #2d2000)",
        border: "1px solid " + C.goldBorder,
        borderRadius: 12, padding: isMobile ? "12px 14px" : "14px 18px", marginBottom: 14,
        display: "flex", alignItems: "center", gap: isMobile ? 10 : 16, flexWrap: isMobile ? "wrap" : "nowrap",
        boxShadow: "0 0 0 1px " + C.goldGlow,
        position: "relative",
      }}>
        <div style={{ fontSize: isMobile ? 20 : 24, flexShrink: 0 }}>⚔️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, color: C.gold, fontSize: isMobile ? 12 : 13 }}>
              {isGuest ? "Founding membership is free — for now." : "Founding spots are almost gone."}
            </span>
            <span style={{ background: C.goldGlow, color: C.gold, border: "1px solid " + C.goldBorder, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>
              {spotsLeft.toLocaleString()} left
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 4, maxWidth: 280 }}>
            <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg, " + C.gold + "88, " + C.gold + ")", borderRadius: 2, transition: "width 0.6s ease" }} />
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
              style={{ background: "linear-gradient(135deg, " + C.gold + ", #d97706)", border: "none", borderRadius: 8, padding: isMobile ? "7px 14px" : "8px 18px", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              Claim Your Spot
            </button>
          ) : (
            <>
              <button onClick={() => setShowInvite(true)}
                style={{ background: "linear-gradient(135deg, " + C.gold + ", #d97706)", border: "none", borderRadius: 8, padding: isMobile ? "7px 14px" : "8px 18px", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                Invite a Friend
              </button>
              <button onClick={() => setActivePage("founding")}
                style={{ background: "transparent", border: "1px solid " + C.goldBorder, borderRadius: 8, padding: isMobile ? "7px 12px" : "8px 14px", color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
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

function FeedPage({ activePage, setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, isMobile, currentUser, isGuest, onSignIn, setProfileDefaultTab, onQuestTrigger, onExit }) {
  const user = currentUser;
  const [showBanner, setShowBanner] = useState(false);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [chartRefresh, setChartRefresh] = useState(0);
  const [livePosts, setLivePosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [pulseCards, setPulseCards] = useState([]);
  const [guestFeedDone, setGuestFeedDone] = useState(false);
  const [linkPreview, setLinkPreview] = useState(null); // { allowed, url, title, description, image, domain } | null
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const [linkWarning, setLinkWarning] = useState(null); // domain string if not allowed
  const [exitUrl, setExitUrl] = useState(null); // url for interstitial modal
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
  const [taggedUsers, setTaggedUsers] = useState([]); // {id, handle, name, type: 'user'|'npc'}
  const [mentionIndex, setMentionIndex] = useState(0);
  const [dbGames, setDbGames] = useState({}); // id -> game object cache
  const [dailyPrompt, setDailyPrompt] = useState(null);
  const [sidebarNPCs, setSidebarNPCs] = useState([]);
  const textareaRef = useRef(null); // array of game ids, max 3

  const URL_REGEX = /https?:\/\/[^\s<>"]+/gi;
  let linkPreviewDebounce = null;

  const fetchLinkPreview = async (url) => {
    setLinkPreviewLoading(true);
    setLinkWarning(null);
    try {
      const res = await fetch("/api/link-preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.allowed) {
        setLinkPreview(null);
        setLinkWarning(data.domain || "this domain");
      } else {
        setLinkPreview(data);
        setLinkWarning(null);
      }
    } catch {
      setLinkPreview(null);
    }
    setLinkPreviewLoading(false);
  };

  const handlePostTextChange = async (e) => {
    const val = e.target.value;
    setPostText(val);

    // URL detection
    const urls = val.match(URL_REGEX);
    const firstUrl = urls?.[0];
    if (firstUrl) {
      if (linkPreviewDebounce) clearTimeout(linkPreviewDebounce);
      linkPreviewDebounce = setTimeout(() => fetchLinkPreview(firstUrl), 600);
    } else {
      setLinkPreview(null);
      setLinkWarning(null);
    }

    const atMatch = val.match(/@([^@]*)$/);
    if (atMatch) {
      const query = atMatch[1].trim();
      if (query.length < 2) {
        setMentionResults([]);
        setMentionQuery(query);
        setMentionIndex(0);
      } else {
        // Search games, players, and NPCs in parallel
        const [localRes, igdbRes, playersRes, npcsRes] = await Promise.allSettled([
          supabase.from("games").select("id, name, followers, igdb_id, cover_url, genre").ilike("name", `%${query}%`).order("followers", { ascending: false }).limit(4),
          fetch("/api/igdb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) }).then(r => r.json()).catch(() => ({ games: [] })),
          supabase.from("profiles").select("id, username, handle, avatar_initials").or(`username.ilike.%${query}%,handle.ilike.%${query}%`).limit(3),
          supabase.from("npcs").select("id, name, handle, avatar_initials").or(`name.ilike.%${query}%,handle.ilike.%${query}%`).eq("is_active", true).limit(3),
        ]);
        const localGames = localRes.status === "fulfilled" ? (localRes.value.data || []) : [];
        const igdbGames = igdbRes.status === "fulfilled" ? (igdbRes.value.games || []) : [];
        const localNames = new Set(localGames.map(g => g.name.toLowerCase()));
        const newFromIGDB = igdbGames.filter(g => !localNames.has(g.name.toLowerCase())).map(g => ({ ...g, _fromIGDB: true }));
        const players = (playersRes.status === "fulfilled" ? (playersRes.value.data || []) : []).map(p => ({ ...p, _type: "player" }));
        const npcs = (npcsRes.status === "fulfilled" ? (npcsRes.value.data || []) : []).map(n => ({ ...n, _type: "npc" }));
        setMentionResults([...players, ...npcs, ...localGames, ...newFromIGDB].slice(0, 10));
        setMentionQuery(query);
        setMentionIndex(0);
      }
    } else {
      setMentionQuery(null);
      setMentionResults([]);
      setMentionIndex(0);
    }
  };

  const addGameFromIGDB = async (game) => {
    // Insert IGDB game into our games table
    const { data, error } = await supabase.from("games").insert({
      name: game.name,
      genre: game.genre,
      summary: game.summary,
      cover_url: game.cover_url,
      igdb_id: game.igdb_id,
      first_release_date: game.first_release_date,
      followers: 0,
    }).select().single();
    if (error) { console.error("[addGameFromIGDB]", error); return null; }
    return data;
  };

  const handlePostKeyDown = (e) => {
    if (mentionResults.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && mentionResults.length > 0) { e.preventDefault(); selectMention(mentionResults[mentionIndex]); }
    else if (e.key === "Escape") { setMentionResults([]); setMentionQuery(null); }
  };

  const selectMention = async (item) => {
    if (item._type === "player") {
      const handle = item.handle?.replace("@", "") || item.username;
      const newText = postText.replace(/@([^@]*)$/, `@${handle} `);
      setPostText(newText);
      setTaggedUsers(prev => {
        if (prev.find(u => u.id === item.id)) return prev;
        return [...prev, { id: item.id, handle: item.handle, name: item.username, type: "user" }];
      });
      setMentionQuery(null); setMentionResults([]); setMentionIndex(0);
      setTimeout(() => textareaRef.current?.focus(), 0);
      return;
    }
    if (item._type === "npc") {
      const handle = item.handle?.replace("@", "") || item.name.replace(/\s+/g, "");
      const newText = postText.replace(/@([^@]*)$/, `@${handle} `);
      setPostText(newText);
      setTaggedUsers(prev => {
        if (prev.find(u => u.id === item.id)) return prev;
        return [...prev, { id: item.id, handle: item.handle, name: item.name, type: "npc" }];
      });
      setMentionQuery(null); setMentionResults([]); setMentionIndex(0);
      setTimeout(() => textareaRef.current?.focus(), 0);
      return;
    }
    // Game
    let resolvedGame = item;
    if (item._fromIGDB) {
      const inserted = await addGameFromIGDB(item);
      if (!inserted) return;
      resolvedGame = inserted;
    }
    const newText = postText.replace(/@([^@]*)$/, "@" + resolvedGame.name.replace(/\s+/g, "") + " ");
    setPostText(newText);
    setTaggedGames(prev => {
      if (prev.includes(resolvedGame.id) || prev.length >= 3) return prev;
      return [...prev, resolvedGame.id];
    });
    setDbGames(prev => ({ ...prev, [resolvedGame.id]: resolvedGame }));
    setMentionQuery(null); setMentionResults([]); setMentionIndex(0);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const removeTaggedGame = (gameId) => {
    setTaggedGames(prev => prev.filter(id => id !== gameId));
  };
  const topPad = isMobile ? "60px 16px 0" : "80px 20px 0";
  const mainPad = isMobile ? "14px 16px 80px" : "14px 20px 40px";

  useEffect(() => {
    loadPosts();
    loadPulseCards();
    loadDailyPrompt();
    loadSidebarNPCs();
    if (!isGuest) {
      loadFollowing();
      loadPlayingGames();
      loadFollowedGames();
      loadSuggestedGamers();
    }
  }, []);

  const loadDailyPrompt = async () => {
    const { data } = await supabase.from("daily_prompts").select("id, question, sort_order").order("sort_order", { ascending: true });
    if (!data || data.length === 0) return;
    const dayIndex = Math.floor(Date.now() / 86400000);
    setDailyPrompt(data[dayIndex % data.length]);
  };

  const loadSidebarNPCs = async () => {
    const { data } = await supabase.from("npcs").select("id, name, handle, avatar_initials, status, role").eq("is_active", true);
    if (!data || data.length === 0) return;
    // Pick 4 random NPCs
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    setSidebarNPCs(shuffled.slice(0, 4));
  };

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
      .select("games(id, name, genre, cover_url)")
      .eq("user_id", user.id)
      .eq("status", "playing");
    if (data) setPlayingGames(data.map(d => d.games).filter(Boolean));
  };

  const loadFollowedGames = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("follows")
      .select("games(id, name, genre, cover_url)")
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
    const [{ data }, likesResult] = await Promise.all([
      supabase
        .from("posts")
        .select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring, avatar_config), comments(id)")
        .in("user_id", followedIds)
        .is("npc_id", null)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("post_likes").select("post_id").eq("user_id", user.id),
    ]);
    const likedIds = new Set((likesResult.data || []).map(l => l.post_id));
    if (data) setFollowingPosts(data.map(p => ({ ...p, comment_count: p.comments?.length || 0, liked: likedIds.has(p.id) })));
  };

  const resolveMentionsInPosts = async (posts) => {
    const allHandles = new Set();
    posts.forEach(p => {
      const matches = (p.content || "").match(/@(\S+)/g) || [];
      matches.forEach(m => allHandles.add(m.slice(1).toLowerCase()));
    });
    if (allHandles.size === 0) return posts;
    const handleList = [...allHandles];
    const [profilesRes, npcsRes] = await Promise.allSettled([
      supabase.from("profiles").select("id, username, handle").or(handleList.map(h => `handle.ilike.@${h}`).join(",")),
      supabase.from("npcs").select("id, name, handle").or(handleList.map(h => `handle.ilike.@${h}`).join(",")),
    ]);
    const resolved = {};
    (profilesRes.status === "fulfilled" ? profilesRes.value.data || [] : []).forEach(p => {
      resolved[p.handle.replace("@","").toLowerCase()] = { id: p.id, handle: p.handle, name: p.username, type: "user" };
    });
    (npcsRes.status === "fulfilled" ? npcsRes.value.data || [] : []).forEach(n => {
      resolved[n.handle.replace("@","").toLowerCase()] = { id: n.id, handle: n.handle, name: n.name, type: "npc" };
    });
    return posts.map(p => {
      const existing = p.tagged_users || [];
      const existingHandles = new Set(existing.map(u => u.handle?.replace("@","").toLowerCase()));
      const matches = (p.content || "").match(/@(\S+)/g) || [];
      const extra = matches.map(m => resolved[m.slice(1).toLowerCase()]).filter(u => u && !existingHandles.has(u.handle.replace("@","").toLowerCase()));
      return extra.length ? { ...p, tagged_users: [...existing, ...extra] } : p;
    });
  };

  const PULSE_FREQUENCY = 3;

  const loadPulseCards = async () => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const cards = [];
    let followIds = [];
    let followNames = {};
    if (currentUser?.id) {
      const { data: follows } = await supabase.from("follows")
        .select("followed_user_id, profiles!follows_followed_user_id_fkey(username)")
        .eq("follower_id", currentUser.id);
      (follows || []).forEach(f => {
        if (!f.followed_user_id) return;
        followIds.push(f.followed_user_id);
        if (f.profiles?.username) followNames[f.followed_user_id] = f.profiles.username;
      });
    }

    // 1. want_to_play → playing transitions from history
    const { data: transitions } = await supabase
      .from("user_games_history")
      .select("user_id, game_id, changed_at, games(id, name, cover_url), profiles(id, username)")
      .eq("from_status", "want_to_play").eq("to_status", "playing")
      .gte("changed_at", since).order("changed_at", { ascending: false }).limit(30);
    if (transitions?.length) {
      const byGame = {};
      transitions.forEach(t => {
        if (!t.games) return;
        if (!byGame[t.game_id]) byGame[t.game_id] = { game: t.games, users: [], followUsers: [] };
        byGame[t.game_id].users.push(t.user_id);
        if (followIds.includes(t.user_id)) byGame[t.game_id].followUsers.push(t.profiles?.username || "Someone you follow");
      });
      Object.values(byGame).slice(0, 3).forEach(({ game, users, followUsers }) => {
        const actor = followUsers[0] || null;
        const count = users.length;
        cards.push({ type: "shelf_pulse", id: "transition_" + game.id, game,
          text: actor ? `${actor} started playing ${game.name}` : count === 1 ? `A player started playing ${game.name}` : `${count} players started playing ${game.name}`,
          cta: "Are you playing it too?", ctaStatus: "playing", hasFollow: followUsers.length > 0, priority: followUsers.length > 0 ? 3 : 1 });
      });
    }

    // 2. Shelf activity by game + status
    const { data: shelfActivity } = await supabase
      .from("user_games")
      .select("game_id, status, user_id, created_at, games(id, name, cover_url), profiles(id, username)")
      .gte("created_at", since).in("status", ["playing", "have_played", "want_to_play"])
      .order("created_at", { ascending: false }).limit(150);
    if (shelfActivity?.length) {
      const byGameStatus = {};
      shelfActivity.forEach(s => {
        if (!s.games) return;
        const key = s.game_id + "_" + s.status;
        if (!byGameStatus[key]) byGameStatus[key] = { game: s.games, status: s.status, count: 0, followUsers: [] };
        byGameStatus[key].count++;
        if (followIds.includes(s.user_id)) byGameStatus[key].followUsers.push(s.profiles?.username || followNames[s.user_id] || "Someone you follow");
      });
      Object.values(byGameStatus)
        .sort((a, b) => (b.followUsers.length > 0 ? 1 : 0) - (a.followUsers.length > 0 ? 1 : 0) || b.count - a.count)
        .slice(0, 8).forEach(({ game, status, count, followUsers }) => {
          const actor = followUsers.length === 1 ? followUsers[0] : null;
          let text, cta, ctaStatus;
          if (status === "playing") {
            text = actor ? `${actor} is currently playing ${game.name}` : count === 1 ? `A player is currently playing ${game.name}` : `${count} players are currently playing ${game.name}`;
            cta = actor ? "Update your shelf" : "What are you playing?"; ctaStatus = "playing";
          } else if (status === "want_to_play") {
            text = actor ? `${actor} wants to play ${game.name}` : count === 1 ? `A player wants to play ${game.name}` : `${count} players want to play ${game.name}`;
            cta = "Want to play?"; ctaStatus = "want_to_play";
          } else {
            text = actor ? `${actor} has ${game.name} on their shelf` : count === 1 ? `A player has played ${game.name}` : `${count} players have played ${game.name}`;
            cta = "Have you?"; ctaStatus = "have_played";
          }
          cards.push({ type: "shelf_pulse", id: "shelf_" + game.id + "_" + status, game, text, cta, ctaStatus, hasFollow: followUsers.length > 0, priority: followUsers.length > 0 ? 2 : 1 });
        });
    }

    // 3. Games with shelves but no reviews (min 3 shelf entries)
    const { data: shelfCounts } = await supabase.from("user_games").select("game_id, games(id, name, cover_url)").in("status", ["have_played", "playing"]).limit(200);
    if (shelfCounts?.length) {
      const counts = {};
      shelfCounts.forEach(s => { if (!s.games) return; if (!counts[s.game_id]) counts[s.game_id] = { game: s.games, count: 0 }; counts[s.game_id].count++; });
      const { data: reviewed } = await supabase.from("reviews").select("game_id");
      const reviewedIds = new Set((reviewed || []).map(r => r.game_id));
      Object.values(counts).filter(({ game, count }) => count >= 3 && !reviewedIds.has(game.id)).sort((a, b) => b.count - a.count).slice(0, 2).forEach(({ game }) => {
        cards.push({ type: "shelf_pulse", id: "no_review_" + game.id, game, text: `${game.name} is on several players' shelves, but no reviews yet`, cta: "Write a review", ctaStatus: "review", hasFollow: false, priority: 1 });
      });
    }

    // 4. Recent reviews
    const { data: recentReviews } = await supabase.from("reviews")
      .select("id, rating, headline, content, game_id, user_id, created_at, games(id, name, cover_url), profiles(id, username, avatar_initials, avatar_config, active_ring, is_founding)")
      .gte("created_at", since).order("created_at", { ascending: false }).limit(8);
    if (recentReviews?.length) {
      const byGame = {};
      recentReviews.forEach(r => {
        if (!r.games || !r.profiles) return;
        if (!byGame[r.game_id]) byGame[r.game_id] = { game: r.games, reviews: [] };
        byGame[r.game_id].reviews.push(r);
      });
      Object.values(byGame).forEach(({ game, reviews }) => {
        const hasFollow = reviews.some(r => followIds.includes(r.user_id));
        if (reviews.length > 1) {
          cards.push({ type: "shelf_pulse", id: "multi_review_" + game.id, game, text: `${reviews.length} players reviewed ${game.name} this week`, cta: "Write a review", ctaStatus: "review", hasFollow, priority: hasFollow ? 2 : 1 });
        } else {
          const r = reviews[0];
          cards.push({ type: "review_spotlight", id: "review_" + r.id, review: r, game, profile: r.profiles, hasFollow: followIds.includes(r.user_id), priority: followIds.includes(r.user_id) ? 2 : 1 });
        }
      });
    }

    cards.sort((a, b) => b.priority - a.priority);
    setPulseCards(cards);
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
          .select("id, content, likes, created_at, game_tag, user_id, npc_id, tagged_users, link_url, comments(id), profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
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

      setLivePosts(await resolveMentionsInPosts(feed.slice(0, 20)));
      setGuestFeedDone(true);
      setFeedLoading(false);
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const [postsResult, likesResult, tipsResult] = await Promise.all([
        supabase.from("posts")
          .select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring, avatar_config), npcs(name, handle, avatar_initials, universe, role), comments(id)")
          .order("created_at", { ascending: false })
          .limit(20),
        authUser
          ? supabase.from("post_likes").select("post_id").eq("user_id", authUser.id).then(r => r.error ? { data: [] } : r)
          : Promise.resolve({ data: [] }),
        authUser
          ? supabase.from("tip_votes").select("post_id").eq("user_id", authUser.id).then(r => r.error ? { data: [] } : r)
          : Promise.resolve({ data: [] }),
      ]);
      if (postsResult.error) console.error("Feed load error:", postsResult.error);
      const likedIds = new Set((likesResult.data || []).map(l => l.post_id));
      const tippedIds = new Set((tipsResult.data || []).map(t => t.post_id));
      if (postsResult.data) {
        const mapped = postsResult.data.map(p => ({
          ...p,
          comment_count: p.comments?.length || 0,
          liked: likedIds.has(p.id),
          tipped: tippedIds.has(p.id),
        }));
        setLivePosts(await resolveMentionsInPosts(mapped));
      }
      setFeedLoading(false);
    }
  };

  const submitPost = async () => {
    if (!postText.trim() || posting) return;
    setPosting(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const urls = postText.match(URL_REGEX);
    const { data, error } = await supabase.from("posts").insert({
      user_id: authUser?.id || null,
      content: postText.trim(),
      game_tag: taggedGames[0] || null,
      tagged_users: taggedUsers.length > 0 ? taggedUsers : [],
      likes: 0,
      comment_count: 0,
      link_url: linkPreview?.url || urls?.[0] || null,
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
          active_ring: user?.activeRing,
          avatar_config: user?.avatarConfig || null,
        }
      };
      setLivePosts(prev => [newPost, ...prev]);
      setPostText("");
      setTaggedGames([]);
      setTaggedUsers([]);
      setLinkPreview(null);
      setLinkWarning(null);
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
            <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 14, marginBottom: 14 }}>
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
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: 56, background: "linear-gradient(135deg, " + C.accent + "22, " + C.teal + "22)" }} />
            <div style={{ padding: "0 16px 18px", marginTop: -22 }}>
              {/* Question mark avatar */}
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.surfaceRaised, border: "2px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontWeight: 900, fontSize: 22 }}>?</div>
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
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: 56, background: "linear-gradient(135deg, " + C.accent + "44, " + C.teal + "44)", borderRadius: "14px 14px 0 0" }} />
            <div style={{ padding: "0 16px 16px", marginTop: -22, overflow: "visible" }}>
              <Avatar initials={user.avatar} size={64} status="online" founding={user.isFounding} ring={user.activeRing} avatarConfig={user.avatarConfig} />
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{user.name}</div>
                <div style={{ color: C.textMuted, fontSize: 12 }}>{user.handle}</div>
                <div style={{ color: C.textDim, fontSize: 11, marginTop: 3 }}>{user.title}</div>
              </div>
              {/* XP + Level */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + C.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, color: C.gold, fontSize: 13 }}>Lv.{user.level}</div>
                  <div style={{ color: C.textDim, fontSize: 10 }}>{user.xp} / {user.xpNext} XP</div>
                </div>
                <div style={{ height: 4, background: C.surfaceRaised, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: Math.min(100, Math.round((user.xp / user.xpNext) * 100)) + "%", background: "linear-gradient(90deg, " + C.gold + ", " + C.accent + ")", borderRadius: 4, transition: "width 0.4s ease" }} />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 16, marginBottom: 14 }}>
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
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < playingGames.length - 1 ? "1px solid " + C.border : "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <span style={{ color: C.textMuted, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
              <span style={{ color: C.textDim, fontSize: 11 }}>→</span>
            </div>
          ))}
        </div>

        {/* Gamers — shelf-based suggestions */}
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 16 }}>
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
                <Avatar initials={(p.avatar_initials || p.username || "?").slice(0,2).toUpperCase()} size={32} founding={p.is_founding} ring={p.active_ring} avatarConfig={p.avatar_config} />
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
              }} style={{ width: "100%", background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "5px", color: C.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Follow</button>
            </div>
          ))}
        </div>

        {/* NPCs */}
        {sidebarNPCs.length > 0 && (
        <div style={{ background: C.goldGlow, border: "1px solid " + C.goldBorder, borderRadius: 14, padding: 16, marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: C.gold, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>NPCs</div>
            <button onClick={() => setActivePage("npcs")} style={{ background: "none", border: "none", color: C.gold + "88", fontSize: 11, cursor: "pointer", padding: 0 }}>See all</button>
          </div>
          {sidebarNPCs.map((npc, i, arr) => (
            <div key={npc.id} onClick={() => { setCurrentNPC(npc.id); setActivePage("npc"); }}
              style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: i < arr.length - 1 ? 10 : 0, marginBottom: i < arr.length - 1 ? 10 : 0, borderBottom: i < arr.length - 1 ? "1px solid " + C.goldBorder : "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <Avatar initials={npc.avatar_initials || "?"} size={30} isNPC={true} status={npc.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: C.gold, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{npc.name}</div>
                <div style={{ color: C.textDim, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{npc.role}</div>
              </div>
              <span style={{ color: C.textDim, fontSize: 11 }}>→</span>
            </div>
          ))}
        </div>
        )}
      </div>
      )}

      {/* Main feed */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Feed tabs — members only */}
        {!isGuest && (
          <div style={{ display: "flex", gap: 4, marginBottom: 14, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: 4 }}>
            {[{ id: "forYou", label: "For You" }, { id: "following", label: "Following" }].map(tab => (
              <button key={tab.id} onClick={() => { setFeedTab(tab.id); if (tab.id === "following") loadFollowingPosts(); }}
                style={{ flex: 1, background: feedTab === tab.id ? C.accentGlow : "transparent", border: "1px solid " + feedTab === tab.id ? C.accentDim : "transparent", borderRadius: 8, padding: "7px", color: feedTab === tab.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: feedTab === tab.id ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}
        {!isGuest && (
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: isMobile ? 12 : 16, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <Avatar initials={user?.avatar || "GL"} size={isMobile ? 48 : 56} status="online" founding={user?.isFounding} ring={user?.activeRing} avatarConfig={user?.avatarConfig} />
            <div style={{ flex: 1 }}>
              <div style={{ position: "relative" }}>
                <textarea ref={textareaRef} value={postText} onChange={handlePostTextChange} onKeyDown={handlePostKeyDown} placeholder={dailyPrompt ? dailyPrompt.question : "Share a win, review a game... (@ to tag a game, player, or NPC)"} style={{ width: "100%", background: C.surfaceHover, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13, resize: "none", outline: "none", minHeight: isMobile ? 56 : 68, boxSizing: "border-box" }} />
                {mentionResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden", zIndex: 50, minWidth: 260, maxWidth: 400, maxHeight: 320, overflowY: "auto", marginTop: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                    {mentionResults.map((item, i) => (
                      <div key={item.id || item.igdb_id} onClick={() => selectMention(item)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", cursor: "pointer", background: i === mentionIndex ? C.surfaceHover : "transparent", borderBottom: i < mentionResults.length - 1 ? "1px solid " + C.border : "none" }}
                        onMouseEnter={() => setMentionIndex(i)}>
                        {item._type === "player" ? (
                          <>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accent + "33", border: "1px solid " + C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{(item.avatar_initials || item.username?.slice(0,2) || "GL").toUpperCase()}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{item.username}</div>
                              <div style={{ color: C.textDim, fontSize: 10 }}>{item.handle}</div>
                            </div>
                            <span style={{ color: C.accent, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>Player</span>
                          </>
                        ) : item._type === "npc" ? (
                          <>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.goldGlow, border: "1px solid " + C.goldBorder, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.gold, flexShrink: 0 }}>{(item.avatar_initials || "NPC").toUpperCase()}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: C.gold, fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                              <div style={{ color: C.textDim, fontSize: 10 }}>{item.handle}</div>
                            </div>
                            <span style={{ color: C.gold, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>NPC</span>
                          </>
                        ) : (
                          <>
                            {item.cover_url
                              ? <img src={item.cover_url} alt="" style={{ width: 48, height: 64, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
                              : <div style={{ width: 48, height: 64, borderRadius: 5, background: C.surfaceRaised, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎮</div>
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                              {(item.platforms || item.genre) && <div style={{ color: C.textDim, fontSize: 10 }}>{item.platforms || item.genre}</div>}
                            </div>
                            {item._fromIGDB && <span style={{ color: C.teal, fontSize: 10, flexShrink: 0, fontWeight: 600 }}>+ Add</span>}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, flexWrap: isMobile ? "wrap" : "nowrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {taggedGames.map(gameId => {
                    const game = dbGames[gameId];
                    return (
                      <span key={gameId} style={{ background: C.accentGlow, border: "1px solid " + C.accentDim, borderRadius: 6, padding: "3px 8px", color: C.accentSoft, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        {game?.name || gameId}
                        <span onClick={() => removeTaggedGame(gameId)} style={{ cursor: "pointer", marginLeft: 2, color: C.textDim, fontWeight: 700 }}>×</span>
                      </span>
                    );
                  })}
                  {taggedGames.length === 0 && (
                    <span style={{ color: C.textDim, fontSize: 12 }}>@ a game, player, or NPC to tag</span>
                  )}
                </div>
                <button onClick={submitPost} disabled={posting || !postText.trim()} style={{ background: postText.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 20px", color: postText.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: postText.trim() ? "pointer" : "default", transition: "all 0.2s" }}>{posting ? "Posting..." : "Post"}</button>
              </div>
              {/* Link warning */}
              {linkWarning && (
                <div style={{ marginTop: 8, background: "#ef444418", border: "1px solid #ef444444", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🚫</span>
                  <span style={{ color: "#ef4444", fontSize: 12 }}><strong>{linkWarning}</strong> isn't on our allowed list. Links from this domain won't be active.</span>
                </div>
              )}
              {/* Link preview card */}
              {linkPreviewLoading && (
                <div style={{ marginTop: 8, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 14px", color: C.textDim, fontSize: 12 }}>Fetching preview…</div>
              )}
              {linkPreview && !linkPreviewLoading && (
                <div style={{ marginTop: 8, background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 10, overflow: "hidden", display: "flex", gap: 0 }}>
                  {linkPreview.image && <img src={linkPreview.image} alt="" style={{ width: 80, objectFit: "cover", flexShrink: 0 }} />}
                  <div style={{ padding: "10px 12px", flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.textDim, fontSize: 10, marginBottom: 2 }}>{linkPreview.domain}</div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{decodeHtml(linkPreview.title) || linkPreview.url}</div>
                    {linkPreview.description && <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{decodeHtml(linkPreview.description)}</div>}
                  </div>
                  <button onClick={() => { setLinkPreview(null); setLinkWarning(null); }} style={{ background: "none", border: "none", color: C.textDim, fontSize: 16, cursor: "pointer", padding: "8px", alignSelf: "flex-start", flexShrink: 0 }}>×</button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* For You feed — interspersed with pulse cards every 3 posts */}
        {(isGuest || feedTab === "forYou") && !feedLoading && (() => {
          const items = [];
          let pulseIdx = 0;

          const renderPulseCard = (card) => {
            if (card.type === "shelf_pulse") {
              return <ShelfPulseCard key={card.id} card={card}
                setCurrentGame={setCurrentGame} setActivePage={setActivePage}
                currentUser={user}
                onAddToShelf={async (game, status) => {
                  const { data: { user: authUser } } = await supabase.auth.getUser();
                  if (!authUser) return;
                  await supabase.from("user_games").upsert({ user_id: authUser.id, game_id: game.id, status }, { onConflict: "user_id,game_id" });
                  await supabase.from("chart_events").insert({ game_id: game.id, user_id: authUser.id, event_type: status === "playing" ? "shelf_playing" : status === "have_played" ? "shelf_played" : "shelf_want", date: new Date().toISOString().slice(0,10), week_start: new Date(Date.now() - new Date().getDay()*86400000).toISOString().slice(0,10) });
                }}
              />;
            }
            if (card.type === "review_spotlight") {
              return <ReviewSpotlightCard key={card.id} card={card}
                setCurrentGame={setCurrentGame} setCurrentPlayer={setCurrentPlayer}
                setActivePage={setActivePage} onExit={onExit}
              />;
            }
            return null;
          };

          livePosts.forEach((post, i) => {
            // Insert pulse card every 3 posts
            if (i > 0 && i % PULSE_FREQUENCY === 0 && pulseIdx < pulseCards.length) {
              const el = renderPulseCard(pulseCards[pulseIdx++]);
              if (el) items.push(el);
            }

            const isNPC = !!post.npc_id;
            const author = isNPC ? post.npcs : post.profiles;
            const npcFallback = isNPC && !author
              ? (Object.values(NPCS).find(n => n.id === post.npc_id) || { name: "NPC", handle: "@npc", avatar: "NP" })
              : null;
            const realFallback = !isNPC && !author ? { username: "Guildies Member", handle: "@member", avatar_initials: "GM", is_founding: false } : null;
            const displayAuthor = author || npcFallback || realFallback;
            items.push(
              <FeedPostCard key={post.id} post={{
                id: post.id,
                npc_id: post.npc_id,
                game_tag: post.game_tag,
                user_id: post.user_id,
                tip_count: post.tip_count || 0,
                tagged_users: post.tagged_users || [],
                user: {
                  name: isNPC ? (displayAuthor?.name || "NPC") : (displayAuthor?.username || "Gamer"),
                  handle: displayAuthor?.handle || "",
                  avatar: displayAuthor?.avatar_initials || displayAuthor?.avatar || "GL",
                  status: "online",
                  isNPC,
                  isFounding: !isNPC && (displayAuthor?.is_founding || false),
                  activeRing: !isNPC ? (displayAuthor?.active_ring || "none") : "none",
                  avatarConfig: !isNPC ? (displayAuthor?.avatar_config || null) : null,
                },
                content: post.content,
                gameId: post.game_tag,
                tagged_users: post.tagged_users || [],
                time: timeAgo(post.created_at),
                likes: post.likes || 0,
                liked: post.liked || false,
                tipped: post.tipped || false,
                tip_count: post.tip_count || 0,
                comment_count: post.comment_count || 0,
                commentList: [],
                link_url: post.link_url || null,
              }} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={user} isGuest={isGuest} onSignIn={onSignIn} onExit={onExit} />
            );
          });
          return items;
        })()}
        {/* Loading skeleton */}
        {(isGuest || feedTab === "forYou") && feedLoading && [1,2,3].map(i => (
          <div key={i} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: isMobile ? 12 : 16, marginBottom: 10 }}>
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
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🎮</div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 16, marginBottom: 8 }}>The feed is empty right now.</div>
            <div style={{ color: C.textMuted, fontSize: 13 }}>Be the first to post something.</div>
          </div>
        )}

        {/* Following feed */}
        {!isGuest && feedTab === "following" && (
          followingPosts.length === 0 ? (
            <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
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
            const displayAuthor = author || { username: "Guildies Member", handle: "@member", avatar_initials: "GM", is_founding: false, active_ring: "none" };
            return (
              <FeedPostCard key={post.id} post={{
                id: post.id,
                game_tag: post.game_tag,
                user_id: post.user_id,
                tagged_users: post.tagged_users || [],
                user: {
                  name: displayAuthor.username || "Gamer",
                  handle: displayAuthor.handle || "@gamer",
                  avatar: displayAuthor.avatar_initials || "GL",
                  status: "online",
                  isNPC: false,
                  isFounding: displayAuthor.is_founding || false,
                  activeRing: displayAuthor.active_ring || "none",
                  avatarConfig: displayAuthor.avatar_config || null,
                },
                content: post.content,
                time: timeAgo(post.created_at),
                likes: post.likes || 0,
                liked: post.liked || false,
                comment_count: post.comment_count || 0,
                commentList: [],
                link_url: post.link_url || null,
              }} setActivePage={setActivePage} setCurrentGame={setCurrentGame} setCurrentNPC={setCurrentNPC} setCurrentPlayer={setCurrentPlayer} isMobile={isMobile} currentUser={user} isGuest={isGuest} onSignIn={onSignIn} onExit={onExit} />
            );
          })
        )}

        {/* Guest sign-up wall after feed */}
        {isGuest && guestFeedDone && (
          <div style={{ background: "linear-gradient(180deg, transparent 0%, " + C.bg + " 40%)", borderRadius: 14, padding: "40px 24px 32px", textAlign: "center", marginTop: -40, position: "relative" }}>
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
              style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 10, padding: "10px 32px", color: C.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "block", width: "100%", maxWidth: 280, margin: "0 auto" }}>
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* Right sidebar — desktop only */}
      {!isMobile && (
      <div style={{ width: 210, flexShrink: 0 }}>
        <ChartsWidget setActivePage={setActivePage} setCurrentGame={setCurrentGame} refreshKey={chartRefresh} limit={5} />
      </div>
      )}
    </div>
    </>
  );
}

export default FeedPage;
