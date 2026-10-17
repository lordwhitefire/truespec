// TASK-005's harness entry point.
//
// The attach-only implementation is shared, not duplicated: it was written for TASK-004 and it is the
// project's one harness for the standing method (`developer-workspace/procedures/browser-check.md`).
// Re-exported here so this task's scripts import from their own folder — as the procedure says —
// while there is still exactly one implementation of `attach`/`assertOurs`/`guardCount`/`detach`.
export * from "../task-004/_lib.mjs";
