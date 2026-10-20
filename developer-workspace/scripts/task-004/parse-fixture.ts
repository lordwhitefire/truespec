/** Decisive test: read the witness's own template fixture through the real upload reader. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readCarFile } from "../../../lib/draft-read";

const p = join(
  process.cwd(),
  "developer-workspace/scripts/task-004/runs/flows/fixtures/car-template-filled.pdf",
);

async function main() {
  const bytes = new Uint8Array(readFileSync(p));
  const res = await readCarFile(bytes);
  console.log(JSON.stringify(res, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
