/** Commit SHA of this build, or "dev". Injected by astro.config.ts through `vite.define`. */
declare const __BUILD_COMMIT__: string;

/** Cloudflare Web Analytics site token, or null. Injected by astro.config.ts through `vite.define`. */
declare const __CF_WEB_ANALYTICS_TOKEN__: string | null;

/** CV generator form settings from the build environment. Injected by astro.config.ts through `vite.define`. */
declare const __CV_GENERATOR__: { enabled: boolean; siteKey: string };
