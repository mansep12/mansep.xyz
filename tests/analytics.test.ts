import { describe, expect, it } from "vitest";
import { ANALYTICS_TOKEN_ENV, beaconConfig, resolveAnalyticsToken } from "../src/lib/analytics";

const token = "0123456789abcdef0123456789abcdef";

describe("resolveAnalyticsToken", () => {
  it("is null when the variable is unset or blank", () => {
    expect(resolveAnalyticsToken({})).toBeNull();
    expect(resolveAnalyticsToken({ [ANALYTICS_TOKEN_ENV]: "  " })).toBeNull();
  });

  it("returns a well-formed token, trimmed", () => {
    expect(resolveAnalyticsToken({ [ANALYTICS_TOKEN_ENV]: ` ${token}\n` })).toBe(token);
  });

  it("fails on a malformed token instead of dropping analytics silently", () => {
    expect(() => resolveAnalyticsToken({ [ANALYTICS_TOKEN_ENV]: "abc" })).toThrow(
      ANALYTICS_TOKEN_ENV,
    );
    expect(() =>
      resolveAnalyticsToken({ [ANALYTICS_TOKEN_ENV]: `${token.slice(0, 31)}"` }),
    ).toThrow();
  });
});

describe("beaconConfig", () => {
  it("is the JSON the beacon expects", () => {
    expect(JSON.parse(beaconConfig(token))).toEqual({ token });
  });
});
