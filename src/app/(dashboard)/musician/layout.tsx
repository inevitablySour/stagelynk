import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/authorization";
import { prisma } from "@/lib/db";

export default async function MusicianLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth({ roles: ["musician", "admin"] });

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) redirect("/onboarding/role");

  return <div className="dashboard-shell">{children}</div>;
}
