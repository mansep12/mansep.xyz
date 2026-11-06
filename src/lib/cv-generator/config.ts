/**
 * Fixed settings of the CV generator: models, focus areas and size limits.
 * Pure data, shared by the Worker endpoint, the validator and the UI.
 */

/** Models verified on 2026-11-06 against platform.claude.com/docs (models overview). */
export const MODELS = {
  /** Cheap classifier that checks the pasted text before the selection call. */
  screening: "claude-haiku-5-5",
  /** Picks and lightly rephrases highlights. */
  selection: "claude-sonnet-5-5",
} as const;

/** Focus chips a visitor can pick. Stable values, sent by the form. */
export const FOCUS_AREAS = ["backend", "security", "fullstack", "research"] as const;

export type FocusArea = (typeof FOCUS_AREAS)[number];

export function isFocusArea(value: unknown): value is FocusArea {
  return typeof value === "string" && (FOCUS_AREAS as readonly string[]).includes(value);
}

/** How each focus area is described to the model (prompts are in English). */
export const FOCUS_PROMPT_LABELS: Record<FocusArea, string> = {
  backend: "backend engineering (APIs, services, data)",
  security: "security and applied cryptography",
  fullstack: "full-stack web development",
  research: "research (cryptography, verifiable e-voting, academic work)",
};

/** Pseudo id the summary may cite to reuse facts from the profile summary. */
export const PROFILE_SUMMARY_ID = "basics.summary";

export const LIMITS = {
  /** Largest request body the endpoint reads, in bytes. */
  requestMaxBytes: 16_384,
  /** Job description or role, in characters after trimming. */
  jobTextMaxChars: 6000,
  jobTextMinChars: 30,
  /** Turnstile tokens are at most 2048 characters. */
  turnstileTokenMaxChars: 2048,
  /** A rewritten highlight. */
  rewriteMaxChars: 380,
  /** Below this a rewrite is not useful; the original is used instead. */
  rewriteMinChars: 25,
  summaryMaxChars: 480,
  summaryMinChars: 40,
  reasonMaxChars: 220,
  maxItemsPerSection: 6,
  maxItemsTotal: 10,
} as const;
