import { useState, useEffect } from "react";
import supabase from "../supabase.js";

/**
 * Returns the number of games in common between currentUserId and targetUserId.
 * Returns null while loading, 0 if no overlap found.
 *
 * Strategy:
 * 1. Check user_similarity first (fast, pre-computed, have_played only)
 * 2. If no pair exists (below 2-game threshold), count directly from user_games
 *    using both "have_played" and "playing" so actively-played games count
 */
export function useGamesInCommon(currentUserId, targetUserId) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      setCount(null);
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      // Fast path: pre-computed similarity pair
      const { data: simData } = await supabase
        .from("user_similarity")
        .select("overlap_count")
        .eq("user_id", currentUserId)
        .eq("similar_user_id", targetUserId)
        .maybeSingle();

      if (cancelled) return;

      if (simData && simData.overlap_count > 0) {
        setCount(simData.overlap_count);
        return;
      }

      // Fallback: direct count including "playing" (user_similarity only counts have_played)
      const { data: myGames } = await supabase
        .from("user_games")
        .select("game_id")
        .eq("user_id", currentUserId)
        .in("status", ["have_played", "playing"]);

      if (cancelled) return;

      if (!myGames || myGames.length === 0) { setCount(0); return; }

      const { count: directCount } = await supabase
        .from("user_games")
        .select("game_id", { count: "exact", head: true })
        .eq("user_id", targetUserId)
        .in("status", ["have_played", "playing"])
        .in("game_id", myGames.map(g => g.game_id));

      if (!cancelled) setCount(directCount || 0);
    };

    fetch();
    return () => { cancelled = true; };
  }, [currentUserId, targetUserId]);

  return count;
}
