import { redirect } from "next/navigation";

// The calendar now lives on the overview page.
export default function VenueCalendarPage() {
  redirect("/venue#calendar");
}
