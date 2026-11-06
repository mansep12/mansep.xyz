/**
 * Theme preference: "system" follows prefers-color-scheme; "light" and
 * "dark" force a scheme through <html data-theme>. Only forced choices are
 * stored; "system" is the absence of a stored value.
 */

export const THEME_STORAGE_KEY = "theme";

export const themeChoices = ["system", "light", "dark"] as const;

export type ThemeChoice = (typeof themeChoices)[number];

export function parseThemeChoice(value: unknown): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system";
}

/** Toggle order: system, light, dark, back to system. */
export function nextThemeChoice(choice: ThemeChoice): ThemeChoice {
  return themeChoices[(themeChoices.indexOf(choice) + 1) % themeChoices.length] ?? "system";
}

/** Browser UI color per scheme (`<meta name="theme-color">`); matches --color-bg in tokens.css. */
export const themeColors = {
  light: "#f4f1e8",
  dark: "#0f1a16",
} as const;
