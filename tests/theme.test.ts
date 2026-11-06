import { describe, expect, it } from "vitest";
import {
  nextThemeChoice,
  parseThemeChoice,
  THEME_STORAGE_KEY,
  themeColorFor,
  themeColors,
} from "../src/lib/theme";
import { themeInitScript } from "../src/lib/theme-init";

/** Runs the inline head script against a fake document and storage. */
function runInitScriptWithMeta(stored: string | null, { storageThrows = false } = {}) {
  const dataset: Record<string, string> = {};
  const localStorage = {
    getItem(key: string) {
      if (storageThrows) throw new Error("SecurityError");
      return key === THEME_STORAGE_KEY ? stored : null;
    },
  };
  const metas = [{ content: themeColors.light }, { content: themeColors.dark }];
  const document = {
    documentElement: { dataset },
    getElementsByName: (name: string) => (name === "theme-color" ? metas : []),
  };
  new Function("localStorage", "document", themeInitScript)(localStorage, document);
  return { theme: dataset.theme, metas: metas.map((meta) => meta.content) };
}

function runInitScript(stored: string | null, options?: { storageThrows?: boolean }) {
  return runInitScriptWithMeta(stored, options).theme;
}

describe("theme choice", () => {
  it("cycles system, light, dark", () => {
    expect(nextThemeChoice("system")).toBe("light");
    expect(nextThemeChoice("light")).toBe("dark");
    expect(nextThemeChoice("dark")).toBe("system");
  });

  it("treats anything but light or dark as system", () => {
    expect(parseThemeChoice("light")).toBe("light");
    expect(parseThemeChoice("dark")).toBe("dark");
    expect(parseThemeChoice("system")).toBe("system");
    expect(parseThemeChoice(null)).toBe("system");
    expect(parseThemeChoice("sepia")).toBe("system");
  });
});

describe("inline theme script", () => {
  it("stays under 256 bytes", () => {
    expect(new TextEncoder().encode(themeInitScript).length).toBeLessThan(256);
  });

  it("points theme-color at a forced theme and leaves it alone otherwise", () => {
    expect(runInitScriptWithMeta("dark").metas).toEqual([themeColors.dark, themeColors.dark]);
    expect(runInitScriptWithMeta("light").metas).toEqual([themeColors.light, themeColors.light]);
    expect(runInitScriptWithMeta(null).metas).toEqual([themeColors.light, themeColors.dark]);
  });

  it("applies a stored forced theme", () => {
    expect(runInitScript("dark")).toBe("dark");
    expect(runInitScript("light")).toBe("light");
  });

  it("leaves the system theme alone and ignores unknown values", () => {
    expect(runInitScript(null)).toBeUndefined();
    expect(runInitScript("<script>")).toBeUndefined();
  });

  it("does not throw when storage is blocked", () => {
    expect(runInitScript("dark", { storageThrows: true })).toBeUndefined();
  });
});

describe("themeColorFor", () => {
  it("uses the forced theme's color for every meta", () => {
    expect(themeColorFor("dark", "(prefers-color-scheme: light)")).toBe(themeColors.dark);
    expect(themeColorFor("light", "(prefers-color-scheme: dark)")).toBe(themeColors.light);
  });

  it("restores the color each media query names under system", () => {
    expect(themeColorFor("system", "(prefers-color-scheme: light)")).toBe(themeColors.light);
    expect(themeColorFor("system", "(prefers-color-scheme: dark)")).toBe(themeColors.dark);
  });
});
