// api/igdb.js — Vercel serverless function for IGDB queries
// Handles token exchange and game search, keeping credentials server-side

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  );
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; // refresh 5min early
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
      // Fetch single game by IGDB ID (for enriching existing games)
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
      // Search by name
      const body = `
        search "${query.replace(/"/g, "")}";
        fields name, genres.name, summary, cover.image_id, first_release_date,
               involved_companies.company.name, involved_companies.developer;
        limit 10;
      `;
      const r = await fetch("https://api.igdb.com/v4/games", { method: "POST", headers, body });
      const games = await r.json();
      return res.status(200).json({ games: games.map(formatGame) });
    }

    return res.status(400).json({ error: "Provide query or igdb_id" });

  } catch (err) {
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
  };
}
