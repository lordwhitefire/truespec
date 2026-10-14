// The two recipe copies under openspec/tasks/TASK-003/ are the record of what the
// store was reproduced from; they are regenerated whenever the uploaders run, so a
// rebuild never leaves them pointing at assets that no longer exist.
import { readFileSync, writeFileSync } from "node:fs";

for (const f of ["demo-photo-manifest.json", "demo-enquiry-import.json"]) {
  let s = readFileSync(`scripts/${f}`, "utf8");
  if (!s.endsWith("\n")) s += "\n"; // the archived copies end with a newline
  writeFileSync(`openspec/tasks/TASK-003/${f}`, s);
  const same = readFileSync(`scripts/${f}`, "utf8").trimEnd() === s.trimEnd();
  console.log(`archived openspec/tasks/TASK-003/${f} (${s.length} bytes) — content identical: ${same}`);
}
