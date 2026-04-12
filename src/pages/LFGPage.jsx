import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import GuildCard from "../components/GuildCard.jsx";
import { isUsernameRestricted } from "../utils.js";

function LFGPage({ isMobile, currentUser, setCurrentPlayer, setActivePage, setCurrentGuild }) {
  const [activeTab, setActiveTab] = useState("find-guilds");

  const [guilds, setGuilds] = useState([]);
  const [guildsLoading, setGuildsLoading] = useState(false);
  const [guildSearch, setGuildSearch] = useState("");
  const [lfmFilter, setLfmFilter] = useState(false);
  const [memberGuildIds, setMemberGuildIds] = useState(new Set());
  const [requestedGuildIds, setRequestedGuildIds] = useState(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", is_public: true, looking_for_members: false, discord_url: "", website_url: "" });
  const [creating, setCreating] = useState(false);

  const [myGuilds, setMyGuilds] = useState([]);
  const [myGuildsLoading, setMyGuildsLoading] = useState(false);

  const loadGuilds = async () => {
    setGuildsLoading(true);
    const { data } = await supabase
      .from("guilds")
      .select("id, name, description, is_public, looking_for_members, discord_url, website_url, created_by")
      .order("created_at", { ascending: false });
    setGuilds(data || []);
    if (currentUser?.id) {
      const { data: mem } = await supabase.from("guild_members").select("guild_id, status").eq("user_id", currentUser.id);
      setMemberGuildIds(new Set((mem || []).filter(m => m.status === "active").map(m => m.guild_id)));
      setRequestedGuildIds(new Set((mem || []).filter(m => m.status === "pending").map(m => m.guild_id)));
    }
    setGuildsLoading(false);
  };

  const loadMyGuilds = async () => {
    if (!currentUser?.id) { setMyGuildsLoading(false); return; }
    setMyGuildsLoading(true);
    const { data } = await supabase
      .from("guild_members")
      .select("guild_id, guilds(id, name, description, is_public, looking_for_members)")
      .eq("user_id", currentUser.id)
      .eq("status", "active");
    setMyGuilds((data || []).map(m => m.guilds).filter(Boolean));
    setMyGuildsLoading(false);
  };

  useEffect(() => { if (activeTab === "find-guilds") loadGuilds(); }, [activeTab, currentUser?.id]);
  useEffect(() => { if (activeTab === "your-guilds") loadMyGuilds(); }, [activeTab, currentUser?.id]);

  const joinGuild = async (guildId) => {
    if (!currentUser?.id) return;
    const guild = guilds.find(g => g.id === guildId);
    const status = guild?.is_public ? "active" : "pending";
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("guild_members").insert({ guild_id: guildId, user_id: currentUser.id, role: "member", status });
    if (status === "active") {
      setMemberGuildIds(prev => new Set([...prev, guildId]));
      // Notify leader when someone joins a public guild
      if (guild?.created_by && guild.created_by !== currentUser.id) {
        await supabase.from("notifications").insert({
          user_id: guild.created_by,
          type: "guild_request",
          message: `${currentUser.name || "Someone"} joined ${guild.name}`,
          guild_id: guildId,
          actor_id: currentUser.id,
        });
      }
    } else {
      setRequestedGuildIds(prev => new Set([...prev, guildId]));
      // Notify guild leader of join request
      if (guild?.created_by && guild.created_by !== currentUser.id) {
        await supabase.from("notifications").insert({
          user_id: guild.created_by,
          type: "guild_request",
          message: `${currentUser.name || "Someone"} has requested to join ${guild.name}`,
          guild_id: guildId,
          actor_id: currentUser.id,
        });
      }
    }
  };

  const cancelRequest = async (guildId) => {
    if (!currentUser?.id) return;
    await supabase.from("guild_members").delete().eq("guild_id", guildId).eq("user_id", currentUser.id).eq("status", "pending");
    setRequestedGuildIds(prev => { const next = new Set(prev); next.delete(guildId); return next; });
  };

  const createGuild = async () => {
    if (!createForm.name.trim() || creating) return;
    const restricted = await isUsernameRestricted(createForm.name.trim());
    if (restricted) { alert("Guild name unavailable."); return; }
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }
    const { data: guild } = await supabase.from("guilds").insert({
      name: createForm.name.trim(),
      description: createForm.description.trim() || null,
      is_public: createForm.is_public,
      looking_for_members: createForm.looking_for_members,
      discord_url: createForm.discord_url.trim() || null,
      website_url: createForm.website_url.trim() || null,
      created_by: user.id,
    }).select().single();
    if (guild) {
      await supabase.from("guild_members").insert({ guild_id: guild.id, user_id: user.id, role: "leader", status: "active" });
      setCreating(false);
      setShowCreateForm(false);
      setCurrentGuild(guild.id);
      setActivePage("guild");
      window.history.pushState({ page: "guild", guildId: guild.id }, "", "/guild/" + guild.id);
    } else {
      setCreating(false);
    }
  };

  const inputStyle = { width: "100%", background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" };

  const tabs = [
    { id: "find-guilds", label: "Find Guilds" },
    { id: "your-guilds", label: "Your Guilds" },
  ];

  const filteredGuilds = guilds.filter(g => {
    if (lfmFilter && !g.looking_for_members) return false;
    if (guildSearch.trim() && !g.name.toLowerCase().includes(guildSearch.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const aRequested = requestedGuildIds.has(a.id) ? 1 : 0;
    const bRequested = requestedGuildIds.has(b.id) ? 1 : 0;
    return aRequested - bRequested;
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "60px 16px 80px" : "80px 20px 40px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: isMobile ? 20 : 26, color: C.text, letterSpacing: "-0.5px" }}>Guilds</h2>
        <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>Guilds are the people you play games with. Join a guild to coordinate play schedules and find new games.</p>
      </div>

      <div style={{ display: "flex", background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: 4, marginBottom: 24, gap: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flex: 1, padding: "8px 16px", background: activeTab === t.id ? C.accentGlow : "transparent", border: activeTab === t.id ? "1px solid " + C.accentDim : "1px solid transparent", borderRadius: 9, color: activeTab === t.id ? C.accentSoft : C.textDim, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "find-guilds" && (
        <div>
          {showCreateForm ? (
            <div style={{ background: C.surface, border: "1px solid " + C.accentDim, borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 16 }}>Create a Guild</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: C.textDim, fontSize: 12, marginBottom: 6 }}>Name *</div>
                <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Guild name" style={inputStyle} autoFocus />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: C.textDim, fontSize: 12, marginBottom: 6 }}>Description</div>
                <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="What is your guild about?" style={{ ...inputStyle, resize: "none", minHeight: 80 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ color: C.textDim, fontSize: 12, marginBottom: 6 }}>Discord URL</div>
                  <input value={createForm.discord_url} onChange={e => setCreateForm(f => ({ ...f, discord_url: e.target.value }))} placeholder="https://discord.gg/..." style={inputStyle} />
                </div>
                <div>
                  <div style={{ color: C.textDim, fontSize: 12, marginBottom: 6 }}>Website URL</div>
                  <input value={createForm.website_url} onChange={e => setCreateForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: C.textMuted, fontSize: 13 }}>
                  <input type="checkbox" checked={createForm.is_public} onChange={e => setCreateForm(f => ({ ...f, is_public: e.target.checked }))} />
                  Public guild
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: C.textMuted, fontSize: 13 }}>
                  <input type="checkbox" checked={createForm.looking_for_members} onChange={e => setCreateForm(f => ({ ...f, looking_for_members: e.target.checked }))} />
                  Looking for members
                </label>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowCreateForm(false)} style={{ background: "transparent", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 20px", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={createGuild} disabled={!createForm.name.trim() || creating}
                  style={{ background: createForm.name.trim() ? C.accent : C.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 24px", color: createForm.name.trim() ? "#fff" : C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {creating ? "Creating..." : "Create Guild"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <input value={guildSearch} onChange={e => setGuildSearch(e.target.value)} placeholder="Search for guilds by name" style={{ flex: 1, minWidth: 160, background: C.surfaceRaised, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
              <button onClick={() => setLfmFilter(f => !f)}
                style={{ background: lfmFilter ? "#22c55e22" : C.surface, border: "1px solid " + (lfmFilter ? "#22c55e44" : C.border), borderRadius: 8, padding: "8px 16px", color: lfmFilter ? "#22c55e" : C.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Looking for Members
              </button>
              {currentUser && (
                <button onClick={() => setShowCreateForm(true)} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  + Create a Guild
                </button>
              )}
            </div>
          )}

          {guildsLoading ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: C.textDim }}>Loading guilds...</div>
          ) : filteredGuilds.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏰</div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 6 }}>No guilds found</div>
              <div style={{ fontSize: 13, color: C.textDim }}>Be the first to create one.</div>
            </div>
          ) : filteredGuilds.map(g => (
            <GuildCard key={g.id} guild={g} isMember={memberGuildIds.has(g.id)} isRequested={requestedGuildIds.has(g.id)} onJoin={() => joinGuild(g.id)} onCancelRequest={() => cancelRequest(g.id)} />
          ))}
        </div>
      )}

      {activeTab === "your-guilds" && (
        <div>
          {!currentUser ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏰</div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 6 }}>Sign in to see your guilds</div>
            </div>
          ) : myGuildsLoading ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: C.textDim }}>Loading...</div>
          ) : myGuilds.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏰</div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 8 }}>You haven't joined any guilds yet</div>
              <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 360, margin: "0 auto" }}>Find one above or create your own.</div>
            </div>
          ) : myGuilds.map(g => (
            <div key={g.id} onClick={() => { setCurrentGuild(g.id); setActivePage("guild"); window.history.pushState({ page: "guild", guildId: g.id }, "", "/guild/" + g.id); }}
              style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 20, marginBottom: 12, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>{g.name}</div>
              {g.description && <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>{g.description}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {g.looking_for_members && <span style={{ background: "#22c55e22", border: "1px solid #22c55e44", color: "#22c55e", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 8px" }}>LFM</span>}
                <span style={{ color: C.textDim, fontSize: 12 }}>{g.is_public ? "Public" : "Private"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LFGPage;
