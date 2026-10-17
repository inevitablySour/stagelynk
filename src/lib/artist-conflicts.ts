import type { Prisma, PrismaClient } from "@prisma/client";

export async function hasArtistConflict(db: Prisma.TransactionClient | PrismaClient, musicianId: string, start: Date, end: Date, excludeBookingId?: string) {
  const bookings = await db.booking.findMany({
    where: {
      musicianId,
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      OR: [{ status: { in: ["accepted", "completed"] } }, { status: "pending", source: "job_application", paymentStatus: { in: ["pending", "authorized"] } }],
    },
    include: { jobApplication: { include: { jobListing: true } } },
  });
  return bookings.some((booking) => {
    const listing = booking.jobApplication?.jobListing;
    const bookedStart = listing?.eventStartsAt ?? new Date(`${booking.eventDate.toISOString().slice(0, 10)}T${booking.startTime}:00Z`);
    let bookedEnd = listing?.eventEndsAt ?? new Date(`${booking.eventDate.toISOString().slice(0, 10)}T${booking.endTime}:00Z`);
    if (bookedEnd <= bookedStart) bookedEnd = new Date(bookedEnd.getTime() + 86400000);
    return bookedStart < end && bookedEnd > start;
  });
}
