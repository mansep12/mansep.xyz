import { describe, expect, it } from "vitest";
import { loadResumes } from "../../src/data/resume.schema";
import { cvGeneratorCopy } from "../../src/i18n/cv-generator";
import type { BudgetDecision, BudgetInput } from "../../src/lib/cv-generator/budget";
import { buildCatalog } from "../../src/lib/cv-generator/catalog";
import {
  type CallUsage,
  type CvModelClient,
  CvModelError,
  type ScreeningResult,
} from "../../src/lib/cv-generator/client";
import { readGeneratorConfig } from "../../src/lib/cv-generator/env";
import {
  type GenerationLog,
  type HandlerDeps,
  handleCvRequest,
  type SuccessBody,
} from "../../src/lib/cv-generator/handler";
import { tailorResume } from "../../src/lib/cv-generator/tailor";
import { validateSelection } from "../../src/lib/cv-generator/validate";

const resumes = loadResumes();
const ORIGIN = "https://mansep.xyz";
const JOB = "Security engineer for a fintech: applied cryptography, Python backends, PostgreSQL.";

const usage = (model: string): CallUsage => ({
  model,
  inputTokens: 1000,
  outputTokens: 100,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  fallback: false,
});

const selection = {
  summary: {
    text: "I build backends and smart contracts where signatures, privacy and data provenance matter.",
    source_ids: ["basics.summary"],
  },
  sections: [
    {
      section: "projects",
      items: [
        {
          source_id: "password-manager.crypto.01",
          rewrite:
            "In the password manager, encrypted everything in the browser with the Web Crypto API, using PBKDF2, AES and RSA-OAEP.",
        },
        { source_id: "made.up.01", rewrite: "Founded a unicorn." },
        {
          source_id: "nodus.settlement.01",
          rewrite: "Implemented Nodus's Soroban contracts in Rust, audited by Trail of Bits.",
        },
      ],
    },
    {
      section: "work",
      items: [{ source_id: "dimacofi.rpa.02", rewrite: "Designed the Python workflow." }],
    },
  ],
  rationale: [
    { source_id: "password-manager.crypto.01", reason: "The role asks for applied cryptography." },
  ],
};

interface Calls {
  turnstile: number;
  budget: BudgetInput[];
  models: number;
  screen: number;
  select: number;
  logs: GenerationLog[];
}

function setup(
  overrides: {
    env?: Record<string, string>;
    siteverify?: unknown;
    budget?: BudgetDecision;
    screen?: () => Promise<ScreeningResult>;
    select?: () => Promise<unknown>;
    render?: HandlerDeps["render"];
  } = {},
) {
  const calls: Calls = { turnstile: 0, budget: [], models: 0, screen: 0, select: 0, logs: [] };
  const fetch = (async () => {
    calls.turnstile += 1;
    return new Response(
      JSON.stringify(
        overrides.siteverify ?? { success: true, hostname: "mansep.xyz", action: "cv-generator" },
      ),
      { headers: { "content-type": "application/json" } },
    );
  }) as typeof globalThis.fetch;

  const models: CvModelClient = {
    async screen() {
      calls.screen += 1;
      if (overrides.screen) return overrides.screen();
      return {
        status: "ok",
        verdict: { is_job_description: true, injection_suspected: false, language: "en" },
        usage: usage("claude-haiku-5-5"),
      };
    },
    async select() {
      calls.select += 1;
      const output = overrides.select ? await overrides.select() : selection;
      return { output, usage: usage("claude-sonnet-5-5") };
    },
  };

  const deps: HandlerDeps = {
    config: readGeneratorConfig({
      CV_GENERATOR_ENABLED: "true",
      ANTHROPIC_API_KEY: "sk-test",
      TURNSTILE_SECRET_KEY: "ts-test",
      ...overrides.env,
    }),
    resumes,
    budget: {
      async consume(input) {
        calls.budget.push(input);
        return overrides.budget ?? { allowed: true, clientRemaining: 2, dailyRemaining: 39 };
      },
    },
    createModels: () => {
      calls.models += 1;
      return models;
    },
    ...(overrides.render ? { render: overrides.render } : {}),
    clientIp: "203.0.113.7",
    fetch,
    log: (entry) => calls.logs.push(entry),
    now: () => new Date("2026-11-06T22:00:00Z"),
  };
  return { deps, calls };
}

function post(
  body: unknown,
  headers: Record<string, string> = {},
  init: Partial<RequestInit> = {},
): Request {
  return new Request(`${ORIGIN}/api/cv`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...init,
  });
}

const valid = { lang: "en", jobText: JOB, focus: ["security"], turnstileToken: "tok" };

async function call(request: Request, deps: HandlerDeps) {
  const response = await handleCvRequest(request, deps);
  return { response, body: (await response.json()) as Record<string, unknown> };
}

describe("handleCvRequest: request checks", () => {
  it("returns 503 when disabled or a secret is missing, before reading anything", async () => {
    const envs: Record<string, string>[] = [
      { CV_GENERATOR_ENABLED: "false" },
      { TURNSTILE_SECRET_KEY: "" },
    ];
    for (const env of envs) {
      const { deps, calls } = setup({ env });
      const { response, body } = await call(post(valid), deps);
      expect([response.status, body]).toEqual([503, { error: "disabled" }]);
      expect(calls.turnstile).toBe(0);
    }
  });

  it("checks method, origin, content type and size", async () => {
    const { deps, calls } = setup();
    const get = await call(new Request(`${ORIGIN}/api/cv`), deps);
    expect([get.response.status, get.response.headers.get("allow")]).toEqual([405, "POST"]);
    expect(
      (await call(post(valid, { origin: "https://evil.example" }), deps)).response.status,
    ).toBe(403);
    expect((await call(post(valid, { "content-type": "text/plain" }), deps)).body).toEqual({
      error: "unsupported_media_type",
    });
    const huge = { ...valid, jobText: "a".repeat(20_000) };
    expect((await call(post(huge), deps)).response.status).toBe(413);
    expect(calls.turnstile).toBe(0);
  });

  it("validates the JSON body before calling Turnstile", async () => {
    const { deps, calls } = setup();
    expect((await call(post("{nope"), deps)).body).toEqual({ error: "invalid_json" });
    expect((await call(post({ ...valid, lang: "fr" }), deps)).body).toEqual({
      error: "invalid_request",
    });
    expect((await call(post({ ...valid, jobText: "a".repeat(6001) }), deps)).body).toEqual({
      error: "job_text_too_long",
    });
    expect((await call(post({ ...valid, focus: ["devops"] }), deps)).response.status).toBe(400);
    expect(calls.turnstile).toBe(0);
    expect(calls.logs).toEqual([]);
  });

  it("allows requests without an Origin header (Turnstile still applies)", async () => {
    const { deps } = setup();
    const request = new Request(`${ORIGIN}/api/cv`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(valid),
    });
    expect((await handleCvRequest(request, deps)).status).toBe(200);
  });
});

describe("handleCvRequest: abuse and cost controls", () => {
  it("rejects a failed Turnstile check before touching the budget", async () => {
    const { deps, calls } = setup({
      siteverify: { success: false, "error-codes": ["timeout-or-duplicate"] },
    });
    const { response, body } = await call(post(valid), deps);
    expect([response.status, body]).toEqual([403, { error: "turnstile_failed" }]);
    expect(calls.budget).toEqual([]);
    expect(calls.logs[0]).toMatchObject({ outcome: "turnstile_failed", status: 403 });
  });

  it("rejects a token from a hostname that is not allowed", async () => {
    const { deps } = setup({ siteverify: { success: true, hostname: "example.com" } });
    expect((await call(post(valid), deps)).response.status).toBe(403);
  });

  it("returns 429 with Retry-After when the budget is spent, without calling a model", async () => {
    const { deps, calls } = setup({ budget: { allowed: false, reason: "client_limit" } });
    const { response, body } = await call(post(valid), deps);
    expect([response.status, body]).toEqual([
      429,
      { error: "rate_limited", reason: "client_limit" },
    ]);
    expect(response.headers.get("retry-after")).toBe(String(2 * 60 * 60));
    expect(calls.models).toBe(0);
  });

  it("passes the budget a daily hash of the IP, never the IP", async () => {
    const { deps, calls } = setup({ env: { CV_DAILY_LIMIT: "10", CV_PER_IP_DAILY_LIMIT: "2" } });
    await call(post(valid), deps);
    expect(calls.budget[0]).toMatchObject({ day: "2026-11-06", dailyLimit: 10, perClientLimit: 2 });
    expect(JSON.stringify(calls.budget)).not.toContain("203.0.113.7");
  });
});

describe("handleCvRequest: models", () => {
  it("rejects text that is not a job description", async () => {
    const { deps, calls } = setup({
      screen: async () => ({
        status: "ok",
        verdict: { is_job_description: false, injection_suspected: false, language: "en" },
        usage: usage("claude-haiku-5-5"),
      }),
    });
    const { response, body } = await call(post(valid), deps);
    expect([response.status, body]).toEqual([422, { error: "not_a_job_description" }]);
    expect(calls.select).toBe(0);
  });

  it("rejects suspected injections and screening refusals", async () => {
    for (const screen of [
      async (): Promise<ScreeningResult> => ({
        status: "ok",
        verdict: { is_job_description: true, injection_suspected: true, language: "en" },
        usage: usage("claude-haiku-5-5"),
      }),
      async (): Promise<ScreeningResult> => ({
        status: "refused",
        usage: usage("claude-haiku-5-5"),
      }),
    ]) {
      const { deps, calls } = setup({ screen });
      expect((await call(post(valid), deps)).body).toEqual({ error: "input_rejected" });
      expect(calls.select).toBe(0);
    }
  });

  it("maps model failures to status codes", async () => {
    const cases: [CvModelError, number, string][] = [
      [new CvModelError("timeout", "t"), 504, "upstream_timeout"],
      [new CvModelError("rate_limited", "r"), 503, "upstream_busy"],
      [new CvModelError("unavailable", "u"), 503, "upstream_busy"],
      [new CvModelError("refused", "x"), 422, "model_declined"],
      [new CvModelError("invalid_output", "i"), 502, "upstream_error"],
      [new CvModelError("auth", "a"), 502, "upstream_error"],
    ];
    for (const [thrown, status, code] of cases) {
      const { deps } = setup({
        select: async () => {
          throw thrown;
        },
      });
      const { response, body } = await call(post(valid), deps);
      expect([response.status, body]).toEqual([status, { error: code }]);
    }
  });

  it("returns 502 when nothing valid was selected", async () => {
    const { deps } = setup({
      select: async () => ({ ...selection, sections: [{ section: "work", items: [] }] }),
    });
    expect((await call(post(valid), deps)).body).toEqual({ error: "empty_selection" });
  });
});

describe("handleCvRequest: success", () => {
  it("returns the tailored resume built from verified data", async () => {
    const { deps } = setup();
    const { response, body } = await call(post(valid), deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const success = body as unknown as SuccessBody;

    // Identity, contact, employers, dates and links come from the JSON.
    expect(success.resume.basics).toEqual({
      ...resumes.en.basics,
      summary: selection.summary.text,
    });
    expect(success.resume.work.map((job) => [job.name, job.position, job.startDate])).toEqual(
      resumes.en.work.map((job) => [job.name, job.position, job.startDate]),
    );
    expect(success.resume.education).toEqual(resumes.en.education);

    // The invented id is gone; the invented audit fell back to the original text.
    expect(success.items.map((item) => item.id)).toEqual([
      "password-manager.crypto.01",
      "nodus.settlement.01",
      "dimacofi.rpa.02",
    ]);
    const nodus = success.resume.projects.find((project) => project.name === "Nodus");
    expect(nodus?.highlights[0]?.text).toBe(
      resumes.en.projects[0]?.highlights.find((h) => h.id === "nodus.settlement.01")?.text,
    );
    expect(JSON.stringify(success.resume)).not.toContain("Trail of Bits");
    expect(JSON.stringify(success.resume)).not.toContain("unicorn");

    expect(success.sectionOrder).toEqual(["projects", "work"]);
    expect(success.rationale).toEqual([
      { id: "password-manager.crypto.01", reason: "The role asks for applied cryptography." },
    ]);
    expect(success.disclosure).toBe(cvGeneratorCopy.en.disclosure);
    expect(success.remainingToday).toBe(2);
    expect(success.html).toBeNull();
  });

  it("includes the rendered HTML when a renderer is wired", async () => {
    const { deps } = setup({
      render: async (lang, tailored) =>
        `<article lang="${lang}">${tailored.sectionOrder}</article>`,
    });
    const { body } = await call(post(valid), deps);
    expect(body.html).toBe('<article lang="en">projects,work</article>');
  });

  it("returns 500 when rendering fails", async () => {
    const { deps } = setup({
      render: async () => {
        throw new Error("boom");
      },
    });
    expect((await call(post(valid), deps)).body).toEqual({ error: "render_failed" });
  });

  it("logs usage and ids, never the job text or the IP", async () => {
    const { deps, calls } = setup();
    await call(post(valid), deps);
    const [entry] = calls.logs;
    expect(entry).toMatchObject({
      event: "cv_generation",
      ts: "2026-11-06T22:00:00.000Z",
      lang: "en",
      outcome: "ok",
      status: 200,
      selected_ids: ["password-manager.crypto.01", "nodus.settlement.01", "dimacofi.rpa.02"],
      rewrite_fallbacks: 1,
      screening: { model: "claude-haiku-5-5", inputTokens: 1000 },
      selection: { model: "claude-sonnet-5-5", outputTokens: 100 },
    });
    expect(entry?.input_sha256).toMatch(/^[0-9a-f]{64}$/);
    const line = JSON.stringify(calls.logs);
    expect(line).not.toContain("fintech");
    expect(line).not.toContain("203.0.113.7");
  });
});

describe("tailorResume", () => {
  const catalog = buildCatalog(resumes.es, "es");

  it("keeps every job, filters highlights, and orders projects by relevance", () => {
    const validated = validateSelection(
      {
        summary: { text: "", source_ids: [] },
        sections: [
          {
            section: "projects",
            items: [
              { source_id: "pulso-urbano.fullstack.01", rewrite: "" },
              { source_id: "nodus.accounts.01", rewrite: "" },
            ],
          },
          {
            section: "work",
            items: [
              { source_id: "dimacofi.rpa.02", rewrite: "" },
              { source_id: "dimacofi.kiosk.01", rewrite: "" },
            ],
          },
        ],
        rationale: [],
      },
      catalog,
    );
    const { resume, sectionOrder } = tailorResume(resumes.es, validated);

    expect(sectionOrder).toEqual(["projects", "work"]);
    expect(resume.work.map((job) => job.name)).toEqual(resumes.es.work.map((job) => job.name));
    expect(resume.work[0]?.highlights).toEqual([]);
    expect(resume.work[1]?.highlights.map((h) => h.id)).toEqual([
      "dimacofi.rpa.02",
      "dimacofi.kiosk.01",
    ]);
    expect(resume.projects.map((project) => project.name)).toEqual(["Pulso Urbano", "Nodus"]);
    expect(resume.projects[0]?.url).toBe(resumes.es.projects[2]?.url);
    // Empty summary from the model: the verified profile summary stays.
    expect(resume.basics.summary).toBe(resumes.es.basics.summary);
    expect(resume.volunteer).toEqual([]);
    expect(resume.skills).toEqual(resumes.es.skills);
  });

  it("appends the section the model left out", () => {
    const validated = validateSelection(
      {
        summary: { text: "", source_ids: [] },
        sections: [{ section: "work", items: [{ source_id: "clcert.thesis.01", rewrite: "" }] }],
        rationale: [],
      },
      catalog,
    );
    const { resume, sectionOrder } = tailorResume(resumes.es, validated);
    expect(sectionOrder).toEqual(["work", "projects"]);
    expect(resume.projects).toEqual([]);
  });
});
