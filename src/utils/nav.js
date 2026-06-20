// Navigation utility — handles both React state and browser history in one call.
// Import pushNav wherever you need to navigate, call it alongside setActivePage.
// When the useNav refactor happens, this file becomes the hook itself.

export const pushNav = (state, path) => {
  try {
    window.history.pushState(state, "", path);
  } catch (e) {
    console.warn("[nav] pushState failed:", e);
  }
};

export const navToGame = (gameId, setCurrentGame, setActivePage) => {
  setCurrentGame(gameId);
  setActivePage("game");
  pushNav({ page: "game", gameId }, `/game/${gameId}`);
};

export const navToPlayer = (playerId, handle, setCurrentPlayer, setActivePage) => {
  setCurrentPlayer(playerId);
  setActivePage("player");
  pushNav({ page: "player", playerId }, `/player/${(handle || playerId).replace("@", "")}`);
};

export const navToNPC = (npcId, setCurrentNPC, setActivePage) => {
  setCurrentNPC(npcId);
  setActivePage("npc");
  pushNav({ page: "npc", npcId }, `/npc/${npcId}`);
};

export const navToPage = (page, setActivePage) => {
  setActivePage(page);
  const path = page === "founding" ? "/about" : page === "squad" ? "/guilds" : `/${page}`;
  pushNav({ page }, path);
};

// Navigates to the feed and scrolls to a specific post (e.g. from a notification).
// No dedicated single-post page exists yet — this surfaces the post within the
// normal feed view, matching how all post interaction already happens in-app.
export const navToPost = (postId, setActivePage) => {
  sessionStorage.setItem("feedTargetPostId", postId);
  setActivePage("feed");
  pushNav({ page: "feed", postId }, "/feed");
};
