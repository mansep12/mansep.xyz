import { describe, expect, it } from "vitest";
import {
  type BudgetInput,
  type CounterStore,
  clientKey,
  consumeBudget,
  nextUtcMidnight,
  secondsUntilNextUtcDay,
  utcDay,
} from "../../src/lib/cv-generator/budget";
import { LIMITS } from "../../src/lib/cv-generator/config";
import { readGeneratorConfig } from "../../src/lib/cv-generator/env";
import {
  BodyTooLargeError,
  normalizeJobText,
  parseGeneratorInput,
  readLimitedText,
} from "../../src/lib/cv-generator/request";
import { SITEVERIFY_URL, verifyTurnstile } from "../../src/lib/cv-generator/turnstile";

/** In-memory stand-in for the Durable Object's synchronous KV storage. */
function memoryStore(): CounterStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: (key) => data.get(key),
    put: (key, value) => {
      data.set(key, value);
    },
    deleteAll: () => data.clear(),
  };
}

describe("verifyTurnstile", () => {
  function siteverify(body: unknown, status = 200) {
    const calls: { url: string; body: Record<string, string> }[] = [];
    const fetch = (async (url: RequestInfo | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }) as typeof globalThis.fetch;
    return { fetch, calls };
  }

  const base = { secret: "s3cret", token: "tok", allowedHostnames: ["mansep.xyz"] };

  it("accepts a valid token from an allowed hostname and sends the secret, IP and idempotency key", async () => {
    const { fetch, calls } = siteverify({
      success: true,
      hostname: "mansep.xyz",
      action: "cv-generator",
      "error-codes": [],
    });
    const result = await verifyTurnstile({
      ...base,
      fetch,
      remoteIp: "203.0.113.7",
      idempotencyKey: "4c0b5a2e-0000-4000-8000-000000000000",
    });
    expect(result).toEqual({ ok: true, hostname: "mansep.xyz" });
    expect(calls[0]?.url).toBe(SITEVERIFY_URL);
    expect(calls[0]?.body).toEqual({
      secret: "s3cret",
      response: "tok",
      remoteip: "203.0.113.7",
      idempotency_key: "4c0b5a2e-0000-4000-8000-000000000000",
    });
  });

  it("rejects an invalid, expired or already used token", async () => {
    const { fetch } = siteverify({ success: false, "error-codes": ["timeout-or-duplicate"] });
    expect(await verifyTurnstile({ ...base, fetch })).toEqual({
      ok: false,
      reason: "invalid_token",
      errorCodes: ["timeout-or-duplicate"],
    });
  });

  it("rejects a token issued on another hostname", async () => {
    // Test secrets always report example.com, so production must not allow it.
    const { fetch } = siteverify({ success: true, hostname: "example.com" });
    expect(await verifyTurnstile({ ...base, fetch })).toMatchObject({
      ok: false,
      reason: "hostname_mismatch",
    });
    const local = siteverify({ success: true, hostname: "example.com" });
    expect(
      await verifyTurnstile({ ...base, fetch: local.fetch, allowedHostnames: ["example.com"] }),
    ).toEqual({ ok: true, hostname: "example.com" });
  });

  it("rejects a token issued for another action", async () => {
    const { fetch } = siteverify({ success: true, hostname: "mansep.xyz", action: "login" });
    expect(await verifyTurnstile({ ...base, fetch })).toMatchObject({ reason: "action_mismatch" });
  });

  it("reports Siteverify outages as unavailable", async () => {
    const down = siteverify({}, 503);
    expect(await verifyTurnstile({ ...base, fetch: down.fetch })).toMatchObject({
      reason: "unavailable",
    });
    const offline = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof globalThis.fetch;
    expect(await verifyTurnstile({ ...base, fetch: offline })).toMatchObject({
      reason: "unavailable",
    });
  });
});

describe("consumeBudget", () => {
  const input: BudgetInput = { day: "2026-11-06", client: "a", dailyLimit: 3, perClientLimit: 2 };

  it("counts generations per visitor and per day", () => {
    const store = memoryStore();
    expect(consumeBudget(store, input)).toEqual({
      allowed: true,
      clientRemaining: 1,
      dailyRemaining: 2,
    });
    expect(consumeBudget(store, input)).toMatchObject({ allowed: true, clientRemaining: 0 });
    expect(consumeBudget(store, input)).toEqual({ allowed: false, reason: "client_limit" });
    expect(consumeBudget(store, { ...input, client: "b" })).toMatchObject({
      allowed: true,
      dailyRemaining: 0,
    });
    expect(consumeBudget(store, { ...input, client: "c" })).toEqual({
      allowed: false,
      reason: "daily_limit",
    });
  });

  it("does not count rejected attempts", () => {
    const store = memoryStore();
    consumeBudget(store, input);
    consumeBudget(store, input);
    consumeBudget(store, input);
    consumeBudget(store, input);
    expect(store.data.get("total")).toBe(2);
  });

  it("starts over on a new day and forgets the previous visitors", () => {
    const store = memoryStore();
    consumeBudget(store, input);
    consumeBudget(store, input);
    expect(consumeBudget(store, { ...input, day: "2026-11-07" })).toMatchObject({ allowed: true });
    expect([...store.data.keys()].sort()).toEqual(["client:a", "day", "total"]);
    expect(store.data.get("total")).toBe(1);
  });

  it("acts as a kill switch with a limit of zero", () => {
    expect(consumeBudget(memoryStore(), { ...input, dailyLimit: 0 })).toMatchObject({
      allowed: false,
      reason: "daily_limit",
    });
  });
});

describe("budget time and keys", () => {
  it("uses UTC days", () => {
    const late = new Date("2026-11-06T23:59:30-03:00");
    expect(utcDay(late)).toBe("2026-11-07");
    expect(nextUtcMidnight(new Date("2026-11-06T10:00:00Z"))).toBe(Date.UTC(2026, 10, 7));
    expect(secondsUntilNextUtcDay(new Date("2026-11-06T23:59:00Z"))).toBe(60);
  });

  it("hashes the IP with the day, so keys never contain the IP and change daily", async () => {
    const today = await clientKey("203.0.113.7", "2026-11-06");
    expect(today).toMatch(/^[0-9a-f]{32}$/);
    expect(today).not.toContain("203");
    expect(await clientKey("203.0.113.7", "2026-11-06")).toBe(today);
    expect(await clientKey("203.0.113.7", "2026-11-07")).not.toBe(today);
    expect(await clientKey("203.0.113.8", "2026-11-06")).not.toBe(today);
  });
});

describe("readGeneratorConfig", () => {
  const secrets = { ANTHROPIC_API_KEY: "sk", TURNSTILE_SECRET_KEY: "ts" };

  it("is disabled unless the flag is true and both secrets are set", () => {
    expect(readGeneratorConfig({}).enabled).toBe(false);
    expect(readGeneratorConfig({ ...secrets, CV_GENERATOR_ENABLED: "false" }).enabled).toBe(false);
    const noSecret = readGeneratorConfig({ CV_GENERATOR_ENABLED: "true", ANTHROPIC_API_KEY: "sk" });
    expect(noSecret).toMatchObject({
      enabled: false,
      flag: true,
      missingSecrets: ["TURNSTILE_SECRET_KEY"],
    });
    expect(readGeneratorConfig({ ...secrets, CV_GENERATOR_ENABLED: "true" }).enabled).toBe(true);
  });

  it("uses defaults for missing or malformed limits", () => {
    const config = readGeneratorConfig({ CV_DAILY_LIMIT: "-5", CV_PER_IP_DAILY_LIMIT: "lots" });
    expect(config).toMatchObject({
      dailyLimit: 40,
      perClientLimit: 3,
      turnstileHostnames: ["mansep.xyz"],
      anthropicBaseUrl: undefined,
    });
    expect(
      readGeneratorConfig({
        CV_DAILY_LIMIT: "10",
        CV_PER_IP_DAILY_LIMIT: "0",
        TURNSTILE_HOSTNAMES: "mansep.xyz, Example.com,",
        ANTHROPIC_BASE_URL: "https://gateway.ai.cloudflare.com/v1/acc/gw/anthropic",
      }),
    ).toMatchObject({
      dailyLimit: 10,
      perClientLimit: 0,
      turnstileHostnames: ["mansep.xyz", "example.com"],
      anthropicBaseUrl: "https://gateway.ai.cloudflare.com/v1/acc/gw/anthropic",
    });
  });
});

describe("parseGeneratorInput", () => {
  const valid = {
    lang: "es",
    jobText: "Buscamos backend engineer con Python y PostgreSQL para una fintech.",
    focus: ["backend"],
    turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
  };

  it("accepts a valid request and normalizes the text", () => {
    const result = parseGeneratorInput({
      ...valid,
      jobText: `  ${valid.jobText}\r\n\n\n\n\u0007ok `,
    });
    expect(result).toEqual({
      ok: true,
      input: { ...valid, jobText: `${valid.jobText}\n\nok` },
    });
    expect(parseGeneratorInput({ ...valid, focus: undefined })).toMatchObject({
      ok: true,
      input: { focus: [] },
    });
  });

  it("caps the job text at 6000 characters", () => {
    const max = "a".repeat(LIMITS.jobTextMaxChars);
    expect(parseGeneratorInput({ ...valid, jobText: max }).ok).toBe(true);
    expect(parseGeneratorInput({ ...valid, jobText: `${max}a` })).toEqual({
      ok: false,
      error: "job_text_too_long",
    });
    expect(parseGeneratorInput({ ...valid, jobText: "   short  " })).toEqual({
      ok: false,
      error: "job_text_too_short",
    });
  });

  it("only accepts known focus chips, once each", () => {
    for (const focus of [["devops"], ["backend", "backend"], "backend", [1]]) {
      expect(parseGeneratorInput({ ...valid, focus })).toEqual({
        ok: false,
        error: "invalid_request",
      });
    }
    expect(
      parseGeneratorInput({ ...valid, focus: ["backend", "security", "fullstack", "research"] }).ok,
    ).toBe(true);
  });

  it("rejects wrong types, unknown fields, other languages and bad tokens", () => {
    for (const body of [
      null,
      [],
      "text",
      { ...valid, lang: "fr" },
      { ...valid, jobText: 42 },
      { ...valid, extra: true },
      { ...valid, turnstileToken: "" },
      { ...valid, turnstileToken: "x".repeat(LIMITS.turnstileTokenMaxChars + 1) },
    ]) {
      expect(parseGeneratorInput(body)).toEqual({ ok: false, error: "invalid_request" });
    }
  });

  it("removes control and format characters but keeps line breaks", () => {
    expect(normalizeJobText("a​b‮c\td\n\ne\u0000")).toBe("abc\td\n\ne");
  });
});

describe("readLimitedText", () => {
  function post(body: string, headers: Record<string, string> = {}) {
    return new Request("https://mansep.xyz/api/cv", { method: "POST", body, headers });
  }

  it("reads a body under the limit", async () => {
    expect(await readLimitedText(post("hola"), 10)).toBe("hola");
  });

  it("stops at the limit, with or without a content-length", async () => {
    await expect(readLimitedText(post("x".repeat(11)), 10)).rejects.toBeInstanceOf(
      BodyTooLargeError,
    );
    await expect(
      readLimitedText(post("x", { "content-length": "999999" }), 10),
    ).rejects.toBeInstanceOf(BodyTooLargeError);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(8)));
        controller.enqueue(new TextEncoder().encode("x".repeat(8)));
        controller.close();
      },
    });
    const streamed = new Request("https://mansep.xyz/api/cv", {
      method: "POST",
      body: stream,
      // @ts-expect-error: Node needs duplex for a streamed body; not in the DOM types.
      duplex: "half",
    });
    await expect(readLimitedText(streamed, 10)).rejects.toBeInstanceOf(BodyTooLargeError);
  });
});
