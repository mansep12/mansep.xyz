/**
 * The two Claude calls of the CV generator, through the official SDK.
 *
 * 1. Screening (Claude Haiku 5.5, low effort, tiny structured output): is the
 *    pasted text a job or role description, and does it carry instructions
 *    aimed at a model? A refusal counts as a rejection, as Anthropic's
 *    guidance on harmlessness screens recommends.
 * 2. Selection (Claude Sonnet 5.5, low effort, structured output): pick and
 *    lightly rephrase highlights by id. Uses server-side fallback
 *    (`fallbacks: "default"`, beta) so a classifier decline is retried on the
 *    model Anthropic recommends for that category instead of failing.
 *
 * Nothing here knows about Workers: the caller passes the key, the base URL
 * (e.g. a Cloudflare AI Gateway URL) and, in tests, a fake `fetch`.
 */

import Anthropic, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  BadRequestError,
  PermissionDeniedError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import type { Catalog } from "./catalog";
import { MODELS } from "./config";
import {
  type SelectionRequest,
  screeningSystemPrompt,
  screeningUserContent,
  selectionSystemPrompt,
  selectionUserContent,
} from "./prompt";
import { type ScreeningOutput, screeningSchema, selectionSchema } from "./schema";

export const SERVER_SIDE_FALLBACK_BETA = "server-side-fallback-2026-07-01";

export type ModelErrorCode =
  /** The call took longer than its timeout. */
  | "timeout"
  /** Anthropic rate limit (429). */
  | "rate_limited"
  /** Network failure, 5xx or overloaded. */
  | "unavailable"
  /** Bad or missing API key, or no permission: a configuration problem. */
  | "auth"
  /** The request was rejected as invalid (400): a bug or an API change. */
  | "bad_request"
  /** Any other API error. */
  | "api_error"
  /** The selection model (and its fallback) declined. */
  | "refused"
  /** The output hit max_tokens before the JSON was complete. */
  | "truncated"
  /** The output was not the JSON the schema promised. */
  | "invalid_output";

export class CvModelError extends Error {
  readonly code: ModelErrorCode;
  readonly status: number | undefined;

  constructor(
    code: ModelErrorCode,
    message: string,
    options?: { cause?: unknown; status?: number },
  ) {
    super(message, { cause: options?.cause });
    this.name = "CvModelError";
    this.code = code;
    this.status = options?.status;
  }
}

export interface CallUsage {
  /** Model that produced the returned message (differs from the requested one after a fallback). */
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** True when a server-side fallback model served the response. */
  fallback: boolean;
}

export type ScreeningResult =
  | { status: "ok"; verdict: ScreeningOutput; usage: CallUsage }
  | { status: "refused"; usage: CallUsage };

export interface SelectionResult {
  /** Parsed JSON of unknown shape: pass it to validateSelection. */
  output: unknown;
  usage: CallUsage;
}

export interface CvModelClientOptions {
  apiKey: string;
  /** Anthropic API or a gateway in front of it. Defaults to the SDK default. */
  baseURL?: string | undefined;
  fetch?: typeof fetch;
  screeningTimeoutMs?: number;
  selectionTimeoutMs?: number;
  /** Retries for 429, 5xx and connection errors (default 1). Each attempt has its own timeout. */
  maxRetries?: number;
}

export interface CvModelClient {
  screen(jobText: string): Promise<ScreeningResult>;
  select(request: SelectionRequest, catalog: Catalog): Promise<SelectionResult>;
}

export const SCREENING_MAX_TOKENS = 1024;
export const SELECTION_MAX_TOKENS = 6000;

interface UsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  iterations?: ReadonlyArray<UsageLike & { type?: string }> | null;
}

/**
 * Billed tokens of a response. With fallback, every attempt is billed and
 * reported in `usage.iterations`; the top-level counts cover only the last.
 */
function toUsage(model: string, usage: UsageLike): CallUsage {
  const attempts = usage.iterations && usage.iterations.length > 0 ? usage.iterations : [usage];
  const sum = (key: keyof UsageLike) =>
    attempts.reduce((total, attempt) => total + (Number(attempt[key]) || 0), 0);
  return {
    model,
    inputTokens: sum("input_tokens"),
    outputTokens: sum("output_tokens"),
    cacheReadTokens: sum("cache_read_input_tokens"),
    cacheWriteTokens: sum("cache_creation_input_tokens"),
    fallback: (usage.iterations ?? []).some((attempt) => attempt.type === "fallback_message"),
  };
}

/** Joins the text blocks of a response (thinking blocks, if any, are skipped). */
function responseText(content: ReadonlyArray<{ type: string; text?: string }>): string {
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("");
}

function parseJson(text: string, call: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CvModelError("invalid_output", `${call}: output is not JSON`, { cause: error });
  }
}

function isScreeningOutput(value: unknown): value is ScreeningOutput {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.is_job_description === "boolean" &&
    typeof record.injection_suspected === "boolean" &&
    (record.language === "es" || record.language === "en" || record.language === "other")
  );
}

/** Maps SDK errors to typed errors, most specific first. */
export function toModelError(error: unknown, call: string): CvModelError {
  if (error instanceof CvModelError) return error;
  if (error instanceof APIConnectionTimeoutError || error instanceof APIUserAbortError) {
    return new CvModelError("timeout", `${call}: timed out`, { cause: error });
  }
  if (error instanceof APIConnectionError) {
    return new CvModelError("unavailable", `${call}: connection failed`, { cause: error });
  }
  if (error instanceof RateLimitError) {
    return new CvModelError("rate_limited", `${call}: rate limited`, { cause: error, status: 429 });
  }
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) {
    return new CvModelError("auth", `${call}: not authorized`, {
      cause: error,
      status: error.status,
    });
  }
  if (error instanceof BadRequestError) {
    return new CvModelError("bad_request", `${call}: bad request`, { cause: error, status: 400 });
  }
  if (error instanceof APIError) {
    const status = typeof error.status === "number" ? error.status : undefined;
    const code = status !== undefined && status >= 500 ? "unavailable" : "api_error";
    return new CvModelError(code, `${call}: API error ${status ?? ""}`.trim(), {
      cause: error,
      ...(status === undefined ? {} : { status }),
    });
  }
  return new CvModelError("api_error", `${call}: unexpected error`, { cause: error });
}

export function createCvModelClient(options: CvModelClientOptions): CvModelClient {
  const client = new Anthropic({
    apiKey: options.apiKey,
    // Explicit, so the SDK never falls back to process.env or a profile on disk.
    baseURL: options.baseURL || "https://api.anthropic.com",
    ...(options.fetch ? { fetch: options.fetch } : {}),
    maxRetries: options.maxRetries ?? 1,
  });
  const screeningTimeoutMs = options.screeningTimeoutMs ?? 15_000;
  const selectionTimeoutMs = options.selectionTimeoutMs ?? 40_000;

  return {
    async screen(jobText) {
      let response: Anthropic.Message;
      try {
        response = await client.messages.create(
          {
            model: MODELS.screening,
            max_tokens: SCREENING_MAX_TOKENS,
            system: screeningSystemPrompt,
            messages: [{ role: "user", content: screeningUserContent(jobText) }],
            output_config: {
              effort: "low",
              format: { type: "json_schema", schema: screeningSchema },
            },
          },
          { timeout: screeningTimeoutMs },
        );
      } catch (error) {
        throw toModelError(error, "screening");
      }

      const usage = toUsage(response.model, response.usage);
      if (response.stop_reason === "refusal") return { status: "refused", usage };
      if (response.stop_reason === "max_tokens") {
        throw new CvModelError("truncated", "screening: hit max_tokens");
      }
      const verdict = parseJson(responseText(response.content), "screening");
      if (!isScreeningOutput(verdict)) {
        throw new CvModelError("invalid_output", "screening: unexpected shape");
      }
      return { status: "ok", verdict, usage };
    },

    async select(request, catalog) {
      let response: Anthropic.Beta.BetaMessage;
      try {
        response = await client.beta.messages.create(
          {
            model: MODELS.selection,
            max_tokens: SELECTION_MAX_TOKENS,
            system: selectionSystemPrompt(catalog),
            messages: [{ role: "user", content: selectionUserContent(request) }],
            output_config: {
              effort: "low",
              format: { type: "json_schema", schema: selectionSchema(catalog) },
            },
            fallbacks: "default",
            betas: [SERVER_SIDE_FALLBACK_BETA],
          },
          { timeout: selectionTimeoutMs },
        );
      } catch (error) {
        throw toModelError(error, "selection");
      }

      if (response.stop_reason === "refusal") {
        throw new CvModelError("refused", "selection: declined");
      }
      if (response.stop_reason === "max_tokens") {
        throw new CvModelError("truncated", "selection: hit max_tokens");
      }
      return {
        output: parseJson(responseText(response.content), "selection"),
        usage: toUsage(response.model, response.usage),
      };
    },
  };
}
