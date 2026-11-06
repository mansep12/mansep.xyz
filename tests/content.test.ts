import { describe, expect, it } from "vitest";
import { highlightIds, loadResumes, parseResumes } from "../src/data/resume.schema";
import { entryId, entryIdFromPath, parseEntryId } from "../src/lib/content/entry-id";
import { projectSchema, researchSchema } from "../src/lib/content/schemas";

const project = {
  title: "Nodus",
  summary: "Something that exists.",
  outcome: "Something it achieved.",
  order: 1,
  year: "2026",
  status: "mvp",
  role: "Backend",
  stack: ["TypeScript"],
  links: { repo: "https://github.com/example/nodus" },
};

describe("projectSchema", () => {
  it("accepts a project with a repo or a demo and defaults featured to false", () => {
    expect(projectSchema.parse(project).featured).toBe(false);
    const demoOnly = { ...project, links: { demo: "https://nodus.example.com" } };
    expect(projectSchema.safeParse(demoOnly).success).toBe(true);
  });

  it("rejects a project without repo and demo", () => {
    const result = projectSchema.safeParse({
      ...project,
      links: { video: "https://example.com/v" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["links"]);
  });

  it("rejects multi-line summaries, dashes in prose and bad years", () => {
    expect(projectSchema.safeParse({ ...project, summary: "a\nb" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, outcome: "fast \u2014 cheap" }).success).toBe(
      false,
    );
    expect(projectSchema.safeParse({ ...project, year: "26" }).success).toBe(false);
  });

  it("validates the YouTube id format", () => {
    const withVideo = (youtubeId: string) =>
      projectSchema.safeParse({ ...project, links: { ...project.links, youtubeId } }).success;
    expect(withVideo("dQw4w9WgXcQ")).toBe(true);
    expect(withVideo("https://youtu.be/dQw4w9WgXcQ")).toBe(false);
  });
});

describe("researchSchema", () => {
  const research = {
    title: "Thesis",
    summary: "A thesis.",
    institution: "University",
    status: "In progress",
    year: "2026",
    kind: "thesis",
  };

  it("accepts bare DOIs and site-relative PDFs", () => {
    const parsed = researchSchema.parse({
      ...research,
      links: { doi: "10.5281/zenodo.123456", pdf: "/research/thesis.pdf" },
    });
    expect(parsed.advisors).toEqual([]);
  });

  it("rejects DOI URLs and unknown kinds", () => {
    expect(
      researchSchema.safeParse({ ...research, links: { doi: "https://doi.org/10.1/x" } }).success,
    ).toBe(false);
    expect(researchSchema.safeParse({ ...research, kind: "blog" }).success).toBe(false);
  });
});

describe("entry ids", () => {
  it("parses <lang>/<slug>", () => {
    expect(parseEntryId("en/pulso-fiscal")).toEqual({ lang: "en", slug: "pulso-fiscal" });
    expect(entryId("es", "nodus")).toBe("es/nodus");
  });

  it("derives ids from file paths", () => {
    expect(entryIdFromPath("es/nodus.md")).toBe("es/nodus");
  });

  it.each(["nodus", "fr/nodus", "es/Nodus", "es/a/b", "es/"])("rejects %s", (id) => {
    expect(() => parseEntryId(id)).toThrow();
  });
});

describe("resume data", () => {
  const basics = {
    name: "Test",
    label: "Engineer",
    email: "test@example.com",
  };
  const withWork = (ids: string[]) => ({
    basics,
    work: [
      {
        name: "Company",
        position: "Engineer",
        startDate: "2024-03",
        highlights: ids.map((id) => ({ id, text: `Did ${id}` })),
      },
    ],
  });

  it("loads and validates both committed files", () => {
    const resumes = loadResumes();
    expect(resumes.es.basics.name).toBe(resumes.en.basics.name);
    expect(resumes.es.work).toEqual([]);
  });

  it("collects highlight ids", () => {
    const { es } = parseResumes({ es: withWork(["acme.api.01"]), en: withWork(["acme.api.01"]) });
    expect(highlightIds(es)).toEqual(["acme.api.01"]);
  });

  it("rejects private fields", () => {
    const phone = { basics: { ...basics, phone: "+56 9 0000 0000" } };
    const address = { basics: { ...basics, location: { address: "Somewhere 123" } } };
    expect(() => parseResumes({ es: phone, en: { basics } })).toThrow(/phone/);
    expect(() => parseResumes({ es: { basics }, en: address })).toThrow(/address/);
  });

  it("rejects malformed and duplicate highlight ids", () => {
    expect(() => parseResumes({ es: withWork(["Acme 1"]), en: withWork(["Acme 1"]) })).toThrow();
    const dup = withWork(["acme.api.01", "acme.api.01"]);
    expect(() => parseResumes({ es: dup, en: dup })).toThrow(
      /duplicate highlight ids: acme.api.01/,
    );
  });

  it("requires the same highlight ids in every locale", () => {
    expect(() =>
      parseResumes({ es: withWork(["acme.api.01", "acme.api.02"]), en: withWork(["acme.api.01"]) }),
    ).toThrow(/resume.en.json: missing highlight ids present in es: acme.api.02/);
  });
});
