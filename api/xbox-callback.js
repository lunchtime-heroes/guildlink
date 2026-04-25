// api/xbox-callback.js
// Handles Microsoft OAuth return, exchanges code for tokens, fetches Xbox game library

const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect("/?xbox_error=auth_failed");
  }

  const clientId = process.env.XBOX_CLIENT_ID;
  const clientSecret = process.env.XBOX_CLIENT_SECRET;
  const redirectUri = process.env.XBOX_REDIRECT_URI || "https://guildlink.gg/api/xbox-callback";

  try {
    // Step 1: Exchange code for Microsoft access token
    // Use common endpoint with consumer account
    const tokenRes = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[xbox-callback] token exchange failed:", tokenData);
      return res.redirect("/?xbox_error=token_failed");
    }

    const msAccessToken = tokenData.access_token;
    console.log("[xbox-callback] step 1 complete - got MS token");

    // Step 2: Exchange Microsoft token for Xbox Live token
    const xblRes = await fetch("https://user.auth.xboxlive.com/user/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: `d=${msAccessToken}`,
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT",
      }),
    });

    if (!xblRes.ok) {
      const xblText = await xblRes.text();
      console.error("[xbox-callback] XBL auth failed with status:", xblRes.status, xblText);
      return res.redirect("/?xbox_error=xbl_failed");
    }

    const xblData = await xblRes.json();
    if (!xblData.Token) {
      console.error("[xbox-callback] XBL auth failed:", xblData);
      return res.redirect("/?xbox_error=xbl_failed");
    }

    const xblToken = xblData.Token;
    const userHash = xblData.DisplayClaims?.xui?.[0]?.uhs;
    console.log("[xbox-callback] step 2 complete - got XBL token");

    // Step 3: Exchange XBL token for XSTS token
    const xstsRes = await fetch("https://xsts.auth.xboxlive.com/xsts/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        Properties: {
          SandboxId: "RETAIL",
          UserTokens: [xblToken],
        },
        RelyingParty: "http://xboxlive.com",
        TokenType: "JWT",
      }),
    });

    const xstsData = await xstsRes.json();
    if (!xstsData.Token) {
      console.error("[xbox-callback] XSTS auth failed:", xstsData);
      return res.redirect("/?xbox_error=xsts_failed");
    }

    const xstsToken = xstsData.Token;
    const authHeader = `XBL3.0 x=${userHash};${xstsToken}`;
    console.log("[xbox-callback] step 3 complete - got XSTS token");

    // Step 4: Get Xbox profile (gamertag)
    const profileRes = await fetch("https://profile.xboxlive.com/users/me/profile/settings?settings=Gamertag", {
      headers: {
        Authorization: authHeader,
        "x-xbl-contract-version": "2",
        Accept: "application/json",
      },
    });

    const profileData = await profileRes.json();
    const gamertag = profileData.profileUsers?.[0]?.settings?.find(s => s.id === "Gamertag")?.value || "Xbox User";
    const xuid = profileData.profileUsers?.[0]?.id;
    console.log("[xbox-callback] step 4 complete - gamertag:", gamertag, "xuid:", xuid);

    // Step 5: Fetch game library (titles played)
    const gamesRes = await fetch(
      `https://titlehub.xboxlive.com/users/xuid(${xuid})/titles/titlehistory/decoration/Achievement,Image,GamePass?maxItems=500`,
      {
        headers: {
          Authorization: authHeader,
          "x-xbl-contract-version": "2",
          Accept: "application/json",
          "Accept-Language": "en-US",
        },
      }
    );

    const gamesData = await gamesRes.json();
    if (!gamesRes.ok) {
      console.error("[xbox-callback] titlehub failed:", gamesRes.status, JSON.stringify(gamesData));
    }
    const titles = gamesData.titles || [];
    console.log("[xbox-callback] step 5 complete - found", titles.length, "titles");

    // Step 6: Filter and format games
    const games = titles
      .filter(t => t.type === "Game" && t.name)
      .map(t => {
        const rawCover = t.displayImage || t.images?.find(i => i.type === "BoxArt")?.url || null;
        const cover_url = rawCover ? rawCover.replace(/^http:\/\//i, "https://") : null;
        return {
          id: t.titleId,
          name: t.name,
          cover_url,
          last_played: t.titleHistory?.lastTimePlayed || null,
          minutes_played: t.titleHistory?.minutesPlayed || 0,
          suggested_status: t.titleHistory?.minutesPlayed > 0
            ? (isRecentlyPlayed(t.titleHistory?.lastTimePlayed) ? "playing" : "have_played")
            : "have_played",
        };
      });

    // Store in Supabase temp table instead of URL (game lists are too large for URL params)
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const sessionId = `xbox_${xuid}_${Date.now()}`;
    const { error: insertError } = await supabaseAdmin.from("xbox_import_sessions").upsert({
      session_id: sessionId,
      xuid,
      gamertag,
      games,
      created_at: new Date().toISOString(),
    }, { onConflict: "session_id" });

    if (insertError) {
      console.error("[xbox-callback] failed to save session:", insertError);
      return res.redirect("/?xbox_error=session_save_failed");
    }

    return res.redirect(`/?xbox_session=${sessionId}`);

  } catch (err) {
    console.error("[xbox-callback] unexpected error:", err);
    return res.redirect("/?xbox_error=unknown");
  }
}

function isRecentlyPlayed(lastPlayedStr) {
  if (!lastPlayedStr) return false;
  const lastPlayed = new Date(lastPlayedStr);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  return lastPlayed > twoWeeksAgo;
}
