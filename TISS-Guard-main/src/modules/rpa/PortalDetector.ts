/**
 * @module PortalDetector
 * @description Centralized URL-matching service that determines whether the current page
 * belongs to a known TISS/health-insurance operator portal. This is the single source of
 * truth for deciding if RPA features (FAB button, PortalScraper) should be activated.
 *
 * The detector aggregates URL patterns from all recipe files and a curated list of
 * well-known operator domains. The content script uses this to gate RPA injection —
 * preventing the "Preencher TISS" button from appearing on unrelated websites.
 */

import recipeSemantic from "./recipes/recipe-semantic.json";
import recipeUnimed from "./recipes/unimed.json";
import recipeBradesco from "./recipes/bradesco.json";

/**
 * Well-known health-insurance portal domains and TISS-related URL fragments.
 * These supplement the recipe-derived patterns to cover portals that don't
 * yet have a dedicated recipe but are still valid targets for the FAB.
 */
const KNOWN_PORTAL_PATTERNS: string[] = [
  // Major operators
  "unimed",
  "bradescoseguros",
  "amil",
  "sulamerica",
  "hapvida",
  "notredame",
  "gndi",
  "cassi",
  "geap",
  "saude.gov",

  // Generic TISS portal indicators
  "tiss",
  "autorizador",
  "faturamento",
  "guia-tiss",
  "portal-operadora",
  "operadora",
  "prestador",

  // Development / test sandbox
  "mock-operadora",
  "localhost",
  "127.0.0.1",
];

/**
 * Extracts the `matches` array from each recipe and flattens them into a
 * single list of URL patterns.
 */
const getRecipePatterns = (): string[] => {
  const recipes = [recipeSemantic, recipeUnimed, recipeBradesco];
  return recipes.flatMap((r) => (r as { matches?: string[] }).matches ?? []);
};

/**
 * All patterns combined: recipe-derived + curated known portals.
 * Built once at module load time for performance.
 */
const ALL_PATTERNS: string[] = [
  ...new Set([...KNOWN_PORTAL_PATTERNS, ...getRecipePatterns()]),
];

/**
 * Checks whether a given URL matches any pattern in the allow-list.
 * Supports simple substring matching and basic wildcard (*) expansion.
 *
 * @param url - The full URL to test (typically `window.location.href`).
 * @returns `true` if the URL is recognized as a TISS portal.
 */
const isPortalUrl = (url: string): boolean => {
  const lowerUrl = url.toLowerCase();

  return ALL_PATTERNS.some((pattern) => {
    const lowerPattern = pattern.toLowerCase();

    if (lowerPattern.includes("*")) {
      // Convert wildcard pattern to regex
      const regex = new RegExp(lowerPattern.replace(/\*/g, ".*"));
      return regex.test(lowerUrl);
    }

    return lowerUrl.includes(lowerPattern);
  });
};

export const PortalDetector = {
  /**
   * Determines if the current page is a recognized TISS portal.
   * @returns `true` if the current URL matches a known portal pattern.
   */
  isOnPortal: (): boolean => isPortalUrl(window.location.href),

  /**
   * Tests an arbitrary URL against the portal allow-list.
   * Useful for unit testing or checking URLs from other contexts.
   * @param url - URL to test.
   */
  testUrl: (url: string): boolean => isPortalUrl(url),

  /**
   * Returns the full list of active patterns (for debugging/logging).
   */
  getPatterns: (): readonly string[] => ALL_PATTERNS,
};
