import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VenueProfileForm } from "@/components/dashboard/venue-profile-form";
import { EquipmentChecklist } from "@/components/equipment/equipment-checklist";

export default async function VenueProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await prisma.venueProfile.findUnique({
    where: { userId: session.user.id },
    include: { equipmentOfferings: true },
  });
  if (!profile) redirect("/venue");

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-stone-900">Venue Profile</h1>
          <p className="mt-1 text-stone-500">Manage your venue&apos;s public information.</p>

          <VenueProfileForm
            initial={{
              venueName: profile.venueName,
              description: profile.description,
              location: profile.location,
              capacity: profile.capacity,
              venueType: profile.venueType,
            }}
          />

          <EquipmentChecklist
            title="In-house equipment"
            description="List the equipment your venue has on-site. Artists will see what's covered and what they need to bring."
            mode="offerings"
            endpoint="/api/venues/me/equipment"
            initial={profile.equipmentOfferings.map((o) => ({ equipmentId: o.equipmentId, quantity: o.quantity, notes: o.notes }))}
          />
        </div>
      </main>
    </div>
  );
}
