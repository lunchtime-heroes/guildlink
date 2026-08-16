// api/resend-backfill.js
// Reconciliation script — safe to run anytime, unlike the original.
// Previously synced EVERY real-email user to Resend regardless of
// consent, directly contradicting the Patch Notes opt-in checkbox at
// signup. Now scoped to patch_notes_opt_in = true only, so running this
// can never add someone who didn't actually consent. Mainly useful as a
// safety net if the real-time trigger (migration-resend-optin.sql) ever
// fails to fire for some transient reason — same "reconciliation pass
// behind a real-time trigger" pattern as compute-user-similarity's
// nightly cron alongside its live triggers.

const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  const { token } = req.query;
  if (!token || token !== process.env.ADMIN_API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // user_private already holds both contact_email and the opt-in flag
  // together — no need for the separate auth.admin.listUsers() call
  // this script used to make.
  const { data: optedInUsers, error } = await supabase
    .from("user_private")
    .select("contact_email")
    .eq("patch_notes_opt_in", true)
    .not("contact_email", "is", null);

  if (error) {
    return res.status(500).json({ error: "Failed to fetch opted-in users", detail: error.message });
  }

  const realUsers = (optedInUsers || []).filter(u =>
    u.contact_email && !u.contact_email.endsWith("@guildlink.gg")
  );

  const results = { success: [], failed: [], skipped: [] };

  for (const user of realUsers) {
    try {
      // Step 1: create as a global contact (Resend's current model —
      // audiences were renamed to Segments, Nov 2025).
      const createRes = await fetch("https://api.resend.com/contacts", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + process.env.RESEND_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.contact_email,
          unsubscribed: false,
        }),
      });

      if (createRes.status === 409) {
        results.skipped.push(user.contact_email);
      } else if (!createRes.ok) {
        const data = await createRes.json();
        results.failed.push({ email: user.contact_email, error: data.message || "Unknown error" });
        continue;
      } else {
        results.success.push(user.contact_email);
      }

      // Step 2: attach to the general mailing list segment.
      if (process.env.RESEND_SEGMENT_ID) {
        await fetch(
          "https://api.resend.com/contacts/" + encodeURIComponent(user.contact_email) + "/segments/" + process.env.RESEND_SEGMENT_ID,
          {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + process.env.RESEND_API_KEY,
              "Content-Type": "application/json",
            },
          }
        );
      }
    } catch (err) {
      results.failed.push({ email: user.contact_email, error: err.message });
    }
  }

  return res.status(200).json({
    total_opted_in_users: realUsers.length,
    added: results.success.length,
    skipped_already_exists: results.skipped.length,
    failed: results.failed.length,
    failures: results.failed,
  });
};
