import { describe, expect, it } from "vitest";
import {
  COMMIT_SHA_ENV,
  describeBuild,
  getBuildInfo,
  resolveBuildCommit,
} from "../src/lib/build-info";
import { decodeEmail, emailLinkScript, encodeEmail, spellOutEmail } from "../src/lib/email";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const OTHER = "fedcba9876543210fedcba9876543210fedcba98";
const noGit = () => {
  throw new Error("not a git repository");
};

describe("resolveBuildCommit", () => {
  it("prefers the Workers Builds variable", () => {
    expect(resolveBuildCommit({ env: { [COMMIT_SHA_ENV]: SHA }, gitHead: () => OTHER })).toBe(SHA);
  });

  it("falls back to git HEAD", () => {
    expect(resolveBuildCommit({ env: {}, gitHead: () => `${OTHER}\n` })).toBe(OTHER);
    expect(resolveBuildCommit({ env: { [COMMIT_SHA_ENV]: "" }, gitHead: () => OTHER })).toBe(OTHER);
  });

  it("falls back to dev without a usable value", () => {
    expect(resolveBuildCommit({ env: {}, gitHead: noGit })).toBe("dev");
    expect(resolveBuildCommit({ env: { [COMMIT_SHA_ENV]: "main" }, gitHead: () => "" })).toBe(
      "dev",
    );
  });
});

describe("describeBuild", () => {
  it("shortens the hash and links to the commit", () => {
    expect(describeBuild(SHA, "https://github.com/o/r")).toEqual({
      commit: SHA,
      shortCommit: "0123456",
      commitUrl: `https://github.com/o/r/commit/${SHA}`,
    });
  });

  it("has no link for dev builds", () => {
    expect(describeBuild("dev")).toEqual({ commit: "dev", shortCommit: "dev", commitUrl: null });
  });

  it("reports dev when no commit was injected", () => {
    expect(getBuildInfo().commit).toBe("dev");
  });
});

describe("email obfuscation", () => {
  const email = "someone.name@example.com";

  it("round-trips and hides the address", () => {
    const encoded = encodeEmail(email);
    expect(encoded).not.toContain("@");
    expect(encoded).not.toContain("example");
    expect(decodeEmail(encoded)).toBe(email);
  });

  it("spells out the fallback", () => {
    expect(spellOutEmail(email)).toBe("someone.name [at] example.com");
  });

  it("replaces the placeholder with a mailto link from the inline script", () => {
    const link: Record<string, string> = {};
    let children: unknown[] = [];
    const placeholder = {
      dataset: { email: encodeEmail(email) },
      replaceChildren: (...nodes: unknown[]) => {
        children = nodes;
      },
    };
    const document = {
      currentScript: { previousElementSibling: placeholder },
      createElement: () => link,
    };
    new Function("document", "atob", emailLinkScript)(document, atob);
    expect(children).toEqual([link]);
    expect(link).toEqual({ href: `mailto:${email}`, textContent: email });
  });
});
