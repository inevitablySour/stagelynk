import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DiscographyManager } from "@/components/dashboard/discography-manager";

export default async function DiscographyManagerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/musician");

  const albums = await prisma.album.findMany({
    where: { musicianId: musician.id },
    include: { tracks: { orderBy: { trackNumber: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-stone-900">Discography Manager</h1>
          <p className="mt-1 text-stone-500">Connect Spotify or Apple Music, or manually add your own tracks.</p>

          <DiscographyManager
            albums={albums.map((a) => ({
              id: a.id,
              title: a.title,
              source: a.source,
              tracks: a.tracks.map((t) => ({ id: t.id, title: t.title })),
            }))}
          />
        </div>
      </main>
    </div>
  );
}
