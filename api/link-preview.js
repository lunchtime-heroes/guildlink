// api/link-preview.js — Validates URLs and fetches Open Graph metadata

const ALLOWED_DOMAINS = [
  // Video
  "youtube.com", "www.youtube.com", "youtu.be",
  "twitch.tv", "www.twitch.tv", "clips.twitch.tv",
  // Social
  "twitter.com", "x.com", "reddit.com", "www.reddit.com",
  // Gaming news
  "ign.com", "www.ign.com",
  "kotaku.com", "www.kotaku.com",
  "polygon.com", "www.polygon.com",
  "eurogamer.net", "www.eurogamer.net",
  "gamespot.com", "www.gamespot.com",
  "pcgamer.com", "www.pcgamer.com",
  "rockpapershotgun.com", "www.rockpapershotgun.com",
  "giantbomb.com", "www.giantbomb.com",
  "videogameschronicle.com", "www.videogameschronicle.com",
  "gameinformer.com", "www.gameinformer.com",
  "metacritic.com", "www.metacritic.com",
  "thegamer.com", "www.thegamer.com",
  "destructoid.com", "www.destructoid.com",
  "vg247.com", "www.vg247.com",
  // Storefronts / official
  "store.steampowered.com", "steampowered.com",
  "epicgames.com", "www.epicgames.com",
  "store.playstation.com", "playstation.com", "blog.playstation.com",
  "xbox.com", "www.xbox.com", "news.xbox.com",
  "nintendo.com", "www.nintendo.com",
  // Reference
  "wikipedia.org", "en.wikipedia.org",
  "imdb.com", "www.imdb.com",
  "igdb.com", "www.igdb.com",
];

function getDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowed(url) {
  const domain = getDomain(url);
  if (!domain) return false;
  return ALLOWED_DOMAINS.some(allowed =>
    domain === allowed || domain.endsWith("." + allowed)
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  if (!isAllowed(url)) {
    return res.status(200).json({ allowed: false, domain: getDomain(url) });
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "GuildLink/1.0 (link preview bot)" },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    const html = await response.text();

    const getMeta = (property) => {
      const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, "i"));
      return match ? match[1].trim() : null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    const preview = {
      allowed: true,
      url,
      title: getMeta("og:title") || getMeta("twitter:title") || (titleMatch ? titleMatch[1].trim() : null),
      description: getMeta("og:description") || getMeta("twitter:description") || null,
      image: getMeta("og:image") || getMeta("twitter:image") || null,
      domain: getDomain(url),
    };

    return res.status(200).json(preview);
  } catch (err) {
    // Still allowed, just couldn't fetch preview
    return res.status(200).json({ allowed: true, url, domain: getDomain(url), title: null, description: null, image: null });
  }
}
