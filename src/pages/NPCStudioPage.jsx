import React, { useState, useEffect } from "react";
import { C, NPCS } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo } from "../utils.js";
import { Avatar } from "../components/Avatar.jsx";
import { FeedPostCard } from "../components/FeedPostCard.jsx";

function NPCEditorModal({ npc, onClose, onSaved }) {
  const isNew = !npc;
  const buildForm = (n) => n ? {
    name: n.name || "",
    handle: n.handle || "",
    avatar_initials: n.avatar_initials || "",
    bio: n.bio || "",
    lore: n.lore || "",
    personality: n.personality || "",
    role: n.role || "",
    location: n.location || "",
    universe: n.universe || "",
    years_of_service: n.years_of_service || "",
    genre: (n.games || []).join(", "),
    stats: Array.isArray(n.stats) ? n.stats : [],
    is_active: n.is_active !== false,
  } : {
    name: "", handle: "", avatar_initials: "", bio: "", lore: "", personality: "",
    role: "", location: "", universe: "",
    years_of_service: "",
    genre: "",
    stats: [],
    is_active: true,
  };

  const [form, setForm] = useState(() => buildForm(npc));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Re-initialize form if npc prop changes (e.g. switching between edit targets)
  useEffect(() => { setForm(buildForm(npc)); }, [npc?.id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addStat = () => setForm(f => ({ ...f, stats: [...f.stats, { label: "", value: "", note: "" }] }));
  const updateStat = (i, key, val) => setForm(f => {
    const stats = f.stats.map((s, idx) => idx === i ? { ...s, [key]: val } : s);
    return { ...f, stats };
  });
  const removeStat = (i) => setForm(f => ({ ...f, stats: f.stats.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.handle.trim()) { setError("Name and handle are required."); return; }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      handle: form.handle.trim(),
      avatar_initials: form.avatar_initials.trim() || form.name.slice(0, 2).toUpperCase(),
      bio: form.bio.trim(),
      lore: form.lore.trim(),
      personality: form.personality.trim(),
      role: form.role.trim(),
      location: form.location.trim(),
      universe: form.universe.trim(),
      status: "online",
      years_of_service: form.years_of_service ? parseInt(form.years_of_service) : null,
      games: form.genre.split(",").map(g => g.trim()).filter(Boolean),
      stats: form.stats.filter(s => s.label.trim()),
      is_active: form.is_active,
    };
    let saveError = null;
    let savedData = null;
    if (isNew) {
      const { data, error } = await supabase.from("npcs").insert(payload).select();
      console.log("[NPC save] insert result:", { data, error });
      saveError = error;
      savedData = data?.[0] || null;
    } else {
      console.log("[NPC save] attempting update for id:", npc.id, "typeof:", typeof npc.id);
      const { data, error, count, status, statusText } = await supabase.from("npcs").update(payload).eq("id", npc.id).select();
      console.log("[NPC save] update result:", { data, error, count, status, statusText, npcId: npc.id, payloadKeys: Object.keys(payload) });
      saveError = error;
      savedData = data?.[0] || null;
      // If select() returned empty (RLS blocks read-back), fetch the row directly
      if (!saveError && !savedData) {
        console.log("[NPC save] select returned empty, fetching row directly...");
        const { data: refetch, error: refetchErr } = await supabase.from("npcs").select("*").eq("id", npc.id).single();
        console.log("[NPC save] refetch result:", { refetch, refetchErr });
        savedData = refetch || null;
      }
    }
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    onSaved(savedData);
  };

  const labelStyle = { color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, display: "block" };
  const inputStyle = { width: "100%", background: C.surfaceHover, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const taStyle = { ...inputStyle, resize: "vertical", minHeight: 80, lineHeight: 1.6 };
  const section = (title) => (
    <div style={{ color: C.accent, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, marginTop: 24, borderBottom: "1px solid " + C.border, paddingBottom: 6 }}>{title}</div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px", overflowY: "auto" }}>
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 20, width: "100%", maxWidth: 640, padding: 28, position: "relative", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{isNew ? "Create NPC" : "Edit NPC"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
        </div>

        {section("Identity")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} style={inputStyle} placeholder="ShopKeep Merv" />
          </div>
          <div>
            <label style={labelStyle}>Handle *</label>
            <input value={form.handle} onChange={e => set("handle", e.target.value)} style={inputStyle} placeholder="@ShopKeepMerv_NPC" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Initials</label>
            <input value={form.avatar_initials} onChange={e => set("avatar_initials", e.target.value)} style={inputStyle} placeholder="SM" maxLength={3} />
          </div>
          <div>
            <label style={labelStyle}>Role / Title</label>
            <input value={form.role} onChange={e => set("role", e.target.value)} style={inputStyle} placeholder="Licensed Cave Merchant" />
          </div>
          <div>
            <label style={labelStyle}>Yrs Service</label>
            <input type="number" value={form.years_of_service} onChange={e => set("years_of_service", e.target.value)} style={inputStyle} placeholder="0" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Universe</label>
            <input value={form.universe} onChange={e => set("universe", e.target.value)} style={inputStyle} placeholder="Realm of Aethoria" />
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <input value={form.location} onChange={e => set("location", e.target.value)} style={inputStyle} placeholder="Eastern Gate, Aethon" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Genre (comma-separated — informs character behavior)</label>
          <input value={form.genre} onChange={e => set("genre", e.target.value)} style={inputStyle} placeholder="Fantasy RPG, Open World, Souls-like" />
        </div>

        {section("Public Content")}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Bio (shown on profile)</label>
          <textarea value={form.bio} onChange={e => set("bio", e.target.value)} style={taStyle} placeholder="I have operated this cave-based general store since the Third Age…" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Lore / Origin (shown on Lore tab)</label>
          <textarea value={form.lore} onChange={e => set("lore", e.target.value)} style={{ ...taStyle, minHeight: 100 }} placeholder="Merv took over the Fogwood Cave shop from his father…" />
        </div>

        {section("Internal Notes")}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Personality & Voice (writing reference — not shown publicly)</label>
          <textarea value={form.personality} onChange={e => set("personality", e.target.value)} style={taStyle} placeholder="Dry, understated, never complains directly. Speaks in short declarative sentences. Absurdist patience. Never sarcastic — sincerely confused by heroes." />
        </div>

        {section("Stats")}
        <div style={{ marginBottom: 8 }}>
          {form.stats.map((stat, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 1fr 28px", gap: 8, marginBottom: 8, alignItems: "start" }}>
              <input value={stat.label} onChange={e => updateStat(i, "label", e.target.value)} style={inputStyle} placeholder="Label" />
              <input value={stat.value} onChange={e => updateStat(i, "value", e.target.value)} style={inputStyle} placeholder="Value" />
              <input value={stat.note} onChange={e => updateStat(i, "note", e.target.value)} style={inputStyle} placeholder="Note (italic)" />
              <button onClick={() => removeStat(i)} style={{ background: "none", border: "1px solid " + C.border, borderRadius: 6, color: C.textDim, fontSize: 14, cursor: "pointer", height: 34, padding: "0 6px" }}>×</button>
            </div>
          ))}
          <button onClick={addStat} style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "6px 14px", color: C.textMuted, fontSize: 12, cursor: "pointer", marginTop: 4 }}>+ Add Stat Row</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, marginBottom: 20 }}>
          <input type="checkbox" id="npc-active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} style={{ accentColor: C.accent }} />
          <label htmlFor="npc-active" style={{ color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Active (visible in Studio and public browse)</label>
        </div>

        {error && <div style={{ background: "#ef444418", border: "1px solid #ef444444", borderRadius: 8, padding: "8px 12px", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: "1px solid " + C.border, borderRadius: 10, padding: "9px 20px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ background: C.accent, border: "none", borderRadius: 10, padding: "9px 24px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : isNew ? "Create NPC" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── NPC STUDIO PAGE ──────────────────────────────────────────────────────────

function NPCStudioPage({ isMobile, currentUser, setActivePage, setCurrentNPC }) {
  const [selectedNPC, setSelectedNPC] = useState(null); // DB row id (uuid)
  const [dbNPCs, setDbNPCs] = useState([]); // all NPCs from DB
  const [loadingNPCs, setLoadingNPCs] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNPC, setEditingNPC] = useState(null); // null = create, object = edit
  const [syncing, setSyncing] = useState(false);

  const [mode, setMode] = useState("respond");
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [replyToComment, setReplyToComment] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [composeText, setComposeText] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [queue, setQueue] = useState([]);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [closedThreads, setClosedThreads] = useState(new Set());
  const [closedCandidates, setClosedCandidates] = useState(new Set());

  const [studioPrompt, setStudioPrompt] = useState(null);
  const [studioTab, setStudioTab] = useState("characters"); // "characters" | "prompts"
  const [prompts, setPrompts] = useState([]);
  const [newPromptText, setNewPromptText] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [editingPromptId, setEditingPromptId] = useState(null);
  const [editingPromptText, setEditingPromptText] = useState("");
  const [csvPreview, setCsvPreview] = useState(null); // array of parsed rows
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [editingScheduledId, setEditingScheduledId] = useState(null);
  const [editingScheduledContent, setEditingScheduledContent] = useState("");
  const [editingScheduledDate, setEditingScheduledDate] = useState("");
  const [editingScheduledTime, setEditingScheduledTime] = useState("");

  const loadStudioPrompt = async () => {
    const { data } = await supabase.from("daily_prompts").select("id, question, sort_order").order("sort_order", { ascending: true });
    if (!data || data.length === 0) return;
    setPrompts(data);
    const dayIndex = Math.floor(Date.now() / 86400000);
    setStudioPrompt(data[dayIndex % data.length]);
  };

  const loadPrompts = async () => {
    const { data } = await supabase.from("daily_prompts").select("id, question, sort_order").order("sort_order", { ascending: true });
    if (data) setPrompts(data);
  };

  const addPrompt = async () => {
    if (!newPromptText.trim()) return;
    setSavingPrompt(true);
    const maxOrder = prompts.length > 0 ? Math.max(...prompts.map(p => p.sort_order)) : 0;
    const { data } = await supabase.from("daily_prompts").insert({ question: newPromptText.trim(), sort_order: maxOrder + 1 }).select();
    if (data?.[0]) setPrompts(prev => [...prev, data[0]]);
    setNewPromptText("");
    setSavingPrompt(false);
  };

  const deletePrompt = async (id) => {
    await supabase.from("daily_prompts").delete().eq("id", id);
    setPrompts(prev => prev.filter(p => p.id !== id));
  };

  const savePromptEdit = async (id) => {
    if (!editingPromptText.trim()) return;
    await supabase.from("daily_prompts").update({ question: editingPromptText.trim() }).eq("id", id);
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, question: editingPromptText.trim() } : p));
    setEditingPromptId(null);
    setEditingPromptText("");
  };

  const parseCsv = (text) => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return { rows: [], errors: ["CSV must have a header row and at least one data row."] };
    const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    const required = ["npc_handle", "content", "scheduled_date", "scheduled_time"];
    const missing = required.filter(r => !header.includes(r));
    if (missing.length > 0) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };
    const rows = [];
    const errors = [];
    lines.slice(1).forEach((line, i) => {
      // Simple CSV split — handles quoted fields with commas
      const cols = [];
      let cur = "", inQuote = false;
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      cols.push(cur.trim());
      const row = {};
      header.forEach((h, j) => { row[h] = (cols[j] || "").replace(/^["']|["']$/g, "").trim(); });
      const rowErrors = [];
      if (!row.npc_handle) rowErrors.push("missing npc_handle");
      if (!row.content) rowErrors.push("missing content");
      if (!row.scheduled_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.scheduled_date)) rowErrors.push("invalid date (use YYYY-MM-DD)");
      if (!row.scheduled_time || !/^\d{2}:\d{2}$/.test(row.scheduled_time)) rowErrors.push("invalid time (use HH:MM)");
      const npcMatch = dbNPCs.find(n => n.handle.toLowerCase() === row.npc_handle.toLowerCase() || n.handle.toLowerCase() === row.npc_handle.toLowerCase().replace(/^@/, "@"));
      if (!npcMatch && row.npc_handle) rowErrors.push(`NPC not found: ${row.npc_handle}`);
      rows.push({ ...row, rowNum: i + 2, errors: rowErrors, npc: npcMatch || null, valid: rowErrors.length === 0 });
      if (rowErrors.length > 0) errors.push(`Row ${i + 2}: ${rowErrors.join(", ")}`);
    });
    return { rows, errors };
  };

  const handleCsvFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows, errors } = parseCsv(ev.target.result);
      setCsvPreview(rows);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmBulkQueue = async () => {
    if (!csvPreview) return;
    setCsvUploading(true);
    const validRows = csvPreview.filter(r => r.valid);
    for (const row of validRows) {
      const scheduledFor = new Date(`${row.scheduled_date}T${row.scheduled_time}`).toISOString();
      const { data, error } = await supabase.from("npc_scheduled_posts").insert({
        npc_id: row.npc.id,
        content: row.content,
        scheduled_for: scheduledFor,
        status: "scheduled",
      }).select();
      console.log("[bulkQueue] insert row:", { handle: row.npc_handle, data, error });
    }
    await loadQueue();
    setCsvPreview(null);
    setCsvErrors([]);
    setCsvUploading(false);
  };

  const saveScheduledEdit = async (id) => {
    if (!editingScheduledContent.trim()) return;
    const scheduledFor = new Date(`${editingScheduledDate}T${editingScheduledTime}`).toISOString();
    await supabase.from("npc_scheduled_posts").update({ content: editingScheduledContent.trim(), scheduled_for: scheduledFor }).eq("id", id);
    await loadQueue();
    setEditingScheduledId(null);
  };

  const reorderPrompts = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const reordered = [...prompts];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    // Reassign sort_order values
    const updated = reordered.map((p, i) => ({ ...p, sort_order: i + 1 }));
    setPrompts(updated);
    // Persist all sort_orders
    for (const p of updated) {
      await supabase.from("daily_prompts").update({ sort_order: p.sort_order }).eq("id", p.id);
    }
  };

  // Load all NPCs from DB
  const loadDBNPCs = async () => {
    setLoadingNPCs(true);
    const { data, error } = await supabase.from("npcs").select("*").order("name");
    console.log("[loadDBNPCs] result:", { count: data?.length, error, sample: data?.[0] });
    if (data) setDbNPCs(data);
    setLoadingNPCs(false);
  };

  useEffect(() => { loadDBNPCs(); loadQueue(); loadStudioPrompt(); }, []);

  // Sync hardcoded NPCs that don't have a DB record yet
  const syncHardcodedNPCs = async () => {
    setSyncing(true);
    const { data: existing } = await supabase.from("npcs").select("handle");
    const existingHandles = new Set((existing || []).map(n => n.handle));
    const hardcodedList = Object.values(NPCS);
    const toSync = hardcodedList.filter(n => !existingHandles.has(n.handle));
    for (const n of toSync) {
      await supabase.from("npcs").insert({
        handle: n.handle,
        name: n.name,
        avatar_initials: n.avatar,
        bio: n.bio || "",
        lore: n.lore || "",
        role: n.role || "",
        location: n.location || "",
        universe: n.universe || "",
        universe_icon: n.universeIcon || "",
        status: "online",
        years_of_service: n.yearsOfService || null,
        games: n.games || [],
        stats: n.stats || [],
        is_active: true,
      });
    }
    await loadDBNPCs();
    setSyncing(false);
  };

  const deleteNPC = async (id) => {
    if (!window.confirm("Delete this NPC and all their posts? This cannot be undone.")) return;
    const { error } = await supabase.rpc("delete_npc_cascade", { p_npc_id: id });
    if (error) { console.error("[deleteNPC] error:", error); return; }
    setDbNPCs(prev => prev.filter(n => n.id !== id));
  };
  const hardcodedHandles = new Set(Object.values(NPCS).map(n => n.handle));
  const dbHandles = new Set(dbNPCs.map(n => n.handle));
  const unsynced = Object.values(NPCS).filter(n => !dbHandles.has(n.handle));

  // Active NPC DB record
  const activeNPC = dbNPCs.find(n => n.id === selectedNPC) || null;

  const loadPostComments = async (postId) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setExpandedComments(prev => ({ ...prev, [postId]: data || [] }));
    setLoadingComments(prev => ({ ...prev, [postId]: false }));
  };

  const togglePostComments = (postId) => {
    if (expandedComments[postId] !== undefined) {
      setExpandedComments(prev => { const n = { ...prev }; delete n[postId]; return n; });
    } else {
      loadPostComments(postId);
    }
  };

  const loadCandidates = async () => {
    setLoadingCandidates(true);
    // Fetch recent posts with author info, likes, comments
    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, created_at, likes, user_id, game_tag, profiles!posts_user_id_fkey(username, handle, avatar_initials, created_at)")
      .is("npc_id", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!posts) { setLoadingCandidates(false); return; }

    // Fetch comment counts
    const postIds = posts.map(p => p.id);
    const { data: comments } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);
    const commentCounts = {};
    (comments || []).forEach(c => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });

    // Fetch NPC-replied post IDs — keep in list but score lower
    const { data: npcReplies } = await supabase
      .from("comments")
      .select("post_id")
      .not("npc_id", "is", null);
    const npcRepliedIds = new Set((npcReplies || []).map(r => r.post_id));

    // Fetch posts that have replies (someone replied to someone) — engagement signal
    const { data: replyComments } = await supabase
      .from("comments")
      .select("post_id")
      .not("reply_to_comment_id", "is", null);
    const replyThreadCounts = {};
    (replyComments || []).forEach(c => { replyThreadCounts[c.post_id] = (replyThreadCounts[c.post_id] || 0) + 1; });

    // Fetch last comment per post to detect if user replied after NPC
    const { data: lastComments } = await supabase
      .from("comments")
      .select("post_id, npc_id, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: false });
    // For each post, find the most recent comment
    const lastCommentByPost = {};
    (lastComments || []).forEach(c => {
      if (!lastCommentByPost[c.post_id]) lastCommentByPost[c.post_id] = c;
    });

    const now = Date.now();
    const scored = posts
      .map(p => {
        const profile = p.profiles;
        const ageHours = (now - new Date(p.created_at).getTime()) / 3600000;
        const recencyScore = Math.max(0, 1 - ageHours / 72);
        const engagementScore = Math.min(1, ((p.likes || 0) + (commentCounts[p.id] || 0) * 1.5) / 50);
        const threadScore = Math.min(1, (replyThreadCounts[p.id] || 0) / 5);
        const accountAgeDays = profile?.created_at
          ? (now - new Date(profile.created_at).getTime()) / 86400000
          : 999;
        const newUserBonus = accountAgeDays < 7 ? 1 : 0;
        const npcReplied = npcRepliedIds.has(p.id);
        const lastComment = lastCommentByPost[p.id];
        // "Needs Reply" = NPC has engaged but user replied since — highest priority
        const needsReply = npcReplied && lastComment && !lastComment.npc_id;
        const baseScore = newUserBonus * 0.35 + engagementScore * 0.30 + threadScore * 0.20 + recencyScore * 0.15;
        // needsReply: boost to top. npcReplied but last was NPC: de-prioritise. fresh: normal score.
        const score = needsReply ? 0.8 + baseScore * 0.2 : npcReplied ? baseScore * 0.3 : baseScore;
        return { ...p, commentCount: commentCounts[p.id] || 0, newUser: accountAgeDays < 7, hasThread: (replyThreadCounts[p.id] || 0) > 0, npcReplied, needsReply, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    setCandidates(scored);
    setLoadingCandidates(false);
  };

  useEffect(() => {
    if (selectedNPC && mode === "respond") loadCandidates();
    if (selectedNPC && mode === "threads") loadThreads();
  }, [selectedNPC, mode]);

  const loadThreads = async () => {
    setLoadingThreads(true);
    const npcUUID = selectedNPC;

    // Find posts where this NPC has commented OR is the author
    // Also check legacy npc_id values (old hardcoded string keys like "merv")
    const npcRecord = dbNPCs.find(n => n.id === npcUUID);
    const legacyKey = npcRecord ? Object.keys(NPCS).find(k => NPCS[k].handle === npcRecord.handle) : null;
    const npcIds = [npcUUID, ...(legacyKey ? [legacyKey] : [])];

    const [commentedRes, legacyCommentedRes, authoredRes] = await Promise.all([
      supabase.from("comments").select("post_id").eq("npc_id", npcUUID),
      legacyKey ? supabase.from("comments").select("post_id").eq("npc_id", legacyKey) : Promise.resolve({ data: [] }),
      supabase.from("posts").select("id").eq("npc_id", npcUUID),
    ]);

    const commentedIds = [
      ...(commentedRes.data || []).map(c => c.post_id),
      ...(legacyCommentedRes.data || []).map(c => c.post_id),
    ];
    const authoredIds = (authoredRes.data || []).map(p => p.id);
    const postIds = [...new Set([...commentedIds, ...authoredIds])];

    if (postIds.length === 0) { setThreads([]); setLoadingThreads(false); return; }

    // Fetch those posts with author info
    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, created_at, likes, user_id, npc_id, profiles!posts_user_id_fkey(username, handle, avatar_initials), npcs(name, handle, avatar_initials)")
      .in("id", postIds)
      .order("created_at", { ascending: false });

    // Fetch all comments for those posts
    const { data: allComments, error: commentsError } = await supabase
      .from("comments")
      .select("*, profiles(username, handle, avatar_initials, is_founding, active_ring, avatar_config)")
      .in("post_id", postIds)
      .order("created_at", { ascending: true });
    if (commentsError) console.error("[loadThreads] comments error:", commentsError);

    // Resolve NPC authors for UUID-based npc_ids
    const npcUUIDs = [...new Set((allComments || []).filter(c => c.npc_id && c.npc_id.includes('-')).map(c => c.npc_id))];
    let npcMap = {};
    if (npcUUIDs.length > 0) {
      const { data: npcRows } = await supabase.from("npcs").select("id, name, handle, avatar_initials").in("id", npcUUIDs);
      if (npcRows) npcRows.forEach(n => { npcMap[n.id] = n; });
    }
    const enrichedComments = (allComments || []).map(c =>
      c.npc_id && c.npc_id.includes('-') ? { ...c, npcs: npcMap[c.npc_id] || null } : c
    );

    const commentsByPost = {};
    enrichedComments.forEach(c => {
      if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
      commentsByPost[c.post_id].push(c);
    });
    console.log("[loadThreads] postIds:", postIds, "allComments count:", allComments?.length, "commentsByPost keys:", Object.keys(commentsByPost));

    const enriched = (posts || []).map(p => {
      const comments = commentsByPost[p.id] || [];
      const lastComment = comments[comments.length - 1];
      // Needs reply if last comment was from a user (not this NPC)
      const needsReply = comments.length === 0 || !npcIds.includes(lastComment?.npc_id);
      return { ...p, comments, needsReply };
    }).sort((a, b) => {
      if (a.needsReply && !b.needsReply) return -1;
      if (!a.needsReply && b.needsReply) return 1;
      const aLast = a.comments[a.comments.length - 1]?.created_at || a.created_at;
      const bLast = b.comments[b.comments.length - 1]?.created_at || b.created_at;
      return new Date(bLast) - new Date(aLast);
    });

    setThreads(enriched);
    setLoadingThreads(false);
  };

  // Load scheduled queue
  const loadQueue = async () => {
    const { data } = await supabase
      .from("npc_scheduled_posts")
      .select("*")
      .eq("status", "scheduled")
      .order("scheduled_for", { ascending: true });
    if (data) setQueue(data);
  };
  useEffect(() => { loadQueue(); }, []);

  const handleSend = async () => {
    if (!composeText.trim() || !selectedNPC) return;
    setSending(true);
    const { data: { user: writerUser } } = await supabase.auth.getUser();
    const npcUUID = selectedNPC;

    if (scheduleMode && scheduleDate && scheduleTime) {
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      const { data: schedData, error: schedError } = await supabase.from("npc_scheduled_posts").insert({
        npc_id: npcUUID,
        content: composeText.trim(),
        reply_to_post_id: selectedPost?.id || null,
        scheduled_for: scheduledFor,
        status: "scheduled",
      }).select();
      console.log("[handleSend] schedule insert:", { data: schedData, error: schedError });
      await loadQueue();
    } else {
      if (mode === "respond" && selectedPost) {
        const { error } = await supabase.from("comments").insert({
          post_id: selectedPost.id,
          content: composeText.trim(),
          npc_id: npcUUID,
          user_id: writerUser.id,
          reply_to_comment_id: replyToComment?.id || null,
        });
        if (!error) {
          const newCount = (selectedPost.commentCount || 0) + 1;
          await supabase.from("posts").update({ comment_count: newCount }).eq("id", selectedPost.id);
          // Notify the user whose comment was replied to
          if (replyToComment?.userId && replyToComment.userId !== writerUser.id) {
            await supabase.from("notifications").insert({
              user_id: replyToComment.userId,
              actor_id: writerUser.id,
              npc_id: npcUUID,
              type: "comment",
              post_id: selectedPost.id,
            });
          }
          setCandidates(prev => prev.filter(p => p.id !== selectedPost.id));
          if (expandedComments[selectedPost.id] !== undefined) loadPostComments(selectedPost.id);
        }
      } else {
        const { data: insertData, error: insertError } = await supabase.from("posts").insert({
          content: composeText.trim(),
          npc_id: npcUUID,
          user_id: writerUser.id,
        });
        console.log("NPC post insert — npcUUID:", npcUUID, "result:", insertData, "error:", insertError);
      }
    }

    setComposeText("");
    setSelectedPost(null);
    setReplyToComment(null);
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  const deleteScheduled = async (id) => {
    await supabase.from("npc_scheduled_posts").delete().eq("id", id);
    loadQueue();
  };

  const C2 = C; // alias
  const pad = isMobile ? "60px 12px 80px" : "80px 24px 40px";

  if (!selectedNPC) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: pad }}>
        {showEditor && (
          <NPCEditorModal
            npc={editingNPC}
            onClose={() => { setShowEditor(false); setEditingNPC(null); }}
            onSaved={async (saved) => {
              if (saved) {
                setDbNPCs(prev => {
                  const exists = prev.find(n => n.id === saved.id);
                  return exists ? prev.map(n => n.id === saved.id ? saved : n) : [...prev, saved];
                });
              } else {
                await loadDBNPCs();
              }
              setShowEditor(false);
              setEditingNPC(null);
            }}
          />
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, color: C2.text, letterSpacing: "-0.5px", marginBottom: 4 }}>NPC Studio</div>
            <div style={{ color: C2.textMuted, fontSize: 14 }}>Manage characters and write as them.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {studioTab === "characters" && (
              <button onClick={() => { setEditingNPC(null); setShowEditor(true); }}
                style={{ background: C2.accent, border: "none", borderRadius: 10, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                + New NPC
              </button>
            )}
          </div>
        </div>

        {/* Studio tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: C2.surface, border: "1px solid " + C2.border, borderRadius: 12, padding: 4 }}>
          {[{ id: "characters", label: "Characters" }, { id: "prompts", label: "Daily Prompts" }].map(t => (
            <button key={t.id} onClick={() => setStudioTab(t.id)}
              style={{ flex: 1, background: studioTab === t.id ? C2.accentGlow : "transparent", border: "1px solid " + (studioTab === t.id ? C2.accentDim : "transparent"), borderRadius: 8, padding: "8px", color: studioTab === t.id ? C2.accentSoft : C2.textMuted, fontSize: 13, fontWeight: studioTab === t.id ? 700 : 500, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Prompts tab */}
        {studioTab === "prompts" && (
          <div>
            {/* Add new prompt */}
            <div style={{ background: C2.surface, border: "1px solid " + C2.border, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ color: C2.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>ADD PROMPT</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newPromptText}
                  onChange={e => setNewPromptText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addPrompt()}
                  placeholder="What's a game moment you'll never forget?"
                  style={{ flex: 1, background: C2.surfaceHover, border: "1px solid " + C2.border, borderRadius: 8, padding: "8px 12px", color: C2.text, fontSize: 13, outline: "none" }}
                />
                <button onClick={addPrompt} disabled={savingPrompt || !newPromptText.trim()}
                  style={{ background: newPromptText.trim() ? C2.accent : C2.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 18px", color: newPromptText.trim() ? "#fff" : C2.textDim, fontSize: 13, fontWeight: 700, cursor: newPromptText.trim() ? "pointer" : "default" }}>
                  {savingPrompt ? "Adding…" : "Add"}
                </button>
              </div>
            </div>

            {/* Prompt queue */}
            <div style={{ color: C2.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
              QUEUE ({prompts.length} prompt{prompts.length !== 1 ? "s" : ""} — cycles daily · drag to reorder)
            </div>
            <div>
            {prompts.length === 0 ? (
              <div style={{ color: C2.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>No prompts yet. Add one above.</div>
            ) : (() => {
              const dayIndex = Math.floor(Date.now() / 86400000);
              const todayIndex = dayIndex % prompts.length;
              // Reorder display: today first, then the rest in queue order
              const displayOrder = [
                ...prompts.slice(todayIndex),
                ...prompts.slice(0, todayIndex),
              ];
              return displayOrder.map((prompt, displayI) => {
                const realIndex = prompts.indexOf(prompt);
                const isToday = realIndex === todayIndex;
                const isEditing = editingPromptId === prompt.id;
                return (
                  <div key={prompt.id}
                    draggable={!isEditing}
                    onDragStart={e => { e.dataTransfer.setData("text/plain", String(realIndex)); }}
                    onDragOver={e => { e.preventDefault(); setDragOverIndex(realIndex); }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={e => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData("text/plain")); reorderPrompts(from, realIndex); setDragOverIndex(null); }}
                    style={{
                      background: isToday ? C2.goldGlow : dragOverIndex === realIndex ? C2.surfaceHover : C2.surface,
                      border: "1px solid " + (isToday ? C2.goldBorder : dragOverIndex === realIndex ? C2.borderHover : C2.border),
                      borderRadius: 10, padding: "12px 14px", marginBottom: 8,
                      display: "flex", alignItems: isEditing ? "flex-start" : "center", gap: 12,
                      cursor: isEditing ? "default" : "grab",
                      transition: "background 0.1s",
                    }}>
                    <div style={{ color: isToday ? C2.gold + "88" : C2.textDim, fontSize: 12, cursor: "grab", userSelect: "none", flexShrink: 0, marginTop: isEditing ? 2 : 0 }}>☰</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            value={editingPromptText}
                            onChange={e => setEditingPromptText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") savePromptEdit(prompt.id); if (e.key === "Escape") { setEditingPromptId(null); setEditingPromptText(""); } }}
                            autoFocus
                            style={{ flex: 1, background: C2.surfaceHover, border: "1px solid " + C2.accentDim, borderRadius: 6, padding: "5px 10px", color: C2.text, fontSize: 13, outline: "none" }}
                          />
                          <button onClick={() => savePromptEdit(prompt.id)}
                            style={{ background: C2.accent, border: "none", borderRadius: 6, padding: "5px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save</button>
                          <button onClick={() => { setEditingPromptId(null); setEditingPromptText(""); }}
                            style={{ background: "none", border: "1px solid " + C2.border, borderRadius: 6, padding: "5px 10px", color: C2.textDim, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ color: isToday ? C2.gold : C2.textMuted, fontSize: 13 }}>{prompt.question}</div>
                      )}
                    </div>
                    {isToday && !isEditing && (
                      <div style={{ background: C2.goldGlow, border: "1px solid " + C2.goldBorder, borderRadius: 6, padding: "2px 8px", color: C2.gold, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>TODAY</div>
                    )}
                    {!isEditing && (
                      <button onClick={() => { setEditingPromptId(prompt.id); setEditingPromptText(prompt.question); }}
                        style={{ background: "none", border: "none", color: isToday ? C2.gold + "88" : C2.textDim, fontSize: 12, cursor: "pointer", padding: "0 2px", flexShrink: 0 }}>
                        Edit
                      </button>
                    )}
                    {!isEditing && (
                      <button onClick={() => deletePrompt(prompt.id)}
                        style={{ background: "none", border: "none", color: isToday ? C2.gold + "88" : C2.textDim, fontSize: 12, cursor: "pointer", padding: "0 2px", flexShrink: 0 }}>
                        Del
                      </button>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          {/* Bulk CSV upload */}
          <div style={{ marginTop: 32 }}>
            <div style={{ color: C2.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>BULK SCHEDULE</div>
            <div style={{ background: C2.surface, border: "1px solid " + C2.border, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ color: C2.textMuted, fontSize: 13, marginBottom: 10 }}>
                Upload a CSV with columns: <span style={{ color: C2.accentSoft, fontFamily: "monospace", fontSize: 12 }}>npc_handle, content, scheduled_date, scheduled_time</span>
              </div>
              <div style={{ color: C2.textDim, fontSize: 11, marginBottom: 12 }}>
                Dates: YYYY-MM-DD &nbsp;|&nbsp; Times: HH:MM (24hr) &nbsp;|&nbsp; Handle must match exactly, e.g. @StayAtDaves_NPC
              </div>
              <label style={{ display: "inline-block", background: C2.accent, border: "none", borderRadius: 8, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Upload CSV
                <input type="file" accept=".csv" onChange={handleCsvFile} style={{ display: "none" }} />
              </label>
            </div>

            {/* CSV preview */}
            {csvPreview && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ color: C2.textMuted, fontSize: 13 }}>
                    <span style={{ color: C2.green, fontWeight: 700 }}>{csvPreview.filter(r => r.valid).length} valid</span>
                    {csvPreview.filter(r => !r.valid).length > 0 && <span style={{ color: C2.red, fontWeight: 700, marginLeft: 12 }}>{csvPreview.filter(r => !r.valid).length} errors</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setCsvPreview(null); setCsvErrors([]); }}
                      style={{ background: "none", border: "1px solid " + C2.border, borderRadius: 8, padding: "6px 14px", color: C2.textMuted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                    <button onClick={confirmBulkQueue} disabled={csvUploading || csvPreview.filter(r => r.valid).length === 0}
                      style={{ background: csvPreview.filter(r => r.valid).length > 0 ? C2.accent : C2.surfaceRaised, border: "none", borderRadius: 8, padding: "6px 18px", color: csvPreview.filter(r => r.valid).length > 0 ? "#fff" : C2.textDim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {csvUploading ? "Queuing…" : `Queue ${csvPreview.filter(r => r.valid).length} posts`}
                    </button>
                  </div>
                </div>
                {csvPreview.map((row, i) => (
                  <div key={i} style={{ background: row.valid ? C2.surface : "#ef444410", border: "1px solid " + (row.valid ? C2.border : "#ef444444"), borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {row.npc ? <Avatar initials={row.npc.avatar_initials || "?"} size={32} isNPC={true} /> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: C2.surfaceRaised, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: row.npc ? C2.gold : C2.red, fontSize: 12 }}>{row.npc_handle}</span>
                        <span style={{ color: C2.textDim, fontSize: 11 }}>{row.scheduled_date} {row.scheduled_time}</span>
                      </div>
                      <div style={{ color: C2.textMuted, fontSize: 13, lineHeight: 1.5 }}>{row.content}</div>
                      {row.errors.length > 0 && <div style={{ color: C2.red, fontSize: 11, marginTop: 4 }}>{row.errors.join(" · ")}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scheduled queue — always visible */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ color: C2.textMuted, fontSize: 12, fontWeight: 700 }}>SCHEDULED QUEUE ({queue.length})</div>
              {queue.length > 0 && <div style={{ color: C2.textDim, fontSize: 11 }}>Sorted by scheduled time</div>}
            </div>
            {queue.length === 0 ? (
              <div style={{ background: C2.surface, border: "1px solid " + C2.border, borderRadius: 10, padding: "24px 16px", textAlign: "center", color: C2.textDim, fontSize: 13 }}>
                No posts scheduled yet. Upload a CSV above or use the Post tab to schedule individual posts.
              </div>
            ) : queue.map(item => {
              const qNPC = dbNPCs.find(n => n.id === item.npc_id);
              const isEditingThis = editingScheduledId === item.id;
              const scheduledDate = new Date(item.scheduled_for);
              const isPast = scheduledDate < new Date();
              return (
                <div key={item.id} style={{ background: C2.surface, border: "1px solid " + (isPast ? C2.textDim + "44" : C2.border), borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 12, alignItems: isEditingThis ? "flex-start" : "flex-start", opacity: isPast ? 0.6 : 1 }}>
                  <Avatar initials={qNPC?.avatar_initials || "?"} size={32} isNPC={true} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditingThis ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <textarea value={editingScheduledContent} onChange={e => setEditingScheduledContent(e.target.value)}
                          style={{ width: "100%", background: C2.surfaceHover, border: "1px solid " + C2.accentDim, borderRadius: 8, padding: "8px 12px", color: C2.text, fontSize: 13, resize: "none", outline: "none", minHeight: 70, boxSizing: "border-box" }} />
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <input type="date" value={editingScheduledDate} onChange={e => setEditingScheduledDate(e.target.value)}
                            style={{ background: C2.surfaceHover, border: "1px solid " + C2.border, borderRadius: 8, padding: "5px 10px", color: C2.text, fontSize: 12, outline: "none" }} />
                          <input type="time" value={editingScheduledTime} onChange={e => setEditingScheduledTime(e.target.value)}
                            style={{ background: C2.surfaceHover, border: "1px solid " + C2.border, borderRadius: 8, padding: "5px 10px", color: C2.text, fontSize: 12, outline: "none" }} />
                          <button onClick={() => saveScheduledEdit(item.id)}
                            style={{ background: C2.accent, border: "none", borderRadius: 8, padding: "5px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save</button>
                          <button onClick={() => setEditingScheduledId(null)}
                            style={{ background: "none", border: "1px solid " + C2.border, borderRadius: 8, padding: "5px 10px", color: C2.textDim, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, gap: 8 }}>
                          <div>
                            <span style={{ fontWeight: 700, color: C2.gold, fontSize: 13 }}>{qNPC?.name || "Unknown NPC"}</span>
                            {isPast && <span style={{ color: C2.textDim, fontSize: 10, marginLeft: 6 }}>· sent</span>}
                          </div>
                          <span style={{ color: isPast ? C2.textDim : C2.accentSoft, fontSize: 11, whiteSpace: "nowrap", flexShrink: 0 }}>
                            {scheduledDate.toLocaleDateString()} {scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div style={{ color: C2.textMuted, fontSize: 13, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{item.content}</div>
                      </>
                    )}
                  </div>
                  {!isEditingThis && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: 2 }}>
                      <button onClick={() => {
                        const d = new Date(item.scheduled_for);
                        setEditingScheduledId(item.id);
                        setEditingScheduledContent(item.content);
                        setEditingScheduledDate(d.toISOString().slice(0, 10));
                        setEditingScheduledTime(d.toISOString().slice(11, 16));
                      }} style={{ background: "none", border: "none", color: C2.textDim, fontSize: 12, cursor: "pointer", padding: "0 4px" }}>Edit</button>
                      <button onClick={() => deleteScheduled(item.id)}
                        style={{ background: "none", border: "none", color: C2.textDim, fontSize: 12, cursor: "pointer", padding: "0 4px" }}>Del</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}
        {studioTab === "characters" && (<>
        {loadingNPCs ? (
          <div style={{ color: C2.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>Loading characters…</div>
        ) : dbNPCs.length === 0 ? (
          <div style={{ color: C2.textDim, fontSize: 13, textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎭</div>
            <div style={{ marginBottom: 8 }}>No NPCs in the database yet.</div>

          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
            {dbNPCs.map(npc => (
              <div key={npc.id}
                style={{ background: C2.surface, border: "1px solid " + (npc.is_active ? C2.border : C2.textDim + "33"), borderRadius: 16, padding: 18, opacity: npc.is_active ? 1 : 0.55, position: "relative" }}
              >
                {!npc.is_active && (
                  <div style={{ position: "absolute", top: 10, right: 10, background: C2.surfaceRaised, border: "1px solid " + C2.border, borderRadius: 6, padding: "2px 7px", color: C2.textDim, fontSize: 10, fontWeight: 700 }}>INACTIVE</div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <Avatar initials={npc.avatar_initials || "?"} size={40} isNPC={true} status={npc.status} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        onClick={e => { e.stopPropagation(); setCurrentNPC(npc.id); setActivePage("npc"); }}
                        style={{ fontWeight: 700, color: C2.accent, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline", textDecorationColor: C2.accentDim }}
                      >{npc.name}</span>
                    </div>
                    <div style={{ color: C2.textDim, fontSize: 11 }}>{npc.handle}</div>
                  </div>
                </div>
                <div style={{ color: C2.textMuted, fontSize: 12, lineHeight: 1.6, marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{npc.bio || "No bio yet."}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setSelectedNPC(npc.id)}
                    style={{ flex: 1, background: C2.accentGlow, border: "1px solid " + C2.accentDim, borderRadius: 8, padding: "6px", color: C2.accentSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Write as
                  </button>
                  <button onClick={() => { setEditingNPC(npc); setShowEditor(true); }}
                    style={{ background: C2.surfaceRaised, border: "1px solid " + C2.border, borderRadius: 8, padding: "6px 10px", color: C2.textMuted, fontSize: 12, cursor: "pointer" }}>
                    Edit
                  </button>
                  <button onClick={() => deleteNPC(npc.id)}
                    style={{ background: "none", border: "1px solid " + C2.border, borderRadius: 8, padding: "6px 10px", color: C2.textDim, fontSize: 12, cursor: "pointer" }}>
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        </>)}
      </div>
    );
  }

  const npc = activeNPC;

  if (!npc) return <div style={{ padding: 40, color: C2.textDim, textAlign: "center" }}>Loading character…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: pad }}>
      {showEditor && (
        <NPCEditorModal
          npc={editingNPC}
          onClose={() => { setShowEditor(false); setEditingNPC(null); }}
          onSaved={async (saved) => {
            if (saved) {
              setDbNPCs(prev => prev.map(n => n.id === saved.id ? saved : n));
            } else {
              await loadDBNPCs();
            }
            setShowEditor(false);
            setEditingNPC(null);
          }}
        />
      )}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* Character sidebar */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <button onClick={() => { setSelectedNPC(null); setSelectedPost(null); setComposeText(""); }}
            style={{ background: "none", border: "none", color: C2.textDim, fontSize: 13, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
            ← All characters
          </button>
          <button onClick={() => { setEditingNPC(npc); setShowEditor(true); }}
            style={{ background: C2.surfaceRaised, border: "1px solid " + C2.border, borderRadius: 8, padding: "5px 12px", color: C2.textMuted, fontSize: 11, cursor: "pointer", marginBottom: 14, width: "100%" }}>
            ✏️ Edit this character
          </button>

          {/* NPC card */}
          <div style={{ background: C2.goldGlow, border: "1px solid " + C2.goldBorder, borderRadius: 16, padding: 18, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Avatar initials={npc.avatar_initials || "?"} size={44} isNPC={true} status={npc.status} />
              <div>
                <div style={{ fontWeight: 800, color: C2.gold, fontSize: 15 }}>{npc.name}</div>
                <div style={{ color: C2.textDim, fontSize: 11 }}>{npc.handle}</div>
              </div>
            </div>

            <div style={{ color: C2.textMuted, fontSize: 12, lineHeight: 1.7, marginBottom: 14, borderBottom: "1px solid " + C2.goldBorder, paddingBottom: 14 }}>{npc.bio}</div>

            {npc.personality && (
              <div style={{ marginBottom: 14, borderBottom: "1px solid " + C2.goldBorder, paddingBottom: 14 }}>
                <div style={{ color: C2.gold, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Voice & Personality</div>
                <div style={{ color: C2.textMuted, fontSize: 12, lineHeight: 1.7 }}>{npc.personality}</div>
              </div>
            )}

            {npc.lore && (
              <div style={{ marginBottom: 14, borderBottom: "1px solid " + C2.goldBorder, paddingBottom: 14 }}>
                <div style={{ color: C2.gold, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Background</div>
                <div style={{ color: C2.textMuted, fontSize: 12, lineHeight: 1.7 }}>{npc.lore}</div>
              </div>
            )}

            {npc.role && (
              <div style={{ marginBottom: 14, borderBottom: "1px solid " + C2.goldBorder, paddingBottom: 14 }}>
                <div style={{ color: C2.gold, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Role</div>
                <div style={{ color: C2.textMuted, fontSize: 12 }}>{npc.role}</div>
                {npc.location && <div style={{ color: C2.textDim, fontSize: 11, marginTop: 2 }}>{npc.location}</div>}
              </div>
            )}

            {npc.universe && (
              <div style={{ marginBottom: (npc.games || []).length > 0 ? 14 : 0, borderBottom: (npc.games || []).length > 0 ? "1px solid " + C2.goldBorder : "none", paddingBottom: (npc.games || []).length > 0 ? 14 : 0 }}>
                <div style={{ color: C2.gold, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Universe</div>
                <div style={{ color: C2.textMuted, fontSize: 12 }}>{npc.universe_icon || "⚔️"} {npc.universe}</div>
              </div>
            )}

            {(npc.games || []).length > 0 && (
              <div>
                <div style={{ color: C2.gold, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Games</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {(npc.games || []).map(g => (
                    <span key={g} style={{ background: "rgba(0,0,0,0.3)", border: "1px solid " + C2.goldBorder, borderRadius: 6, padding: "2px 8px", color: C2.gold, fontSize: 11 }}>{g}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          {(npc.stats || []).length > 0 && (
            <div style={{ background: C2.surface, border: "1px solid " + C2.border, borderRadius: 14, padding: 16 }}>
              <div style={{ color: C2.textDim, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Stats</div>
              {(npc.stats || []).map(s => (
                <div key={s.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C2.textMuted, fontSize: 12 }}>{s.label}</span>
                    <span style={{ color: C2.text, fontSize: 12, fontWeight: 700 }}>{s.value}</span>
                  </div>
                  <div style={{ color: C2.textDim, fontSize: 10, marginTop: 1 }}>{s.note}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 4, marginBottom: studioPrompt ? 12 : 20, background: C2.surface, border: "1px solid " + C2.border, borderRadius: 12, padding: 4 }}>
            {[{ id: "respond", label: "Respond" }, { id: "threads", label: "Threads" }, { id: "post", label: "Post" }].map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setSelectedPost(null); setReplyToComment(null); setComposeText(""); }}
                style={{ flex: 1, background: mode === m.id ? C2.accentGlow : "transparent", border: "1px solid " + mode === m.id ? C2.accentDim : "transparent", borderRadius: 8, padding: "8px", color: mode === m.id ? C2.accentSoft : C2.textMuted, fontSize: 14, fontWeight: mode === m.id ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Daily prompt bulletin */}
          {studioPrompt && (
            <div style={{ background: C2.accentGlow, border: "1px solid " + C2.accentDim, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ color: C2.accentSoft, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", marginTop: 1 }}>Today</div>
              <div style={{ color: C2.text, fontSize: 13, lineHeight: 1.5 }}>{studioPrompt.question}</div>
            </div>
          )}

          {/* Respond mode */}
          {mode === "respond" && (
            <div>
              {loadingCandidates ? (
                <div style={{ color: C2.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>Loading candidate posts…</div>
              ) : candidates.filter(p => !closedCandidates.has(p.id)).length === 0 ? (
                <div style={{ color: C2.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>No new candidates right now.</div>
              ) : (
                candidates.filter(p => !closedCandidates.has(p.id)).map(post => {
                  const isSelected = selectedPost?.id === post.id;
                  const postComments = expandedComments[post.id];
                  const npcComments = (postComments || []).filter(c => c.npc_id);
                  const hasNpcReply = npcComments.length > 0;
                  const lastComment = postComments?.length > 0 ? postComments[postComments.length - 1] : null;
                  const lastIsUser = lastComment && !lastComment.npc_id;
                  const status = hasNpcReply ? (lastIsUser ? "needs_reply" : "replied") : "fresh";
                  const statusStyles = {
                    fresh:       { bg: C2.accent + "18", border: C2.accentDim, label: "Fresh",       color: C2.accentSoft },
                    replied:     { bg: "#22c55e18",      border: "#22c55e44",  label: "Replied",     color: "#22c55e" },
                    needs_reply: { bg: "#f59e0b18",      border: "#f59e0b44",  label: "Needs Reply", color: C2.gold },
                  };
                  const st = statusStyles[status];
                  const feedPost = {
                    id: post.id,
                    npc_id: null,
                    user_id: post.user_id,
                    game_tag: post.game_tag,
                    user: {
                      name: post.profiles?.username || "Gamer",
                      handle: post.profiles?.handle || "",
                      avatar: post.profiles?.avatar_initials || "?",
                      status: "online",
                      isNPC: false,
                      isFounding: post.profiles?.is_founding || false,
                      activeRing: post.profiles?.active_ring || "none",
                    },
                    content: post.content,
                    time: timeAgo(post.created_at),
                    likes: post.likes || 0,
                    liked: false,
                    comment_count: post.commentCount || 0,
                    commentList: [],
                  };
                  return (
                    <div key={post.id} style={{ marginBottom: 12 }}>
                      {/* Studio status bar */}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 5, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ background: st.bg, border: "1px solid " + st.border, borderRadius: 6, padding: "2px 8px", color: st.color, fontSize: 10, fontWeight: 700 }}>{st.label}</span>
                        {post.newUser && <span style={{ background: C2.accent + "22", border: "1px solid " + C2.accentDim, borderRadius: 6, padding: "2px 7px", color: C2.accentSoft, fontSize: 10, fontWeight: 700 }}>NEW USER</span>}
                        {post.hasThread && <span style={{ background: "#f59e0b22", border: "1px solid #f59e0b44", borderRadius: 6, padding: "2px 7px", color: C2.gold, fontSize: 10, fontWeight: 700 }}>THREAD</span>}
                        <button onClick={() => { setClosedCandidates(prev => new Set([...prev, post.id])); if (selectedPost?.id === post.id) { setSelectedPost(null); setReplyToComment(null); setComposeText(""); } }}
                          style={{ background: C2.surfaceRaised, border: "1px solid " + C2.border, borderRadius: 6, padding: "2px 10px", color: C2.textDim, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          Close ✓
                        </button>
                      </div>
                      <FeedPostCard
                        post={feedPost}
                        setActivePage={setActivePage}
                        setCurrentGame={() => {}}
                        setCurrentNPC={setCurrentNPC}
                        setCurrentPlayer={() => {}}
                        isMobile={isMobile}
                        currentUser={currentUser}
                        readOnly={true}
                        onCommentReply={c => { setSelectedPost(post); setReplyToComment(c); }}
                      />
                      {/* Reply as NPC button + composer */}
                      {!isSelected && (
                        <div style={{ marginTop: 6 }}>
                          <button onClick={() => { setSelectedPost(post); setComposeText(""); setReplyToComment(null); loadPostComments(post.id); }}
                            style={{ background: C2.accentGlow, border: "1px solid " + C2.accentDim, borderRadius: 8, padding: "6px 16px", color: C2.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            Reply as {npc.name.split(" ")[0]}
                          </button>
                        </div>
                      )}
                      {isSelected && (
                        <div style={{ borderTop: "1px solid " + C2.accentDim, padding: "12px 16px", background: C2.accentGlow, borderRadius: "0 0 14px 14px", marginTop: 4 }}>
                          {replyToComment && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, background: C2.surfaceRaised, border: "1px solid " + C2.border, borderRadius: 8, padding: "5px 10px" }}>
                              <span style={{ color: C2.accentSoft, fontSize: 12 }}>↩ Replying to <strong>{replyToComment.name}</strong></span>
                              <button onClick={() => setReplyToComment(null)} style={{ background: "none", border: "none", color: C2.textDim, fontSize: 14, cursor: "pointer", marginLeft: "auto", padding: 0 }}>×</button>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            <Avatar initials={npc.avatar_initials || "?"} size={28} isNPC={true} />
                            <textarea value={composeText} onChange={e => setComposeText(e.target.value)}
                              placeholder={replyToComment ? `Reply to ${replyToComment.name} as ${npc.name}…` : `Reply as ${npc.name}…`}
                              style={{ flex: 1, background: C2.bg, border: "1px solid " + C2.border, borderRadius: 8, padding: "8px 12px", color: C2.text, fontSize: 13, resize: "none", outline: "none", minHeight: 80 }}
                              autoFocus
                            />
                          </div>
                          {renderScheduler()}
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button onClick={() => { setSelectedPost(null); setReplyToComment(null); setComposeText(""); setScheduleMode(false); }}
                              style={{ background: "none", border: "1px solid " + C2.border, borderRadius: 8, padding: "7px 16px", color: C2.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleSend} disabled={!composeText.trim() || sending || (scheduleMode && (!scheduleDate || !scheduleTime))}
                              style={{ background: (composeText.trim() && !(scheduleMode && (!scheduleDate || !scheduleTime))) ? C2.accent : C2.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 20px", color: (composeText.trim() && !(scheduleMode && (!scheduleDate || !scheduleTime))) ? "#fff" : C2.textDim, fontSize: 13, fontWeight: 700, cursor: (composeText.trim() && !(scheduleMode && (!scheduleDate || !scheduleTime))) ? "pointer" : "default" }}>
                              {sending ? "Sending…" : sent ? "✓ Sent" : scheduleMode ? "Schedule" : "Reply Now"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Threads mode */}
          {mode === "threads" && (
            <div>
              {loadingThreads ? (
                <div style={{ color: C2.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>Loading threads…</div>
              ) : threads.filter(t => !closedThreads.has(t.id)).length === 0 ? (
                <div style={{ color: C2.textDim, fontSize: 13, textAlign: "center", padding: 40 }}>
                  {closedThreads.size > 0 ? `All ${closedThreads.size} thread${closedThreads.size > 1 ? "s" : ""} closed. ` : ""}
                  {npc.name.split(" ")[0]} hasn't engaged any posts yet.
                </div>
              ) : threads.filter(t => !closedThreads.has(t.id)).map(thread => {
                const statusLabel = thread.needsReply ? "Needs Reply" : "Replied";
                const statusColor = thread.needsReply ? C2.gold : "#22c55e";
                const statusBg = thread.needsReply ? "#f59e0b18" : "#22c55e18";
                const statusBorder = thread.needsReply ? "#f59e0b44" : "#22c55e44";
                const isNPCPost = !!thread.npc_id;
                const author = isNPCPost ? thread.npcs : thread.profiles;
                const feedPost = {
                  id: thread.id,
                  npc_id: thread.npc_id || null,
                  user_id: thread.user_id,
                  game_tag: thread.game_tag,
                  user: {
                    name: isNPCPost ? (author?.name || "NPC") : (author?.username || "Gamer"),
                    handle: author?.handle || "",
                    avatar: author?.avatar_initials || "?",
                    status: "online",
                    isNPC: isNPCPost,
                    isFounding: !isNPCPost && (author?.is_founding || false),
                    activeRing: !isNPCPost ? (author?.active_ring || "none") : "none",
                  },
                  content: thread.content,
                  time: timeAgo(thread.created_at),
                  likes: thread.likes || 0,
                  liked: false,
                  comment_count: thread.comments.length,
                  commentList: [],
                };
                return (
                  <div key={thread.id} style={{ marginBottom: 14 }}>
                    {/* Studio status bar */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 4 }}>
                      <span style={{ background: statusBg, border: "1px solid " + statusBorder, borderRadius: 6, padding: "2px 8px", color: statusColor, fontSize: 10, fontWeight: 700 }}>{statusLabel}</span>
                      <button onClick={() => setClosedThreads(prev => new Set([...prev, thread.id]))}
                        style={{ background: C2.surfaceRaised, border: "1px solid " + C2.border, borderRadius: 6, padding: "2px 10px", color: C2.textDim, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                        Close ✓
                      </button>
                    </div>
                    <FeedPostCard
                      post={{
                        ...feedPost,
                        commentList: thread.comments.map(c => ({
                          ...c,
                          user: {
                            name: c.npc_id ? (c.npcs?.name || "NPC") : (c.profiles?.username || "User"),
                            handle: c.npc_id ? (c.npcs?.handle || "") : (c.profiles?.handle || ""),
                            avatar: c.npc_id ? (c.npcs?.avatar_initials || "NPC") : (c.profiles?.avatar_initials || "?"),
                            isNPC: !!c.npc_id,
                          },
                        })),
                      }}
                      setActivePage={setActivePage}
                      setCurrentGame={() => {}}
                      setCurrentNPC={setCurrentNPC}
                      setCurrentPlayer={() => {}}
                      isMobile={isMobile}
                      currentUser={currentUser}
                      readOnly={true}
                      onCommentReply={c => { setSelectedPost(thread); setReplyToComment(c); }}
                    />
                    {/* Reply as NPC button */}
                    <div style={{ marginTop: 6 }}>
                      {!(selectedPost?.id === thread.id) && (
                        <button onClick={() => { setSelectedPost(thread); setComposeText(""); setReplyToComment(null); }}
                          style={{ background: C2.accentGlow, border: "1px solid " + C2.accentDim, borderRadius: 8, padding: "6px 16px", color: C2.accentSoft, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Reply as {npc.name.split(" ")[0]}
                        </button>
                      )}
                    </div>
                    {/* NPC compose box */}
                    {selectedPost?.id === thread.id && (
                      <div style={{ borderTop: "1px solid " + C2.accentDim, padding: "12px 16px", background: C2.accentGlow, borderRadius: "0 0 14px 14px", marginTop: 4 }}>
                        {replyToComment && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, background: C2.surfaceRaised, border: "1px solid " + C2.border, borderRadius: 8, padding: "5px 10px" }}>
                            <span style={{ color: C2.accentSoft, fontSize: 12 }}>↩ Replying to <strong>{replyToComment.name}</strong></span>
                            <button onClick={() => setReplyToComment(null)} style={{ background: "none", border: "none", color: C2.textDim, fontSize: 14, cursor: "pointer", marginLeft: "auto", padding: 0 }}>×</button>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                          <Avatar initials={npc.avatar_initials || "?"} size={28} isNPC={true} />
                          <textarea value={composeText} onChange={e => setComposeText(e.target.value)}
                            placeholder={replyToComment ? `Reply to ${replyToComment.name} as ${npc.name}…` : `Reply as ${npc.name}…`}
                            style={{ flex: 1, background: C2.bg, border: "1px solid " + C2.border, borderRadius: 8, padding: "8px 12px", color: C2.text, fontSize: 13, resize: "none", outline: "none", minHeight: 70 }}
                            autoFocus
                          />
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button onClick={() => { setSelectedPost(null); setReplyToComment(null); setComposeText(""); }}
                            style={{ background: "none", border: "1px solid " + C2.border, borderRadius: 8, padding: "7px 16px", color: C2.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                          <button onClick={async () => {
                            if (!composeText.trim()) return;
                            setSending(true);
                            const { data: { user: writerUser } } = await supabase.auth.getUser();
                            const { error } = await supabase.from("comments").insert({
                              post_id: thread.id,
                              content: composeText.trim(),
                              npc_id: selectedNPC,
                              user_id: writerUser.id,
                              reply_to_comment_id: replyToComment?.id || null,
                            });
                            if (replyToComment?.userId && replyToComment.userId !== writerUser.id) {
                              await supabase.from("notifications").insert({
                                user_id: replyToComment.userId,
                                actor_id: writerUser.id,
                                npc_id: selectedNPC,
                                type: "comment",
                                post_id: thread.id,
                              });
                            }
                            setSending(false);
                            if (error) { console.error("[thread reply] error:", error); return; }
                            setComposeText(""); setReplyToComment(null); setSelectedPost(null);
                            setSent(true); setTimeout(() => setSent(false), 2000);
                            loadThreads();
                          }} disabled={!composeText.trim() || sending}
                            style={{ background: composeText.trim() ? C2.accent : C2.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 20px", color: composeText.trim() ? "#fff" : C2.textDim, fontSize: 13, fontWeight: 700, cursor: composeText.trim() ? "pointer" : "default" }}>
                            {sending ? "Sending…" : sent ? "✓ Sent" : "Reply Now"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Post mode */}
          {mode === "post" && (
            <div style={{ background: C2.surface, border: "1px solid " + C2.border, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <Avatar initials={npc.avatar_initials || "?"} size={38} isNPC={true} status={npc.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: C2.text, fontSize: 14 }}>{npc.name}</div>
                  <div style={{ color: C2.textDim, fontSize: 12 }}>{npc.handle}</div>
                </div>
              </div>
              <textarea value={composeText} onChange={e => setComposeText(e.target.value)}
                placeholder={`What's ${npc.name.split(" ")[0]} thinking?`}
                style={{ width: "100%", background: C2.surfaceHover, border: "1px solid " + C2.border, borderRadius: 10, padding: "12px 16px", color: C2.text, fontSize: 14, resize: "none", outline: "none", minHeight: 120, boxSizing: "border-box", lineHeight: 1.6 }}
              />
              <div style={{ color: C2.textDim, fontSize: 11, textAlign: "right", marginTop: 4, marginBottom: 14 }}>{composeText.length} chars</div>
              {renderScheduler()}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => setComposeText("")}
                  style={{ background: "none", border: "1px solid " + C2.border, borderRadius: 8, padding: "8px 18px", color: C2.textMuted, fontSize: 13, cursor: "pointer" }}>Clear</button>
                <button onClick={handleSend} disabled={!composeText.trim() || sending || (scheduleMode && (!scheduleDate || !scheduleTime))}
                  style={{ background: (composeText.trim() && !(scheduleMode && (!scheduleDate || !scheduleTime))) ? C2.accent : C2.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 24px", color: (composeText.trim() && !(scheduleMode && (!scheduleDate || !scheduleTime))) ? "#fff" : C2.textDim, fontSize: 14, fontWeight: 700, cursor: (composeText.trim() && !(scheduleMode && (!scheduleDate || !scheduleTime))) ? "pointer" : "default" }}>
                  {sending ? "Sending…" : sent ? "✓ Posted" : scheduleMode ? "Schedule" : "Post Now"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function renderScheduler() {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: scheduleMode ? 10 : 0 }}>
          <input type="checkbox" checked={scheduleMode} onChange={e => {
            setScheduleMode(e.target.checked);
            if (e.target.checked) {
              const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
              setScheduleDate(tomorrow.toISOString().split("T")[0]);
              setScheduleTime("09:00");
            }
          }}
            style={{ accentColor: C2.accent }} />
          <span style={{ color: C2.textMuted, fontSize: 13 }}>Schedule for later</span>
        </label>
        {scheduleMode && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
              style={{ background: C2.surfaceHover, border: "1px solid " + C2.border, borderRadius: 8, padding: "6px 10px", color: C2.text, fontSize: 13, outline: "none", flex: 1 }} />
            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
              style={{ background: C2.surfaceHover, border: "1px solid " + C2.border, borderRadius: 8, padding: "6px 10px", color: C2.text, fontSize: 13, outline: "none", flex: 1 }} />
          </div>
        )}
      </div>
    );
  }
}

export default NPCStudioPage;
export { NPCEditorModal };
