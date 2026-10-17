import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/authorization";
import { prisma } from "@/lib/db";

export default async function VenueLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth({ roles: ["venue", "admin"] });

  const profile = await prisma.venueProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) redirect("/onboarding/role");

  return <div className="dashboard-shell">{children}</div>;
}
