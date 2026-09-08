import { requireAuth } from "@/lib/authorization";

export default async function VenueLayout({ children }: { children: React.ReactNode }) {
  await requireAuth({ roles: ["venue", "admin"] });
  return children;
}
