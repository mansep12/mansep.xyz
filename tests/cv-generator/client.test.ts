import { describe, expect, it } from "vitest";
import { loadResumes } from "../../src/data/resume.schema";
import { buildCatalog } from "../../src/lib/cv-generator/catalog";
import {
  CvModelError,
  createCvModelClient,
  SERVER_SIDE_FALLBACK_BETA,
} from "../../src/lib/cv-generator/client";
import { MODELS } from "../../src/lib/cv-generator/config";

const catalog = buildCatalog(loadResumes().en, "en");
const BASE_URL = "https://gateway.test/anthropic";

interface Captured {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
}

type Reply = Response | ((init: RequestInit) => Promise<Response>);

/** A fetch that records requests and answers from a queue. */
function fakeFetch(...replies: Reply[]) {
  const calls: Captured[] = [];
  const fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      headers: new Headers(init.headers),
      body: JSON.parse(String(init.body)),
    });
    const reply = replies.shift();
    if (!reply) throw new Error("unexpected request");
    return typeof reply === "function" ? reply(init) : reply;
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "request-id": "req_test", ...headers },
  });
}

function message(model: string, text: string, extra: Record<string, unknown> = {}) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model,
    content: [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "text", text },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    stop_details: null,
    usage: {
      input_tokens: 900,
      output_tokens: 40,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
    ...extra,
  };
}

function apiError(status: number, type: string, headers: Record<string, string> = {}): Response {
  return json({ type: "error", error: { type, message: type } }, status, headers);
}

const verdict = { is_job_description: true, injection_suspected: false, language: "en" };

const selection = {
  summary: { text: "Backend engineer.", source_ids: ["basics.summary"] },
  sections: [{ section: "work", items: [{ source_id: "dimacofi.rpa.01", rewrite: "x" }] }],
  rationale: [],
};

function client(fetch: typeof globalThis.fetch, extra = {}) {
  return createCvModelClient({
    apiKey: "sk-test",
    baseURL: BASE_URL,
    fetch,
    maxRetries: 0,
    ...extra,
  });
}

describe("screen", () => {
  it("sends a low-effort structured request to Haiku and parses the verdict", async () => {
    const { fetch, calls } = fakeFetch(json(message(MODELS.screening, JSON.stringify(verdict))));
    const result = await client(fetch).screen("Backend engineer, Go, fintech");

    expect(result).toEqual({
      status: "ok",
      verdict,
      usage: expect.objectContaining({
        model: MODELS.screening,
        inputTokens: 900,
        outputTokens: 40,
      }),
    });
    const [call] = calls;
    expect(call?.url).toBe(`${BASE_URL}/v1/messages`);
    expect(call?.headers.get("authorization")).toBe("Bearer sk-test");
    expect(call?.body).toMatchObject({
      model: "claude-haiku-5-5",
      max_tokens: 1024,
      output_config: { effort: "low", format: { type: "json_schema" } },
    });
    expect(call?.body).not.toHaveProperty("temperature");
    expect(call?.body).not.toHaveProperty("thinking");
    expect(JSON.stringify(call?.body.messages)).toContain("Backend engineer, Go, fintech");
  });

  it("treats a refusal as a rejection", async () => {
    const refused = message(MODELS.screening, "", {
      content: [],
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: "cyber", explanation: "declined" },
    });
    const { fetch } = fakeFetch(json(refused));
    expect((await client(fetch).screen("x")).status).toBe("refused");
  });

  it("rejects output that is not the promised JSON", async () => {
    const { fetch } = fakeFetch(
      json(message(MODELS.screening, "not json")),
      json(message(MODELS.screening, JSON.stringify({ is_job_description: "yes" }))),
    );
    const screen = client(fetch);
    await expect(screen.screen("x")).rejects.toMatchObject({ code: "invalid_output" });
    await expect(screen.screen("x")).rejects.toMatchObject({ code: "invalid_output" });
  });

  it("reports truncated output", async () => {
    const { fetch } = fakeFetch(
      json(message(MODELS.screening, '{"is_job', { stop_reason: "max_tokens" })),
    );
    await expect(client(fetch).screen("x")).rejects.toMatchObject({ code: "truncated" });
  });
});

describe("select", () => {
  it("sends Sonnet a structured request with server-side fallback", async () => {
    const { fetch, calls } = fakeFetch(json(message(MODELS.selection, JSON.stringify(selection))));
    const result = await client(fetch).select(
      { jobText: "Security engineer", lang: "en", focus: ["security"] },
      catalog,
    );

    expect(result.output).toEqual(selection);
    const [call] = calls;
    expect(call?.url).toMatch(/^https:\/\/gateway\.test\/anthropic\/v1\/messages(\?beta=true)?$/);
    expect(call?.headers.get("anthropic-beta")).toContain(SERVER_SIDE_FALLBACK_BETA);
    expect(call?.body).toMatchObject({
      model: "claude-sonnet-5-5",
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema" } },
    });
    expect(call?.body.system).toContain("dimacofi.rpa.01");
    expect(call?.body).not.toHaveProperty("betas");
  });

  it("sums billed tokens across fallback attempts", async () => {
    const served = message("claude-sonnet-5", JSON.stringify(selection), {
      usage: {
        input_tokens: 3000,
        output_tokens: 700,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        iterations: [
          { type: "message", model: "claude-sonnet-5-5", input_tokens: 3000, output_tokens: 0 },
          {
            type: "fallback_message",
            model: "claude-sonnet-5",
            input_tokens: 3000,
            output_tokens: 700,
          },
        ],
      },
    });
    const { fetch } = fakeFetch(json(served));
    const { usage } = await client(fetch).select({ jobText: "x", lang: "en", focus: [] }, catalog);
    expect(usage).toMatchObject({
      model: "claude-sonnet-5",
      inputTokens: 6000,
      outputTokens: 700,
      fallback: true,
    });
  });

  it("throws a typed error when the whole chain declines", async () => {
    const refused = message(MODELS.selection, "", { content: [], stop_reason: "refusal" });
    const { fetch } = fakeFetch(json(refused));
    await expect(
      client(fetch).select({ jobText: "x", lang: "en", focus: [] }, catalog),
    ).rejects.toMatchObject({ name: "CvModelError", code: "refused" });
  });
});

describe("errors", () => {
  const cases: [number, string, string][] = [
    [400, "invalid_request_error", "bad_request"],
    [401, "authentication_error", "auth"],
    [403, "permission_error", "auth"],
    [429, "rate_limit_error", "rate_limited"],
    [500, "api_error", "unavailable"],
    [529, "overloaded_error", "unavailable"],
  ];

  for (const [status, type, code] of cases) {
    it(`maps HTTP ${status} to "${code}"`, async () => {
      const { fetch } = fakeFetch(apiError(status, type));
      const error = await client(fetch)
        .screen("x")
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(CvModelError);
      expect(error).toMatchObject({ code });
    });
  }

  it("retries once on an overloaded API, then succeeds", async () => {
    const { fetch, calls } = fakeFetch(
      apiError(529, "overloaded_error", { "retry-after-ms": "1" }),
      json(message(MODELS.screening, JSON.stringify(verdict))),
    );
    const result = await client(fetch, { maxRetries: 1 }).screen("x");
    expect(result.status).toBe("ok");
    expect(calls).toHaveLength(2);
  });

  it("times out a call that hangs", async () => {
    const hang = (init: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    const { fetch } = fakeFetch(hang);
    await expect(client(fetch, { screeningTimeoutMs: 20 }).screen("x")).rejects.toMatchObject({
      code: "timeout",
    });
  });

  it("maps a network failure to unavailable", async () => {
    const { fetch } = fakeFetch(() => Promise.reject(new TypeError("fetch failed")));
    await expect(client(fetch).screen("x")).rejects.toMatchObject({ code: "unavailable" });
  });
});
