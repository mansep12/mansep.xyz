/**
 * Daily budget: at most `dailyLimit` generations per UTC day for the whole
 * site and `perClientLimit` per visitor. The counters live in one Durable
 * Object (src/durable-objects/cv-budget.ts); this file is the logic, written
 * against a tiny synchronous store so it runs in tests without Workers.
 *
 * Visitors are counted by a hash of their IP and the day, computed in the
 * Worker: the Durable Object never sees an IP, the hash changes every day,
 * and all counters are deleted when the day ends.
 */

export interface CounterStore {
  get(key: string): unknown;
  put(key: string, value: string | number): void;
  deleteAll(): void;
}

export interface BudgetInput {
  /** UTC day, "YYYY-MM-DD". */
  day: string;
  /** Hashed visitor key from `clientKey`. */
  client: string;
  dailyLimit: number;
  perClientLimit: number;
}

export type BudgetDecision =
  | { allowed: true; clientRemaining: number; dailyRemaining: number }
  | { allowed: false; reason: "daily_limit" | "client_limit" };

const DAY_KEY = "day";
const TOTAL_KEY = "total";

function count(store: CounterStore, key: string): number {
  const value = store.get(key);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Counts one generation if both limits allow it. Every attempt that reaches
 * the model counts, successful or not: each one costs money.
 */
export function consumeBudget(store: CounterStore, input: BudgetInput): BudgetDecision {
  if (store.get(DAY_KEY) !== input.day) {
    store.deleteAll();
    store.put(DAY_KEY, input.day);
  }

  const total = count(store, TOTAL_KEY);
  if (total >= input.dailyLimit) return { allowed: false, reason: "daily_limit" };

  const clientKey = `client:${input.client}`;
  const used = count(store, clientKey);
  if (used >= input.perClientLimit) return { allowed: false, reason: "client_limit" };

  store.put(TOTAL_KEY, total + 1);
  store.put(clientKey, used + 1);
  return {
    allowed: true,
    clientRemaining: input.perClientLimit - used - 1,
    dailyRemaining: input.dailyLimit - total - 1,
  };
}

/** "YYYY-MM-DD" of an instant, in UTC. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Start of the next UTC day, in milliseconds since the epoch. */
export function nextUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

/** Whole seconds until the next UTC day (for Retry-After). */
export function secondsUntilNextUtcDay(date: Date): number {
  return Math.max(1, Math.ceil((nextUtcMidnight(date) - date.getTime()) / 1000));
}

/** SHA-256 of a text, hex. Also used to log the job text without logging it. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Daily visitor key: a truncated SHA-256 of the day and the IP. */
export async function clientKey(ip: string, day: string): Promise<string> {
  return (await sha256Hex(`cv-budget|${day}|${ip}`)).slice(0, 32);
}
