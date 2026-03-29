import React, { useState } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";

function FeedbackPage({ currentUser, isMobile, setActivePage }) {
  const [form, setForm] = useState({ liked: "", confused: "", missing: "", rating: 0 });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.rating) return alert("Please give us a rating before submitting.");
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("feedback").insert({
      user_id: user?.id || null,
      username: currentUser?.name || "Anonymous",
      liked: form.liked,
      confused: form.confused,
      missing: form.missing,
      rating: form.rating,
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: isMobile ? "80px 16px" : "100px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
      <div style={{ fontWeight: 800, color: C.text, fontSize: 22, marginBottom: 8 }}>Thanks for the feedback.</div>
      <div style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>This genuinely helps. Every response gets read.</div>
      <button onClick={() => setActivePage("feed")} style={{ background: C.accent, border: "none", borderRadius: 10, padding: "10px 28px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Back to Feed</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: isMobile ? "70px 16px 80px" : "80px 24px 40px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 900, fontSize: isMobile ? 22 : 26, color: C.text, marginBottom: 6 }}>Share your feedback</div>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>GuildLink is early. Your experience matters a lot right now. Three questions — honest answers only.</div>
      </div>

      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 4 }}>Overall, how would you rate GuildLink so far?</div>
        <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 14 }}>1 = not for me, 10 = this is exactly what I needed</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button key={n} onClick={() => setForm(f => ({ ...f, rating: n }))}
              style={{ width: 38, height: 38, borderRadius: 8, border: "1px solid " + (form.rating === n ? C.accent : C.border), background: form.rating === n ? C.accent : C.surfaceRaised, color: form.rating === n ? "#fff" : C.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {[
        { key: "liked", label: "What did you like?", placeholder: "What felt good, intuitive, or fun..." },
        { key: "confused", label: "What confused you?", placeholder: "What was hard to find, unclear, or unexpected..." },
        { key: "missing", label: "What's missing?", placeholder: "A feature, a section, something you expected to find..." },
      ].map(q => (
        <div key={q.key} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 10 }}>{q.label}</div>
          <textarea
            value={form[q.key]}
            onChange={e => setForm(f => ({ ...f, [q.key]: e.target.value }))}
            placeholder={q.placeholder}
            rows={3}
            style={{ width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
          />
        </div>
      ))}

      <button onClick={submit} disabled={submitting}
        style={{ width: "100%", background: C.accent, border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
        {submitting ? "Submitting..." : "Submit Feedback"}
      </button>
      <button onClick={() => setActivePage("feed")} style={{ width: "100%", background: "none", border: "none", color: C.textDim, fontSize: 13, cursor: "pointer", marginTop: 10, padding: "8px" }}>
        Cancel
      </button>
    </div>
  );
}

export default FeedbackPage;
