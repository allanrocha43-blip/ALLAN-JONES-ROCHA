// --- Interface for Portal Adapters ---
export interface PortalAdapter {
  name: string;
  // Returns true if this adapter handles the current URL
  canHandle(url: string): boolean;
  // Returns a list of error messages found on the page
  scrapeErrors(): string[];
}

// --- Generic Adapter (Heuristic) ---
// Looks for visible elements containing error keywords or semantic roles
const GenericAdapter: PortalAdapter = {
  name: "Generic (Heuristic)",
  canHandle: (_url: string) => true,
  scrapeErrors: () => {
    const errors: Set<string> = new Set();

    // 1. Semantic Selectors (Roles & Accessibility)
    const semanticSelectors = [
      '[role="alert"]',
      ".alert",
      ".error",
      ".invalid",
      ".toast-error",
      ".msg-erro",
      ".ui-messages-error",
    ];

    // 2. Keyword Heuristics (Text Content)
    // Only run this on relatively small containers to avoid full-page scans
    const potentialContainers = document.querySelectorAll("div, span, p, li");

    // Helper: visible?
    const isVisible = (el: Element) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0"
      );
    };

    // Scan selectors first
    semanticSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (isVisible(el) && el.textContent) {
          const text = el.textContent.trim();
          if (text.length > 5 && text.length < 200) errors.add(text);
        }
      });
    });

    // Scan for keywords if no obvious alerts found, or to supplement
    if (errors.size === 0) {
      potentialContainers.forEach((el) => {
        if (isVisible(el) && el.textContent) {
          const text = el.textContent.trim().toLowerCase();
          // Keywords that strongly suggest a TISS error
          if (
            (text.includes("erro") ||
              text.includes("inválid") ||
              text.includes("obrigatório") ||
              text.includes("glosa")) &&
            text.length < 150 && // Errors are usually short
            // Heuristic: Error text usually has specific colors (Red)
            (window.getComputedStyle(el).color.includes("rgb(2") || // Red component high? Very rough.
              window.getComputedStyle(el).color === "rgb(255, 0, 0)" ||
              window.getComputedStyle(el).color.includes("#d32f2f") ||
              text.includes("critica")) // 'Critica' is common in TISS
          ) {
            // Double check it's not just a label
            if (el.tagName !== "LABEL") {
              errors.add(el.textContent!.trim());
            }
          }
        }
      });
    }

    return Array.from(errors);
  },
};

// --- Unimed Adapter (Optimized) ---
const UnimedAdapter: PortalAdapter = {
  name: "Unimed / TISS",
  canHandle: (url: string) =>
    url.includes("unimed") ||
    url.includes("tiss") ||
    url.includes("autorizador"),
  scrapeErrors: () => {
    // Unimed portals often use PrimeFaces or specific classes
    // But we rely on GenericAdapter mostly now.
    // We can add specific known IDs if strictly needed.
    return GenericAdapter.scrapeErrors();
  },
};

// --- Manager ---
export const PortalScraper = {
  getAdapter: (): PortalAdapter => {
    const url = window.location.href;

    // Priority List
    if (UnimedAdapter.canHandle(url)) return UnimedAdapter;

    return GenericAdapter;
  },

  scan: (): string[] => {
    const adapter = PortalScraper.getAdapter();
    console.log(`[TISS Guard] Scanning with adapter: ${adapter.name}`);
    return adapter.scrapeErrors();
  },
};
