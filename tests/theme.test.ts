import { describe, expect, it } from "vitest";
import { nextThemeChoice, parseThemeChoice, THEME_STORAGE_KEY } from "../src/lib/theme";
import { themeInitScript } from "../src/lib/theme-init";

/** Runs the inline head script against a fake document and storage. */
function runInitScript(stored: string | null, { storageThrows = false } = {}) {
  const dataset: Record<string, string> = {};
  const localStorage = {
    getItem(key: string) {
      if (storageThrows) throw new Error("SecurityError");
      return key === THEME_STORAGE_KEY ? stored : null;
    },
  };
  const document = { documentElement: { dataset } };
  new Function("localStorage", "document", themeInitScript)(localStorage, document);
  return dataset.theme;
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
  it("stays under 200 bytes", () => {
    expect(new TextEncoder().encode(themeInitScript).length).toBeLessThan(200);
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
