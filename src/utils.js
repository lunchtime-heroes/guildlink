import { useState, useEffect } from "react";
import supabase from "./supabase.js";

// Week start helper — Sunday 12:00am Pacific time
// Uses a fixed UTC offset: Pacific is UTC-8 (PST) or UTC-7 (PDT)
// We detect DST automatically via Intl
function getWeekStart() {
  const now = new Date();
  // Get current Pacific offset in minutes
  const pacificOffset = -new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "shortOffset" })
    .match(/GMT([+-]\d+)/)?.[1] * 60 || -480;
  // Shift now to Pacific time
  const pacificNow = new Date(now.getTime() + (pacificOffset + now.getTimezoneOffset()) * 60000);
  // Roll back to the most recent Sunday
  const dayOfWeek = pacificNow.getDay(); // 0 = Sunday
  const sunday = new Date(pacificNow);
  sunday.setDate(pacificNow.getDate() - dayOfWeek);
  // Return as YYYY-MM-DD using Pacific date components
  const y = sunday.getFullYear();
  const m = String(sunday.getMonth() + 1).padStart(2, '0');
  const d = String(sunday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  const today = new Date();
  const pacificOffset = -new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "shortOffset" })
    .match(/GMT([+-]\d+)/)?.[1] * 60 || -480;
  const pacificNow = new Date(today.getTime() + (pacificOffset + today.getTimezoneOffset()) * 60000);
  const todayDate = `${pacificNow.getFullYear()}-${String(pacificNow.getMonth() + 1).padStart(2, "0")}-${String(pacificNow.getDate()).padStart(2, "0")}`;

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
    case "like":             return "liked your post";
    case "comment":          return "commented on your post";
    case "reply":            return "replied to your comment";
    case "follow":           return "started following you";
    default:                 return "interacted with you";
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

export { getWeekStart, logAnalytics, logChartEvent, getAge, timeAgo, notifLabel, useWindowSize };
