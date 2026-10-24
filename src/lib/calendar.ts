import { prisma } from "@/lib/db";

export type CalendarEventKind = "booking_event" | "project_due" | "availability" | "listing_deadline";

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  date: string; // YYYY-MM-DD
  title: string;
  subtitle?: string;
  status?: string;
  href?: string;
}

/** Unified calendar feed for a musician: confirmed bookings (event + project), their own availability windows. */
export async function getMusicianCalendarEvents(musicianId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
  const [bookings, availability] = await Promise.all([
    prisma.booking.findMany({
      where: {
        musicianId,
        status: { in: ["pending", "accepted", "completed"] },
        eventDate: { gte: from, lte: to },
      },
      include: { venue: { select: { venueName: true } } },
      orderBy: { eventDate: "asc" },
    }),
    prisma.availabilitySlot.findMany({
      where: { musicianId, startDate: { lte: to }, endDate: { gte: from } },
    }),
  ]);

  const events: CalendarEvent[] = [];

  for (const booking of bookings) {
    const isProject = booking.source === "project_application";
    events.push({
      id: booking.id,
      kind: isProject ? "project_due" : "booking_event",
      date: booking.eventDate.toISOString().slice(0, 10),
      title: booking.title,
      subtitle: isProject ? `Due · ${booking.venue.venueName}` : booking.venue.venueName,
      status: booking.status,
      href: "/musician/bookings",
    });
  }

  for (const slot of availability) {
    events.push({
      id: slot.id,
      kind: "availability",
      date: slot.startDate.toISOString().slice(0, 10),
      title: "Available",
      href: "/musician/profile",
    });
  }

  return events;
}

/** Unified calendar feed for a venue: their bookings (event + project), plus deadlines on project listings they've posted. */
export async function getVenueCalendarEvents(venueId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
  const [bookings, projectListings] = await Promise.all([
    prisma.booking.findMany({
      where: {
        venueId,
        status: { in: ["pending", "accepted", "completed"] },
        eventDate: { gte: from, lte: to },
      },
      include: { musician: { select: { stageName: true } } },
      orderBy: { eventDate: "asc" },
    }),
    prisma.projectListing.findMany({
      where: { venueId, deadline: { gte: from, lte: to }, status: { in: ["draft", "published"] } },
    }),
  ]);

  const events: CalendarEvent[] = [];

  for (const booking of bookings) {
    const isProject = booking.source === "project_application";
    events.push({
      id: booking.id,
      kind: isProject ? "project_due" : "booking_event",
      date: booking.eventDate.toISOString().slice(0, 10),
      title: booking.title,
      subtitle: isProject ? `Due · ${booking.musician.stageName}` : booking.musician.stageName,
      status: booking.status,
      href: "/venue/bookings",
    });
  }

  for (const listing of projectListings) {
    if (!listing.deadline) continue;
    events.push({
      id: listing.id,
      kind: "listing_deadline",
      date: listing.deadline.toISOString().slice(0, 10),
      title: listing.title,
      subtitle: "Application deadline",
      status: listing.status,
      href: "/venue/projects",
    });
  }

  return events;
}
