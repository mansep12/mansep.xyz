import { THEME_STORAGE_KEY, themeColors } from "./theme";

/**
 * Blocking script for <head>: applies the stored choice before first paint
 * so a forced theme never flashes, and points every
 * `<meta name="theme-color">` (which must come before it) at the forced
 * theme's color. Must stay under 256 bytes and must not throw when storage
 * is unavailable. Its SHA-256 goes into the Content-Security-Policy, which is
 * generated from the built HTML (src/integrations/security-headers.ts).
 */
export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t=="light"||t=="dark"){document.documentElement.dataset.theme=t;for(var m of document.getElementsByName("theme-color"))m.content=t=="dark"?"${themeColors.dark}":"${themeColors.light}"}}catch(e){}`;
