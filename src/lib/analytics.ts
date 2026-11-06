/**
 * Cloudflare Web Analytics (cookieless). The beacon is added to every page
 * only when the build has a site token in PUBLIC_CF_WEB_ANALYTICS_TOKEN
 * (a Workers Builds variable; see README). Without it, pages load no
 * third-party script at all.
 *
 * The token is read once, in Node, when astro.config.ts loads (pages are
 * prerendered in workerd, which cannot see the build environment) and
 * injected as the __CF_WEB_ANALYTICS_TOKEN__ constant.
 */

export const ANALYTICS_TOKEN_ENV = "PUBLIC_CF_WEB_ANALYTICS_TOKEN";

export const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

/** Site tokens from the Web Analytics dashboard are 32 hexadecimal characters. */
const TOKEN = /^[0-9a-f]{32}$/i;

/**
 * The configured token, or null when the variable is unset or empty.
 * Throws on a malformed value, so a typo fails the build instead of
 * silently turning analytics off.
 */
export function resolveAnalyticsToken(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const value = env[ANALYTICS_TOKEN_ENV]?.trim();
  if (!value) return null;
  if (!TOKEN.test(value)) {
    throw new Error(
      `${ANALYTICS_TOKEN_ENV} must be the 32-character site token from Cloudflare Web Analytics`,
    );
  }
  return value;
}

/** Value of the beacon's data-cf-beacon attribute. */
export function beaconConfig(token: string): string {
  return JSON.stringify({ token });
}

/** Token of the running bundle, or null. */
export function getAnalyticsToken(): string | null {
  return typeof __CF_WEB_ANALYTICS_TOKEN__ === "string" ? __CF_WEB_ANALYTICS_TOKEN__ : null;
}
