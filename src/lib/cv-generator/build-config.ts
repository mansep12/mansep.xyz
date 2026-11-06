/**
 * Whether the /cv pages ship the generator form, decided once at build time
 * in Node (astro.config.ts), like the build commit. With the flag off or no
 * Turnstile site key, the pages render nothing for it and load no script.
 * The Worker checks its own runtime flag on every request (env.ts).
 */

export interface GeneratorBuildConfig {
  enabled: boolean;
  /** Public Turnstile site key; empty when disabled. */
  siteKey: string;
}

export function resolveGeneratorBuildConfig(
  env: Readonly<Record<string, string | undefined>>,
): GeneratorBuildConfig {
  const flag = env.CV_GENERATOR_ENABLED?.trim().toLowerCase() === "true";
  const siteKey = env.PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const valid = /^[\w-]{10,100}$/.test(siteKey);
  return flag && valid ? { enabled: true, siteKey } : { enabled: false, siteKey: "" };
}

/** Settings of the running bundle; disabled when the constant is missing (e.g. in unit tests). */
export function getGeneratorBuildConfig(): GeneratorBuildConfig {
  return typeof __CV_GENERATOR__ === "object" && __CV_GENERATOR__ !== null
    ? __CV_GENERATOR__
    : { enabled: false, siteKey: "" };
}
