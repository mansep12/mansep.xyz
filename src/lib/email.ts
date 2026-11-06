/**
 * Light protection against address scrapers: the HTML carries the address
 * reversed and base64-encoded, and a small script turns it back into a
 * mailto link. Not a security measure, only friction for naive crawlers.
 */

export function encodeEmail(email: string): string {
  return btoa([...email].reverse().join(""));
}

export function decodeEmail(encoded: string): string {
  return [...atob(encoded)].reverse().join("");
}

/** Readable but not directly parseable form, for the no-JavaScript fallback. */
export function spellOutEmail(email: string): string {
  return email.replace("@", " [at] ");
}
