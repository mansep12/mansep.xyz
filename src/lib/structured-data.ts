/**
 * schema.org structured data (JSON-LD) for the pages that describe the
 * author: a ProfilePage whose main entity is the Person.
 *
 * Every fact comes from src/data/site.ts (name, links, featured skills) or
 * from the CV data (job title, location, education, current affiliation), so
 * the markup cannot drift from what the pages say.
 * https://developers.google.com/search/docs/appearance/structured-data/profile-page
 */

import type { Resume } from "../data/resume.schema";
import { site as defaultSite, type SiteConfig } from "../data/site";

type JsonLdObject = { "@type": string } & Record<string, unknown>;

export interface ProfilePageInput {
  /** Absolute URL of the page. */
  readonly url: string;
  /** Document title of the page. */
  readonly title: string;
  /** BCP 47 language tag of the page. */
  readonly inLanguage: string;
  /** CV data in the page's locale. */
  readonly resume: Resume;
  readonly site?: SiteConfig;
}

/** Stable identifier of the Person node, shared by every page that mentions it. */
export function personId(site: SiteConfig = defaultSite): string {
  return `${site.url}/#person`;
}

function unique<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Universities from the CV's education entries, once each. */
function alumniOf(resume: Resume): JsonLdObject[] {
  return unique(resume.education, (entry) => entry.institution).map((entry) => ({
    "@type": "CollegeOrUniversity",
    name: entry.institution,
    ...(entry.url && { url: entry.url }),
  }));
}

/**
 * Organizations of the current positions (work entries without an end
 * date). A name like "CLCERT, Universidad de Chile" whose second part is an
 * education institution becomes CLCERT with that university as parent.
 */
function affiliation(resume: Resume): JsonLdObject[] {
  const universities = alumniOf(resume);
  return resume.work
    .filter((entry) => !entry.endDate)
    .map((entry) => {
      const [name = entry.name, ...rest] = entry.name.split(", ");
      const parent = universities.find((university) => university.name === rest.join(", "));
      return {
        "@type": "Organization",
        name: parent ? name : entry.name,
        ...(entry.url && { url: entry.url }),
        ...(parent && { parentOrganization: parent }),
      };
    });
}

/** The site's featured skills, in CV order, keeping only those the CV lists. */
function knowsAbout(resume: Resume, site: SiteConfig): string[] {
  const featured = new Set<string>(site.featuredSkills);
  const keywords = resume.skills.flatMap((skill) => skill.keywords);
  return unique(
    keywords.filter((keyword) => featured.has(keyword)),
    (keyword) => keyword,
  );
}

/** Only the city and country: the CV schema already rejects a street address. */
function address(resume: Resume): JsonLdObject | undefined {
  const { city, countryCode } = resume.basics.location ?? {};
  if (!city && !countryCode) return undefined;
  return {
    "@type": "PostalAddress",
    ...(city && { addressLocality: city }),
    ...(countryCode && { addressCountry: countryCode }),
  };
}

export function personJsonLd(resume: Resume, site: SiteConfig = defaultSite): JsonLdObject {
  const location = address(resume);
  return {
    "@type": "Person",
    "@id": personId(site),
    name: site.name,
    url: site.url,
    jobTitle: resume.basics.label,
    sameAs: [site.links.github, site.links.linkedin],
    alumniOf: alumniOf(resume),
    affiliation: affiliation(resume),
    knowsAbout: knowsAbout(resume, site),
    ...(location && { address: location }),
  };
}

/** ProfilePage for the home and about pages, with the Person as main entity. */
export function profilePageJsonLd({
  url,
  title,
  inLanguage,
  resume,
  site = defaultSite,
}: ProfilePageInput): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": url,
    url,
    name: title,
    inLanguage,
    mainEntity: personJsonLd(resume, site),
  };
}

/**
 * JSON for a `<script type="application/ld+json">` element. `<` is escaped so
 * a value can never close the script element.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
