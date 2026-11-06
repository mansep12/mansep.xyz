import { describe, expect, it } from "vitest";
import { canonicalPageUrl, sitemapLinks } from "../src/lib/sitemap";

describe("canonicalPageUrl", () => {
  it("keeps route map URLs and adds the trailing slash of the English home", () => {
    expect(canonicalPageUrl("https://mansep.xyz/")).toBe("https://mansep.xyz/");
    expect(canonicalPageUrl("https://mansep.xyz/en")).toBe("https://mansep.xyz/en/");
    expect(canonicalPageUrl("https://mansep.xyz/sobre-mi")).toBe("https://mansep.xyz/sobre-mi");
  });

  it("drops pages outside the route map", () => {
    expect(canonicalPageUrl("https://mansep.xyz/404")).toBeUndefined();
    expect(canonicalPageUrl("https://mansep.xyz/robots.txt")).toBeUndefined();
  });
});

describe("sitemapLinks", () => {
  const pages = new Set([
    "https://mansep.xyz/sobre-mi",
    "https://mansep.xyz/en/about",
    "https://mansep.xyz/proyectos/solo",
  ]);

  it("lists every locale plus x-default, like the page's hreflang links", () => {
    expect(sitemapLinks("https://mansep.xyz/en/about", pages)).toEqual([
      { url: "https://mansep.xyz/sobre-mi", lang: "es" },
      { url: "https://mansep.xyz/en/about", lang: "en" },
      { url: "https://mansep.xyz/sobre-mi", lang: "x-default" },
    ]);
  });

  it("lists no alternates for an untranslated page", () => {
    expect(sitemapLinks("https://mansep.xyz/proyectos/solo", pages)).toBeUndefined();
  });
});
