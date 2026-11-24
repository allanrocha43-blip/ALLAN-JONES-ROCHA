// The Ear: Portal Error Listener
// Monitors the DOM for error messages (Glosas) returned by the operator's portal.

export const initErrorListener = () => {
  console.log("[TISS Guard Ear] Listening for portal errors...");

  // Strategy 1: MutationObserver on Toast/Alert containers
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      const node = m.target as HTMLElement;
      if (
        node.innerText &&
        (node.innerText.includes("Erro") || node.innerText.includes("Glosa"))
      ) {
        console.log("[TISS Guard Ear] Heard an error:", node.innerText);
        // Future: Send to sidebar
        // chrome.runtime.sendMessage(...)
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
};
