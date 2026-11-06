/**
 * POST /api/cv, independent of Astro and Workers: the route in
 * src/pages/api/cv.ts passes the environment, the budget and the model
 * client in, and tests pass fakes.
 *
 * Order: feature flag, method, origin, content type, body size, input caps,
 * Turnstile, daily budget, screening, selection, validation, response.
 * Each step that fails returns a JSON error with a stable `error` code.
 *
 * Privacy: the job text is never logged or stored. One log line per request
 * that passed the input checks carries the time, language, SHA-256 of the
 * text, token usage, outcome and selected ids.
 */

import type { Resume } from "../../data/resume.schema";
import { cvGeneratorCopy } from "../../i18n/cv-generator";
import type { Lang } from "../../i18n/locales";
import {
  type BudgetDecision,
  type BudgetInput,
  clientKey,
  secondsUntilNextUtcDay,
  sha256Hex,
  utcDay,
} from "./budget";
import { buildCatalog, type CatalogSection } from "./catalog";
import { type CallUsage, type CvModelClient, CvModelError } from "./client";
import { LIMITS } from "./config";
import type { GeneratorConfig } from "./env";
import {
  BodyTooLargeError,
  type GeneratorInput,
  parseGeneratorInput,
  readLimitedText,
} from "./request";
import { type TailoredResume, tailorResume } from "./tailor";
import { TURNSTILE_ACTION, verifyTurnstile } from "./turnstile";
import { type ValidatedSelection, validateSelection } from "./validate";

export type ErrorCode =
  | "disabled"
  | "method_not_allowed"
  | "forbidden_origin"
  | "unsupported_media_type"
  | "payload_too_large"
  | "invalid_json"
  | "invalid_request"
  | "job_text_too_short"
  | "job_text_too_long"
  | "turnstile_failed"
  | "turnstile_unavailable"
  | "rate_limited"
  | "not_a_job_description"
  | "input_rejected"
  | "model_declined"
  | "upstream_timeout"
  | "upstream_busy"
  | "upstream_error"
  | "empty_selection"
  | "render_failed"
  | "internal_error";

export interface GenerationLog {
  event: "cv_generation";
  ts: string;
  lang: Lang;
  input_sha256: string;
  outcome: "ok" | ErrorCode;
  status: number;
  screening?: CallUsage;
  selection?: CallUsage;
  selected_ids?: string[];
  rewrite_fallbacks?: number;
  validator_issues?: number;
}

export interface HandlerDeps {
  config: GeneratorConfig;
  resumes: Readonly<Record<Lang, Resume>>;
  budget: { consume(input: BudgetInput): Promise<BudgetDecision> };
  /** Called only once the request is allowed to reach the model. */
  createModels: () => CvModelClient;
  /** Renders the tailored resume as an HTML fragment with <CvDocument>. */
  render?: (lang: Lang, tailored: TailoredResume) => Promise<string>;
  /** Visitor IP (CF-Connecting-IP). Hashed before it reaches the budget. */
  clientIp: string;
  /** For Siteverify; defaults to the global fetch. */
  fetch?: typeof fetch;
  log?: (entry: GenerationLog) => void;
  now?: () => Date;
}

export interface SuccessBody {
  lang: Lang;
  resume: Resume;
  sectionOrder: CatalogSection[];
  rationale: ValidatedSelection["rationale"];
  /** Which items kept the model's rewrite and which fell back to the original. */
  items: { id: string; rewritten: boolean }[];
  summaryRewritten: boolean;
  disclosure: string;
  html: string | null;
  remainingToday: number;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function error(status: number, code: ErrorCode, headers: Record<string, string> = {}): Response {
  return json(status, { error: code }, headers);
}

function failureResponse(caught: unknown): { status: number; code: ErrorCode } {
  if (!(caught instanceof CvModelError)) return { status: 500, code: "internal_error" };
  switch (caught.code) {
    case "timeout":
      return { status: 504, code: "upstream_timeout" };
    case "rate_limited":
    case "unavailable":
      return { status: 503, code: "upstream_busy" };
    case "refused":
      return { status: 422, code: "model_declined" };
    default:
      return { status: 502, code: "upstream_error" };
  }
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function handleCvRequest(request: Request, deps: HandlerDeps): Promise<Response> {
  const now = deps.now ?? (() => new Date());

  // 1. Feature flag and secrets.
  if (!deps.config.enabled) return error(503, "disabled");

  // 2. Method, origin, content type and size.
  if (request.method !== "POST") return error(405, "method_not_allowed", { allow: "POST" });
  if (!sameOrigin(request)) return error(403, "forbidden_origin");
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType)) return error(415, "unsupported_media_type");

  let raw: string;
  try {
    raw = await readLimitedText(request, LIMITS.requestMaxBytes);
  } catch (caught) {
    if (caught instanceof BodyTooLargeError) return error(413, "payload_too_large");
    throw caught;
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error(400, "invalid_json");
  }
  const parsed = parseGeneratorInput(body);
  if (!parsed.ok) return error(400, parsed.error);
  const { input } = parsed;

  const started = now();
  const entry: GenerationLog = {
    event: "cv_generation",
    ts: started.toISOString(),
    lang: input.lang,
    input_sha256: await sha256Hex(input.jobText),
    outcome: "ok",
    status: 200,
  };
  const finish = (response: Response, outcome: GenerationLog["outcome"]): Response => {
    entry.outcome = outcome;
    entry.status = response.status;
    (deps.log ?? ((line) => console.log(JSON.stringify(line))))(entry);
    return response;
  };

  try {
    return await generate(input, deps, started, entry, finish);
  } catch (caught) {
    const { status, code } = failureResponse(caught);
    return finish(error(status, code), code);
  }
}

async function generate(
  input: GeneratorInput,
  deps: HandlerDeps,
  started: Date,
  entry: GenerationLog,
  finish: (response: Response, outcome: GenerationLog["outcome"]) => Response,
): Promise<Response> {
  const { config } = deps;

  // 3. Turnstile: single-use token, our hostname, our action.
  const turnstile = await verifyTurnstile({
    secret: config.turnstileSecret,
    token: input.turnstileToken,
    remoteIp: deps.clientIp,
    allowedHostnames: config.turnstileHostnames,
    expectedAction: TURNSTILE_ACTION,
    ...(deps.fetch ? { fetch: deps.fetch } : {}),
  });
  if (!turnstile.ok) {
    return turnstile.reason === "unavailable"
      ? finish(error(503, "turnstile_unavailable"), "turnstile_unavailable")
      : finish(error(403, "turnstile_failed"), "turnstile_failed");
  }

  // 4. Daily budget, per visitor and for the whole site.
  const day = utcDay(started);
  const decision = await deps.budget.consume({
    day,
    client: await clientKey(deps.clientIp, day),
    dailyLimit: config.dailyLimit,
    perClientLimit: config.perClientLimit,
  });
  if (!decision.allowed) {
    return finish(
      json(
        429,
        { error: "rate_limited", reason: decision.reason },
        { "retry-after": String(secondsUntilNextUtcDay(started)) },
      ),
      "rate_limited",
    );
  }

  const models = deps.createModels();

  // 5. Screening: is this a job or role, and is it trying to steer the model?
  const screening = await models.screen(input.jobText);
  entry.screening = screening.usage;
  if (screening.status === "refused" || screening.verdict.injection_suspected) {
    return finish(error(422, "input_rejected"), "input_rejected");
  }
  if (!screening.verdict.is_job_description) {
    return finish(error(422, "not_a_job_description"), "not_a_job_description");
  }

  // 6. Selection, then 7. validation against the verified catalog.
  const resume = deps.resumes[input.lang];
  const catalog = buildCatalog(resume, input.lang);
  const selection = await models.select(input, catalog);
  entry.selection = selection.usage;
  const validated = validateSelection(selection.output, catalog);
  const items = validated.sections.flatMap((section) => section.items);
  entry.selected_ids = items.map((item) => item.id);
  entry.rewrite_fallbacks = items.filter((item) => item.fallback).length;
  entry.validator_issues = validated.issues.length;
  if (items.length === 0) return finish(error(502, "empty_selection"), "empty_selection");

  // 8. The tailored resume, rendered with the same <CvDocument> as /cv.
  const tailored = tailorResume(resume, validated);
  let html: string | null = null;
  if (deps.render) {
    try {
      html = await deps.render(input.lang, tailored);
    } catch {
      return finish(error(500, "render_failed"), "render_failed");
    }
  }

  const success: SuccessBody = {
    lang: input.lang,
    resume: tailored.resume,
    sectionOrder: tailored.sectionOrder,
    rationale: validated.rationale,
    items: items.map((item) => ({ id: item.id, rewritten: item.rewritten })),
    summaryRewritten: validated.summary.rewritten,
    disclosure: cvGeneratorCopy[input.lang].disclosure,
    html,
    remainingToday: decision.clientRemaining,
  };
  return finish(json(200, success), "ok");
}
