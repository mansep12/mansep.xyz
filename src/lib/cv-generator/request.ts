/**
 * Input caps for POST /api/cv: body size, JSON shape, job text length, focus
 * chips from a fixed list and a plausible Turnstile token. Everything that
 * fails here is rejected before Turnstile, the budget or any model call.
 */

import { isLang, type Lang } from "../../i18n/locales";
import { type FocusArea, isFocusArea, LIMITS } from "./config";

export interface GeneratorInput {
  lang: Lang;
  jobText: string;
  focus: FocusArea[];
  turnstileToken: string;
}

export type InputError =
  | "invalid_json"
  | "invalid_request"
  | "job_text_too_short"
  | "job_text_too_long";

export type ParsedInput = { ok: true; input: GeneratorInput } | { ok: false; error: InputError };

const ALLOWED_KEYS = new Set(["lang", "jobText", "focus", "turnstileToken"]);

/**
 * Normalizes pasted text: NFC, line breaks as "\n", no control or format
 * characters (keeps tabs and line breaks), at most one blank line in a row.
 */
export function normalizeJobText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\r\n?/gu, "\n")
    .replace(/[^\P{Cc}\n\t]|\p{Cf}/gu, "")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

/** Length in code points, so an emoji counts as one character, as in the form's counter. */
export function charCount(text: string): number {
  return [...text].length;
}

export function parseGeneratorInput(body: unknown): ParsedInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "invalid_request" };
  }
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => !ALLOWED_KEYS.has(key))) {
    return { ok: false, error: "invalid_request" };
  }

  const { lang, jobText, focus = [], turnstileToken } = record;
  if (!isLang(lang) || typeof jobText !== "string" || typeof turnstileToken !== "string") {
    return { ok: false, error: "invalid_request" };
  }
  if (turnstileToken.length === 0 || turnstileToken.length > LIMITS.turnstileTokenMaxChars) {
    return { ok: false, error: "invalid_request" };
  }
  if (
    !Array.isArray(focus) ||
    focus.length > 4 ||
    !focus.every(isFocusArea) ||
    new Set(focus).size !== focus.length
  ) {
    return { ok: false, error: "invalid_request" };
  }

  const text = normalizeJobText(jobText);
  const length = charCount(text);
  if (length < LIMITS.jobTextMinChars) return { ok: false, error: "job_text_too_short" };
  if (length > LIMITS.jobTextMaxChars) return { ok: false, error: "job_text_too_long" };

  return { ok: true, input: { lang, jobText: text, focus, turnstileToken } };
}

export class BodyTooLargeError extends Error {
  constructor() {
    super("Request body too large");
    this.name = "BodyTooLargeError";
  }
}

/** Reads a request body as text, stopping as soon as it exceeds `maxBytes`. */
export async function readLimitedText(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError();
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
