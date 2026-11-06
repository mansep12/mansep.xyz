import { describe, expect, it } from "vitest";
import { formatDate, formatDateRange, isoYearMonth } from "../src/lib/dates";
import { displayUrl } from "../src/lib/urls";

describe("formatDate", () => {
  it("formats years, months and days", () => {
    expect(formatDate("2024", "es")).toBe("2024");
    expect(formatDate("2024-07", "es")).toBe("jul. 2024");
    expect(formatDate("2024-07", "en")).toBe("Jul 2024");
    expect(formatDate("2024-09-11", "es")).toBe("sept. 2024");
    expect(formatDate("2026-10", "es", "long")).toBe("octubre de 2026");
    expect(formatDate("2026-10", "en", "long")).toBe("October 2026");
  });

  it.each(["24", "2024-13", "2024/07", "July 2024"])("rejects %s", (value) => {
    expect(() => formatDate(value, "en")).toThrow();
  });
});

describe("formatDateRange", () => {
  it("joins both ends with a word, never a dash", () => {
    expect(formatDateRange("2024-07", "2026-04", "es")).toBe("jul. 2024 a abr. 2026");
    expect(formatDateRange("2024-07", "2026-04", "en")).toBe("Jul 2024 to Apr 2026");
  });

  it("marks open ranges as ongoing", () => {
    expect(formatDateRange("2025-03", undefined, "es")).toBe("mar. 2025 a la fecha");
    expect(formatDateRange("2020", undefined, "en")).toBe("2020 to present");
  });

  it("collapses a range that starts and ends in the same period", () => {
    expect(formatDateRange("2026-10", "2026-10", "en")).toBe("Oct 2026");
    expect(formatDateRange(undefined, "2024", "es")).toBe("2024");
    expect(formatDateRange(undefined, undefined, "es")).toBe("");
  });
});

describe("isoYearMonth", () => {
  it("uses the given time zone", () => {
    // 02:00 UTC on Dec 1 is still Nov 30 in Santiago.
    const instant = new Date("2026-12-01T02:00:00Z");
    expect(isoYearMonth(instant, "America/Santiago")).toBe("2026-11");
    expect(isoYearMonth(instant, "UTC")).toBe("2026-12");
    expect(formatDate(isoYearMonth(instant, "America/Santiago"), "es", "long")).toBe(
      "noviembre de 2026",
    );
  });
});

describe("displayUrl", () => {
  it("drops the scheme, www and trailing slash", () => {
    expect(displayUrl("https://www.linkedin.com/in/someone/")).toBe("linkedin.com/in/someone");
    expect(displayUrl("https://github.com/mansep12")).toBe("github.com/mansep12");
  });
});
