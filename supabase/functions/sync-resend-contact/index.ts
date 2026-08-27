// supabase/functions/sync-resend-contact/index.ts
//
// Called only by the user_private trigger, and only when
// patch_notes_opt_in is true — this function itself doesn't re-check
// consent, that check already happened in SQL before this was ever
// invoked. Skips internal/NPC accounts, matching the existing backfill
// script's convention (wiki-resend.md).
//
// Uses Resend's CURRENT contact model (confirmed Aug 2026), not the
// deprecated one the original wiki doc describes. Resend restructured
// this in Nov 2025 — contacts are now global entities identified by
// email, no longer scoped under a single audience_id at creation.
// "Audiences" were renamed to "Segments." Adding someone to a specific
// mailing list is now a SEPARATE call from creating the contact.
// See: https://resend.com/blog/new-contacts-experience

Deno.serve(async (req) => {
  const payload = await req.json();
  const email = payload.contact_email;

  if (!email || email.endsWith('@guildlink.gg')) {
    console.log('[resend] skipped — no email or internal account');
    return new Response('skipped', { status: 200 });
  }

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const segmentId = Deno.env.get('RESEND_SEGMENT_ID');
  if (!apiKey) {
    console.log('[resend] ERROR — RESEND_API_KEY not set as a function secret');
    return new Response('missing config', { status: 500 });
  }

  // Step 1: create the contact as a global Resend entity.
  const createRes = await fetch('https://api.resend.com/contacts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, unsubscribed: false }),
  });

  if (createRes.status === 409) {
    console.log(`[resend] contact already exists: ${email}`);
  } else if (!createRes.ok) {
    const body = await createRes.text();
    console.log(`[resend] ERROR creating contact ${email}: ${createRes.status} ${body}`);
    return new Response('ok', { status: 200 }); // don't fail the DB trigger over a Resend-side error
  } else {
    console.log(`[resend] contact created: ${email}`);
  }

  // Step 2: attach to the general mailing list segment, if configured.
  if (segmentId) {
    const segRes = await fetch(
      `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${segmentId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!segRes.ok && segRes.status !== 409) {
      const body = await segRes.text();
      console.log(`[resend] ERROR adding ${email} to segment: ${segRes.status} ${body}`);
    } else {
      console.log(`[resend] added to segment: ${email}`);
    }
  } else {
    console.log('[resend] no RESEND_SEGMENT_ID configured — contact created but not added to any list');
  }

  return new Response('ok', { status: 200 });
});
