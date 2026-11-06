/** Pure helpers for the generator form script (src/scripts/cv-generator.ts). */

import type { CvGeneratorKey } from "../../i18n/cv-generator";

/** Message for a failed response, from its status and the endpoint's error code. */
export function errorMessageKey(
  status: number,
  body: { error?: unknown; reason?: unknown },
): CvGeneratorKey {
  switch (body.error) {
    case "job_text_too_short":
      return "error.tooShort";
    case "job_text_too_long":
    case "payload_too_large":
      return "error.tooLong";
    case "disabled":
      return "error.disabled";
    case "rate_limited":
      return body.reason === "daily_limit" ? "error.dailyLimit" : "error.clientLimit";
    case "turnstile_failed":
    case "turnstile_unavailable":
      return "error.turnstile";
    case "not_a_job_description":
      return "error.notJob";
    case "input_rejected":
      return "error.rejected";
    case "model_declined":
      return "error.declined";
    default:
      return status === 429 ? "error.clientLimit" : "error.generic";
  }
}

/** Message for the tries left today. */
export function remainingMessageKey(remaining: number): CvGeneratorKey {
  if (remaining <= 0) return "remainingNone";
  return remaining === 1 ? "remainingOne" : "remaining";
}
