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

// Note: navToPost in App.jsx uses local React state (not sessionStorage) so it
// works correctly even when already on the feed page — see App.jsx for the real
// implementation. This export is kept for reference/consistency but is not
// currently wired into App.jsx's navigation calls.
export const navToPost = (postId, setActivePage) => {
  sessionStorage.setItem("feedTargetPostId", postId);
  setActivePage("feed");
  pushNav({ page: "feed", postId }, "/feed");
};
