/**
 * Which commit a build came from, shown in the footer as a short hash that
 * links to the commit on GitHub.
 *
 * The commit is resolved once, in Node, when astro.config.ts loads (pages are
 * prerendered in workerd, where neither the build environment nor git is
 * available) and injected into the bundle as the __BUILD_COMMIT__ constant.
 */

import { site } from "../data/site";

/** Set by Cloudflare Workers Builds to the commit being built. */
export const COMMIT_SHA_ENV = "WORKERS_CI_COMMIT_SHA";

export const DEV_COMMIT = "dev";

const SHA = /^[0-9a-f]{7,40}$/i;

export interface CommitSources {
  readonly env: Readonly<Record<string, string | undefined>>;
  /** Output of `git rev-parse HEAD`; may throw when git or the repo is missing. */
  readonly gitHead: () => string;
}

/** Workers Builds commit, else the local git HEAD, else "dev". */
export function resolveBuildCommit({ env, gitHead }: CommitSources): string {
  const fromEnv = env[COMMIT_SHA_ENV]?.trim();
  if (fromEnv && SHA.test(fromEnv)) {
    return fromEnv.toLowerCase();
  }
  try {
    const head = gitHead().trim();
    if (SHA.test(head)) {
      return head.toLowerCase();
    }
  } catch {
    // No git (e.g. a source tarball): fall through.
  }
  return DEV_COMMIT;
}

export interface BuildInfo {
  /** Full SHA, or "dev". */
  readonly commit: string;
  /** First 7 characters of the SHA, or "dev". */
  readonly shortCommit: string;
  /** Commit page on GitHub, or null for "dev". */
  readonly commitUrl: string | null;
}

export function describeBuild(commit: string, repoUrl: string = site.links.repo): BuildInfo {
  if (!SHA.test(commit)) {
    return { commit: DEV_COMMIT, shortCommit: DEV_COMMIT, commitUrl: null };
  }
  return { commit, shortCommit: commit.slice(0, 7), commitUrl: `${repoUrl}/commit/${commit}` };
}

/** Build info of the running bundle. */
export function getBuildInfo(): BuildInfo {
  return describeBuild(typeof __BUILD_COMMIT__ === "string" ? __BUILD_COMMIT__ : DEV_COMMIT);
}
