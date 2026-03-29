import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo } from "../utils.js";
import { Avatar } from "./Avatar.jsx";

function GuildActivityFeed({ guildId, memberIds }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberIds || memberIds.length === 0) { setLoading(false); return; }
    const load = async () => {
      const [postsRes, shelfRes] = await Promise.all([
        supabase
          .from("posts")
          .select("id, content, created_at, user_id, profiles(username, avatar_initials, avatar_config, active_ring, is_founding), games(name)")
          .in("user_id", memberIds)
          .order("created_at", { ascending: false })
          .limit(memberIds.length * 2),
        supabase
          .from("user_games_history")
          .select("id, to_status, changed_at, user_id, profiles(username, avatar_initials, avatar_config, active_ring, is_founding), games(name)")
          .in("user_id", memberIds)
          .order("changed_at", { ascending: false })
          .limit(memberIds.length * 2),
      ]);

      const postItems = (postsRes.data || []).map(p => ({
        id: "post-" + p.id,
        type: "post",
        user: p.profiles,
        content: p.content,
        game: p.games?.name,
        ts: p.created_at,
      }));

      const shelfItems = (shelfRes.data || []).map(u => ({
        id: "shelf-" + u.id,
        type: "shelf",
        user: u.profiles,
        game: u.games?.name,
        status: u.to_status,
        ts: u.changed_at,
      }));

      // Keep last 2 per member across both streams
      const byMember = {};
      [...postItems, ...shelfItems]
        .sort((a, b) => new Date(b.ts) - new Date(a.ts))
        .forEach(item => {
          const uid = item.user?.username || "unknown";
          if (!byMember[uid]) byMember[uid] = [];
          if (byMember[uid].length < 2) byMember[uid].push(item);
        });

      const merged = Object.values(byMember)
        .flat()
        .sort((a, b) => new Date(b.ts) - new Date(a.ts));

      setItems(merged);
      setLoading(false);
    };
    load();
  }, [guildId, (memberIds || []).join(",")]);

  const statusLabel = (status) => {
    if (status === "playing") return "is now playing";
    if (status === "want_to_play") return "wants to play";
    if (status === "have_played") return "finished playing";
    return "added";
  };

  if (loading) return <div style={{ color: C.textDim, fontSize: 13, padding: "20px 0" }}>Loading activity...</div>;
  if (items.length === 0) return <div style={{ color: C.textDim, fontSize: 13, padding: "20px 0" }}>No recent activity from guild members.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map(item => (
        <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Avatar
            initials={(item.user?.avatar_initials || "?").slice(0, 2).toUpperCase()}
            size={32}
            founding={item.user?.is_founding}
            ring={item.user?.active_ring}
            avatarConfig={item.user?.avatar_config}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>
              <span style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{item.user?.username || "Member"}</span>
              <span style={{ color: C.textDim, fontSize: 13 }}>
                {item.type === "post"
                  ? (item.game ? " posted about " + item.game + ": " : " posted: ")
                  : (" " + statusLabel(item.status) + " " + (item.game || "a game"))
                }
              </span>
              {item.type === "post" && item.content && (
                <span style={{ color: C.textMuted, fontSize: 13 }}>
                  {item.content.length > 80 ? item.content.slice(0, 80) + "..." : item.content}
                </span>
              )}
            </div>
            <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>{timeAgo(item.ts)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default GuildActivityFeed;
