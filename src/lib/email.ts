/**
 * Light protection against address scrapers: the HTML carries the address
 * reversed and base64-encoded, and a small script turns it back into a
 * mailto link. Not a security measure, only friction for naive crawlers.
 */

/**
 * Inline script placed right after each `[data-email]` placeholder. It runs
 * while the page is still being parsed, so the address is in place before
 * the first paint; a deferred script filled it in later and the line
 * reflowed (a layout shift in the CV header on phones). Same decoding as
 * `decodeEmail`. Its hash is added to the Content-Security-Policy at build.
 */
export const emailLinkScript = `(function(p){var m=[...atob(p.dataset.email)].reverse().join(""),a=document.createElement("a");a.href="mailto:"+m;a.textContent=m;p.replaceChildren(a)})(document.currentScript.previousElementSibling)`;

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
