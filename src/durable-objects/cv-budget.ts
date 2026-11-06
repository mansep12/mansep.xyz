/**
 * One Durable Object instance ("global") holds the CV generator's daily
 * counters in its SQLite-backed storage (available on the Workers Free plan).
 * A single instance serializes every request, so the counts cannot race.
 * An alarm deletes everything when the UTC day ends.
 */

import { DurableObject } from "cloudflare:workers";
import {
  type BudgetDecision,
  type BudgetInput,
  type CounterStore,
  consumeBudget,
  nextUtcMidnight,
} from "../lib/cv-generator/budget";

export const CV_BUDGET_INSTANCE = "global";

export class CvBudget extends DurableObject {
  /** Counts one generation if the limits allow it. Called over RPC from the Worker. */
  async consume(input: BudgetInput): Promise<BudgetDecision> {
    const kv = this.ctx.storage.kv;
    const store: CounterStore = {
      get: (key) => kv.get(key),
      put: (key, value) => kv.put(key, value),
      deleteAll: () => {
        for (const [key] of kv.list()) kv.delete(key);
      },
    };
    const decision = this.ctx.storage.transactionSync(() => consumeBudget(store, input));
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(nextUtcMidnight(new Date()));
    }
    return decision;
  }

  /** End of the UTC day: forget every counter and visitor hash. */
  override async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
