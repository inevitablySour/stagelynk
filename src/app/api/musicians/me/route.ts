import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { musicianProfileSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";

const MAX_SUBCATEGORIES_PER_GROUP = 3;
const MAX_SUBGENRES = 3;

const profileInclude = {
  mainGenreGroup: true,
  genrePicks: { include: { subtype: true } },
  categoryPicks: { include: { subtype: { include: { group: true } }, instrumentType: true } },
  services: { include: { service: true } },
} as const;

function serializeProfile(profile: {
  mainGenreGroup: { id: string; name: string; slug: string } | null;
  genrePicks: { subtype: { id: string; name: string; slug: string }; customLabel: string | null }[];
  categoryPicks: {
    subtype: { id: string; name: string; slug: string; group: { name: string; slug: string } };
    instrumentType: { name: string; slug: string } | null;
  }[];
  services: { service: unknown }[];
  [key: string]: unknown;
}) {
  return {
    ...profile,
    genrePicks: profile.genrePicks.map((p) => ({
      subtypeId: p.subtype.id, subtypeName: p.subtype.name, subtypeSlug: p.subtype.slug, customLabel: p.customLabel,
    })),
    categoryPicks: profile.categoryPicks.map((p) => ({
      subtypeId: p.subtype.id, subtypeName: p.subtype.name, subtypeSlug: p.subtype.slug,
      groupName: p.subtype.group.name, groupSlug: p.subtype.group.slug,
      instrumentTypeName: p.instrumentType?.name ?? null, instrumentTypeSlug: p.instrumentType?.slug ?? null,
    })),
    services: profile.services.map((ms) => ms.service),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id }, include: profileInclude });
  if (!profile) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: serializeProfile(profile) });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = musicianProfileSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid musician profile update", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { categoryPicks, mainGenreGroupSlug, genrePicks, services: serviceSlugs, instruments, ...profileFields } = parsed.data;

  const existing = await prisma.musicianProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!existing) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  // Category picks: resolve slugs, enforce max 3 subtypes per broad group.
  let categoryCreateData: { subtypeId: string; instrumentTypeId: string | null }[] | undefined;
  let derivedInstruments: string[] | undefined;
  if (categoryPicks) {
    const subtypeSlugs = categoryPicks.map((p) => p.subtypeSlug);
    const subtypes = await prisma.categorySubtype.findMany({
      where: { slug: { in: subtypeSlugs } },
      include: { group: true, instrumentTypes: true },
    });
    const subtypeBySlug = new Map(subtypes.map((s) => [s.slug, s]));

    const countPerGroup = new Map<string, number>();
    const resolved: { subtypeId: string; instrumentTypeId: string | null }[] = [];
    const instrumentNames: string[] = [];

    for (const pick of categoryPicks) {
      const subtype = subtypeBySlug.get(pick.subtypeSlug);
      if (!subtype) {
        return NextResponse.json({ success: false, message: `Unknown category: ${pick.subtypeSlug}` }, { status: 400 });
      }
      const groupCount = (countPerGroup.get(subtype.groupId) ?? 0) + 1;
      countPerGroup.set(subtype.groupId, groupCount);
      if (groupCount > MAX_SUBCATEGORIES_PER_GROUP) {
        return NextResponse.json(
          { success: false, message: `Choose at most ${MAX_SUBCATEGORIES_PER_GROUP} subcategories under "${subtype.group.name}"` },
          { status: 400 }
        );
      }

      let instrumentTypeId: string | null = null;
      if (pick.instrumentTypeSlug) {
        const instrumentType = subtype.instrumentTypes.find((it) => it.slug === pick.instrumentTypeSlug);
        if (!instrumentType) {
          return NextResponse.json({ success: false, message: `Unknown instrument type: ${pick.instrumentTypeSlug}` }, { status: 400 });
        }
        instrumentTypeId = instrumentType.id;
        instrumentNames.push(instrumentType.name);
      }

      resolved.push({ subtypeId: subtype.id, instrumentTypeId });
    }

    categoryCreateData = resolved;
    derivedInstruments = instrumentNames;
  }

  // Genre picks: resolve the main group, enforce subgenres belong to it.
  if (genrePicks !== undefined && mainGenreGroupSlug === undefined) {
    return NextResponse.json({ success: false, message: "Choose a main genre before picking subgenres" }, { status: 400 });
  }

  let genreCreateData: { subtypeId: string; customLabel: string | null }[] | undefined;
  let mainGenreGroupId: string | null | undefined;
  if (mainGenreGroupSlug !== undefined) {
    const group = await prisma.genreGroup.findUnique({ where: { slug: mainGenreGroupSlug } });
    if (!group) {
      return NextResponse.json({ success: false, message: `Unknown genre: ${mainGenreGroupSlug}` }, { status: 400 });
    }
    mainGenreGroupId = group.id;

    if (genrePicks) {
      if (genrePicks.length > MAX_SUBGENRES) {
        return NextResponse.json({ success: false, message: `Choose at most ${MAX_SUBGENRES} subgenres` }, { status: 400 });
      }
      const subtypeSlugs = genrePicks.map((p) => p.subtypeSlug);
      const subtypes = await prisma.genreSubtype.findMany({ where: { slug: { in: subtypeSlugs }, groupId: group.id } });
      const subtypeBySlug = new Map(subtypes.map((s) => [s.slug, s]));

      const resolved: { subtypeId: string; customLabel: string | null }[] = [];
      for (const pick of genrePicks) {
        const subtype = subtypeBySlug.get(pick.subtypeSlug);
        if (!subtype) {
          return NextResponse.json(
            { success: false, message: `"${pick.subtypeSlug}" is not a subgenre of ${group.name}` },
            { status: 400 }
          );
        }
        if (subtype.isOther && !pick.customLabel) {
          return NextResponse.json({ success: false, message: "Describe your custom genre tag" }, { status: 400 });
        }
        resolved.push({ subtypeId: subtype.id, customLabel: subtype.isOther ? pick.customLabel ?? null : null });
      }
      genreCreateData = resolved;
    }
  }

  const profile = await prisma.musicianProfile.update({
    where: { userId: session.user.id },
    data: {
      ...profileFields,
      ...(instruments !== undefined || derivedInstruments !== undefined
        ? { instruments: derivedInstruments !== undefined ? [...(instruments ?? []), ...derivedInstruments] : instruments }
        : {}),
      ...(mainGenreGroupId !== undefined ? { mainGenreGroupId } : {}),
      ...(categoryCreateData
        ? { categoryPicks: { deleteMany: {}, create: categoryCreateData } }
        : {}),
      ...(genreCreateData
        ? { genrePicks: { deleteMany: {}, create: genreCreateData } }
        : {}),
      ...(serviceSlugs
        ? {
            services: {
              deleteMany: {},
              create: await Promise.all(
                serviceSlugs.map(async (slug) => {
                  const service = await prisma.service.upsert({
                    where: { slug },
                    update: {},
                    create: { slug, name: slug },
                  });
                  return { serviceId: service.id };
                })
              ),
            },
          }
        : {}),
    },
    include: profileInclude,
  });

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "profile_update",
    category: "profile",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "MusicianProfile",
    targetId: profile.id,
  });

  return NextResponse.json({ success: true, data: serializeProfile(profile) });
}
