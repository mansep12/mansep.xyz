import { describe, expect, it } from "vitest";
import { isLang, otherLangs } from "../src/i18n/locales";
import {
  alternateLinks,
  alternates,
  getLangFromUrl,
  localizedPath,
  type RouteKey,
  routes,
} from "../src/i18n/routes";
import { ui } from "../src/i18n/ui";

describe("localizedPath", () => {
  it("returns the Spanish path at the root and the English path under /en/", () => {
    expect(localizedPath("home", "es")).toBe("/");
    expect(localizedPath("home", "en")).toBe("/en/");
    expect(localizedPath("projects", "es")).toBe("/proyectos");
    expect(localizedPath("projects", "en")).toBe("/en/projects");
    expect(localizedPath("about", "es")).toBe("/sobre-mi");
    expect(localizedPath("colophon", "en")).toBe("/en/colophon");
  });

  it("fills route params", () => {
    expect(localizedPath("project", "es", { slug: "nodus" })).toBe("/proyectos/nodus");
    expect(localizedPath("project", "en", { slug: "nodus" })).toBe("/en/projects/nodus");
  });

  it("encodes param values", () => {
    expect(localizedPath("project", "es", { slug: "a b/c" })).toBe("/proyectos/a%20b%2Fc");
  });

  it("throws when a required param is missing or empty", () => {
    // @ts-expect-error `project` requires a slug; the type check catches this too.
    expect(() => localizedPath("project", "es")).toThrow(/slug/);
    expect(() => localizedPath("project", "es", { slug: "" })).toThrow(/slug/);
  });

  it("rejects params on routes without params at the type level", () => {
    // @ts-expect-error `home` declares no params.
    expect(localizedPath("home", "es", { slug: "x" })).toBe("/");
  });
});

describe("alternates", () => {
  it("returns absolute URLs for every locale", () => {
    expect(alternates("home")).toEqual({
      es: "https://mansep.xyz/",
      en: "https://mansep.xyz/en/",
    });
    expect(alternates("research")).toEqual({
      es: "https://mansep.xyz/investigacion",
      en: "https://mansep.xyz/en/research",
    });
  });

  it("passes params through", () => {
    expect(alternates("project", { slug: "pulso-fiscal" })).toEqual({
      es: "https://mansep.xyz/proyectos/pulso-fiscal",
      en: "https://mansep.xyz/en/projects/pulso-fiscal",
    });
  });
});

describe("alternateLinks", () => {
  it("lists every locale plus x-default pointing to Spanish", () => {
    expect(alternateLinks("cv")).toEqual([
      { hreflang: "es", href: "https://mansep.xyz/cv" },
      { hreflang: "en", href: "https://mansep.xyz/en/cv" },
      { hreflang: "x-default", href: "https://mansep.xyz/cv" },
    ]);
  });
});

describe("getLangFromUrl", () => {
  it.each([
    ["https://mansep.xyz/", "es"],
    ["https://mansep.xyz/proyectos/nodus", "es"],
    ["https://mansep.xyz/en", "en"],
    ["https://mansep.xyz/en/", "en"],
    ["https://mansep.xyz/en/projects/nodus", "en"],
    ["https://mansep.xyz/english", "es"],
    ["https://mansep.xyz/enviar", "es"],
  ])("%s is %s", (url, lang) => {
    expect(getLangFromUrl(new URL(url))).toBe(lang);
  });

  it("accepts site-relative paths", () => {
    expect(getLangFromUrl("/en/about")).toBe("en");
    expect(getLangFromUrl("/sobre-mi")).toBe("es");
  });
});

describe("route map", () => {
  const keys = Object.keys(routes) as RouteKey[];

  it("keeps every English path under /en/ and no Spanish path there", () => {
    for (const key of keys) {
      expect(routes[key].en.startsWith("/en/")).toBe(true);
      expect(routes[key].es.startsWith("/en")).toBe(false);
    }
  });

  it("declares the same params in both locales", () => {
    const params = (path: string) => [...path.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
    for (const key of keys) {
      expect(params(routes[key].es)).toEqual(params(routes[key].en));
    }
  });

  it("round-trips every path through getLangFromUrl", () => {
    for (const key of keys) {
      for (const [lang, url] of Object.entries(alternates(key, { slug: "x" } as never))) {
        expect(getLangFromUrl(url)).toBe(lang);
      }
    }
  });
});

describe("locales", () => {
  it("recognizes supported locales only", () => {
    expect(isLang("es")).toBe(true);
    expect(isLang("en")).toBe(true);
    expect(isLang("fr")).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });

  it("lists the other locales", () => {
    expect(otherLangs("es")).toEqual(["en"]);
    expect(otherLangs("en")).toEqual(["es"]);
  });

  it("has a non-empty UI string for every key in every locale", () => {
    for (const strings of Object.values(ui)) {
      for (const value of Object.values(strings)) {
        expect(value.trim()).not.toBe("");
      }
    }
  });
});
