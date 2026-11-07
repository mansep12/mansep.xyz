/**
 * Runtime configuration of the generator, read from the Worker environment.
 *
 * - CV_GENERATOR_ENABLED: "true" to enable; anything else disables it. Set in
 *   the dashboard (wrangler.jsonc has `keep_vars`), so it is a kill switch
 *   that takes effect without a deploy.
 * - CV_DAILY_LIMIT (default 15) and CV_PER_IP_DAILY_LIMIT (default 3).
 * - TURNSTILE_HOSTNAMES: comma-separated hostnames a Turnstile token may come
 *   from (default "mansep.xyz").
 * - ANTHROPIC_BASE_URL: optional, e.g. a Cloudflare AI Gateway endpoint.
 * - Secrets: ANTHROPIC_API_KEY and TURNSTILE_SECRET_KEY. Without either, the
 *   generator stays disabled whatever the flag says.
 */

export const DEFAULT_DAILY_LIMIT = 15;
export const DEFAULT_PER_IP_DAILY_LIMIT = 3;
export const DEFAULT_TURNSTILE_HOSTNAMES = ["mansep.xyz"];

export const REQUIRED_SECRETS = ["ANTHROPIC_API_KEY", "TURNSTILE_SECRET_KEY"] as const;

export interface GeneratorConfig {
  /** Flag on and every secret present. */
  enabled: boolean;
  flag: boolean;
  missingSecrets: string[];
  anthropicApiKey: string;
  anthropicBaseUrl: string | undefined;
  turnstileSecret: string;
  turnstileHostnames: string[];
  dailyLimit: number;
  perClientLimit: number;
}

function stringVar(env: Readonly<Record<string, unknown>>, name: string): string {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
}

function limitVar(env: Readonly<Record<string, unknown>>, name: string, fallback: number): number {
  const raw = stringVar(env, name);
  if (!/^\d{1,6}$/.test(raw)) return fallback;
  return Number(raw);
}

export function readGeneratorConfig(env: Readonly<Record<string, unknown>>): GeneratorConfig {
  const flag = stringVar(env, "CV_GENERATOR_ENABLED").toLowerCase() === "true";
  const missingSecrets = REQUIRED_SECRETS.filter((name) => stringVar(env, name) === "");
  const hostnames = stringVar(env, "TURNSTILE_HOSTNAMES")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return {
    enabled: flag && missingSecrets.length === 0,
    flag,
    missingSecrets,
    anthropicApiKey: stringVar(env, "ANTHROPIC_API_KEY"),
    anthropicBaseUrl: stringVar(env, "ANTHROPIC_BASE_URL") || undefined,
    turnstileSecret: stringVar(env, "TURNSTILE_SECRET_KEY"),
    turnstileHostnames: hostnames.length > 0 ? hostnames : [...DEFAULT_TURNSTILE_HOSTNAMES],
    dailyLimit: limitVar(env, "CV_DAILY_LIMIT", DEFAULT_DAILY_LIMIT),
    perClientLimit: limitVar(env, "CV_PER_IP_DAILY_LIMIT", DEFAULT_PER_IP_DAILY_LIMIT),
  };
}
