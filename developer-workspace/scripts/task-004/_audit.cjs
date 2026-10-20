/**
 * TASK-004 Task 32 — the store's own audit, as JSON on stdout.
 *
 * Answers, from the database (not from a belief about the code):
 *   * how many rows each subject table holds, and how many of the three marker-bearing
 *     tables (`car`, `draft`, `enquiry`) carry the demo marker;
 *   * exactly which rows the demonstration created (identified by the brands and filenames the
 *     flows use), and whether every one of them carries the marker;
 *   * whether any child row (cost line, photo, sale) hangs off a non-demo car — which is the
 *     one way the marker could be lying.
 *
 * Run: node --env-file=.env.local developer-workspace/scripts/task-004/_audit.cjs
 */
const { neon } = require("@neondatabase/serverless");

const q = neon(process.env.DATABASE_URL_UNPOOLED, { fetchOptions: { cache: "no-store" } });

(async () => {
  const counts = await q`
    select
      (select count(*) from car)            as cars,
      (select count(*) from cost_line)      as costs,
      (select count(*) from car_photo)      as photos,
      (select count(*) from sale)           as sales,
      (select count(*) from enquiry)        as enquiries,
      (select count(*) from enquiry_pdf)    as enquiry_pdfs,
      (select count(*) from tap)            as taps,
      (select count(*) from activity_event) as activity,
      (select count(*) from draft)          as drafts,
      (select count(*) from car_state)      as states,
      (select count(*) from setting)        as settings,
      (select count(*) from office_user)    as office_users,
      (select count(*) from session)        as sessions,
      (select count(*) from auth_attempt)   as auth_attempts
  `;

  // The three tables that carry the marker.
  const markerTables = await q`
    select 'car' as t, count(*)::int as total, (count(*) filter (where is_demo))::int as marked from car
    union all
    select 'draft', count(*)::int, (count(*) filter (where is_demo))::int from draft
    union all
    select 'enquiry', count(*)::int, (count(*) filter (where is_demo))::int from enquiry
  `;

  // The rows this demonstration created, by the markers the flows leave.
  const demoCars = await q`
    select ref, brand, model, is_demo from car
    where brand like 'TS-FLOW-%' or brand like 'TS-FIX-%'
    order by ref
  `;
  const demoDrafts = await q`
    select source_filename, kind, is_demo, count(*)::int as n
    from draft
    where source_filename like 'car-template-%' or source_filename like 'enquiries-%'
    group by source_filename, kind, is_demo
    order by source_filename
  `;

  // Child rows: none may hang off a non-demo car (that is the marker lying).
  const orphans = await q`
    select
      (select count(*) from car_photo p join car c on c.id = p.car_id where not c.is_demo)::int as non_demo_photos,
      (select count(*) from cost_line l join car c on c.id = l.car_id where not c.is_demo)::int as non_demo_costs,
      (select count(*) from sale s join car c on c.id = s.car_id where not c.is_demo)::int as non_demo_sales
  `;

  // Activity rows naming a demonstration car, and whether they carry a subject ref (they are the
  // rows the wipe matches by subject, since activity_event has no is_demo column).
  const flowRefs = demoCars.map((c) => c.ref);
  const activityForFlow = await q`
    select count(*)::int as n, count(distinct subject)::int as subjects
    from activity_event
    where subject = any(${flowRefs})
  `;

  const demoCarsUnmarked = demoCars.filter((c) => !c.is_demo).map((c) => c.ref);
  const demoDraftsUnmarked = demoDrafts.filter((d) => !d.is_demo).map((d) => `${d.source_filename} (${d.kind})`);

  const out = {
    ranAt: new Date().toISOString(),
    counts: counts[0],
    markerTables,
    demonstration: {
      cars: demoCars.length,
      drafts: demoDrafts.reduce((a, d) => a + d.n, 0),
      carRefs: flowRefs,
      draftsByFile: demoDrafts,
      activityRowsNamingADemoCar: activityForFlow[0].n,
      activitySubjects: activityForFlow[0].subjects,
    },
    markerCheck: {
      everyCarTheDemonstrationCreatedIsMarked: demoCarsUnmarked.length === 0,
      everyDraftTheDemonstrationCreatedIsMarked: demoDraftsUnmarked.length === 0,
      unmarkedCars: demoCarsUnmarked,
      unmarkedDrafts: demoDraftsUnmarked,
      markableTables: ["car", "draft", "enquiry"],
      note:
        "Only car, draft and enquiry carry is_demo. Cost lines, photos and sales have no column of " +
        "their own: they are removed by ON DELETE CASCADE when their demo car goes, so the audit " +
        "checks no such row hangs off a non-demo car.",
    },
    childRowsOffNonDemoCars: orphans[0],
  };

  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
