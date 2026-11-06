import { experimental_AstroContainer } from "astro/container";
import { parse } from "node-html-parser";
import { describe, expect, it } from "vitest";
import CvGenerator from "../../src/components/cv/CvGenerator.astro";
import { cvGeneratorCopy } from "../../src/i18n/cv-generator";
import { locales } from "../../src/i18n/locales";
import { getGeneratorBuildConfig } from "../../src/lib/cv-generator/build-config";
import { FOCUS_AREAS } from "../../src/lib/cv-generator/config";

const SITE_KEY = "1x00000000000000000000AA";

async function render(lang: "es" | "en") {
  const container = await experimental_AstroContainer.create();
  const html = await container.renderToString(CvGenerator, { props: { lang, siteKey: SITE_KEY } });
  return { html, root: parse(html) };
}

describe("CvGenerator", () => {
  for (const lang of locales) {
    it(`${lang}: is hidden until its script runs and carries the site key`, async () => {
      const { root } = await render(lang);
      const generator = root.querySelector("[data-cv-generator]");
      expect(generator?.hasAttribute("hidden")).toBe(true);
      expect(generator?.getAttribute("data-site-key")).toBe(SITE_KEY);
      expect(generator?.getAttribute("data-lang")).toBe(lang);
    });

    it(`${lang}: labels every control and offers every focus chip`, async () => {
      const { root } = await render(lang);
      for (const id of ["cvgen-job", "cvgen-lang"]) {
        expect(root.querySelector(`label[for="${id}"]`)).not.toBeNull();
        expect(root.querySelector(`#${id}`)).not.toBeNull();
      }
      const chips = root
        .querySelectorAll('input[name="focus"]')
        .map((input) => input.getAttribute("value"));
      expect(chips).toEqual([...FOCUS_AREAS]);
      expect(root.querySelector("#cvgen-job")?.getAttribute("maxlength")).toBe("6000");
      expect(root.querySelector('[role="status"]')).not.toBeNull();
      expect(root.querySelector('[role="alert"]')).not.toBeNull();
    });

    it(`${lang}: explains how it works, links the code and the privacy page`, async () => {
      const { html, root } = await render(lang);
      const copy = cvGeneratorCopy[lang];
      for (const key of ["how1", "how2", "stage1", "print", "full", "why"] as const) {
        expect(html).toContain(copy[key]);
      }
      const links = root.querySelectorAll("a").map((a) => a.getAttribute("href"));
      expect(links).toContain(
        "https://github.com/mansep12/mansep.xyz/tree/main/src/lib/cv-generator",
      );
      expect(links).toContain(
        lang === "es" ? "/privacidad#generador-de-cv" : "/en/privacy#cv-generator",
      );
    });

    it(`${lang}: has nothing the Content-Security-Policy would block`, async () => {
      const { root } = await render(lang);
      for (const element of root.querySelectorAll("*")) {
        for (const name of Object.keys(element.attributes)) {
          expect(name.startsWith("on") || name === "style").toBe(false);
        }
      }
      expect(root.querySelectorAll("script:not([src])").length).toBe(0);
    });
  }
});

describe("getGeneratorBuildConfig", () => {
  it("is disabled in a build without the flag and the site key", () => {
    expect(getGeneratorBuildConfig()).toEqual({ enabled: false, siteKey: "" });
  });
});
