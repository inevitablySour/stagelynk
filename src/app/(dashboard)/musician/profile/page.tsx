import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MusicianProfileForm } from "@/components/dashboard/musician-profile-form";
import { MusicianSocialForm } from "@/components/dashboard/musician-social-form";
import { EquipmentChecklist } from "@/components/equipment/equipment-checklist";
import { CredentialsManager } from "@/components/dashboard/credentials-manager";
import { AvailabilityManager } from "@/components/dashboard/availability-manager";
import { ArtistDiscoveryDetailsForm } from "@/components/dashboard/artist-discovery-details-form";
import type { SocialLinks } from "@/types";

export default async function MusicianProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      mainGenreGroup: true,
      genrePicks: { include: { subtype: true } },
      categoryPicks: { include: { subtype: true, instrumentType: true } },
      services: { include: { service: true } },
      equipmentNeeds: true,
      equipmentOwned: true,
      credentials: true,
      availabilitySlots: true,
    },
  });

  if (!profile) redirect("/musician");

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-stone-900">Creative Profile</h1>
          <p className="mt-1 text-stone-500">Manage how clients see you in search and on your public profile.</p>

          <MusicianProfileForm
            initial={{
              stageName: profile.stageName,
              bio: profile.bio,
              location: profile.location,
              experienceYears: profile.experienceYears,
              mainGenreGroupSlug: profile.mainGenreGroup?.slug ?? null,
              genreSubtypeSlugs: profile.genrePicks.map((p) => p.subtype.slug),
              genreCustomLabel: profile.genrePicks.find((p) => p.customLabel)?.customLabel ?? null,
              serviceSlugs: profile.services.map((ms) => ms.service.slug),
              instruments: profile.instruments,
            }}
          />

          <MusicianSocialForm initial={(profile.socialLinks as SocialLinks) ?? {}} />
          <ArtistDiscoveryDetailsForm initial={{
            categoryPicks: profile.categoryPicks.map((p) => ({ subtypeSlug: p.subtype.slug, instrumentTypeSlug: p.instrumentType?.slug })),
            influences: profile.influences,
            favorites: profile.favorites, performanceFee: profile.performanceFee, hourlyFee: profile.hourlyFee,
            dayFee: profile.dayFee, profileImage: profile.profileImage, bannerImage: profile.bannerImage,
          }} />
          <EquipmentChecklist title="Equipment I can bring" description="Your own equipment, separate from what you need a venue to provide." mode="offerings" endpoint="/api/musicians/me/equipment-owned" initial={profile.equipmentOwned} />

          <CredentialsManager
            initial={profile.credentials.map((c) => ({ id: c.id, type: c.type, title: c.title, issuer: c.issuer, year: c.year ?? undefined }))}
          />

          <AvailabilityManager
            initial={profile.availabilitySlots.map((s) => ({ id: s.id, startDate: s.startDate.toISOString(), endDate: s.endDate.toISOString() }))}
          />

          <EquipmentChecklist
            title="Technical rider"
            description="List the equipment you need venues to provide for a live performance. Venues will see a gap alert if they can't fully cover your rider."
            mode="needs"
            endpoint="/api/musicians/me/equipment"
            initial={profile.equipmentNeeds.map((n) => ({ equipmentId: n.equipmentId, quantity: n.quantity, notes: n.notes }))}
          />
        </div>
      </main>
    </div>
  );
}
