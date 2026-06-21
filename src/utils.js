import { useState, useEffect } from "react";
import supabase from "./supabase.js";

// Returns Pacific calendar date parts for a given instant, via Intl directly.
// NEVER replace this with manual UTC-offset arithmetic — a sign error in that
// approach previously caused chart_events to get duplicate-stamped with the
// wrong week_start for users outside Pacific time, inflating chart scores.
// Intl.DateTimeFormat reads the Pacific calendar date directly and is immune
// to the browser's own local timezone, so it can't drift like that again.
function getPacificDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  return {
    y: Number(parts.find(p => p.type === "year").value),
    m: Number(parts.find(p => p.type === "month").value),
    d: Number(parts.find(p => p.type === "day").value),
  };
}

// Week start helper — Sunday 12:00am Pacific time
function getWeekStart() {
  const { y, m, d } = getPacificDateParts();
  const pacificDate = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = pacificDate.getUTCDay(); // 0 = Sunday
  pacificDate.setUTCDate(pacificDate.getUTCDate() - dayOfWeek);
  const sy = pacificDate.getUTCFullYear();
  const sm = String(pacificDate.getUTCMonth() + 1).padStart(2, '0');
  const sd = String(pacificDate.getUTCDate()).padStart(2, '0');
  return `${sy}-${sm}-${sd}`;
}

async function logAnalytics(userId, eventType, page, metadata = {}) {
  if (!userId) return;
  try {
    await supabase.from("analytics_events").insert({
      user_id: userId, event_type: eventType, page, metadata,
    });
  } catch(e) { /* non-fatal */ }
}

async function logChartEvent(gameId, eventType, userId) {
  if (!gameId || !gameId.includes('-')) return;
  const weekStart = getWeekStart();
  const { y, m, d } = getPacificDateParts();
  const todayDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  if (eventType === 'post') {
    const { data: existing } = await supabase
      .from("chart_events")
      .select("post_sequence")
      .eq("game_id", gameId)
      .eq("user_id", userId)
      .eq("event_type", "post")
      .eq("date", todayDate)
      .order("post_sequence", { ascending: false })
      .limit(1);
    const nextSeq = existing && existing.length > 0 ? existing[0].post_sequence + 1 : 1;
    await supabase.from("chart_events").insert({
      game_id: gameId, user_id: userId, event_type: eventType,
      week_start: weekStart, date: todayDate, post_sequence: nextSeq,
    });
  } else {
    // Dedup per user/game/event_type per day
    const { data: existing } = await supabase
      .from("chart_events")
      .select("id")
      .eq("game_id", gameId)
      .eq("user_id", userId)
      .eq("event_type", eventType)
      .eq("date", todayDate)
      .limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from("chart_events").insert({
        game_id: gameId, user_id: userId, event_type: eventType,
        week_start: weekStart, date: todayDate, post_sequence: 1,
      });
    }
  }
}

// Returns age in years from a date string, or null if not set
function getAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function timeAgo(timestamp) {
  if (!timestamp) return "Just now";
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function notifLabel(n) {
  switch (n.type) {
    case "like":          return "liked your post";
    case "comment":       return "commented on your post";
    case "reply":         return "replied to your comment";
    case "follow":        return "started following you";
    case "guild_post":    return n.message || "posted in your guild";
    case "guild_session": return n.message || "scheduled a session in your guild";
    case "guild_rsvp":    return n.message || "responded to your session";
    case "guild_request": return n.message || "requested to join your guild";
    default:              return "interacted with you";
  }
}

function useWindowSize() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}

async function updateTasteProfile(gameId, eventType, userId) {
  if (!gameId || !gameId.includes('-') || !userId) return;
  try {
    await supabase.rpc("update_taste_profile", {
      p_user_id: userId,
      p_game_id: gameId,
      p_event_type: eventType,
    });
  } catch(e) { /* non-fatal */ }
}

export { getWeekStart, logAnalytics, logChartEvent, updateTasteProfile, getAge, timeAgo, notifLabel, useWindowSize };

export async function isUsernameRestricted(value) {
  const normalize = (str) => str
    .toLowerCase()
    .replace(/[\s_.\-]/g, "")
    .replace(/@/g, "a").replace(/4/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i").replace(/!/g, "i")
    .replace(/0/g, "o")
    .replace(/5/g, "s").replace(/\$/g, "s")
    .replace(/7/g, "t");

  const { data } = await supabase.from("restricted_usernames").select("pattern");
  if (!data) return false;
  const normalized = normalize(value);
  return data.some(row => normalized.includes(normalize(row.pattern)));
}
