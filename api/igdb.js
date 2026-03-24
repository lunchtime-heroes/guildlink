// api/igdb.js — Vercel serverless function for IGDB queries
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get IGDB token");
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { query, igdb_id } = req.body;
  try {
    const token = await getAccessToken();
    const headers = {
      "Client-ID": process.env.IGDB_CLIENT_ID,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "text/plain",
    };

    if (igdb_id) {
      const body = `
        fields name, genres.name, summary, cover.image_id, first_release_date,
               involved_companies.company.name, involved_companies.developer;
        where id = ${igdb_id};
        limit 1;
      `;
      const r = await fetch("https://api.igdb.com/v4/games", { method: "POST", headers, body });
      const games = await r.json();
      return res.status(200).json({ games: games.map(formatGame) });
    }

    if (query) {
      const body = `
        search "${query.replace(/"/g, "")}";
        fields name, genres.name, summary, cover.image_id, first_release_date,
               involved_companies.company.name, involved_companies.developer, follows, category, rating, rating_count;
        limit 30;
      `;
      const r = await fetch("https://api.igdb.com/v4/games", { method: "POST", headers, body });
      const games = await r.json();

      // Only filter out DLC (1), expansions (2), and mods (6)
      // Keep bundles (3), episodes (4), seasons (5), remakes (8), remasters (9), ports (10), forks (11)
      const EXCLUDED_CATEGORIES = [1, 2, 6];
      const categoryFiltered = (games || []).filter(g => !EXCLUDED_CATEGORIES.includes(g.category));

      // Loose quality filter: remove games with NO cover AND NO rating AND NO follows
      // This catches true shovelware while keeping any game with any signal of legitimacy
      const qualityFiltered = categoryFiltered.filter(g =>
        g.cover?.image_id ||
        (g.rating_count || 0) > 0 ||
        (g.follows || 0) > 0 ||
        g.category === 0
      );

      // Sort: cover art first, then by rating count + follows as combined signal
      const sorted = qualityFiltered.sort((a, b) => {
        const aScore = (a.cover?.image_id ? 10000 : 0) + (a.rating_count || 0) * 10 + (a.follows || 0);
        const bScore = (b.cover?.image_id ? 10000 : 0) + (b.rating_count || 0) * 10 + (b.follows || 0);
        return bScore - aScore;
      });

      // Fall back to just category-filtered if quality filter removes everything
      const results = sorted.length > 0 ? sorted : categoryFiltered;
      return res.status(200).json({ games: results.slice(0, 10).map(formatGame) });
    }

    return res.status(400).json({ error: "Provide query or igdb_id" });
  } catch (err) {
    // Clear cached token on error so next request gets a fresh one
    cachedToken = null;
    tokenExpiry = 0;
    console.error("[igdb] error:", err);
    return res.status(500).json({ error: "IGDB request failed" });
  }
}

function formatGame(g) {
  return {
    igdb_id: g.id,
    name: g.name,
    summary: g.summary || null,
    genre: g.genres?.[0]?.name || null,
    cover_url: g.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
      : null,
    first_release_date: g.first_release_date || null,
    developer: g.involved_companies?.find(c => c.developer)?.company?.name || null,
    follows: g.follows || 0,
  };
}
