/**
 * Site-wide identity and contact data. Single source for anything that names
 * the author or links out (header, footer, metadata, structured data).
 * Private details (phone, street address) never belong here.
 */

export interface SiteLinks {
  readonly github: string;
  readonly linkedin: string;
  /** Source code of this site. */
  readonly repo: string;
}

export interface SiteConfig {
  /** Canonical origin, without trailing slash. */
  readonly url: string;
  readonly name: string;
  /** One-line professional description; the same English text in both locales. */
  readonly tagline: string;
  readonly location: string;
  /** IANA time zone name. */
  readonly timeZone: string;
  /** Public contact address. Change it here only. */
  readonly email: string;
  readonly links: SiteLinks;
}

export const site = {
  url: "https://mansep.xyz",
  name: "Manuel Sepúlveda",
  tagline: "Software engineer · backend, applied cryptography and security",
  location: "Santiago, Chile",
  timeZone: "America/Santiago",
  email: "manuelsepulveda.sepulveda@gmail.com",
  links: {
    github: "https://github.com/mansep12",
    linkedin: "https://www.linkedin.com/in/manuel-sepulveda-cabeza",
    repo: "https://github.com/mansep12/mansep.xyz",
  },
} as const satisfies SiteConfig;
