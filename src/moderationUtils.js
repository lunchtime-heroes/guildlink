import supabase from "./supabase.js";

// Maps a content type to its column name on reports/hidden_content.
// Every function below takes a `targetType` + `targetId` pair instead
// of duplicating logic per content type — this is what makes "same
// approach everywhere" a structural guarantee rather than something
// four separate call sites have to remember to keep in sync.
const TARGET_COLUMN = {
  post: "post_id",
  comment: "comment_id",
  guild_post: "guild_post_id",
  session_message: "session_message_id",
};

export async function blockUser(blockerId, blockedId) {
  const { error } = await supabase.from("blocked_users").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) return { error };
  await supabase.from("follows").delete().eq("follower_id", blockerId).eq("followed_user_id", blockedId);
  await supabase.from("follows").delete().eq("follower_id", blockedId).eq("followed_user_id", blockerId);
  return { error: null };
}

export async function unblockUser(blockerId, blockedId) {
  return supabase.from("blocked_users").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
}

export async function getBlockedUserIds(userId) {
  const { data } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", userId);
  return new Set((data || []).map(r => r.blocked_id));
}

export async function hideContent(userId, targetType, targetId, reason = "hide") {
  const column = TARGET_COLUMN[targetType];
  return supabase.from("hidden_content").insert({ user_id: userId, [column]: targetId, reason });
}

export async function getHiddenContentIds(userId, targetType) {
  const column = TARGET_COLUMN[targetType];
  const { data } = await supabase.from("hidden_content").select(column).eq("user_id", userId).eq("reason", "hide").not(column, "is", null);
  return new Set((data || []).map(r => r[column]));
}

export async function submitReport(reporterId, targetType, targetId, category) {
  const column = TARGET_COLUMN[targetType];
  const { data: report, error } = await supabase
    .from("reports")
    .insert({ reporter_id: reporterId, [column]: targetId, category, status: "pending" })
    .select()
    .single();
  if (error) return { error };
  // Same two-step pattern as mobile: insert the report, then hide it
  // for the reporter specifically while it's pending review — not
  // moderator_hidden (that's for confirmed violations, visible to
  // everyone), just this one person's own view.
  await hideContent(reporterId, targetType, targetId, "report_pending");
  return { data: report, error: null };
}

export const REPORT_CATEGORIES = [
  { value: "personal_attack", label: "Personal attack" },
  { value: "off_topic", label: "Off-topic / agenda-driven" },
  { value: "harassment", label: "Harassment or pile-on" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "other", label: "Something else" },
];
