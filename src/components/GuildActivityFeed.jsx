import React, { useState, useEffect } from "react";
import { C } from "../constants.js";
import supabase from "../supabase.js";
import { timeAgo } from "../utils.js";
import { Avatar } from "./Avatar.jsx";

function GuildActivityFeed({ guildId, memberIds }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberIds || memberIds.length === 0) { return; } // wait — don't set loading:false yet
    const load = async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [postsRes, shelfRes, profilesRes] = await Promise.all([
        supabase
          .from("posts")
          .select("id, content, created_at, user_id, game_tag")
          .in("user_id", memberIds)
          .or("post_type.eq.post,post_type.is.null")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("user_games_history")
          .select("id, to_status, changed_at, user_id, game_id")
          .in("user_id", memberIds)
          .gte("changed_at", since)
          .order("changed_at", { ascending: false })
          .limit(30),
        supabase
          .from("profiles")
          .select("id, username, avatar_initials, avatar_config, active_ring, is_founding")
          .in("id", memberIds),
      ]);

      // Build profile map
      const profileMap = {};
      (profilesRes.data || []).forEach(p => { profileMap[p.id] = p; });

      // Get game names for tagged posts and shelf items
      const gameIds = [
        ...(postsRes.data || []).map(p => p.game_tag).filter(Boolean),
        ...(shelfRes.data || []).map(s => s.game_id).filter(Boolean),
      ];
      const uniqueGameIds = [...new Set(gameIds)];
      let gameMap = {};
      if (uniqueGameIds.length > 0) {
        const { data: games } = await supabase.from("games").select("id, name").in("id", uniqueGameIds);
        (games || []).forEach(g => { gameMap[g.id] = g.name; });
      }

      const postItems = (postsRes.data || [])
        .filter(p => p.game_tag)
        .map(p => ({
          id: "post-" + p.id,
          type: "post",
          user: profileMap[p.user_id],
          content: p.content,
          game: gameMap[p.game_tag],
          ts: p.created_at,
        }));

      const shelfItems = (shelfRes.data || []).map(u => ({
        id: "shelf-" + u.id,
        type: "shelf",
        user: profileMap[u.user_id],
        game: gameMap[u.game_id],
        status: u.to_status,
        ts: u.changed_at,
      }));

      // Limit to 3 items per member
      const countByUser = {};
      const merged = [...postItems, ...shelfItems]
        .sort((a, b) => new Date(b.ts) - new Date(a.ts))
        .filter(item => {
          const uid = item.user?.id;
          if (!uid) return false;
          countByUser[uid] = (countByUser[uid] || 0) + 1;
          return countByUser[uid] <= 3;
        })
        .slice(0, 20);
      setItems(merged);
      setLoading(false);
    };
    load();
  }, [guildId, (memberIds || []).join(",")]);

  if (loading) return <div style={{ color: C.textDim, fontSize: 13, padding: "20px 0" }}>Loading activity\u2026</div>;
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
                  : item.status === "playing" ? (" is playing " + (item.game || "a game"))
                  : item.status === "have_played" ? (" finished playing " + (item.game || "a game"))
                  : (" wants to play " + (item.game || "a game"))
                }
              </span>
              {item.type === "post" && item.content && (
                <span style={{ color: C.textMuted, fontSize: 13 }}>
                  {item.content.length > 80 ? item.content.slice(0, 80) + "\u2026" : item.content}
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
