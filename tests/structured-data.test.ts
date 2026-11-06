import { describe, expect, it } from "vitest";
import { loadResumes } from "../src/data/resume.schema";
import { site } from "../src/data/site";
import { locales } from "../src/i18n/locales";
import {
  personId,
  personJsonLd,
  profilePageJsonLd,
  serializeJsonLd,
} from "../src/lib/structured-data";

const resumes = loadResumes();

describe("profilePageJsonLd", () => {
  for (const lang of locales) {
    describe(lang, () => {
      const page = profilePageJsonLd({
        url: "https://mansep.xyz/",
        title: site.name,
        inLanguage: lang,
        resume: resumes[lang],
      });
      const person = page.mainEntity as Record<string, unknown>;

      it("is a ProfilePage about the Person", () => {
        expect(page).toMatchObject({
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "@id": "https://mansep.xyz/",
          url: "https://mansep.xyz/",
          name: site.name,
          inLanguage: lang,
        });
        expect(person).toMatchObject({
          "@type": "Person",
          "@id": personId(),
          name: site.name,
          url: site.url,
          jobTitle: resumes[lang].basics.label,
        });
      });

      it("links the GitHub and LinkedIn profiles", () => {
        expect(person.sameAs).toEqual([site.links.github, site.links.linkedin]);
      });

      it("names Universidad de Chile once and CLCERT as affiliation", () => {
        expect(person.alumniOf).toEqual([
          {
            "@type": "CollegeOrUniversity",
            name: "Universidad de Chile",
            url: "https://uchile.cl",
          },
        ]);
        expect(person.affiliation).toEqual([
          {
            "@type": "Organization",
            name: "CLCERT",
            url: "https://clcert.cl",
            parentOrganization: {
              "@type": "CollegeOrUniversity",
              name: "Universidad de Chile",
              url: "https://uchile.cl",
            },
          },
        ]);
      });

      it("gives only the city and the country as address", () => {
        expect(person.address).toEqual({
          "@type": "PostalAddress",
          addressLocality: "Santiago",
          addressCountry: "CL",
        });
      });

      it("lists every featured skill, all taken from the CV", () => {
        const keywords = resumes[lang].skills.flatMap((skill) => skill.keywords);
        expect(person.knowsAbout).toEqual(
          keywords.filter((keyword) =>
            (site.featuredSkills as readonly string[]).includes(keyword),
          ),
        );
        expect([...(person.knowsAbout as string[])].sort()).toEqual(
          [...site.featuredSkills].sort(),
        );
      });
    });
  }

  it("is the same Person in both locales except the job title", () => {
    const { jobTitle: _es, ...es } = personJsonLd(resumes.es);
    const { jobTitle: _en, ...en } = personJsonLd(resumes.en);
    expect(es).toEqual(en);
  });

  it("omits the address when the CV has no location", () => {
    const resume = { ...resumes.en, basics: { ...resumes.en.basics, location: undefined } };
    expect(personJsonLd(resume)).not.toHaveProperty("address");
  });
});

describe("serializeJsonLd", () => {
  it("cannot close the script element", () => {
    const json = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
