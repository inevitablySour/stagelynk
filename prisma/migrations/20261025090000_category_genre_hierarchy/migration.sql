-- DropForeignKey
ALTER TABLE "MusicianGenre" DROP CONSTRAINT "MusicianGenre_genreId_fkey";

-- DropForeignKey
ALTER TABLE "MusicianGenre" DROP CONSTRAINT "MusicianGenre_musicianId_fkey";

-- DropForeignKey
ALTER TABLE "TalentCategory" DROP CONSTRAINT "TalentCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "TalentCategory" DROP CONSTRAINT "TalentCategory_musicianId_fkey";

-- DropIndex
DROP INDEX "MusicianProfile_primaryCategory_idx";

-- AlterTable
ALTER TABLE "MusicianProfile" DROP COLUMN "primaryCategory",
DROP COLUMN "subgenres",
ADD COLUMN     "mainGenreGroupId" TEXT;

-- DropTable
DROP TABLE "CreativeCategory";

-- DropTable
DROP TABLE "Genre";

-- DropTable
DROP TABLE "MusicianGenre";

-- DropTable
DROP TABLE "TalentCategory";

-- CreateTable
CREATE TABLE "CategoryGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "CategoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorySubtype" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "CategorySubtype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentType" (
    "id" TEXT NOT NULL,
    "subtypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "InstrumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicianCategoryPick" (
    "id" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    "subtypeId" TEXT NOT NULL,
    "instrumentTypeId" TEXT,

    CONSTRAINT "MusicianCategoryPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenreGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "GenreGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenreSubtype" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isOther" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GenreSubtype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicianGenreSubtypePick" (
    "id" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    "subtypeId" TEXT NOT NULL,
    "customLabel" TEXT,

    CONSTRAINT "MusicianGenreSubtypePick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryGroup_name_key" ON "CategoryGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryGroup_slug_key" ON "CategoryGroup"("slug");

-- CreateIndex
CREATE INDEX "CategoryGroup_slug_idx" ON "CategoryGroup"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CategorySubtype_slug_key" ON "CategorySubtype"("slug");

-- CreateIndex
CREATE INDEX "CategorySubtype_groupId_idx" ON "CategorySubtype"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentType_slug_key" ON "InstrumentType"("slug");

-- CreateIndex
CREATE INDEX "InstrumentType_subtypeId_idx" ON "InstrumentType"("subtypeId");

-- CreateIndex
CREATE INDEX "MusicianCategoryPick_subtypeId_idx" ON "MusicianCategoryPick"("subtypeId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicianCategoryPick_musicianId_subtypeId_instrumentTypeId_key" ON "MusicianCategoryPick"("musicianId", "subtypeId", "instrumentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "GenreGroup_name_key" ON "GenreGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GenreGroup_slug_key" ON "GenreGroup"("slug");

-- CreateIndex
CREATE INDEX "GenreGroup_slug_idx" ON "GenreGroup"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GenreSubtype_slug_key" ON "GenreSubtype"("slug");

-- CreateIndex
CREATE INDEX "GenreSubtype_groupId_idx" ON "GenreSubtype"("groupId");

-- CreateIndex
CREATE INDEX "MusicianGenreSubtypePick_subtypeId_idx" ON "MusicianGenreSubtypePick"("subtypeId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicianGenreSubtypePick_musicianId_subtypeId_key" ON "MusicianGenreSubtypePick"("musicianId", "subtypeId");

-- CreateIndex
CREATE INDEX "MusicianProfile_mainGenreGroupId_idx" ON "MusicianProfile"("mainGenreGroupId");

-- AddForeignKey
ALTER TABLE "MusicianProfile" ADD CONSTRAINT "MusicianProfile_mainGenreGroupId_fkey" FOREIGN KEY ("mainGenreGroupId") REFERENCES "GenreGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySubtype" ADD CONSTRAINT "CategorySubtype_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CategoryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentType" ADD CONSTRAINT "InstrumentType_subtypeId_fkey" FOREIGN KEY ("subtypeId") REFERENCES "CategorySubtype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicianCategoryPick" ADD CONSTRAINT "MusicianCategoryPick_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicianCategoryPick" ADD CONSTRAINT "MusicianCategoryPick_subtypeId_fkey" FOREIGN KEY ("subtypeId") REFERENCES "CategorySubtype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicianCategoryPick" ADD CONSTRAINT "MusicianCategoryPick_instrumentTypeId_fkey" FOREIGN KEY ("instrumentTypeId") REFERENCES "InstrumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenreSubtype" ADD CONSTRAINT "GenreSubtype_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GenreGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicianGenreSubtypePick" ADD CONSTRAINT "MusicianGenreSubtypePick_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicianGenreSubtypePick" ADD CONSTRAINT "MusicianGenreSubtypePick_subtypeId_fkey" FOREIGN KEY ("subtypeId") REFERENCES "GenreSubtype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

