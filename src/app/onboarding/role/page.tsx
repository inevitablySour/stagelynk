import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OnboardingRoleForm } from "@/components/onboarding/onboarding-role-form";

export default async function OnboardingRolePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [musicianProfile, venueProfile] = await Promise.all([
    prisma.musicianProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } }),
    prisma.venueProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } }),
  ]);

  if (musicianProfile) redirect("/musician");
  if (venueProfile) redirect("/venue");

  return <OnboardingRoleForm />;
}
