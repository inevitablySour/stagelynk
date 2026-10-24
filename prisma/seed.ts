import { PrismaClient } from "@prisma/client";
import { EQUIPMENT_ITEMS, CATEGORY_GROUPS, GENRE_GROUPS } from "../src/config";

const prisma = new PrismaClient();

async function main() {
  for (const item of EQUIPMENT_ITEMS) {
    await prisma.equipmentItem.upsert({
      where: { slug: item.slug },
      update: { name: item.name, category: item.category },
      create: { slug: item.slug, name: item.name, category: item.category },
    });
  }
  console.log(`Seeded ${EQUIPMENT_ITEMS.length} equipment items.`);

  let subcatCount = 0;
  let instrumentCount = 0;
  for (const group of CATEGORY_GROUPS) {
    const groupRow = await prisma.categoryGroup.upsert({
      where: { slug: group.slug },
      update: { name: group.name },
      create: { slug: group.slug, name: group.name },
    });
    for (const subtype of group.subcategories) {
      const subtypeRow = await prisma.categorySubtype.upsert({
        where: { slug: subtype.slug },
        update: { name: subtype.name, groupId: groupRow.id },
        create: { slug: subtype.slug, name: subtype.name, groupId: groupRow.id },
      });
      subcatCount += 1;
      for (const instrument of subtype.instrumentTypes ?? []) {
        await prisma.instrumentType.upsert({
          where: { slug: instrument.slug },
          update: { name: instrument.name, subtypeId: subtypeRow.id },
          create: { slug: instrument.slug, name: instrument.name, subtypeId: subtypeRow.id },
        });
        instrumentCount += 1;
      }
    }
  }
  console.log(`Seeded ${CATEGORY_GROUPS.length} category groups, ${subcatCount} subcategories, ${instrumentCount} instrument types.`);

  let subgenreCount = 0;
  for (const group of GENRE_GROUPS) {
    const groupRow = await prisma.genreGroup.upsert({
      where: { slug: group.slug },
      update: { name: group.name },
      create: { slug: group.slug, name: group.name },
    });
    for (const subtype of group.subgenres) {
      await prisma.genreSubtype.upsert({
        where: { slug: subtype.slug },
        update: { name: subtype.name, groupId: groupRow.id, isOther: subtype.isOther ?? false },
        create: { slug: subtype.slug, name: subtype.name, groupId: groupRow.id, isOther: subtype.isOther ?? false },
      });
      subgenreCount += 1;
    }
  }
  console.log(`Seeded ${GENRE_GROUPS.length} genre groups, ${subgenreCount} subgenres.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
