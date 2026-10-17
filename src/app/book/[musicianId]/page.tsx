import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTechnicalGaps } from "@/lib/technical-gap";
import { BookingRequestForm } from "@/components/artists/booking-request-form";
import { TechnicalGapAlert } from "@/components/equipment/technical-gap-alert";

export default async function BookArtistPage({ params }: { params: Promise<{ musicianId: string }> }) {
  const { musicianId } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "venue") redirect("/musician");

  const musician = await prisma.musicianProfile.findUnique({
    where: { id: musicianId, user: { deletedAt: null } },
    select: { id: true, userId: true, stageName: true, location: true, profileImage: true, primaryCategory: true },
  });
  if (!musician) notFound();
  if (musician.userId === session.user.id) redirect(`/artists/${musician.id}`);

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  const gaps = venue ? await getTechnicalGaps(musician.id, venue.id) : [];

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-page">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-stone-900">Request a booking</h1>
          <p className="mt-1 text-stone-500">
            You&apos;re booking <span className="font-medium text-stone-700">{musician.stageName}</span>.
            A hold will be placed on your card now, but you are only charged if they accept — the artist has 48 hours to accept, decline, or counter-offer.
          </p>

          <div className="mt-6">
            <TechnicalGapAlert gaps={gaps} />
          </div>

          <div className="mt-8">
            <BookingRequestForm musicianId={musician.id} stageName={musician.stageName} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
