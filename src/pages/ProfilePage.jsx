import React, { useState, useEffect, useCallback, useRef } from "react";
import { C, NPCS, QUESTS, PROFILE_RINGS, QUEST_THEMES, FOUNDING, THEMES, applyTheme } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo, logChartEvent, updateTasteProfile, isUsernameRestricted } from "../utils.js";
import { Avatar } from "../components/Avatar.jsx";
import { AvatarPixel } from "../components/Avatar.jsx";
import { FeedPostCard } from "../components/FeedPostCard.jsx";
import { FoundingBadge, Badge } from "../components/FoundingBadge.jsx";
import AvatarBuilderModal from "../modals/AvatarBuilderModal.jsx";
import SteamImportModal from "../modals/SteamImportModal.jsx";

function ProfilePage({ setActivePage, setCurrentGame, setCurrentNPC, setCurrentPlayer, isMobile, currentUser, isGuest, onSignIn, defaultTab, onProfileSaved, onThemeChange, onQuestComplete }) {
  const user = currentUser;
  const [activeTab, setActiveTab] = useState(defaultTab || "posts");

  // Re-sync if parent changes the default tab (e.g. from quest banner)
  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);
  const [editing, setEditing] = useState(false);
  const [showAvatarBuilder, setShowAvatarBuilder] = useState(false);
  const [showSteamImport, setShowSteamImport] = useState(false);
  const [localAvatarConfig, setLocalAvatarConfig] = useState(null);
  const [previewThemeId, setPreviewThemeId] = useState(null);
  const [editForm, setEditForm] = useState({ username: "", bio: "", games: "" });
  const [saving, setSaving] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewEditForm, setReviewEditForm] = useState({});
  const [savingReview, setSavingReview] = useState(false);
  const [showNewReview, setShowNewReview] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState({ rating: 0, headline: "", loved: "", didnt_love: "", content: "", time_played: "", completed: false });
  const [newReviewGameSearch, setNewReviewGameSearch] = useState("");
  const [newReviewGameResults, setNewReviewGameResults] = useState([]);
  const [newReviewGame, setNewReviewGame] = useState(null);
  const [submittingNewReview, setSubmittingNewReview] = useState(false);
  const [gameLibrary, setGameLibrary] = useState([]);
  const [postCount, setPostCount] = useState(0);
  const [postGameNames, setPostGameNames] = useState({});
  const [userShelf, setUserShelf] = useState({ want_to_play: [], playing: [], have_played: [] });
  const [dragging, setDragging] = useState(null); // { gameId, fromStatus }
  const [dragOver, setDragOver] = useState(null);  // column id (cross-column target)
  const [dragOverCard, setDragOverCard] = useState(null); // { gameId, position: "above"|"below" }
  const dragOverCardRef = React.useRef(null);
  const [mobileMoveCard, setMobileMoveCard] = useState(null);
  const [shelfMenuOpen, setShelfMenuOpen] = useState(null); // gameId of open tile menu
  const [addingGame, setAddingGame] = useState(false);
  const [gameSearch, setGameSearch] = useState("");
  const [gameSearchResults, setGameSearchResults] = useState([]);
  // Quest state
  const [userQuests, setUserQuests] = useState([]);
  const [userRewards, setUserRewards] = useState([]);
  const [questsLoaded, setQuestsLoaded] = useState(false);
  const [profileFollowing, setProfileFollowing] = useState([]);
  const [playerTags, setPlayerTags] = useState(typeof user.player_tags === 'object' && !Array.isArray(user.player_tags) && user.player_tags !== null ? user.player_tags : {});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletionPending, setDeletionPending] = useState(user?.deletion_requested_at ? true : false);
  const [exportRequested, setExportRequested] = useState(false);
  const [steamId, setSteamId] = useState(null);

  const TAG_CATEGORIES = [
    { label: "How I play", tags: ["Casual", "Competitive"] },
    { label: "Modes I like", tags: ["PvP", "PvE", "Solo", "Co-op"] },
    { label: "Voice chat", tags: ["Yes", "No"] },
    { label: "What matters more", tags: ["Winning", "Good game"], binary: true },
    { label: "I play on", tags: ["PC", "PlayStation", "Xbox", "Switch", "Mobile", "Retro"] },
  ];

  // Guard must be after all hooks
  if (!user) return null;

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
          .select("*, profiles!posts_user_id_fkey(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
          .eq("user_id", authUser.id)
          .is("npc_id", null)
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
        .select("*, games(id, name, developer, genre, cover_url)")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false });
      if (reviews) setUserReviews(reviews);

      // Game shelf from user_games table
      const { data: shelfData } = await supabase
        .from("user_games")
        .select("*, games(id, name, developer, genre, cover_url)")
        .eq("user_id", authUser.id)
        .order("sort_order", { ascending: true, nullsFirst: false });
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
        .select("followed_user_id, followed_npc_id, profiles!follows_followed_user_id_fkey(id, username, handle, avatar_initials, is_founding, active_ring)")
        .eq("follower_id", authUser.id);
      if (followData) {
        const users = followData.filter(f => f.followed_user_id && f.profiles).map(f => ({
          id: f.followed_user_id,
          username: f.profiles.username,
          handle: f.profiles.handle,
          avatar_initials: f.profiles.avatar_initials,
          is_founding: f.profiles.is_founding,
          active_ring: f.profiles.active_ring,
          type: "user"
        }));
        const npcs = followData.filter(f => f.followed_npc_id).map(f => {
          const npc = Object.values(NPCS).find(n => n.id === f.followed_npc_id) || null;
          return npc ? { id: f.followed_npc_id, username: npc.name, handle: npc.handle, avatar_initials: npc.avatar, type: "npc" } : null;
        }).filter(Boolean);
        setProfileFollowing([...users, ...npcs]);
      }
      // Load Steam ID from user_private
      const { data: privateData } = await supabase
        .from("user_private")
        .select("steam_id")
        .eq("id", authUser.id)
        .maybeSingle();
      if (privateData?.steam_id) setSteamId(privateData.steam_id);
    };
    load();
    loadQuests();
  }, []);

  const disconnectSteam = async () => {
    if (!window.confirm("Disconnect Steam? Your imported games will stay on your shelf.")) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("user_private").update({ steam_id: null }).eq("id", authUser.id);
    setSteamId(null);
  };

  const loadShelf = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: shelfData } = await supabase
      .from("user_games")
      .select("*, games(id, name, developer, genre, cover_url)")
      .eq("user_id", authUser.id)
      .order("sort_order", { ascending: true, nullsFirst: false });
    if (shelfData) {
      const shelf = { want_to_play: [], playing: [], have_played: [] };
      shelfData.forEach(entry => {
        if (shelf[entry.status]) shelf[entry.status].push(entry);
      });
      setUserShelf(shelf);
    }
  };

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
    const restricted = await isUsernameRestricted(editForm.username.trim());
    if (restricted) { setSaving(false); alert("Username unavailable."); return; }
    const updates = {
      username: editForm.username.trim(),
      handle: "@" + editForm.username.trim().toLowerCase().replace(/\s+/g, "_"),
      bio: editForm.bio.trim(),
      games: editForm.games.trim(),
      avatar_initials: editForm.username.trim().slice(0, 2).toUpperCase(),
      theme: editForm.theme || "deep-space",
      player_tags: playerTags,
    };
    const { error } = await supabase.from("profiles").update(updates).eq("id", authUser.id);
    if (!error) {
      onThemeChange?.(editForm.theme || "deep-space");
      setEditing(false);
      onProfileSaved?.();
    }
    setSaving(false);
  };

  const saveTag = async (newTags) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("profiles").update({ player_tags: newTags }).eq("id", authUser.id);
  };

  const requestDeletion = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`https://zpalkpcqihxamedymnwe.supabase.co/functions/v1/delete-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
    });
    if (res.ok) {
      setDeletionPending(true);
      setShowDeleteModal(false);
      setDeleteConfirmText("");
    }
  };

  const cancelDeletion = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("profiles").update({ deletion_requested_at: null }).eq("id", authUser.id);
    setDeletionPending(false);
  };

  const requestDataExport = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("data_requests").insert({
      user_id: authUser.id,
      username: user.name || user.username || "Unknown",
      request_type: "export",
      status: "pending",
    });
    setExportRequested(true);
  };

  const moveGame = async (gameId, fromStatus, toStatus) => {
    if (fromStatus === toStatus) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const destLength = userShelf[toStatus].length;
    await supabase.from("user_games").upsert({
      user_id: authUser.id,
      game_id: gameId,
      status: toStatus,
      sort_order: destLength,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,game_id" });
    // Log shelf transition for developer analytics
    await supabase.from("user_games_history").insert({
      user_id: authUser.id,
      game_id: gameId,
      from_status: fromStatus,
      to_status: toStatus,
    });
    const eventMap = { playing: 'shelf_playing', want_to_play: 'shelf_want', have_played: 'shelf_played' };
    if (eventMap[toStatus]) { logChartEvent(gameId, eventMap[toStatus], authUser.id); updateTasteProfile(gameId, eventMap[toStatus], authUser.id); }
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
    }, { onConflict: "user_id,game_id" });
    if (!error) {
      // Log shelf addition for developer analytics (from_status null = new addition)
      await supabase.from("user_games_history").insert({
        user_id: authUser.id,
        game_id: game.id,
        from_status: null,
        to_status: status,
      });
      const eventMap = { playing: 'shelf_playing', want_to_play: 'shelf_want', have_played: 'shelf_played' };
      if (eventMap[status]) { logChartEvent(game.id, eventMap[status], authUser.id); updateTasteProfile(game.id, eventMap[status], authUser.id); }
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

  const saveLiked = async (gameId, liked) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("user_games").update({ liked }).eq("user_id", authUser.id).eq("game_id", gameId);
    setUserShelf(prev => ({
      ...prev,
      have_played: prev.have_played.map(e => e.game_id === gameId ? { ...e, liked } : e),
    }));
  };

  const submitNewReview = async () => {
    if (!newReviewGame || !newReviewForm.rating) return;
    setSubmittingNewReview(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setSubmittingNewReview(false); return; }
    const { data, error } = await supabase.from("reviews").upsert({
      user_id: authUser.id,
      game_id: newReviewGame.id,
      rating: newReviewForm.rating,
      headline: newReviewForm.headline || null,
      loved: newReviewForm.loved || null,
      didnt_love: newReviewForm.didnt_love || null,
      content: newReviewForm.content || null,
      time_played: newReviewForm.time_played ? parseInt(newReviewForm.time_played) : null,
      completed: newReviewForm.completed || false,
    }, { onConflict: "user_id,game_id" }).select("*, games(id, name, developer, genre)").single();
    if (!error && data) {
      setUserReviews(prev => {
        const existing = prev.findIndex(r => r.game_id === data.game_id);
        if (existing >= 0) { const updated = [...prev]; updated[existing] = data; return updated; }
        return [data, ...prev];
      });
    }
    setSubmittingNewReview(false);
    setShowNewReview(false);
    setNewReviewForm({ rating: 0, headline: "", loved: "", didnt_love: "", content: "", time_played: "", completed: false });
    setNewReviewGame(null);
    setNewReviewGameSearch("");
  };

  const saveReview = async () => {
    if (!editingReview || !reviewEditForm.rating) return;
    setSavingReview(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setSavingReview(false); return; }
    const { error } = await supabase.from("reviews").upsert({
      user_id: authUser.id,
      game_id: editingReview.game_id,
      rating: reviewEditForm.rating,
      headline: reviewEditForm.headline || null,
      time_played: reviewEditForm.time_played ? parseInt(reviewEditForm.time_played) : null,
      completed: reviewEditForm.completed || false,
      loved: reviewEditForm.loved || null,
      didnt_love: reviewEditForm.didnt_love || null,
      content: reviewEditForm.content || null,
    });
    if (!error) {
      setUserReviews(prev => prev.map(r =>
        r.game_id === editingReview.game_id ? { ...r, ...reviewEditForm } : r
      ));
      setEditingReview(null);
    }
    setSavingReview(false);
  };

  const startEditReview = (review) => {
    setEditingReview(review);
    setReviewEditForm({
      rating: review.rating || 0,
      headline: review.headline || "",
      time_played: review.time_played ? String(review.time_played) : "",
      completed: review.completed || false,
      loved: review.loved || "",
      didnt_love: review.didnt_love || "",
      content: review.content || "",
    });
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
    // Search local DB first
    const { data: localGames } = await supabase
      .from("games")
      .select("id, name, developer, genre, cover_url, platforms, igdb_id")
      .ilike("name", `%${q}%`)
      .limit(6);

    const results = localGames || [];
    setGameSearchResults(results);

    // Also search IGDB for games not in DB yet
    try {
      const igdbRes = await fetch("/api/igdb", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const { games: igdbGames } = await igdbRes.json();
      if (igdbGames?.length) {
        const localIgdbIds = new Set(results.map(g => g.igdb_id).filter(Boolean));
        const newGames = igdbGames.filter(g => !localIgdbIds.has(g.igdb_id)).map(g => ({ ...g, _fromIGDB: true }));
        setGameSearchResults([...results, ...newGames].slice(0, 10));

        // Background enrich: update any local games missing platforms
        results.forEach(async (g) => {
          if (!g.platforms && g.igdb_id) {
            const match = igdbGames.find(ig => ig.igdb_id === g.igdb_id);
            if (match?.platforms) {
              await supabase.from("games").update({ platforms: match.platforms, cover_url: match.cover_url || g.cover_url }).eq("id", g.id);
              setGameSearchResults(prev => prev.map(r => r.id === g.id ? { ...r, platforms: match.platforms, cover_url: match.cover_url || r.cover_url } : r));
            }
          }
        });
      }
    } catch (e) { /* IGDB unavailable, local results are fine */ }
  };

  const handleDragStart = (gameId, fromStatus) => setDragging({ gameId, fromStatus });

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    setDragOver(colId);
  };

  const handleCardDragOver = (e, colId, targetGameId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(colId);
    const val = { gameId: targetGameId, position: "before" };
    setDragOverCard(val);
    dragOverCardRef.current = val;
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
    setDragOverCard(null);
    dragOverCardRef.current = null;
  };

  const saveSortOrder = async (colId, orderedEntries) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const updates = orderedEntries.map((entry, idx) => ({
      user_id: authUser.id,
      game_id: entry.game_id,
      status: colId,
      sort_order: idx,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from("user_games").upsert(updates, { onConflict: "user_id,game_id" });

    // Log elevations for Want to Play column — any game that moved up
    if (colId === "want_to_play") {
      const prevOrder = userShelf.want_to_play;
      const elevations = orderedEntries
        .map((entry, toIdx) => {
          const fromIdx = prevOrder.findIndex(e => e.game_id === entry.game_id);
          if (fromIdx === -1 || toIdx >= fromIdx) return null; // didn't move up
          return { game_id: entry.game_id, from_position: fromIdx, to_position: toIdx };
        })
        .filter(Boolean);
      if (elevations.length > 0) {
        await supabase.from("shelf_elevations").insert(
          elevations.map(e => ({
            user_id: authUser.id,
            game_id: e.game_id,
            from_position: e.from_position,
            to_position: e.to_position,
          }))
        );
      }
    }
  };

  const handleDrop = (e, toStatus) => {
    e.preventDefault();
    if (!dragging) return;
    const { gameId, fromStatus } = dragging;
    const currentDragOverCard = dragOverCardRef.current;

    if (fromStatus === toStatus) {
      const col = [...userShelf[toStatus]];
      const fromIdx = col.findIndex(e => e.game_id === gameId);
      if (fromIdx === -1) { handleDragEnd(); return; }
      let toIdx = col.length - 1;
      if (currentDragOverCard) {
        const targetIdx = col.findIndex(e => e.game_id === currentDragOverCard.gameId);
        if (targetIdx !== -1) {
          // Insert before target, adjusting for removal of dragged item
          toIdx = targetIdx > fromIdx ? targetIdx - 1 : targetIdx;
        }
      }
      if (fromIdx === toIdx) { handleDragEnd(); return; }
      const reordered = [...col];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      setUserShelf(prev => ({ ...prev, [toStatus]: reordered }));
      saveSortOrder(toStatus, reordered);
    } else {
      moveGame(gameId, fromStatus, toStatus);
    }
    handleDragEnd();
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
    { id: "games", label: `My Shelf${shelfCount > 0 ? ` (${shelfCount})` : ""}` },
    { id: "following", label: `Following${profileFollowing.length > 0 ? ` (${profileFollowing.length})` : ""}` },
    { id: "groups", label: "Groups" },
    { id: "quests", label: "Quests" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>
      {/* Header card */}
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ height: 150, background: "linear-gradient(135deg, #1a1040 0%, " + C.accent + "66 50%, #0a2040 100%)", position: "relative" }}>
          <div style={{ position: "absolute", bottom: -36, left: 28 }}>
            <Avatar initials={user.avatar} size={84} status="online" founding={user.isFounding} ring={user.activeRing} avatarConfig={localAvatarConfig || user.avatarConfig} />
          </div>
          {user.isFounding && (
            <div style={{ position: "absolute", top: 16, right: 16 }}>
              <span style={{ background: C.goldGlow, color: C.gold, border: "1px solid " + C.goldBorder, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 800 }}>⚔️ Founding Member</span>
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
              <div style={{ marginTop: 12, marginBottom: 4 }}>
                {TAG_CATEGORIES.map(cat => (
                  <div key={cat.label} style={{ marginBottom: 8 }}>
                    <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{cat.label}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {cat.tags.map(tag => {
                        const val = playerTags[tag];
                        const isUnset = val === undefined || val === null;
                        const bg = val === 1 ? "#22c55e22" : val === 0 ? C.gold + "22" : val === -1 ? "#ef444422" : C.gold + "11";
                        const border = val === 1 ? "#22c55e55" : val === 0 ? C.gold + "55" : val === -1 ? "#ef444455" : C.gold + "33";
                        const color = val === 1 ? "#22c55e" : val === 0 ? C.gold : val === -1 ? "#ef4444" : C.gold + "88";
                        const cycle = () => {
                          setPlayerTags(prev => {
                            let newTags;
                            if (cat.binary) {
                              const cur = prev[tag];
                              if (cur === 1) { newTags = { ...prev }; delete newTags[tag]; }
                              else { newTags = { ...prev }; cat.tags.forEach(t => delete newTags[t]); newTags[tag] = 1; }
                            } else {
                              const cur = prev[tag];
                              if (cur === undefined || cur === null) newTags = { ...prev, [tag]: 1 };
                              else if (cur === 1) newTags = { ...prev, [tag]: 0 };
                              else if (cur === 0) newTags = { ...prev, [tag]: -1 };
                              else { newTags = { ...prev }; delete newTags[tag]; }
                            }
                            saveTag(newTags);
                            return newTags;
                          });
                        };
                        return (
                          <button key={tag} onClick={cycle}
                            style={{ background: bg, border: "1px solid " + border, color, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ color: C.textMuted, fontSize: 13, margin: "8px 0 0", maxWidth: 480, lineHeight: 1.6 }}>{user.bio || "No bio yet."}</p>
              <div style={{ marginTop: 12 }}>
                <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Connected Platforms</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {steamId ? (
                    <button onClick={disconnectSteam}
                      style={{ background: "#22c55e22", border: "1px solid #22c55e55", borderRadius: 8, padding: "4px 12px", color: "#22c55e", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      ✓ Steam
                    </button>
                  ) : (
                    <button onClick={() => setShowSteamImport(true)}
                      style={{ background: C.gold + "18", border: "1px solid " + C.gold + "44", borderRadius: 8, padding: "4px 12px", color: C.gold, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      + Steam
                    </button>
                  )}
                  {/* Future platforms slot in here */}
                </div>
              </div>
            </div>
            {editing ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveProfile} disabled={saving} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 22px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save Changes"}</button>
                <button onClick={cancelEdit} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={startEdit} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 22px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Edit Profile</button>
                  <button onClick={() => setShowAvatarBuilder(true)} style={{ background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "8px 16px", color: C.accentSoft, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Character Builder</button>
                </div>
                {deletionPending ? (
                  <button onClick={cancelDeletion} style={{ background: "#c0392b22", border: "1px solid #c0392b55", borderRadius: 8, padding: "8px 16px", color: "#c0392b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Deletion pending — cancel?</button>
                ) : (
                  <button onClick={() => setShowDeleteModal(true)} style={{ background: "#c0392b22", border: "1px solid #c0392b55", borderRadius: 8, padding: "8px 16px", color: "#c0392b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Delete Account</button>
                )}
              </div>
            )}
          </div>

          {editing && (
            <div style={{ marginTop: 20, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 16 }}>Edit Profile</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 4 }}>Display Name</div>
                <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} style={{ width: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 4 }}>Bio</div>
                <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell people who you are..." style={{ width: "100%", background: C.surface, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", resize: "none", minHeight: 72, boxSizing: "border-box" }} />
              </div>

              {/* Theme picker — base themes + quest-unlocked catalog */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 12 }}>Theme</div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {[
                    { id: "deep-space",    label: "Deep Space",     bg: "#080e1a", accent: "#0ea5e9" },
                    { id: "light",         label: "Light",          bg: "#f4f6fa", accent: "#0284c7" },
                    { id: "high-contrast", label: "High Contrast",  bg: "#000000", accent: "#ffffff" },
                    { id: "colorblind",    label: "Colorblind Safe",bg: "#0f0a00", accent: "#f97316" },
                  ].map(theme => {
                    const isActive = (editForm.theme || "deep-space") === theme.id;
                    return (
                      <div key={theme.id} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <button onClick={() => { setEditForm(f => ({ ...f, theme: theme.id })); applyTheme(theme.id); setPreviewThemeId(theme.id); }}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 6 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, " + theme.bg + " 60%, " + theme.accent + " 60%)", border: isActive ? "2px solid " + C.accent : "2px solid " + C.border, boxShadow: isActive ? "0 0 0 3px " + C.accentDim : "none", transition: "all 0.15s" }} />
                        </button>
                        <span style={{ color: isActive ? C.accentSoft : C.textMuted, fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{theme.label}</span>
                      </div>
                    );
                  })}
                  {QUEST_THEMES.map(qt => {
                    const palette = THEMES[qt.id];
                    if (!palette) return null;
                    const isUnlocked = userRewards.some(r => r.reward_id === qt.rewardId || r.quest_rewards?.value === qt.id) ||
                      userQuests.some(q => q.completed && (q.reward_id === qt.rewardId || q.reward_id === qt.id));
                    const isActive = (editForm.theme || "deep-space") === qt.id;
                    return (
                      <div key={qt.id} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <button onClick={() => { if (!isUnlocked) return; setEditForm(f => ({ ...f, theme: qt.id })); applyTheme(qt.id); setPreviewThemeId(qt.id); }}
                          title={isUnlocked ? qt.label : `Locked — ${qt.questLabel}`}
                          style={{ background: "none", border: "none", cursor: isUnlocked ? "pointer" : "default", padding: 0, marginBottom: 6 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, " + palette.bg + " 60%, " + palette.accent + " 60%)", border: isActive && isUnlocked ? "2px solid " + palette.accent : "2px solid " + C.border, boxShadow: isActive && isUnlocked ? "0 0 0 3px " + palette.accent + "44" : "none", opacity: isUnlocked ? 1 : 0.45, transition: "all 0.15s" }} />
                        </button>
                        <span style={{ color: isActive && isUnlocked ? palette.accent : isUnlocked ? C.textMuted : C.textDim, fontSize: 10, fontWeight: isActive ? 700 : 400, opacity: isUnlocked ? 1 : 0.6 }}>{qt.label}</span>
                        <span style={{ color: C.textDim, fontSize: 9, opacity: isUnlocked ? 1 : 0.5 }}>{isUnlocked ? "Unlocked" : qt.questLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ring picker — full catalog, founding-page style */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 16 }}>Profile Ring</div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {PROFILE_RINGS.filter(r => r.id !== "none").map(ring => {
                    const isFoundingUnlocked = ring.foundingOnly && user.isFounding;
                    const isRewardUnlocked = userRewards.some(r =>
                      r.quest_rewards?.value === ring.id ||
                      r.reward_id === ring.id ||
                      r.reward_id === ring.questId
                    );
                    const isQuestCompleted = userQuests.some(q =>
                      q.completed && (
                        q.reward_id === ring.id ||
                        q.reward_id === ring.questId ||
                        (q.reward_label || "").toLowerCase().replace(/\s+/g, "_").includes(ring.id)
                      )
                    );
                    const isUnlocked = ring.alwaysUnlocked || isFoundingUnlocked || isRewardUnlocked || isQuestCompleted;
                    const isActive = (editForm.activeRing || user.activeRing || "none") === ring.id;

                    return (
                      <div key={ring.id} style={{ textAlign: "center", width: 72, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <button
                          onClick={() => { if (!isUnlocked) return; setEditForm(f => ({ ...f, activeRing: ring.id })); equipRing(ring.id); }}
                          title={isUnlocked ? (isActive ? `${ring.label} — equipped` : `Equip ${ring.label}`) : `Locked — ${ring.how}`}
                          style={{ background: "none", border: "none", cursor: isUnlocked ? "pointer" : "default", padding: 0, marginBottom: 8 }}>
                          <div style={{ position: "relative", width: 56, height: 56, opacity: isUnlocked ? 1 : 0.4 }}>
                            <div style={{
                              position: "absolute", inset: -4, borderRadius: "50%",
                              border: "3px solid " + ring.color,
                              boxShadow: isActive && isUnlocked
                                ? "0 0 18px " + (ring.glow || ring.color + "66") + ", 0 0 6px " + ring.color + "44"
                                : isUnlocked ? "0 0 8px " + ring.color + "33" : "none",
                              transition: "all 0.2s"
                            }} />
                            <div style={{
                              width: 56, height: 56, borderRadius: "50%",
                              background: "linear-gradient(135deg, " + ring.color + "22, " + ring.color + "11)",
                              border: "2px solid " + ring.color + "44",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 22, position: "relative"
                            }}>
                              {ring.icon || "●"}
                              {isActive && isUnlocked && (
                                <div style={{ position: "absolute", bottom: -1, right: -1, width: 18, height: 18, borderRadius: "50%", background: ring.color, border: "2px solid " + C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <span style={{ fontSize: 9, color: ring.id === "platinum" ? "#000" : "#fff", fontWeight: 900 }}>✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                        <div style={{ fontWeight: isActive && isUnlocked ? 700 : 400, color: isActive && isUnlocked ? ring.color : isUnlocked ? C.textMuted : C.textDim, fontSize: 10, lineHeight: 1.3, marginBottom: 2, textAlign: "center" }}>{ring.label}</div>
                        <div style={{ color: C.textDim, fontSize: 9, lineHeight: 1.3, textAlign: "center" }}>{isUnlocked ? ring.description : ring.how}</div>
                      </div>
                    );
                  })}
                  {/* No ring option */}
                  <div style={{ textAlign: "center", width: 72, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <button onClick={() => { setEditForm(f => ({ ...f, activeRing: "none" })); equipRing("none"); }}
                      title="Remove ring"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8 }}>
                      <div style={{ position: "relative", width: 56, height: 56 }}>
                        <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: "3px dashed " + C.border }} />
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.surfaceRaised, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: C.textDim }}>✕</div>
                      </div>
                    </button>
                    <div style={{ color: (editForm.activeRing || user.activeRing || "none") === "none" ? C.accentSoft : C.textDim, fontSize: 10, lineHeight: 1.3, fontWeight: (editForm.activeRing || user.activeRing || "none") === "none" ? 700 : 400, textAlign: "center" }}>No Ring</div>
                    <div style={{ color: C.textDim, fontSize: 9, textAlign: "center" }}>Remove ring</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveProfile} disabled={saving} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 20px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save Changes"}</button>
                <button onClick={cancelEdit} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 20px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: "flex", gap: 24, marginTop: 20, paddingTop: 20, borderTop: "1px solid " + C.border, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: "Posts", val: postCount || 0, color: C.accent, tab: "posts" },
              { label: "Reviews", val: userReviews.length, color: C.teal, tab: "reviews" },
              { label: "Shelf", val: shelfCount || 0, color: C.gold, tab: "games" },
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
                <div style={{ height: "100%", width: Math.min(((user.xp || 0) / (user.xpNext || 1000)) * 100, 100) + "%", background: "linear-gradient(90deg, " + C.gold + ", #f97316)", borderRadius: 4 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto" }}>
        {tabs.map(tab => (
          <button key={tab.id} data-tour={tab.id + "-tab"} onClick={() => setActiveTab(tab.id)} style={{ background: activeTab === tab.id ? C.accentGlow : "transparent", border: activeTab === tab.id ? "1px solid " + C.accentDim : "1px solid transparent", borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: activeTab === tab.id ? C.accentSoft : C.textMuted, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{tab.label}</button>
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
                activeRing: user.activeRing || "none",
              },
              content: post.content,
              tagged_users: post.tagged_users || [],
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
            <div style={{ color: C.textDim, fontSize: 13 }}>{isMobile ? "Tap a game to move or remove it." : "Drag games to reorder. Hover to remove."}</div>
            <button data-tour="add-game-btn" onClick={() => setAddingGame(a => !a)} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "7px 16px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Game</button>
          </div>

          {/* Search to add */}
          {addingGame && (
            <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 16, position: "relative" }}>
              <input
                autoFocus
                value={gameSearch}
                onChange={async e => {
                  setGameSearch(e.target.value);
                  const val = e.target.value;
                  const q = val.startsWith("@") ? val.slice(1) : val;
                  if (q.length >= 2) {
                    const [localRes, igdbRes] = await Promise.allSettled([
                      supabase.from("games").select("id, name, developer, genre, cover_url").ilike("name", `%${q}%`).limit(5),
                      fetch("/api/igdb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) }).then(r => r.json()).catch(() => ({ games: [] })),
                    ]);
                    const local = localRes.status === "fulfilled" ? (localRes.value.data || []) : [];
                    const igdb = igdbRes.status === "fulfilled" ? (igdbRes.value.games || []) : [];
                    const localNames = new Set(local.map(g => g.name.toLowerCase()));
                    const fromIGDB = igdb.filter(g => !localNames.has(g.name.toLowerCase())).map(g => ({ ...g, _fromIGDB: true }));
                    setGameSearchResults([...local, ...fromIGDB].slice(0, 8));
                  } else {
                    setGameSearchResults([]);
                  }
                }}
                placeholder="Search for any game..."
                style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
              {gameSearchResults.length > 0 && (
                <div style={{ marginTop: 8, borderRadius: 10, overflow: "hidden", border: "1px solid " + C.border }}>
                  {gameSearchResults.map(game => (
                    <div key={game.id || game.igdb_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: C.surfaceRaised, borderBottom: "1px solid " + C.border }}>
                      {game.cover_url
                        ? <img src={game.cover_url} alt="" style={{ width: 48, height: 64, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
                        : <div style={{ width: 48, height: 64, borderRadius: 5, background: C.surface, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎮</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                        <div style={{ color: C.textDim, fontSize: 11 }}>{game.platforms || game.genre || game.developer || ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {game._fromIGDB ? (
                          SHELF_COLUMNS.map(col => (
                            <button key={col.id} onClick={async () => {
                              const { data: inserted } = await supabase.from("games").insert({
                                name: game.name, genre: game.genre, summary: game.summary,
                                cover_url: game.cover_url, igdb_id: game.igdb_id,
                                first_release_date: game.first_release_date, followers: 0,
                                platforms: game.platforms || null,
                              }).select().single();
                              if (inserted) { addToShelf(inserted, col.id); setGameSearchResults([]); setGameSearch(""); }
                            }}
                              style={{ background: "transparent", border: "1px solid " + col.color + "44", borderRadius: 6, padding: "4px 8px", color: col.color, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                              {col.label}
                            </button>
                          ))
                        ) : (
                          SHELF_COLUMNS.map(col => (
                            <button key={col.id} onClick={() => { addToShelf(game, col.id); setGameSearchResults([]); setGameSearch(""); }}
                              style={{ background: "transparent", border: "1px solid " + col.color + "44", borderRadius: 6, padding: "4px 8px", color: col.color, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                              {col.label}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cover art grid shelf */}
          <div data-tour="shelf-columns">
            {SHELF_COLUMNS.map(col => {
              const entries = userShelf[col.id];
              if (entries.length === 0) return null;
              return (
                <div key={col.id} style={{ marginBottom: 28 }}
                  onDragOver={!isMobile ? e => handleDragOver(e, col.id) : undefined}
                  onDrop={!isMobile ? e => handleDrop(e, col.id) : undefined}>
                  {/* Section header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ fontWeight: 800, color: col.color, fontSize: 14 }}>{col.label}</div>
                    <div style={{ background: col.color + "22", color: col.color, borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{entries.length}</div>
                  </div>
                  {/* Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: 10 }}>
                    {entries.map((entry, entryIndex) => {
                      const game = entry.games;
                      if (!game) return null;
                      const review = userReviews.find(r => r.game_id === game.id);
                      const menuOpen = shelfMenuOpen === entry.game_id;
                      const actualIdx = entryIndex;
                      const shelfRank = col.id === "have_played" && actualIdx < 10 ? actualIdx + 1 : null;
                      return (
                        <div key={entry.game_id}
                          draggable={!isMobile}
                          onDragStart={!isMobile ? () => handleDragStart(entry.game_id, col.id) : undefined}
                          onDragEnd={!isMobile ? handleDragEnd : undefined}
                          onDragOver={!isMobile ? e => { e.preventDefault(); handleCardDragOver(e, col.id, entry.game_id); } : undefined}
                          onDrop={!isMobile ? e => handleDrop(e, col.id) : undefined}
                          style={{ background: C.surface, border: "1px solid " + (menuOpen ? col.color : dragOverCard?.gameId === entry.game_id ? col.color : C.border), borderRadius: 12, cursor: isMobile ? "pointer" : "grab", position: "relative", overflow: "hidden", alignSelf: "start", opacity: dragging?.gameId === entry.game_id ? 0.5 : 1, transition: "border-color 0.15s", boxShadow: dragOverCard?.gameId === entry.game_id ? "0 0 0 2px " + col.color + "66" : "none" }}
                          onMouseEnter={e => { if (!isMobile) { e.currentTarget.style.borderColor = col.color + "88"; const btn = e.currentTarget.querySelector(".remove-btn"); if (btn) btn.style.opacity = "1"; } }}
                          onMouseLeave={e => { if (!isMobile) { e.currentTarget.style.borderColor = menuOpen ? col.color : C.border; const btn = e.currentTarget.querySelector(".remove-btn"); if (btn) btn.style.opacity = "0"; } }}
                          onClick={() => { if (isMobile) { setShelfMenuOpen(menuOpen ? null : entry.game_id); } }}>

                          {/* Cover art */}
                          <div style={{ width: "100%", aspectRatio: "3/4", background: "#0a0f1a", position: "relative" }}
                            onClick={e => { if (!isMobile) { e.stopPropagation(); setCurrentGame(game.id); setActivePage("game"); } }}>
                            {game.cover_url
                              ? <img src={game.cover_url} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🎮</div>
                            }
                            {/* X remove button — top right over art */}
                            <button
                              onClick={e => { e.stopPropagation(); removeFromShelf(entry.game_id, col.id); setShelfMenuOpen(null); }}
                              style={{ position: "absolute", top: 4, right: 4, background: "rgba(8,14,26,0.75)", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 13, cursor: "pointer", lineHeight: 1, opacity: isMobile ? 1 : 0, transition: "opacity 0.15s" }}
                              className="remove-btn">
                              ×
                            </button>
                            {/* Top 10 rank badge — bottom left over art, Have Played only */}
                            {col.id === "have_played" && shelfRank && (
                              <div style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(8,14,26,0.85)", border: "1px solid " + C.gold + "66", borderRadius: 6, padding: "1px 6px", color: C.gold, fontSize: 10, fontWeight: 800 }}>
                                #{shelfRank}
                              </div>
                            )}
                          </div>

                          {/* Below art — name + actions */}
                          <div style={{ padding: "8px 8px 10px" }}>
                            <div style={{ fontWeight: 700, color: C.text, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: col.id === "have_played" ? 6 : 0 }}>{game.name}</div>
                            {/* Have Played actions */}
                            {col.id === "have_played" && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <button onClick={e => { e.stopPropagation(); saveLiked(entry.game_id, entry.liked === true ? null : true); }}
                                  style={{ background: entry.liked === true ? "#10b98133" : "transparent", border: "1px solid " + (entry.liked === true ? "#10b98166" : C.border), borderRadius: 6, padding: "4px 6px", fontSize: 12, cursor: "pointer", lineHeight: 1, flex: 1 }}>
                                  👍
                                </button>
                                <button onClick={e => { e.stopPropagation(); saveLiked(entry.game_id, entry.liked === false ? null : false); }}
                                  style={{ background: entry.liked === false ? "#ef444433" : "transparent", border: "1px solid " + (entry.liked === false ? "#ef444466" : C.border), borderRadius: 6, padding: "4px 6px", fontSize: 12, cursor: "pointer", lineHeight: 1, flex: 1 }}>
                                  👎
                                </button>
                                {review && (
                                  <div style={{ background: C.goldDim, border: "1px solid " + C.gold + "44", borderRadius: 5, padding: "2px 5px", color: C.gold, fontWeight: 800, fontSize: 10, flexShrink: 0 }}>
                                    {review.rating}/10
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Mobile status change overlay */}
                          {menuOpen && isMobile && (
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(8,14,26,0.93)", borderRadius: 12, zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 8px", gap: 6 }}
                              onClick={e => e.stopPropagation()}>
                              <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textAlign: "center", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                              {SHELF_COLUMNS.filter(c => c.id !== col.id).map(target => (
                                <button key={target.id} onClick={() => { moveGame(entry.game_id, col.id, target.id); setShelfMenuOpen(null); }}
                                  style={{ background: target.color + "22", border: "1px solid " + target.color + "55", borderRadius: 7, padding: "7px 8px", color: target.color, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                                  → {target.label}
                                </button>
                              ))}
                              {col.id === "have_played" && (
                                <div>
                                  <div style={{ color: C.textDim, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", marginBottom: 4, marginTop: 2 }}>Top 10 Rank</div>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
                                    {[1,2,3,4,5,6,7,8,9,10].map(n => {
                                      const isCurrentRank = shelfRank === n;
                                      return (
                                        <button key={n} onClick={() => {
                                          const col2 = [...userShelf["have_played"]];
                                          const fromIdx = col2.findIndex(e => e.game_id === entry.game_id);
                                          if (fromIdx === -1) return;
                                          const toIdx = n - 1;
                                          if (fromIdx === toIdx) { setShelfMenuOpen(null); return; }
                                          const reordered = [...col2];
                                          const [moved] = reordered.splice(fromIdx, 1);
                                          reordered.splice(toIdx, 0, moved);
                                          setUserShelf(prev => ({ ...prev, have_played: reordered }));
                                          saveSortOrder("have_played", reordered);
                                          setShelfMenuOpen(null);
                                        }}
                                          style={{ background: isCurrentRank ? C.goldDim : "transparent", border: "1px solid " + (isCurrentRank ? C.gold : C.border), borderRadius: 5, padding: "4px 2px", color: isCurrentRank ? C.gold : C.textDim, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                                          {n}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              <button onClick={() => setShelfMenuOpen(null)}
                                style={{ background: "transparent", border: "none", color: C.textDim, fontSize: 10, cursor: "pointer", marginTop: 2 }}>
                                Cancel
                              </button>
                            </div>
                          )}


                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {shelfCount === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎮</div>
                <div style={{ fontSize: 14 }}>Your shelf is empty. Add some games to get started.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviews tab */}
      {activeTab === "reviews" && (
        <div>
          {/* Write Review button + form */}
          <div style={{ marginBottom: 16 }}>
            {!showNewReview ? (
              <button onClick={() => setShowNewReview(true)} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Write a Review</button>
            ) : (
              <div style={{ background: C.surface, border: "1px solid " + C.accentDim, borderRadius: 14, padding: 20, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 14 }}>New Review</div>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  {newReviewGame ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ flex: 1, fontWeight: 600, color: C.text, fontSize: 13 }}>{newReviewGame.name}</div>
                      <button onClick={() => { setNewReviewGame(null); setNewReviewGameSearch(""); }} style={{ background: "none", border: "none", color: C.textDim, fontSize: 16, cursor: "pointer", padding: 0 }}>×</button>
                    </div>
                  ) : (
                    <>
                      <input value={newReviewGameSearch} onChange={async e => {
                        const q = e.target.value;
                        setNewReviewGameSearch(q);
                        if (q.length < 2) { setNewReviewGameResults([]); return; }
                        const { data } = await supabase.from("games").select("id, name, genre").ilike("name", "%" + q + "%").limit(8);
                        setNewReviewGameResults(data || []);
                      }} placeholder="Search for a game..." style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                      {newReviewGameResults.length > 0 && (
                        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, zIndex: 50, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", overflow: "hidden" }}>
                          {newReviewGameResults.map(g => (
                            <div key={g.id} onClick={() => { setNewReviewGame(g); setNewReviewGameResults([]); setNewReviewGameSearch(""); }}
                              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid " + C.border, fontSize: 13, color: C.text }}
                              onMouseEnter={e => e.currentTarget.style.background = C.surfaceRaised}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <div style={{ fontWeight: 600 }}>{g.name}</div>
                              {g.genre && <div style={{ color: C.textDim, fontSize: 11 }}>{g.genre}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setNewReviewForm(f => ({ ...f, rating: n }))}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid " + (newReviewForm.rating >= n ? C.gold : C.border), background: newReviewForm.rating >= n ? C.goldDim : C.surfaceRaised, color: newReviewForm.rating >= n ? C.gold : C.textDim, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      {n}
                    </button>
                  ))}
                </div>
                <input value={newReviewForm.headline} onChange={e => setNewReviewForm(f => ({ ...f, headline: e.target.value }))} placeholder="Headline (e.g. 'A masterpiece that respects your time')" style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
                <input value={newReviewForm.loved} onChange={e => setNewReviewForm(f => ({ ...f, loved: e.target.value }))} placeholder="What you loved..." style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
                <input value={newReviewForm.didnt_love} onChange={e => setNewReviewForm(f => ({ ...f, didnt_love: e.target.value }))} placeholder="What you didn't love..." style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
                <textarea value={newReviewForm.content} onChange={e => setNewReviewForm(f => ({ ...f, content: e.target.value }))} placeholder="Full thoughts (optional)..." style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", resize: "none", minHeight: 80, marginBottom: 12, boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={submitNewReview} disabled={!newReviewGame || !newReviewForm.rating || submittingNewReview}
                    style={{ background: (newReviewGame && newReviewForm.rating) ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 20px", color: (newReviewGame && newReviewForm.rating) ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: (newReviewGame && newReviewForm.rating) ? "pointer" : "default" }}>
                    {submittingNewReview ? "Saving…" : "Submit Review"}
                  </button>
                  <button onClick={() => { setShowNewReview(false); setNewReviewForm({ rating: 0, headline: "", loved: "", didnt_love: "", content: "", time_played: "", completed: false }); setNewReviewGame(null); setNewReviewGameSearch(""); }}
                    style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
          {userReviews.length > 0 ? userReviews.map(review => (
            <div key={review.id} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 12 }}>
              {editingReview?.game_id === review.game_id ? (
                /* Inline edit form */
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 12 }}>Editing: {review.games?.name}</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => setReviewEditForm(f => ({ ...f, rating: n }))}
                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid " + (reviewEditForm.rating >= n ? C.gold : C.border), background: reviewEditForm.rating >= n ? C.goldDim : C.surfaceRaised, color: reviewEditForm.rating >= n ? C.gold : C.textDim, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <input value={reviewEditForm.headline} onChange={e => setReviewEditForm(f => ({ ...f, headline: e.target.value }))} placeholder="Headline (optional)" style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
                  <input value={reviewEditForm.loved} onChange={e => setReviewEditForm(f => ({ ...f, loved: e.target.value }))} placeholder="What you loved..." style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
                  <input value={reviewEditForm.didnt_love} onChange={e => setReviewEditForm(f => ({ ...f, didnt_love: e.target.value }))} placeholder="What you didn't love..." style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
                  <textarea value={reviewEditForm.content} onChange={e => setReviewEditForm(f => ({ ...f, content: e.target.value }))} placeholder="Full thoughts (optional)..." rows={3} style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", resize: "none", marginBottom: 12, boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveReview} disabled={!reviewEditForm.rating || savingReview}
                      style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 20px", color: C.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {savingReview ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditingReview(null)} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 16px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div onClick={() => review.games && (setCurrentGame(review.game_id), setActivePage("game"))}
                      style={{ width: 36, height: 48, borderRadius: 6, background: C.surfaceRaised, border: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: review.games ? "pointer" : "default", overflow: "hidden" }}>
                      {review.games?.cover_url
                        ? <img src={review.games.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ fontWeight: 800, color: C.textDim, fontSize: 11 }}>{(review.games?.name || "?").slice(0,2).toUpperCase()}</div>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div onClick={() => review.games && (setCurrentGame(review.game_id), setActivePage("game"))}
                        style={{ fontWeight: 700, color: C.text, fontSize: 15, cursor: review.games ? "pointer" : "default" }}>{review.games?.name || "Unknown Game"}</div>
                      <div style={{ color: C.textDim, fontSize: 12 }}>{review.games?.developer}{review.time_played ? " · " + review.time_played + "h played" : ""}{review.completed ? " · Completed" : ""}</div>
                    </div>
                    <button onClick={() => startEditReview(review)}
                      style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "6px 12px", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                      Edit
                    </button>
                    <div style={{ background: C.goldDim, border: "1px solid " + C.gold + "44", borderRadius: 8, padding: "6px 12px", color: C.gold, fontWeight: 800, fontSize: 16 }}>{review.rating + "/10"}</div>
                  </div>
                  {review.headline && <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 8 }}>{review.headline}</div>}
                  {review.loved && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>Loved: {review.loved}</div>}
                  {review.didnt_love && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 4 }}>Didn't love: {review.didnt_love}</div>}
                  {review.content && <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: "8px 0 0" }}>{review.content}</p>}
                  <div style={{ color: C.textDim, fontSize: 11, marginTop: 10 }}>{timeAgo(review.created_at)}</div>
                </div>
              )}
            </div>
          )) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
              <div style={{ fontSize: 14 }}>No reviews yet. Use the button above to write your first.</div>
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
                  style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.accentDim}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <Avatar initials={(p.avatar_initials || p.username || "?").slice(0,2).toUpperCase()} size={56} isNPC={p.type === "npc"} founding={p.type !== "npc" && p.is_founding} ring={p.type !== "npc" ? p.active_ring : null} avatarConfig={p.type !== "npc" ? p.avatar_config : null} />
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
                    border: "1px solid " + quest.completed ? C.green + "44" : C.border,
                    borderRadius: 14, padding: "16px 20px",
                    display: "flex", gap: 16, alignItems: "center",
                    opacity: quest.completed ? 0.85 : 1,
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: quest.completed ? C.green + "18" : C.surfaceRaised, border: "1px solid " + quest.completed ? C.green + "33" : C.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                      {quest.completed ? "✓" : quest.is_onboarding ? "🗺️" : "🎯"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: quest.completed ? C.green : C.text, fontSize: 14 }}>{quest.title}</span>
                        {quest.is_onboarding && !quest.completed && <span style={{ background: C.accentGlow, color: C.accentSoft, border: "1px solid " + C.accentDim, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>INTRO</span>}
                        {quest.reward_id && <span style={{ background: rewardColor + "18", color: rewardColor, border: "1px solid " + rewardColor + "33", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{quest.reward_label}</span>}
                      </div>
                      <div style={{ color: C.textMuted, fontSize: 12, marginBottom: quest.completed ? 0 : 8 }}>{quest.description}</div>
                      {!quest.completed && (
                        <>
                          <div style={{ height: 4, background: C.surfaceRaised, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: pct + "%", background: C.accent, borderRadius: 2, transition: "width 0.3s" }} />
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: 28, maxWidth: 420, width: "100%" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 10 }}>Delete your account?</div>
            <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
              This will permanently delete your profile, shelf, reviews, posts, and all activity. You have 14 days to change your mind after requesting deletion — after that, everything is gone for good.
            </div>
            <div style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>Want a copy of your data before you go?</div>
              {exportRequested ? (
                <div style={{ color: C.accentSoft, fontSize: 12, fontWeight: 700 }}>✓ Export requested — we'll be in touch.</div>
              ) : (
                <button onClick={requestDataExport} style={{ background: C.surface, border: "1px solid " + C.accentDim, borderRadius: 8, padding: "6px 14px", color: C.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Request data export
                </button>
              )}
            </div>
            <div style={{ color: C.textDim, fontSize: 12, marginBottom: 8 }}>Type DELETE to confirm:</div>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, marginBottom: 16, boxSizing: "border-box", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 16px", color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Never mind
              </button>
              <button
                onClick={requestDeletion}
                disabled={deleteConfirmText !== "DELETE"}
                style={{ background: deleteConfirmText === "DELETE" ? "#c0392b" : C.surfaceRaised, border: "1px solid " + (deleteConfirmText === "DELETE" ? "#c0392b" : C.border), borderRadius: 8, padding: "8px 16px", color: deleteConfirmText === "DELETE" ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: deleteConfirmText === "DELETE" ? "pointer" : "default", transition: "all 0.2s" }}>
                Request deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {showAvatarBuilder && (
        <AvatarBuilderModal
          currentUser={user}
          userRewards={userRewards}
          onSave={(cfg) => { setLocalAvatarConfig(cfg); onProfileSaved?.(); }}
          onClose={() => setShowAvatarBuilder(false)}
        />
      )}

      {showSteamImport && (
        <SteamImportModal
          currentUser={user}
          onClose={() => setShowSteamImport(false)}
          onImportComplete={() => { setShowSteamImport(false); loadShelf(); onProfileSaved?.(); }}
          onSteamConnected={(id) => setSteamId(id)}
        />
      )}

    </div>
  );
}

export default ProfilePage;
