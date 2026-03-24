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

function formatPlatformName(name) {
  const map = {
    "PC (Microsoft Windows)": "PC",
    "PlayStation 5": "PS5", "PlayStation 4": "PS4", "PlayStation 3": "PS3",
    "PlayStation 2": "PS2", "PlayStation": "PS1",
    "Xbox Series X|S": "Xbox Series X/S", "Xbox One": "Xbox One",
    "Xbox 360": "Xbox 360", "Xbox": "Xbox",
    "Nintendo Switch": "Switch", "Nintendo 3DS": "3DS", "Nintendo DS": "DS",
    "Wii U": "Wii U", "Wii": "Wii", "Game Boy Advance": "GBA",
    "iOS": "iOS", "Android": "Android", "Mac": "Mac", "Linux": "Linux",
  };
  return map[name] || name;
}

function formatGame(g) {
  const MAJOR_PLATFORMS = ["PC (Microsoft Windows)", "PlayStation 5", "PlayStation 4",
    "PlayStation 3", "Xbox Series X|S", "Xbox One", "Xbox 360", "Nintendo Switch", "iOS", "Android", "Mac"];
  let platforms = null;
  if (g.platforms?.length) {
    const names = g.platforms.map(p => p.name);
    const sorted = [
      ...names.filter(n => MAJOR_PLATFORMS.includes(n)),
      ...names.filter(n => !MAJOR_PLATFORMS.includes(n)),
    ];
    platforms = sorted.slice(0, 4).map(formatPlatformName).join(", ");
  }
  return {
    igdb_id: g.id,
    name: g.name,
    summary: g.summary || null,
    genre: g.genres?.[0]?.name || null,
    platforms,
    cover_url: g.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
      : null,
    first_release_date: g.first_release_date || null,
    developer: g.involved_companies?.find(c => c.developer)?.company?.name || null,
    follows: g.follows || 0,
  };
}

const FIELDS = "name, genres.name, summary, cover.image_id, first_release_date, involved_companies.company.name, involved_companies.developer, platforms.name";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { query, igdb_id, slug } = req.body;
  try {
    const token = await getAccessToken();
    const headers = {
      "Client-ID": process.env.IGDB_CLIENT_ID,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "text/plain",
    };

    if (slug) {
      const r = await fetch("https://api.igdb.com/v4/games", { method: "POST", headers, body: `fields ${FIELDS}; where slug = "${slug}"; limit 1;` });
      return res.status(200).json({ games: (await r.json()).map(formatGame) });
    }

    if (igdb_id) {
      const r = await fetch("https://api.igdb.com/v4/games", { method: "POST", headers, body: `fields ${FIELDS}; where id = ${igdb_id}; limit 1;` });
      return res.status(200).json({ games: (await r.json()).map(formatGame) });
    }

    if (query) {
      const r = await fetch("https://api.igdb.com/v4/games", { method: "POST", headers, body: `search "${query.replace(/"/g, "")}"; fields ${FIELDS}, follows, category, rating, rating_count; limit 30;` });
      const games = await r.json();
      const categoryFiltered = (games || []).filter(g => ![1, 2, 6].includes(g.category));
      const qualityFiltered = categoryFiltered.filter(g =>
        g.cover?.image_id || (g.rating_count || 0) > 0 || (g.follows || 0) > 0 || g.category === 0
      );
      const sorted = qualityFiltered.sort((a, b) => {
        const aScore = (a.cover?.image_id ? 10000 : 0) + (a.rating_count || 0) * 10 + (a.follows || 0);
        const bScore = (b.cover?.image_id ? 10000 : 0) + (b.rating_count || 0) * 10 + (b.follows || 0);
        return bScore - aScore;
      });
      return res.status(200).json({ games: (sorted.length > 0 ? sorted : categoryFiltered).slice(0, 10).map(formatGame) });
    }

    return res.status(400).json({ error: "Provide query or igdb_id" });
  } catch (err) {
    cachedToken = null;
    tokenExpiry = 0;
    console.error("[igdb] error:", err);
    return res.status(500).json({ error: "IGDB request failed" });
  }
}
