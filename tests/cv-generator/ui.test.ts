import { describe, expect, it } from "vitest";
import { cvGeneratorCopy } from "../../src/i18n/cv-generator";
import { locales } from "../../src/i18n/locales";
import { resolveGeneratorBuildConfig } from "../../src/lib/cv-generator/build-config";
import { errorMessageKey, remainingMessageKey } from "../../src/lib/cv-generator/ui";

describe("resolveGeneratorBuildConfig", () => {
  const siteKey = "1x00000000000000000000AA";

  it("enables the form only with the flag and a plausible site key", () => {
    expect(resolveGeneratorBuildConfig({})).toEqual({ enabled: false, siteKey: "" });
    expect(resolveGeneratorBuildConfig({ CV_GENERATOR_ENABLED: "true" })).toEqual({
      enabled: false,
      siteKey: "",
    });
    expect(
      resolveGeneratorBuildConfig({
        CV_GENERATOR_ENABLED: "false",
        PUBLIC_TURNSTILE_SITE_KEY: siteKey,
      }),
    ).toEqual({ enabled: false, siteKey: "" });
    expect(
      resolveGeneratorBuildConfig({
        CV_GENERATOR_ENABLED: "true",
        PUBLIC_TURNSTILE_SITE_KEY: '"><script>',
      }),
    ).toEqual({ enabled: false, siteKey: "" });
    expect(
      resolveGeneratorBuildConfig({
        CV_GENERATOR_ENABLED: "TRUE",
        PUBLIC_TURNSTILE_SITE_KEY: siteKey,
      }),
    ).toEqual({ enabled: true, siteKey });
  });
});

describe("errorMessageKey", () => {
  it("maps every endpoint error to a message", () => {
    const cases: [number, Record<string, string>, string][] = [
      [400, { error: "job_text_too_short" }, "error.tooShort"],
      [400, { error: "job_text_too_long" }, "error.tooLong"],
      [413, { error: "payload_too_large" }, "error.tooLong"],
      [503, { error: "disabled" }, "error.disabled"],
      [429, { error: "rate_limited", reason: "client_limit" }, "error.clientLimit"],
      [429, { error: "rate_limited", reason: "daily_limit" }, "error.dailyLimit"],
      [403, { error: "turnstile_failed" }, "error.turnstile"],
      [503, { error: "turnstile_unavailable" }, "error.turnstile"],
      [422, { error: "not_a_job_description" }, "error.notJob"],
      [422, { error: "input_rejected" }, "error.rejected"],
      [422, { error: "model_declined" }, "error.declined"],
      [504, { error: "upstream_timeout" }, "error.generic"],
      [500, {}, "error.generic"],
    ];
    for (const [status, body, key] of cases) {
      expect([status, body, errorMessageKey(status, body)]).toEqual([status, body, key]);
    }
  });

  it("picks the right form for the tries left", () => {
    expect([0, 1, 2].map(remainingMessageKey)).toEqual([
      "remainingNone",
      "remainingOne",
      "remaining",
    ]);
  });
});

describe("generator copy", () => {
  it("has the disclosure line in both locales and no em or en dashes", () => {
    expect(cvGeneratorCopy.es.disclosure).toBe(
      "CV armado por un asistente a partir de datos verificados por mí: el modelo solo eligió y reordenó, no agregó hechos. Versión completa: mansep.xyz/cv",
    );
    expect(cvGeneratorCopy.en.disclosure).toContain("mansep.xyz/en/cv");
    for (const lang of locales) {
      for (const value of Object.values(cvGeneratorCopy[lang])) {
        expect(value).not.toMatch(/[–—]/);
      }
    }
  });

  it("has the progress states", () => {
    expect([
      cvGeneratorCopy.es.stage1,
      cvGeneratorCopy.es.stage2,
      cvGeneratorCopy.es.stage3,
    ]).toEqual(["Leyendo la oferta", "Eligiendo lo relevante", "Armando el CV"]);
  });
});
