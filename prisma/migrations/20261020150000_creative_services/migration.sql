-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicianService" (
    "id" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "portfolioAlbumId" TEXT,

    CONSTRAINT "MusicianService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Service_name_key" ON "Service"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_slug_idx" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "MusicianService_serviceId_idx" ON "MusicianService"("serviceId");

-- CreateIndex
CREATE INDEX "MusicianService_portfolioAlbumId_idx" ON "MusicianService"("portfolioAlbumId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicianService_musicianId_serviceId_key" ON "MusicianService"("musicianId", "serviceId");

-- AddForeignKey
ALTER TABLE "MusicianService" ADD CONSTRAINT "MusicianService_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicianService" ADD CONSTRAINT "MusicianService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicianService" ADD CONSTRAINT "MusicianService_portfolioAlbumId_fkey" FOREIGN KEY ("portfolioAlbumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

