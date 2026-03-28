import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo } from "../utils.js";
import { Avatar } from "../components/Avatar.jsx";
import SessionCard from "../components/SessionCard.jsx";
import GuildActivityFeed from "../components/GuildActivityFeed.jsx";

function GuildPortal({ guildId, isMobile, currentUser, setActivePage, setCurrentPlayer }) {
  const [guild, setGuild] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberIds, setMemberIds] = useState([]);
  const [isLeader, setIsLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionRsvps, setSessionRsvps] = useState({});
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ game: "", title: "", scheduled_at: "", notes: "" });
  const [schedulingSession, setSchedulingSession] = useState(false);

  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [postingToThread, setPostingToThread] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [replies, setReplies] = useState({});
  const [newReply, setNewReply] = useState({});

  const load = async () => {
    if (!guildId) return;
    const [guildRes, membersRes] = await Promise.all([
      supabase.from("guilds").select("*").eq("id", guildId).single(),
      supabase.from("guild_members").select("user_id, role, profiles(id, username, avatar_initials, avatar_config, active_ring, is_founding)").eq("guild_id", guildId),
    ]);
    if (guildRes.data) {
      setGuild(guildRes.data);
      setEditForm({
        name: guildRes.data.name,
        description: guildRes.data.description || "",
        is_public: guildRes.data.is_public,
        looking_for_members: guildRes.data.looking_for_members,
        discord_url: guildRes.data.discord_url || "",
        website_url: guildRes.data.website_url || "",
      });
    }
    if (membersRes.data) {
      setMembers(membersRes.data);
      const ids = membersRes.data.map(m => m.user_id);
      setMemberIds(ids);
      if (currentUser?.id) {
        const me = membersRes.data.find(m => m.user_id === currentUser.id);
        setIsLeader(me?.role === "leader");
      }
    }
    setLoading(false);
  };

  const loadSessions = async () => {
    const { data } = await supabase
      .from("guild_sessions")
      .select("*")
      .eq("guild_id", guildId)
      .gt("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });
    setSessions(data || []);
    if (data && data.length > 0 && currentUser?.id) {
      const sessionIds = data.map(s => s.id);
      const { data: rsvpData } = await supabase.from("guild_session_rsvps").select("*").in("session_id", sessionIds);
      const grouped = {};
      (rsvpData || []).forEach(r => {
        if (!grouped[r.session_id]) grouped[r.session_id] = [];
        grouped[r.session_id].push(r);
      });
      setSessionRsvps(grouped);
    }
  };

  const loadThread = async () => {
    const { data } = await supabase
      .from("guild_posts")
      .select("id, content, created_at, user_id, parent_id, profiles(id, username, avatar_initials, avatar_config, active_ring, is_founding)")
      .eq("guild_id", guildId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });
    setPosts(data || []);
  };

  useEffect(() => {
    load();
    loadSessions();
    loadThread();
  }, [guildId]);

  const saveEdit = async () => {
    setSaving(true);
    await supabase.from("guilds").update({
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      is_public: editForm.is_public,
      looking_for_members: editForm.looking_for_members,
      discord_url: editForm.discord_url.trim() || null,
      website_url: editForm.website_url.trim() || null,
    }).eq("id", guildId);
    setGuild(g => ({ ...g, ...editForm, name: editForm.name.trim(), description: editForm.description.trim() || null }));
    setShowEdit(false);
    setSaving(false);
  };

  const scheduleSession = async () => {
    if (!sessionForm.game.trim() || !sessionForm.scheduled_at || schedulingSession) return;
    setSchedulingSession(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSchedulingSession(false); return; }
    await supabase.from("guild_sessions").insert({
      guild_id: guildId,
      game: sessionForm.game.trim(),
      title: sessionForm.title.trim() || null,
      scheduled_at: sessionForm.scheduled_at,
      notes: sessionForm.notes.trim() || null,
      created_by: user.id,
    });
    setSessionForm({ game: "", title: "", scheduled_at: "", notes: "" });
    setShowSessionForm(false);
    setSchedulingSession(false);
    loadSessions();
  };

  const handleRsvp = async (sessionId, response) => {
    if (!currentUser?.id) return;
    await supabase.from("guild_session_rsvps").upsert(
      { session_id: sessionId, user_id: currentUser.id, response },
      { onConflict: "session_id,user_id" }
    );
    setSessionRsvps(prev => {
      const existing = (prev[sessionId] || []).filter(r => r.user_id !== currentUser.id);
      return { ...prev, [sessionId]: [...existing, { session_id: sessionId, user_id: currentUser.id, response }] };
    });
  };

  const submitPost = async () => {
    if (!newPost.trim() || postingToThread) return;
    setPostingToThread(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPostingToThread(false); return; }
    await supabase.from("guild_posts").insert({ guild_id: guildId, user_id: user.id, content: newPost.trim(), parent_id: null });
    setNewPost("");
    setPostingToThread(false);
    loadThread();
  };

  const loadReplies = async (postId) => {
    const { data } = await supabase
      .from("guild_posts")
      .select("id, content, created_at, user_id, profiles(id, username, avatar_initials, avatar_config, active_ring, is_founding)")
      .eq("guild_id", guildId)
      .eq("parent_id", postId)
      .order("created_at", { ascending: true });
    setReplies(prev => ({ ...prev, [postId]: data || [] }));
  };

  const submitReply = async (parentId) => {
    const text = (newReply[parentId] || "").trim();
    if (!text) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("guild_posts").insert({ guild_id: guildId, user_id: user.id, content: text, parent_id: parentId });
    setNewReply(prev => ({ ...prev, [parentId]: "" }));
    loadReplies(parentId);
  };

  const inputStyle = { width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const sectionStyle = { background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: 20, marginBottom: 20 };
  const labelStyle = { color: C.textDim, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 };

  if (loading) return <div style={{ textAlign: "center", padding: "120px 20px", color: C.textDim }}>Loading guild\u2026</div>;
  if (!guild) return <div style={{ textAlign: "center", padding: "120px 20px", color: C.textDim }}>Guild not found.</div>;

  const isMember = currentUser && memberIds.includes(currentUser.id);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>
      <button onClick={() => setActivePage("squad")} style={{ background: "none", border: "none", color: C.textDim, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>\u2190 Back to Guilds</button>

      <div style={sectionStyle}>
        {showEdit ? (
          <div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 16 }}>Edit Guild</div>
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Name</div>
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Description</div>
              <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, resize: "none", minHeight: 80 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={labelStyle}>Discord URL</div>
                <input value={editForm.discord_url} onChange={e => setEditForm(f => ({ ...f, discord_url: e.target.value }))} placeholder="https://discord.gg/..." style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Website URL</div>
                <input value={editForm.website_url} onChange={e => setEditForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: C.textMuted, fontSize: 13 }}>
                <input type="checkbox" checked={editForm.is_public} onChange={e => setEditForm(f => ({ ...f, is_public: e.target.checked }))} />
                Public
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: C.textMuted, fontSize: 13 }}>
                <input type="checkbox" checked={editForm.looking_for_members} onChange={e => setEditForm(f => ({ ...f, looking_for_members: e.target.checked }))} />
                Looking for members
              </label>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowEdit(false)} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 20px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 24px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Saving\u2026" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <h1 style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? 22 : 28, color: C.text, letterSpacing: "-0.5px" }}>{guild.name}</h1>
              {isLeader && (
                <button onClick={() => setShowEdit(true)} style={{ background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 16px", color: C.textMuted, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Edit</button>
              )}
            </div>
            {guild.description && <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, margin: "0 0 14px" }}>{guild.description}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              {guild.looking_for_members && (
                <span style={{ background: "#22c55e22", border: "1px solid #22c55e44", color: "#22c55e", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 8px" }}>LFM</span>
              )}
              <span style={{ background: C.surfaceRaised, border: "1px solid " + C.border, color: C.textDim, fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "3px 8px" }}>
                {guild.is_public ? "Public" : "Private"}
              </span>
              {guild.discord_url && (
                <a href={guild.discord_url} target="_blank" rel="noopener noreferrer" style={{ color: "#5865f2", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Discord</a>
              )}
              {guild.website_url && (
                <a href={guild.website_url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Website</a>
              )}
            </div>
            <div style={labelStyle}>Members</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {members.map(m => {
                const p = m.profiles;
                if (!p) return null;
                return (
                  <div key={m.user_id} onClick={() => { setCurrentPlayer(p.id); setActivePage("player"); }} style={{ cursor: "pointer" }} title={p.username}>
                    <Avatar initials={(p.avatar_initials || "?").slice(0, 2).toUpperCase()} size={40} founding={p.is_founding} ring={p.active_ring} avatarConfig={p.avatar_config} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Session Board</div>
          {isMember && (
            <button onClick={() => setShowSessionForm(f => !f)}
              style={{ background: showSessionForm ? C.surfaceRaised : C.accent, border: "none", borderRadius: 8, padding: "7px 16px", color: showSessionForm ? C.textMuted : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {showSessionForm ? "Cancel" : "+ Schedule a Session"}
            </button>
          )}
        </div>

        {showSessionForm && (
          <div style={{ background: C.surfaceRaised, border: "1px solid " + C.accentDim, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={labelStyle}>Game *</div>
                <input value={sessionForm.game} onChange={e => setSessionForm(f => ({ ...f, game: e.target.value }))} placeholder="e.g. Elden Ring" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Title (optional)</div>
                <input value={sessionForm.title} onChange={e => setSessionForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Weekly run" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Date & Time *</div>
              <input type="datetime-local" value={sessionForm.scheduled_at} onChange={e => setSessionForm(f => ({ ...f, scheduled_at: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Notes</div>
              <textarea value={sessionForm.notes} onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes for the session\u2026" style={{ ...inputStyle, resize: "none", minHeight: 60 }} />
            </div>
            <button onClick={scheduleSession} disabled={!sessionForm.game.trim() || !sessionForm.scheduled_at || schedulingSession}
              style={{ background: sessionForm.game.trim() && sessionForm.scheduled_at ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 20px", color: sessionForm.game.trim() && sessionForm.scheduled_at ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {schedulingSession ? "Scheduling\u2026" : "Schedule Session"}
            </button>
          </div>
        )}

        {sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 20px", color: C.textDim, fontSize: 13 }}>No sessions scheduled. Be the first to schedule one.</div>
        ) : sessions.map(s => (
          <SessionCard key={s.id} session={s} currentUserId={currentUser?.id} rsvps={sessionRsvps[s.id] || []} onRsvp={handleRsvp} />
        ))}
      </div>

      <div style={sectionStyle}>
        <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 16 }}>Activity</div>
        <GuildActivityFeed guildId={guildId} memberIds={memberIds} />
      </div>

      <div style={sectionStyle}>
        <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 16 }}>Guild Thread</div>

        {isMember && (
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <input
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitPost(); } }}
              placeholder="Post to guild thread\u2026"
              style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "9px 14px", color: C.text, fontSize: 13, outline: "none" }}
            />
            <button onClick={submitPost} disabled={!newPost.trim() || postingToThread}
              style={{ background: newPost.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "9px 18px", color: newPost.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Post
            </button>
          </div>
        )}

        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 20px", color: C.textDim, fontSize: 13 }}>No posts yet. Start the conversation.</div>
        ) : posts.map(post => {
          const p = post.profiles;
          const isExpanded = expandedPost === post.id;
          return (
            <div key={post.id} style={{ borderBottom: "1px solid " + C.border, paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div onClick={() => { if (p?.id) { setCurrentPlayer(p.id); setActivePage("player"); } }} style={{ cursor: p?.id ? "pointer" : "default", flexShrink: 0 }}>
                  <Avatar initials={(p?.avatar_initials || "?").slice(0, 2).toUpperCase()} size={36} founding={p?.is_founding} ring={p?.active_ring} avatarConfig={p?.avatar_config} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span onClick={() => { if (p?.id) { setCurrentPlayer(p.id); setActivePage("player"); } }} style={{ fontWeight: 700, color: C.text, fontSize: 14, cursor: p?.id ? "pointer" : "default" }}>{p?.username || "Member"}</span>
                    <span style={{ color: C.textDim, fontSize: 12 }}>{timeAgo(post.created_at)}</span>
                  </div>
                  <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{post.content}</p>
                  <button onClick={() => {
                    if (isExpanded) { setExpandedPost(null); }
                    else { setExpandedPost(post.id); loadReplies(post.id); }
                  }} style={{ background: "none", border: "none", color: C.textDim, fontSize: 12, cursor: "pointer", padding: 0 }}>
                    {isExpanded ? "Hide replies" : "Reply"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginLeft: 48, marginTop: 12 }}>
                  {(replies[post.id] || []).map(reply => {
                    const rp = reply.profiles;
                    return (
                      <div key={reply.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                        <Avatar initials={(rp?.avatar_initials || "?").slice(0, 2).toUpperCase()} size={28} founding={rp?.is_founding} ring={rp?.active_ring} avatarConfig={rp?.avatar_config} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{rp?.username || "Member"}</span>
                            <span style={{ color: C.textDim, fontSize: 11 }}>{timeAgo(reply.created_at)}</span>
                          </div>
                          <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{reply.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  {isMember && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <input
                        value={newReply[post.id] || ""}
                        onChange={e => setNewReply(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitReply(post.id); } }}
                        placeholder="Write a reply\u2026"
                        style={{ flex: 1, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 12px", color: C.text, fontSize: 13, outline: "none" }}
                      />
                      <button onClick={() => submitReply(post.id)} disabled={!(newReply[post.id] || "").trim()}
                        style={{ background: (newReply[post.id] || "").trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "7px 14px", color: (newReply[post.id] || "").trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GuildPortal;
