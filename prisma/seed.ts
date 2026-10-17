import { PrismaClient } from "@prisma/client";
import { GENRES, EQUIPMENT_ITEMS, CREATIVE_CATEGORIES } from "../src/config";

const prisma = new PrismaClient();

async function main() {
  for (const genre of GENRES) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { name: genre.name },
      create: { slug: genre.slug, name: genre.name },
    });
  }
  console.log(`Seeded ${GENRES.length} genres.`);

  for (const item of EQUIPMENT_ITEMS) {
    await prisma.equipmentItem.upsert({
      where: { slug: item.slug },
      update: { name: item.name, category: item.category },
      create: { slug: item.slug, name: item.name, category: item.category },
    });
  }
  console.log(`Seeded ${EQUIPMENT_ITEMS.length} equipment items.`);

  for (const category of CREATIVE_CATEGORIES) {
    await prisma.creativeCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, icon: category.icon },
      create: { slug: category.slug, name: category.name, icon: category.icon },
    });
  }
  console.log(`Seeded ${CREATIVE_CATEGORIES.length} creative categories.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
