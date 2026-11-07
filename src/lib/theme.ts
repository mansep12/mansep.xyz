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
  light: "#ffffff",
  dark: "#0d0f12",
} as const;

/**
 * Content for a `<meta name="theme-color" media="...">` under a choice: the
 * forced theme's color, or under "system" the color its media query names.
 */
export function themeColorFor(choice: ThemeChoice, media: string): string {
  if (choice !== "system") return themeColors[choice];
  return media.includes("dark") ? themeColors.dark : themeColors.light;
}
