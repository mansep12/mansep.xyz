import { THEME_STORAGE_KEY } from "./theme";

/**
 * Blocking script for <head>: applies the stored choice before first paint
 * so a forced theme never flashes. Must stay under 200 bytes and must not
 * throw when storage is unavailable.
 */
export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t=="light"||t=="dark")document.documentElement.dataset.theme=t}catch(e){}`;
