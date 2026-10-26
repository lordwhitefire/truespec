/**
 * Retired legacy command — fails closed.
 *
 * The old tool deleted rows where `is_demo` was true. That flag is a legacy marker on main's
 * generated sample rows; those rows are **main data now**. It is not the demo boundary, so a tool
 * that deletes by the flag could delete the showroom. This file opens no database, reads no
 * environment and deletes nothing.
 *
 * The demo deletion path is the daily reset (`app/api/demo/reset/route.ts`); main data is deleted
 * by the owner through the office. There is no replacement CLI that deletes by `is_demo`.
 */
console.error("This command is retired. The demo reset is the only demo deletion path.");
process.exit(1);
