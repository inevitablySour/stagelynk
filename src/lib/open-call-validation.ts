import type { JobListing } from "@prisma/client";
import { eventInstants } from "@/lib/open-call-utils";

export function validateCallForPublishing(listing: Pick<JobListing, "eventDate" | "startTime" | "endTime" | "timeZone" | "venueAddress" | "location" | "stageSpecs" | "budgetMin" | "budgetMax" | "applicationDeadline" | "genres">, now = new Date()) {
  if (!listing.eventDate || !listing.startTime || !listing.endTime) throw new Error("Set the event date, start time and end time before publishing.");
  if (!listing.location.trim() || !listing.venueAddress.trim()) throw new Error("Set the event location and address before publishing.");
  if (!listing.stageSpecs.trim()) throw new Error("Describe the stage setup and technical specifications before publishing.");
  if (!Array.isArray(listing.genres) || listing.genres.length === 0) throw new Error("Choose at least one target genre before publishing.");
  if (listing.budgetMin <= 0 || listing.budgetMax < listing.budgetMin) throw new Error("Set a positive payout range in ascending order.");
  const instants = eventInstants(listing.eventDate.toISOString().slice(0, 10), listing.startTime, listing.endTime, listing.timeZone);
  if (instants.eventStartsAt <= now) throw new Error("The event must be in the future.");
  if (listing.applicationDeadline && (listing.applicationDeadline <= now || listing.applicationDeadline > instants.eventStartsAt)) throw new Error("The application deadline must be in the future and before the event.");
  return instants;
}
