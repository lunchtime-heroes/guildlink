// api/resend-backfill.js
// ONE-TIME SCRIPT — hit this once to load all real-email users into Resend audience
// Admin-protected. After running, you can delete or disable this route.

const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  // Simple admin protection — require a secret token in the request
  const { token } = req.query;
  if (!token || token !== process.env.ADMIN_API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Use the admin API to access auth.users
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });

  if (authError) {
    return res.status(500).json({ error: "Failed to fetch users", detail: authError.message });
  }

  // Filter to real emails only
  const realUsers = authUsers.filter(u =>
    u.email && !u.email.endsWith("@guildlink.gg")
  );

  const results = { success: [], failed: [], skipped: [] };

  for (const user of realUsers) {
    try {
      const response = await fetch(
        "https://api.resend.com/audiences/" + process.env.RESEND_AUDIENCE_ID + "/contacts",
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + process.env.RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            unsubscribed: false,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        results.success.push(user.email);
      } else if (response.status === 409) {
        // Already exists — not an error
        results.skipped.push(user.email);
      } else {
        results.failed.push({ email: user.email, error: data.message || "Unknown error" });
      }
    } catch (err) {
      results.failed.push({ email: user.email, error: err.message });
    }
  }

  return res.status(200).json({
    total_real_users: realUsers.length,
    added: results.success.length,
    skipped_already_exists: results.skipped.length,
    failed: results.failed.length,
    failures: results.failed,
  });
};
