import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const [
      cars,
      costs,
      photos,
      enquiries,
      taps,
      activity,
      drafts,
      settings,
    ] = await Promise.all([
      prisma.car.count().catch(() => 0),
      prisma.cost.count().catch(() => 0),
      prisma.photo.count().catch(() => 0),
      prisma.enquiry.count().catch(() => 0),
      prisma.tap.count().catch(() => 0),
      prisma.activityLog.count().catch(() => 0),
      prisma.draft.count().catch(() => 0),
      prisma.setting.count().catch(() => 0),
    ]);
    console.log(
      JSON.stringify({
        cars,
        costs,
        photos,
        enquiries,
        taps,
        activity,
        settings,
        drafts,
      })
    );
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
