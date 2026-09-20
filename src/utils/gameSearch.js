// src/utils/gameSearch.js
// (deploy retry marker — Vercel missed the previous push, forcing a fresh commit)
//
// Shared game-search core. Consolidated July 2026 after the same bug —
// relevance loss on old exact matches, name-only dedup causing duplicate
// inserts, and out-of-order async race conditions — was found independently
// broken in ProfilePage.jsx and App.jsx's NavSearch (the "Myst won't add"
// bug). At the time this was written, 12 files in the codebase had their
// own hand-rolled game search logic; ProfilePage and App.jsx were migrated
// to this shared version first. The other 10 (XboxImportModal,
// SteamImportModal, PSNImportModal, Onboarding, FeedPostCard, FeedPage,
// ReviewsPage, GuildPortal, GamesPage, GamingSessionsPage) still have their
// own copies as of this writing — migrate them to this module as they come
// up, rather than patching bugs in place, so this bug class can't recur.
//
// Bug details, for context if this needs debugging again later:
//  1. RELEVANCE: sorting local matches by first_release_date DESC with a
//     tight limit() let newer substring matches ("Mystery", "Mystic") push
//     older exact matches ("Myst", 1993) out of the result set entirely.
//     Fixed by fetching a wider unsorted set and ranking client-side
//     (exact match > starts-with > whole-word > substring, then shorter
//     names, then newest).
//  2. DEDUP: "is this game already in our DB" was checked against the same
//     display-limited/sorted local slice used for the DB-match column —
//     meaning a game correctly excluded from the display slice would also
//     wrongly be treated as brand new when it appeared in IGDB's own
//     results. Fixed by checking against the FULL local match set (by both
//     igdb_id and name), independent of the display limit.
//  3. INSERT COLLISION: even with (1) and (2) fixed, a game misclassified
//     as "new" would hit a plain `.insert()` and collide with the unique
//     constraint on games.name/igdb_id, failing with a silent 409. Fixed by
//     using `.upsert(..., { onConflict: "igdb_id", ignoreDuplicates: true })`
//     as a safety net regardless of whether dedup logic is correct.
//  4. RACE CONDITION: each keystroke fired its own async request with
//     nothing guaranteeing the last-FIRED request also resolved last. A
//     slower, stale response landing after a newer one could silently
//     overwrite correct results. Fixed with a caller-side sequence-number
//     guard — see searchGamesForShelf usage in ProfilePage.jsx / App.jsx
//     for the pattern (increment a ref on every call, discard the response
//     if a newer call has since been made).

import supabase from "../supabase.js";

/**
 * Core local+IGDB game search, relevance-ranked and safely deduped.
 * Every "search for a game" UI should call this rather than writing its
 * own query — this is the fix for the Myst bug, and callers get it for free.
 *
 * @param {string} q - search text (already trimmed/stripped of any leading @ etc by caller)
 * @param {object} opts
 * @param {number} opts.localFetchLimit - how many local rows to pull before ranking (default 30, wide on purpose — narrowing this reintroduces the original bug)
 * @param {number} opts.displayLimit - how many ranked local results to keep for display (default 8)
 * @param {number} opts.igdbNewLimit - how many net-new IGDB results to include (default unlimited/all returned)
 * @returns {Promise<{ local: object[], fromIGDB: object[], fromUpcoming: object[] }>}
 */
export async function searchGamesCore(q, opts = {}) {
  const { localFetchLimit = 30, displayLimit = 8, igdbNewLimit = null } = opts;

  const [localRes, igdbRes] = await Promise.allSettled([
    supabase.from("games")
      .select("id, name, genre, developer, cover_url, platforms, igdb_id, first_release_date")
      .ilike("name", "%" + q + "%")
      .limit(localFetchLimit),
    fetch("/api/igdb", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    }).then(r => r.json()).catch(() => ({ games: [] })),
  ]);

  const localAll = localRes.status === "fulfilled" ? (localRes.value.data || []) : [];
  const igdb = igdbRes.status === "fulfilled" ? (igdbRes.value.games || []) : [];
  const upcoming = igdbRes.status === "fulfilled" ? (igdbRes.value.upcoming || []) : [];

  // Relevance rank: exact match > starts-with > whole-word > substring,
  // then shorter names (closer to the query), then newest.
  // first_release_date comes in two different shapes depending on source:
  // local DB rows (a Postgres `date` column) return an ISO string like
  // "1993-09-24"; IGDB's raw API returns a Unix timestamp (seconds). Mixing
  // both in one sort without normalizing crashed on whichever shape the
  // comparator wasn't written for — see conversation, July 13 2026.
  const toTimestampMs = (d) => {
    if (d == null || d === "") return 0;
    if (typeof d === "number") return d * 1000; // IGDB epoch seconds -> ms
    const t = Date.parse(d); // local ISO date string -> ms
    return Number.isNaN(t) ? 0 : t;
  };

  const qLower = q.toLowerCase();
  const scored = localAll.map((g) => {
    const nameLower = g.name.toLowerCase();
    let rank = 3;
    if (nameLower === qLower) rank = 0;
    else if (nameLower.startsWith(qLower)) rank = 1;
    else if (nameLower.split(/\s+/).includes(qLower)) rank = 2;
    return { ...g, _rank: rank };
  });
  scored.sort((a, b) => {
    if (a._rank !== b._rank) return a._rank - b._rank;
    if (a.name.length !== b.name.length) return a.name.length - b.name.length;
    return toTimestampMs(b.first_release_date) - toTimestampMs(a.first_release_date);
  });
  const local = scored.slice(0, displayLimit);

  // Dedup against the FULL local match set — not the display-limited slice.
  const localIgdbIds = new Set(localAll.map((g) => g.igdb_id).filter(Boolean));
  const localNamesLower = new Set(localAll.map((g) => g.name.toLowerCase()));
  const isKnown = (g) =>
    (g.igdb_id && localIgdbIds.has(g.igdb_id)) || localNamesLower.has((g.name || "").toLowerCase());

  let fromIGDB = igdb.filter((g) => !isKnown(g)).map((g) => ({ ...g, _fromIGDB: true }));
  let fromUpcoming = upcoming.filter((g) => !isKnown(g)).map((g) => ({ ...g, _fromIGDB: true, _upcoming: true }));
  if (igdbNewLimit != null) {
    fromIGDB = fromIGDB.slice(0, igdbNewLimit);
    fromUpcoming = fromUpcoming.slice(0, igdbNewLimit);
  }

  return { local, fromIGDB, fromUpcoming };
}

/**
 * Safety net for adding an IGDB-sourced game. games has TWO separate unique
 * constraints — games_igdb_id_unique and games_name_unique — so upserting
 * on igdb_id alone isn't sufficient: an IGDB result whose igdb_id doesn't
 * match anything locally (e.g. a re-indexed IGDB entry with a different ID
 * than what was originally stored) can still collide on name and 409.
 *
 * Strategy: check for an existing row by name FIRST (cheap, avoids the
 * conflict entirely in the common case), fall back to upsert-by-igdb_id,
 * and if that *still* 409s (name collision on the upsert itself), do one
 * final lookup by name before giving up. This can't throw an uncaught 409
 * for either constraint.
 */
export async function upsertGameFromIGDB(game) {
  // 1. Already exists by name? Just use that row — most common case for a
  //    search-dedup miss, and avoids ever touching the unique constraints.
  const { data: byName } = await supabase
    .from("games")
    .select("*")
    .ilike("name", game.name)
    .maybeSingle();
  if (byName) return byName;

  const payload = {
    name: game.name,
    genre: game.genre,
    summary: game.summary,
    cover_url: game.cover_url,
    igdb_id: game.igdb_id,
    first_release_date: game.first_release_date,
    followers: 0,
    platforms: game.platforms || null,
  };

  // 2. Upsert on igdb_id — handles the case where the same IGDB game was
  //    already inserted previously under this exact igdb_id.
  const { error: upsertErr } = await supabase
    .from("games")
    .upsert(payload, { onConflict: "igdb_id", ignoreDuplicates: true });

  if (upsertErr) {
    // 3. Last resort: the upsert itself hit the OTHER unique constraint
    //    (name) — a row with this name exists but wasn't caught by step 1
    //    (race condition: something else inserted it between step 1 and
    //    now) or has a different igdb_id than expected. Re-check by name
    //    one more time rather than surfacing the 409 to the user.
    console.error("game upsert failed, falling back to name lookup:", upsertErr);
    const { data: fallback } = await supabase.from("games").select("*").ilike("name", game.name).maybeSingle();
    return fallback || null;
  }

  const { data: row } = await supabase.from("games").select("*").eq("igdb_id", game.igdb_id).maybeSingle();
  return row;
}
