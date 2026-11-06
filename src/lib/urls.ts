/**
 * A URL as readable text: no scheme, no "www.", no trailing slash, e.g.
 * "github.com/mansep12". Used where a link must still make sense on paper.
 */
export function displayUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}
