import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, MapPin, Clock, Calendar, AudioLines, Award, SlidersHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/common/star-rating";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getInitials } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serializeMusicianProfile } from "@/lib/serializers";
import { BookingRequestCard } from "@/components/artists/booking-request-card";
import { ProfileArtwork } from "@/components/artists/profile-artwork";
import { CREATIVE_CATEGORIES } from "@/config";
import type { SocialLinks } from "@/types";
import { formatMoney } from "@/lib/marketplace-fees";
import { PortfolioRelease } from "@/components/artists/portfolio-release";

export default async function ArtistProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profile = await prisma.musicianProfile.findUnique({
    where: { id, user: { deletedAt: null } },
    include: {
      genres: { include: { genre: true } },
      albums: { include: { tracks: true } },
      credentials: true,
      availabilitySlots: {
        where: { endDate: { gte: new Date() } },
        orderBy: { startDate: "asc" },
      },
      equipmentNeeds: { include: { equipment: true } },
      equipmentOwned: { include: { equipment: true } },
    },
  });

  if (!profile) notFound();

  const artist = serializeMusicianProfile(profile);
  const session = await auth();
  const viewer = session?.user ? { role: session.user.role, isOwner: session.user.id === artist.userId } : null;

  const reviews = await prisma.review.findMany({
    where: { musicianId: id },
    include: { reviewer: { include: { venueProfile: true } } },
    orderBy: { createdAt: "desc" },
  });

  const socialLinks = (artist.socialLinks ?? {}) as SocialLinks;
  const category = CREATIVE_CATEGORIES.find((item) => item.slug === artist.primaryCategory)?.name ?? "Creative";
  const upcomingAvailability = artist.availability;
  const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const links = Object.entries(socialLinks).filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <>
      <Navbar />
      <main className="min-w-0 flex-1 pb-16 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/artists" className="my-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-brand">
            <ArrowLeft className="h-4 w-4" /> Back to discovery
          </Link>

          <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_70px_-45px_rgba(47,59,29,0.4)]" aria-label="Artist introduction">
            <ProfileArtwork src={artist.bannerImage} alt={`${artist.stageName}'s cover`} sizes="(max-width: 1280px) 100vw, 1280px" className="h-44 bg-olive-900 sm:h-64">
              <div className="absolute -right-10 -top-36 h-96 w-96 rounded-full border-[60px] border-olive-700/60" />
              <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full border-[50px] border-copper-500/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-olive-900/20 to-copper-500/20" />
            </ProfileArtwork>
            <div className="relative px-5 pb-7 sm:px-8 sm:pb-8">
              <ProfileArtwork src={artist.profileImage} alt={artist.stageName} sizes="144px" className="-mt-14 flex h-28 w-28 items-center justify-center rounded-3xl border-[5px] border-surface bg-brand-soft text-3xl font-bold text-brand shadow-lg sm:-mt-16 sm:h-36 sm:w-36 sm:text-4xl">
                {getInitials(artist.stageName)}
              </ProfileArtwork>
              <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 max-w-3xl">
                  <p className="eyebrow mb-2">{category}</p>
                  <h1 className="break-words text-3xl font-bold tracking-tight text-ink sm:text-5xl">{artist.stageName}</h1>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                    {artist.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{artist.location}</span>}
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{artist.experienceYears > 0 ? `${artist.experienceYears} years of experience` : "Building their creative journey"}</span>
                    <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4" />{artist.reviewCount > 0 ? `${artist.weightedRating}/10 weighted · ${artist.reviewCount} reviews` : "New here · discover their work"}</span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {artist.genres.map((genre) => <Badge key={genre.id} variant="secondary" className="px-3 py-1">{genre.name}</Badge>)}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 lg:pt-5">
                  <Button size="lg" asChild><Link href={viewer?.isOwner ? (viewer.role === "venue" ? "/venue/profile" : "/musician/profile") : "#book"}>{viewer?.isOwner ? "Manage your profile" : viewer && viewer.role !== "venue" ? "Booking information" : "Request a booking"}<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
                  <p className="text-center text-xs text-muted">Share your idea. Find your creative fit.</p>
                </div>
              </div>
            </div>
            <nav aria-label="Profile sections" className="flex gap-6 overflow-x-auto border-t border-line px-5 sm:px-8">
              {[["about", "About"], ["work", "Selected work"], ["rider", "Technical rider"], ["reviews", "Reviews"]].map(([anchor, label]) => (
                <a key={anchor} href={`#${anchor}`} className="shrink-0 border-b-2 border-transparent py-4 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-brand">{label}</a>
              ))}
            </nav>
          </section>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            <div className="min-w-0 space-y-6">
              <Card id="about" className="profile-section">
                <CardHeader><p className="eyebrow">The creative behind the work</p><CardTitle className="text-xl leading-tight sm:text-2xl">Meet {artist.stageName}</CardTitle></CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line break-words text-sm leading-7 text-muted sm:text-base">{artist.bio || "Every creative story starts somewhere. This artist hasn't added their introduction yet — explore their work below."}</p>
                  {artist.instruments.length > 0 && (
                    <div className="mt-6 border-t border-line pt-5">
                      <h3 className="mb-3 text-sm font-semibold text-ink">Instruments & tools</h3>
                      <div className="flex flex-wrap gap-2">{artist.instruments.map((instrument) => <Badge key={instrument} variant="outline" className="px-3 py-1">{instrument}</Badge>)}</div>
                    </div>
                  )}
                  {(artist.subgenres?.length || artist.influences?.length || artist.favorites?.length) ? <div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">{[["Subgenres", artist.subgenres], ["Influences", artist.influences], ["Four favorites", artist.favorites]].map(([title, values]) => Array.isArray(values) && values.length > 0 ? <div key={String(title)}><h3 className="mb-2 text-sm font-semibold text-ink">{String(title)}</h3><p className="text-sm leading-6 text-muted">{values.join(" · ")}</p></div> : null)}</div> : null}
                </CardContent>
              </Card>

              <Card id="work" className="profile-section overflow-hidden">
                <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="eyebrow mb-2">Let the work speak</p><CardTitle className="text-xl leading-tight sm:text-2xl">Selected work</CardTitle></div>
                  <Badge variant="outline">{artist.discography.length} {artist.discography.length === 1 ? "release" : "releases"}</Badge>
                </CardHeader>
                <CardContent className="space-y-6">
                  {artist.discography.length === 0 && (
                    <div className="empty-state">
                      <AudioLines className="mx-auto mb-4 h-8 w-8 text-brand" />
                      <h3 className="font-semibold text-ink">A portfolio in the making</h3>
                      <p className="mt-2 text-sm leading-6 text-muted">Work samples haven&apos;t been added yet. Explore their links for more of their creative world.</p>
                    </div>
                  )}
                  {artist.discography.map((album) => <PortfolioRelease key={album.id} album={album} />)}
                </CardContent>
              </Card>

              <Card id="rider" className="profile-section">
                <CardHeader><p className="eyebrow">Before the show</p><CardTitle className="flex items-center gap-2 text-xl leading-tight sm:text-2xl"><SlidersHorizontal className="h-5 w-5 text-brand" />Technical rider</CardTitle></CardHeader>
                <CardContent>
                  <p className="mb-5 text-sm leading-6 text-muted">Equipment this artist asks the venue to provide. Compatibility is checked when you start a booking.</p>
                  {profile.equipmentNeeds.length > 0 ? (
                    <ul className="divide-y divide-line rounded-xl border border-line px-4">
                      {profile.equipmentNeeds.map((need) => <li key={need.id} className="flex items-start gap-4 py-4"><span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-brand-soft px-2 text-sm font-semibold text-brand">{need.quantity}×</span><div className="min-w-0"><p className="text-sm font-medium text-ink">{need.equipment.name}</p><p className="mt-1 break-words text-xs leading-5 text-muted">{need.notes || need.equipment.category}</p></div></li>)}
                    </ul>
                  ) : <p className="rounded-xl bg-page/50 p-4 text-sm leading-6 text-muted">No equipment requirements listed yet. Confirm the setup directly before booking.</p>}
                  {profile.equipmentOwned.length > 0 && <div className="mt-6 border-t border-line pt-5"><h3 className="mb-3 text-sm font-semibold">Equipment the artist can bring</h3><ul className="space-y-2 text-sm text-muted">{profile.equipmentOwned.map((item) => <li key={item.id}>{item.quantity}× {item.equipment.name}</li>)}</ul></div>}
                </CardContent>
              </Card>

              {artist.credentials.length > 0 && (
                <Card>
                  <CardHeader><p className="eyebrow">Background & craft</p><CardTitle className="text-xl leading-tight sm:text-2xl">Credentials</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    {artist.credentials.map((credential) => <div key={credential.id} className="flex items-start gap-3 rounded-xl border border-line p-4"><Award className="mt-0.5 h-5 w-5 shrink-0 text-brand" /><div className="min-w-0"><p className="break-words text-sm font-semibold text-ink">{credential.title}</p><p className="mt-1 text-xs leading-5 text-muted">{[credential.issuer, credential.year].filter(Boolean).join(" · ")}</p><p className="mt-1 text-xs capitalize text-muted">{credential.type}</p></div></div>)}
                  </CardContent>
                </Card>
              )}

              <Card id="reviews" className="profile-section">
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow mb-2">From the people they work with</p><CardTitle className="text-xl leading-tight sm:text-2xl">Client reviews</CardTitle></div><Badge variant="outline">{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</Badge></CardHeader>
                <CardContent className="space-y-6">
                  {reviews.length === 0 && <div className="empty-state"><Star className="mx-auto mb-4 h-8 w-8 text-brand" /><h3 className="font-semibold text-ink">New connections start here</h3><p className="mt-2 text-sm leading-6 text-muted">No reviews yet. Get to know their work, not just their review count.</p></div>}
                  {reviews.map((review) => (
                    <article key={review.id} className="border-b border-line pb-6 last:border-0 last:pb-0">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div><h3 className="text-sm font-semibold text-ink">{review.reviewer.venueProfile?.venueName || review.reviewer.name || "Client"}</h3><p className="mt-1 text-xs text-muted">{dateFormat.format(review.createdAt)}</p></div>
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                      <p className="whitespace-pre-line break-words text-sm leading-7 text-muted">{review.comment || "This client left a rating without a written review."}</p>
                    </article>
                  ))}
                </CardContent>
              </Card>
            </div>

            <aside className="min-w-0 space-y-5 lg:sticky lg:top-24" aria-label="Booking and artist details">
              {[artist.performanceFee, artist.hourlyFee, artist.dayFee].some((rate) => rate != null) && <Card><CardHeader><CardTitle className="text-base">Quoted fees</CardTitle></CardHeader><CardContent><dl className="space-y-3 text-sm">{[["Performance", artist.performanceFee], ["Per hour", artist.hourlyFee], ["Per day", artist.dayFee]].map(([label, fee]) => typeof fee === "number" ? <div key={String(label)} className="flex justify-between gap-3"><dt className="text-muted">{label}</dt><dd className="font-semibold text-brand">{formatMoney(fee)}</dd></div> : null)}</dl><p className="mt-4 text-xs leading-5 text-muted">Starting rates; confirm the project scope and agreed fee before booking.</p></CardContent></Card>}
              <BookingRequestCard musicianId={artist.id} stageName={artist.stageName} viewer={viewer} />
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4 text-brand" />Availability</CardTitle></CardHeader>
                <CardContent>
                  {upcomingAvailability.length > 0 ? <ul className="space-y-3">{upcomingAvailability.slice(0, 3).map((slot) => <li key={slot.id} className="rounded-xl border border-line bg-page/30 px-3 py-3 text-sm text-ink"><span className="mb-1 block text-xs text-muted">Listed availability</span>{dateFormat.format(new Date(slot.startDate))}<span className="px-1 text-muted">–</span>{dateFormat.format(new Date(slot.endDate))}</li>)}</ul> : <p className="text-sm leading-6 text-muted">No upcoming dates listed. Send a request to check availability for your project.</p>}
                  {upcomingAvailability.length > 0 && <p className="mt-3 text-xs leading-5 text-muted">Dates are artist-provided. Your booking is confirmed only after acceptance and successful payment.</p>}
                </CardContent>
              </Card>
              {links.length > 0 && <Card><CardHeader><CardTitle className="text-base">Elsewhere on the web</CardTitle></CardHeader><CardContent className="space-y-2">{links.map(([key, url]) => <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-brand hover:bg-brand-soft"><span className="capitalize">{key === "appleMusic" ? "Apple Music" : key}</span><ArrowUpRight className="h-4 w-4 text-brand" /></a>)}</CardContent></Card>}
              <Link href="/artists" className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-muted hover:text-brand">Explore more creatives <ArrowUpRight className="h-4 w-4" /></Link>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
