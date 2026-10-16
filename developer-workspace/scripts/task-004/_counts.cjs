const { neon } = require('@neondatabase/serverless');

function getUrl() {
  if (process.env.DATABASE_URL_UNPOOLED) return process.env.DATABASE_URL_UNPOOLED;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error('no database url');
}

async function main() {
  try {
    const sql = neon(getUrl(), { fetchOptions: { cache: 'no-store' } });
    const [cars, costLines, carPhotos, enquiries, taps, activityEvents, drafts, settings] = await Promise.all([
      sql`SELECT COUNT(*)::int AS c FROM car`,
      sql`SELECT COUNT(*)::int AS c FROM cost_line`,
      sql`SELECT COUNT(*)::int AS c FROM car_photo`,
      sql`SELECT COUNT(*)::int AS c FROM enquiry`,
      sql`SELECT COUNT(*)::int AS c FROM tap`,
      sql`SELECT COUNT(*)::int AS c FROM activity_event`,
      sql`SELECT COUNT(*)::int AS c FROM draft`,
      sql`SELECT COUNT(*)::int AS c FROM setting`,
    ]);
    console.log(JSON.stringify({
      cars: cars[0]?.c ?? 0,
      costs: costLines[0]?.c ?? 0,
      photos: carPhotos[0]?.c ?? 0,
      enquiries: enquiries[0]?.c ?? 0,
      taps: taps[0]?.c ?? 0,
      activity: activityEvents[0]?.c ?? 0,
      drafts: drafts[0]?.c ?? 0,
      settings: settings[0]?.c ?? 0,
    }));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
main();
