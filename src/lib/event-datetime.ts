/**
 * Combines a Booking's `eventDate` (date-only, time irrelevant) with its
 * `endTime` string ("HH:mm") into a real Date. Used to compute "N hours
 * after the gig ends" deadlines (e.g. payout auto-release).
 */
export function combineEventDateAndEndTime(eventDate: Date, endTime: string): Date {
  const [hours, minutes] = endTime.split(":").map(Number);
  const combined = new Date(eventDate);
  if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
    combined.setHours(hours, minutes, 0, 0);
  }
  return combined;
}

/** Same as combineEventDateAndEndTime, for the event's start. */
export function combineEventDateAndStartTime(eventDate: Date, startTime: string): Date {
  return combineEventDateAndEndTime(eventDate, startTime);
}
