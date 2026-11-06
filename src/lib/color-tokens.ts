/**
 * Reads the color tokens of src/styles/tokens.css, for build-time code that
 * draws outside the page (Open Graph images, icons) and for tests that keep
 * hard-coded colors in sync with the stylesheet.
 */

export interface SchemeColor {
  readonly light: string;
  readonly dark: string;
}

const LIGHT_DARK_TOKEN =
  /--color-([\w-]+):\s*light-dark\(\s*(#[0-9a-f]{3,8})\s*,\s*(#[0-9a-f]{3,8})\s*\)/gi;

/** Every `--color-<name>: light-dark(<light>, <dark>)` declaration, by name. */
export function parseColorTokens(css: string): Record<string, SchemeColor> {
  const tokens: Record<string, SchemeColor> = {};
  for (const [, name, light, dark] of css.matchAll(LIGHT_DARK_TOKEN)) {
    if (name && light && dark) {
      tokens[name] = { light: light.toLowerCase(), dark: dark.toLowerCase() };
    }
  }
  return tokens;
}

/** A token by name; throws if tokens.css does not declare it. */
export function colorToken(tokens: Record<string, SchemeColor>, name: string): SchemeColor {
  const token = tokens[name];
  if (!token) {
    throw new Error(`tokens.css declares no --color-${name} with light-dark()`);
  }
  return token;
}
