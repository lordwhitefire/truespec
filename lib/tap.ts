import "server-only";
import { storeQueryOnceMain } from "./store-guard";
import type { TapInput } from "./tap-rules";

/**
 * The tap's write (truth 8). One row, three facts, and the store's own clock for the time.
 *
 * The statement names two columns and not `at`: the third fact is `timestamptz NOT NULL DEFAULT
 * now()`, so the time is the store's and no caller — not the visitor, not this code — can set it.
 * Nothing else is passed, and `readTap` has already reduced whatever arrived to those two values, so
 * a name, a number or a message has nowhere to go.
 *
 * The witness (`developer-workspace/scripts/task-004/tap-check.ts`) runs this same function and then
 * reads the row back and counts `tap`'s columns, so "three facts and nothing else" is checked against
 * the table and not against this comment.
 *
 * It goes through `storeQueryOnceMain`, not `storeQueryMain`: a tap is an event, not a state, so a retry after
 * a lost reply would count one tap twice. See that function's note.
 */
export const TAP_INSERT = `INSERT INTO tap (page, car_ref) VALUES ($1, $2)`;

export async function recordTap(input: TapInput): Promise<void> {
  await storeQueryOnceMain(TAP_INSERT, [input.page, input.carRef]);
}
