// api/xbox-auth.js
// Redirects user to Microsoft OAuth to authorize GuildLink to read their Xbox library

module.exports = function handler(req, res) {
  const clientId = process.env.XBOX_CLIENT_ID;
  const redirectUri = process.env.XBOX_REDIRECT_URI || "https://guildlink.gg/api/xbox-callback";

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid profile offline_access https://graph.microsoft.com/User.Read",
    response_mode: "query",
    prompt: "select_account",
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  res.redirect(authUrl);
}
