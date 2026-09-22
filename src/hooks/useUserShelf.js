// src/hooks/useUserShelf.js
//
// Centralizes what used to be a copy-pasted fetch in every file that needed
// to know "does the current user already have this game on their shelf, and
// if so, what status?" — first written for GamesPage.jsx, then duplicated
// (with the exact same shape) in FeedPage.jsx. Extracted so a third, fourth,
// fifth... copy never gets written by hand again.
//
// Returns a `game_id -> status` Map (not a Set) — status is needed, not just
// membership, so callers can show "which shelf" a game is on, not just that
// it's on one somewhere.

import { useState, useEffect, useCallback } from "react";
import supabase from "../supabase.js";

export function useUserShelf(currentUser) {
  const [userShelf, setUserShelf] = useState(new Map());

  const refresh = useCallback(async () => {
    if (!currentUser?.id) { setUserShelf(new Map()); return; }
    const { data } = await supabase
      .from("user_games")
      .select("game_id, status")
      .eq("user_id", currentUser.id);
    if (data) setUserShelf(new Map(data.map(r => [r.game_id, r.status])));
  }, [currentUser?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  // setLocalStatus lets a caller optimistically update the Map the instant
  // ShelfStatusMenu writes a new status, without waiting on a full refetch.
  const setLocalStatus = useCallback((gameId, status) => {
    setUserShelf(prev => {
      const next = new Map(prev);
      next.set(gameId, status);
      return next;
    });
  }, []);

  return { userShelf, refreshUserShelf: refresh, setLocalStatus };
}
