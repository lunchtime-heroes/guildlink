// api/resend-add-contact.js
// Called after signup when user opts in to Patch Notes

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email required" });
  }

  // Skip fake guildlink.gg addresses — should never happen via opt-in but guard anyway
  if (email.endsWith("@guildlink.gg")) {
    return res.status(200).json({ skipped: true, reason: "internal address" });
  }

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
          email,
          unsubscribed: false,
        }),
      }
    );

    const data = await response.json();

    if (response.ok || response.status === 409) {
      // 409 = already exists, treat as success
      return res.status(200).json({ success: true });
    }

    console.error("[resend-add-contact] Resend error:", data);
    return res.status(500).json({ error: "Failed to add contact", detail: data.message });
  } catch (err) {
    console.error("[resend-add-contact] Exception:", err.message);
    return res.status(500).json({ error: "Request failed", detail: err.message });
  }
};
