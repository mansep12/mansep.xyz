import { experimental_AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import CvDocument from "../../src/components/cv/CvDocument.astro";
import { renderTailoredCv, stripScripts } from "../../src/components/cv/render-tailored";
import { loadResumes } from "../../src/data/resume.schema";
import { cvGeneratorCopy } from "../../src/i18n/cv-generator";
import { buildCatalog } from "../../src/lib/cv-generator/catalog";
import { tailorResume } from "../../src/lib/cv-generator/tailor";
import { validateSelection } from "../../src/lib/cv-generator/validate";

const resumes = loadResumes();

function tailored() {
  const catalog = buildCatalog(resumes.es, "es");
  const validated = validateSelection(
    {
      summary: { text: "", source_ids: [] },
      sections: [
        { section: "projects", items: [{ source_id: "nodus.settlement.01", rewrite: "" }] },
        { section: "work", items: [{ source_id: "dimacofi.rpa.01", rewrite: "" }] },
      ],
      rationale: [],
    },
    catalog,
  );
  return tailorResume(resumes.es, validated);
}

/** Positions of the section headings, to check their order. */
function headingIndex(html: string, heading: string): number {
  return html.search(new RegExp(`<h2[^>]*>${heading}</h2>`));
}

describe("renderTailoredCv", () => {
  it("renders the same CV document, in the chosen section order, with the footnote", async () => {
    const footnote = cvGeneratorCopy.es.disclosure;
    const html = await renderTailoredCv("es", tailored(), footnote);

    expect(html).toMatch(/^<article class="cv" lang="es" data-astro-cid-[a-z0-9]+/);
    expect(html).toContain(resumes.es.basics.name);
    expect(html).toContain("data-email=");
    expect(headingIndex(html, "Proyectos")).toBeLessThan(headingIndex(html, "Experiencia"));
    expect(html).toContain(footnote);
    expect(html.match(/class="source-id"/g)).toHaveLength(2);
    expect(html).toContain("nodus.settlement.01");
    expect(html).not.toContain("dimacofi.kiosk.01");
  });

  it("ships no script tags and no build paths", async () => {
    const html = await renderTailoredCv("en", tailored(), "x");
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toContain("src/components");
  });
});

describe("CvDocument defaults", () => {
  it("keeps the static CV as it was: work first, no source ids, no footnote", async () => {
    const container = await experimental_AstroContainer.create();
    const html = await container.renderToString(CvDocument, {
      props: { lang: "es", resume: resumes.es },
    });
    expect(headingIndex(html, "Experiencia")).toBeLessThan(headingIndex(html, "Proyectos"));
    expect(html).not.toContain("source-id");
    expect(html).not.toContain('class="footnote"');
    expect(html.match(/data-highlight-id=/g)?.length).toBe(
      buildCatalog(resumes.es, "es").ids.length,
    );
  });
});

describe("stripScripts", () => {
  it("removes script elements, whatever their attributes or case", () => {
    expect(
      stripScripts('<p>a</p><script type="module" src="/x.ts"></script><SCRIPT>1</SCRIPT >b'),
    ).toBe("<p>a</p>b");
  });
});
