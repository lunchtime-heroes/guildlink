const { exchangeNpssoForAccessCode, exchangeAccessCodeForAuthTokens, getUserTitles } = require("psn-api");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { npsso } = req.body;
  if (!npsso || typeof npsso !== "string" || npsso.trim().length < 10) {
    return res.status(400).json({ error: "Invalid NPSSO token." });
  }

  try {
    // Exchange NPSSO for access token
    const accessCode = await exchangeNpssoForAccessCode(npsso.trim());
    const authorization = await exchangeAccessCodeForAuthTokens(accessCode);

    // Fetch all trophy titles — paginate if needed
    const allTitles = [];
    let offset = 0;
    const limit = 200;

    while (true) {
      const response = await getUserTitles(
        { accessToken: authorization.accessToken },
        "me",
        { limit, offset }
      );
      const titles = response?.trophyTitles || [];
      allTitles.push(...titles);
      if (titles.length < limit) break;
      offset += limit;
    }

    // Clean up PSN title quirks — strip trophy suffixes only
    const cleanName = (name) => {
      if (!name) return name;
      return name
        .replace(/\s+Trophies$/i, "")
        .replace(/\s+Trophy\s+set$/i, "")
        .replace(/\s+Trophy\s+Pack$/i, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Map to GuildLink game format
    const games = allTitles
      .filter(t => t.trophyTitleName && (t.earnedTrophies?.bronze > 0 || t.earnedTrophies?.silver > 0 || t.earnedTrophies?.gold > 0 || t.earnedTrophies?.platinum > 0))
      .map(t => ({
        name: cleanName(t.trophyTitleName),
        platform: t.trophyTitlePlatform || "PS",
        iconUrl: t.trophyTitleIconUrl || null,
        trophiesEarned: (t.earnedTrophies?.bronze || 0) + (t.earnedTrophies?.silver || 0) + (t.earnedTrophies?.gold || 0) + (t.earnedTrophies?.platinum || 0),
        lastUpdatedAt: t.lastUpdatedDateTime || null,
        suggested_status: "have_played",
      }))
      .sort((a, b) => new Date(b.lastUpdatedAt || 0) - new Date(a.lastUpdatedAt || 0));

    return res.status(200).json({
      games,
      totalGames: games.length,
      accountId: authorization.accountId || null,
    });

  } catch (err) {
    console.error("[psn] error:", err?.message || err);
    if (err?.message?.includes("NPSSO") || err?.message?.includes("npsso") || err?.status === 400) {
      return res.status(400).json({ error: "Invalid or expired NPSSO token. Please get a fresh one from PlayStation.com." });
    }
    if (err?.status === 403 || err?.message?.includes("forbidden")) {
      return res.status(403).json({ error: "PSN account is private or access was denied." });
    }
    return res.status(500).json({ error: "Failed to connect to PlayStation Network. Please try again." });
  }
};
