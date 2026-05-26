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

// Extract a readable title from a URL slug as a last-resort fallback
function slugToTitle(url) {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.split("/").filter(Boolean).pop() || "";
    // Strip trailing file extensions and numeric IDs
    const cleaned = slug.replace(/\.[a-z]{2,4}$/, "").replace(/-\d+$/, "");
    return cleaned.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).trim() || null;
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  if (!isAllowed(url)) {
    return res.status(200).json({ allowed: false, domain: getDomain(url) });
  }

  const domain = getDomain(url);

  // X/Twitter: scraping is blocked by Cloudflare — use the public oEmbed API instead
  if (domain === "x.com" || domain === "twitter.com") {
    try {
      const oembedUrl = "https://publish.twitter.com/oembed?url=" + encodeURIComponent(url) + "&omit_script=true";
      const oRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
      if (oRes.ok) {
        const oData = await oRes.json();
        // Strip HTML tags from the embed HTML to get plain tweet text
        const tweetText = oData.html
          ? oData.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim().slice(0, 200)
          : null;
        return res.status(200).json({
          allowed: true, url, domain,
          title: oData.author_name ? oData.author_name + " on X" : "Post on X",
          description: tweetText,
          image: null,
        });
      }
    } catch {}
    // oEmbed failed — return a minimal branded fallback
    return res.status(200).json({ allowed: true, url, domain, title: "Post on X", description: null, image: null });
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GuildLink/1.0; +https://guildlink.gg)" },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    const html = await response.text();

    // Cloudflare challenge page — no useful OG data, fall back to slug title
    const isChallenge = html.includes("Just a moment") || html.includes("cf-browser-verification") || html.includes("_cf_chl_");

    const getMeta = (property) => {
      const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, "i"));
      return match ? match[1].trim() : null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    const ogTitle = !isChallenge ? (getMeta("og:title") || getMeta("twitter:title") || (titleMatch ? titleMatch[1].trim() : null)) : null;
    const ogDesc = !isChallenge ? (getMeta("og:description") || getMeta("twitter:description") || null) : null;
    const ogImage = !isChallenge ? (getMeta("og:image") || getMeta("twitter:image") || null) : null;

    return res.status(200).json({
      allowed: true,
      url,
      title: ogTitle || slugToTitle(url),
      description: ogDesc,
      image: ogImage,
      domain,
    });
  } catch (err) {
    return res.status(200).json({ allowed: true, url, domain, title: slugToTitle(url), description: null, image: null });
  }
};
