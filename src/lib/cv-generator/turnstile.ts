/**
 * Server-side Turnstile validation (Siteverify). A token is valid for 300
 * seconds and can be validated only once; Cloudflare enforces both and
 * answers `timeout-or-duplicate` otherwise. We also check that the token was
 * issued on one of our hostnames and, when present, for our action.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** The action the widget is rendered with; checked when Siteverify returns one. */
export const TURNSTILE_ACTION = "cv-generator";

export interface TurnstileOptions {
  secret: string;
  token: string;
  /** Visitor IP (CF-Connecting-IP), passed to Siteverify as an extra signal. */
  remoteIp?: string | undefined;
  allowedHostnames: readonly string[];
  expectedAction?: string;
  /** Lets a retry of the same validation reuse the result instead of failing as a duplicate. */
  idempotencyKey?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export type TurnstileResult =
  | { ok: true; hostname: string }
  | {
      ok: false;
      reason: "invalid_token" | "hostname_mismatch" | "action_mismatch" | "unavailable";
      errorCodes: string[];
    };

interface SiteverifyResponse {
  success?: unknown;
  hostname?: unknown;
  action?: unknown;
  "error-codes"?: unknown;
}

export async function verifyTurnstile(options: TurnstileOptions): Promise<TurnstileResult> {
  const doFetch = options.fetch ?? fetch;
  const body: Record<string, string> = { secret: options.secret, response: options.token };
  if (options.remoteIp) body.remoteip = options.remoteIp;
  if (options.idempotencyKey) body.idempotency_key = options.idempotencyKey;

  let data: SiteverifyResponse;
  try {
    const response = await doFetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
    });
    if (!response.ok) {
      return { ok: false, reason: "unavailable", errorCodes: [`http_${response.status}`] };
    }
    data = (await response.json()) as SiteverifyResponse;
  } catch {
    return { ok: false, reason: "unavailable", errorCodes: ["network"] };
  }

  const errorCodes = Array.isArray(data["error-codes"])
    ? data["error-codes"].filter((code): code is string => typeof code === "string")
    : [];

  if (data.success !== true) return { ok: false, reason: "invalid_token", errorCodes };

  const hostname = typeof data.hostname === "string" ? data.hostname.toLowerCase() : "";
  const allowed = options.allowedHostnames.map((name) => name.toLowerCase());
  if (!allowed.includes(hostname)) {
    return { ok: false, reason: "hostname_mismatch", errorCodes: [hostname || "missing"] };
  }

  const expectedAction = options.expectedAction ?? TURNSTILE_ACTION;
  if (typeof data.action === "string" && data.action !== expectedAction) {
    return { ok: false, reason: "action_mismatch", errorCodes: [data.action] };
  }
  return { ok: true, hostname };
}
