// api/steam.js — Vercel serverless function for Steam library import

const STEAM_API = "https://api.steampowered.com";
const STEAM_KEY = process.env.STEAM_API_KEY;

// Resolve a vanity URL or profile URL to a Steam64 ID
async function resolveSteamId(input) {
  const trimmed = input.trim();

  // Already a Steam64 ID (17-digit number)
  if (/^\d{17}$/.test(trimmed)) return trimmed;

  // Extract vanity name from URL patterns:
  // steamcommunity.com/id/USERNAME
  // steamcommunity.com/profiles/STEAM64ID
  const profileMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/);
  if (profileMatch) return profileMatch[1];

  const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^\/\?]+)/);
  const vanityName = vanityMatch ? vanityMatch[1] : trimmed;

  // Resolve vanity URL to Steam64 ID
  const res = await fetch(
    `${STEAM_API}/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_KEY}&vanityurl=${encodeURIComponent(vanityName)}`
  );
  const data = await res.json();
  if (data.response?.success === 1) return data.response.steamid;
  throw new Error("Could not find Steam profile. Make sure your profile URL or username is correct.");
}

// Fetch player summary (avatar, display name)
async function getPlayerSummary(steamId) {
  const res = await fetch(
    `${STEAM_API}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_KEY}&steamids=${steamId}`
  );
  const data = await res.json();
  const player = data.response?.players?.[0];
  if (!player) throw new Error("Profile not found or is private.");
  if (player.communityvisibilitystate !== 3) {
    throw new Error("Your Steam profile is set to private. Please set it to public in Steam Settings → Privacy → Profile Status → Public.");
  }
  return {
    steamId,
    playerName: player.personaname,
    avatar: player.avatarmedium,
  };
}

// Fetch owned games with playtime
async function getOwnedGames(steamId) {
  const res = await fetch(
    `${STEAM_API}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`
  );
  const data = await res.json();
  if (!data.response?.games) return [];

  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  return data.response.games.map(g => {
    const playtimeMinutes = g.playtime_forever || 0;
    const recentMinutes = g.playtime_2weeks || 0;
    const recentlyPlayed = recentMinutes > 0;

    return {
      appid: g.appid,
      name: g.name,
      playtime_hours: Math.round(playtimeMinutes / 60 * 10) / 10,
      recently_played: recentlyPlayed,
      suggested_status: recentlyPlayed ? "playing" : "have_played",
      img_icon: g.img_icon_url
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
        : null,
      source: "library",
    };
  });
}

// Fetch wishlist
async function getWishlist(steamId) {
  try {
    const res = await fetch(
      `https://store.steampowered.com/wishlist/profiles/${steamId}/wishlistdata/?p=0`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || typeof data !== "object") return [];

    return Object.entries(data).map(([appid, game]) => ({
      appid: parseInt(appid),
      name: game.name,
      playtime_hours: 0,
      recently_played: false,
      suggested_status: "want_to_play",
      img_icon: game.capsule
        ? game.capsule
        : null,
      source: "wishlist",
    }));
  } catch {
    // Wishlist may be private or unavailable — non-fatal
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { input } = req.body;
  if (!input?.trim()) return res.status(400).json({ error: "Steam ID or profile URL required." });

  try {
    // 1. Resolve to Steam64 ID
    const steamId = await resolveSteamId(input);

    // 2. Get player summary (also validates profile is public)
    const profile = await getPlayerSummary(steamId);

    // 3. Get owned games
    const libraryGames = await getOwnedGames(steamId);

    // 4. Get wishlist (non-fatal if unavailable)
    const wishlistGames = await getWishlist(steamId);

    // 5. Merge — wishlist games that are already in library are skipped
    const libraryAppIds = new Set(libraryGames.map(g => g.appid));
    const wishlistOnly = wishlistGames.filter(g => !libraryAppIds.has(g.appid));

    const allGames = [...libraryGames, ...wishlistOnly];

    // Sort: recently played first, then alphabetical
    allGames.sort((a, b) => {
      if (a.recently_played && !b.recently_played) return -1;
      if (!a.recently_played && b.recently_played) return 1;
      return a.name.localeCompare(b.name);
    });

    return res.status(200).json({
      ...profile,
      playedGames: libraryGames.length,
      wishlistGames: wishlistOnly.length,
      recentGames: libraryGames.filter(g => g.recently_played).length,
      games: allGames,
    });

  } catch (err) {
    console.error("[steam] error:", err.message);
    return res.status(400).json({ error: err.message || "Failed to fetch Steam data." });
  }
}
