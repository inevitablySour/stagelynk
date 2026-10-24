import { prisma } from "../src/lib/db";

interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  images: { url: string }[];
  external_urls: { spotify: string };
}
interface SpotifyTrack {
  name: string;
  duration_ms: number;
  track_number: number;
  preview_url: string | null;
}

const demoEmail = "nova-sol@demo.stagelynk.invalid";
const pitbullId = "0TnOYISbd1XYRBk9myaseg";

async function spotify<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${process.env.SPOTIFY_ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Spotify metadata lookup failed (${response.status}); no demo data was written.`);
  return response.json() as Promise<T>;
}

async function main() {
  if (!process.argv.includes("--confirm")) throw new Error("Pass --confirm to create/update the clearly labeled demo account.");
  if (!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "")) throw new Error("Demo seeding is restricted to Stripe test-mode configuration.");
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) throw new Error("Configure Spotify credentials before seeding reference music.");

  const auth = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20000),
  });
  if (!auth.ok) throw new Error("Spotify authentication failed; no demo data was written.");
  process.env.SPOTIFY_ACCESS_TOKEN = ((await auth.json()) as { access_token: string }).access_token;
  const releases = await spotify<{ items: SpotifyAlbum[] }>(`/artists/${pitbullId}/albums?include_groups=album&limit=2&market=BE`);
  const albums = await Promise.all(releases.items.map(async (album) => ({
    album,
    tracks: (await spotify<{ items: SpotifyTrack[] }>(`/albums/${album.id}/tracks?limit=5&market=BE`)).items,
  })));
  if (!albums.length || albums.every((release) => !release.tracks.length)) throw new Error("Spotify returned no reference tracks.");

  const existing = await prisma.user.findUnique({ where: { email: demoEmail }, include: { musicianProfile: true } });
  if (existing && (!existing.musicianProfile?.stageName.startsWith("DEMO") || existing.role !== "musician")) throw new Error("Refusing to overwrite a non-demo account.");
  const electronicDanceGroup = await prisma.genreGroup.findUniqueOrThrow({ where: { slug: "electronic-dance" } });
  const subgenres = await prisma.genreSubtype.findMany({ where: { slug: { in: ["house", "synthwave", "downtempo-chillout"] } } });
  const djSubtype = await prisma.categorySubtype.findUniqueOrThrow({ where: { slug: "dj" } });
  const catalog = await prisma.equipmentItem.findMany();
  const idFor = (slug: string) => {
    const item = catalog.find((entry) => entry.slug === slug);
    if (!item) throw new Error(`Missing equipment catalog entry ${slug}; seed the catalog first.`);
    return item.id;
  };
  const today = new Date().toISOString().slice(0, 10);
  const day = (offset: number) => new Date(Date.parse(today) + offset * 86400000);
  const profile = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: demoEmail },
      update: {},
      create: { email: demoEmail, name: "Nova Sol (demo)", role: "musician" },
    });
    const details = {
      stageName: "DEMO — Nova Sol",
      mainGenreGroupId: electronicDanceGroup.id,
      bio: "DEMO PROFILE — a fictional creative used to demonstrate StageLynk. This is not a real performer or a booking offer.\n\nExample Brussels-based DJ, vocalist and keyboard player with a bright Latin-pop and electronic sound. Sample services include a 90-minute live/DJ set, acoustic reception music, session keys and small-stage production.\n\nThe Spotify releases below are credited Pitbull reference material, not Nova Sol's recordings. Artwork, track names and durations come from Spotify. Credentials, reviews and past projects on this profile are explicitly fictional demo examples; no payments or payouts were made.",
      experienceYears: 7,
      location: "Brussels, Belgium · demo location",
      instruments: ["Vocals", "DJ controller", "Keyboard", "Percussion"],
      influences: ["Pitbull", "Stromae", "Daft Punk", "Latin club music"],
      favorites: ["Pitbull — Globalization", "Daft Punk — Discovery", "Stromae — Racine carrée", "Parcels — Day/Night"],
      performanceFee: 350,
      hourlyFee: 75,
      dayFee: 450,
      profileImage: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=320&q=80",
      bannerImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1600&q=80",
      socialLinks: {
        website: "https://example.com/?demo=website",
        instagram: "https://example.com/?demo=instagram",
        twitter: "https://example.com/?demo=twitter",
        facebook: "https://example.com/?demo=facebook",
        youtube: "https://example.com/?demo=youtube",
        spotify: `https://open.spotify.com/artist/${pitbullId}`,
        appleMusic: "https://example.com/?demo=apple-music",
        soundcloud: "https://example.com/?demo=soundcloud",
        tiktok: "https://example.com/?demo=tiktok",
      },
      spotifyConnected: false,
    };
    const creative = await tx.musicianProfile.upsert({ where: { userId: user.id }, update: details, create: { ...details, userId: user.id } });
    await tx.musicianGenreSubtypePick.deleteMany({ where: { musicianId: creative.id } });
    await tx.musicianGenreSubtypePick.createMany({ data: subgenres.map((subtype) => ({ musicianId: creative.id, subtypeId: subtype.id })) });
    await tx.musicianCategoryPick.deleteMany({ where: { musicianId: creative.id } });
    await tx.musicianCategoryPick.create({ data: { musicianId: creative.id, subtypeId: djSubtype.id } });
    await tx.credential.deleteMany({ where: { musicianId: creative.id } });
    await tx.credential.createMany({ data: [
      { musicianId: creative.id, type: "degree", title: "DEMO — BA in Music Production", issuer: "Example Creative Academy (fictional)", year: 2020 },
      { musicianId: creative.id, type: "certificate", title: "DEMO — Live Sound Fundamentals", issuer: "Example Audio School (fictional)", year: 2023 },
      { musicianId: creative.id, type: "license", title: "DEMO — Event Safety Training", issuer: "Example Training Provider (fictional)", year: 2025 },
      { musicianId: creative.id, type: "award", title: "DEMO — Emerging Creative Award", issuer: "Example Arts Collective (fictional)", year: 2025 },
    ] });
    await tx.availabilitySlot.deleteMany({ where: { musicianId: creative.id } });
    await tx.availabilitySlot.createMany({ data: [[2, 5], [9, 12], [16, 19]].map(([start, end]) => ({ musicianId: creative.id, startDate: day(start), endDate: day(end) })) });
    await tx.musicianEquipmentNeed.deleteMany({ where: { musicianId: creative.id } });
    await tx.musicianEquipmentNeed.createMany({ data: [
      ["pa-system", 1], ["vocal-microphone", 2], ["monitor-wedge", 1], ["di-box", 2],
    ].map(([slug, quantity]) => ({ musicianId: creative.id, equipmentId: idFor(String(slug)), quantity: Number(quantity), notes: "DEMO requirement — confirm the actual setup before any real booking." })) });
    await tx.musicianEquipmentOwned.deleteMany({ where: { musicianId: creative.id } });
    await tx.musicianEquipmentOwned.createMany({ data: ["dj-mixer-controller", "keyboard-piano", "vocal-microphone"].map((slug) => ({ musicianId: creative.id, equipmentId: idFor(slug), quantity: 1, notes: "DEMO owned equipment." })) });
    await tx.album.deleteMany({ where: { musicianId: creative.id, externalId: { startsWith: "demo-reference:" } } });
    for (const release of albums) {
      await tx.album.create({ data: {
        musicianId: creative.id,
        title: `Pitbull — ${release.album.name} (demo reference only)`,
        releaseYear: Number(release.album.release_date.slice(0, 4)),
        coverArt: release.album.images[0]?.url,
        source: "spotify",
        externalId: `demo-reference:${release.album.id}`,
        externalUrl: release.album.external_urls.spotify,
        tracks: { create: release.tracks.map((track) => ({
          title: track.name, duration: Math.round(track.duration_ms / 1000), trackNumber: track.track_number,
          previewUrl: track.preview_url, genre: "Pitbull reference",
        })) },
      } });
    }
    for (const [index, rating] of [5, 4, 5].entries()) {
      const venueUser = await tx.user.upsert({
        where: { email: `venue-${index + 1}@demo.stagelynk.invalid` }, update: {},
        create: { email: `venue-${index + 1}@demo.stagelynk.invalid`, name: `Demo client ${index + 1}`, role: "venue" },
      });
      const venue = await tx.venueProfile.upsert({
        where: { userId: venueUser.id }, update: {},
        create: { userId: venueUser.id, venueName: `DEMO — Example Stage ${index + 1}`, description: "Fictional demonstration venue, not a real booking opportunity.", location: "Brussels · demo", capacity: 180, venueType: "Club / Nightclub" },
      });
      const booking = await tx.booking.upsert({
        where: { id: `demo-nova-sol-past-project-${index + 1}` },
        update: {},
        create: {
          id: `demo-nova-sol-past-project-${index + 1}`, musicianId: creative.id, venueId: venue.id,
          title: `DEMO — Example creative project ${index + 1}`, eventType: "Demo performance",
          eventDate: day(-14 - index * 7), startTime: "20:00", endTime: "22:00",
          venueAddress: "Fictional demo address — not a real venue", status: "completed", source: "manual",
          fee: 350, currency: "EUR", paymentStatus: "cancelled", payoutStatus: "cancelled",
          notes: "DEMO ONLY: no payment was charged and no payout exists.",
        },
      });
      await tx.review.upsert({
        where: { bookingId: booking.id },
        update: { rating, comment: "DEMO REVIEW — fictional example, not a real client endorsement. Illustrates feedback on communication, technical preparation and creative fit." },
        create: { bookingId: booking.id, reviewerId: venueUser.id, musicianId: creative.id, rating, comment: "DEMO REVIEW — fictional example, not a real client endorsement. Illustrates feedback on communication, technical preparation and creative fit." },
      });
    }
    const reviews = await tx.review.aggregate({ where: { musicianId: creative.id }, _avg: { rating: true }, _count: { rating: true } });
    return tx.musicianProfile.update({ where: { id: creative.id }, data: { rating: reviews._avg.rating ?? 0, reviewCount: reviews._count.rating } });
  }, { timeout: 30000 });
  console.log(JSON.stringify({
    profileId: profile.id,
    stageName: profile.stageName,
    publicPath: `/artists/${profile.id}`,
    spotifyReferenceAlbums: albums.length,
    tracks: albums.reduce((sum, album) => sum + album.tracks.length, 0),
    nativePreviews: albums.flatMap((album) => album.tracks).filter((track) => track.preview_url).length,
    paymentsCreated: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Demo seeding failed");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
