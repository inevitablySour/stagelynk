import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";
import { artistCallInclude, GENRE_OPTIONS, listArtistCalls, ROLE_OPTIONS, serializeArtistCall } from "@/lib/artist-calls";

const dealTypes = ["rate", "milestone", "split_credit"] as const;

const callSchema = z.object({
  title: z.string().trim().min(5, "Add a short job title.").max(120),
  roleSlug: z.string().refine((slug) => ROLE_OPTIONS.some((r) => r.slug === slug), "Choose a role tag."),
  genreSlug: z.string().refine((slug) => GENRE_OPTIONS.some((g) => g.slug === slug), "Unknown genre.").optional(),
  timeline: z.string().trim().min(2, "Add dates or a timeline.").max(160),
  dealType: z.enum(dealTypes),
  dealDetails: z.string().trim().max(160).default(""),
  description: z.string().trim().min(10, "Add a couple of sentences about the vibe and references.").max(1500),
});

const filterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.string().max(80).optional(),
  genre: z.string().max(80).optional(),
  dealType: z.enum(dealTypes).optional(),
});

export async function GET(request: Request) {
  const parsed = filterSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid filters" }, { status: 400 });
  const session = await auth();
  const me = session?.user?.role === "musician"
    ? await prisma.musicianProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;
  return NextResponse.json({ success: true, data: await listArtistCalls(parsed.data, me?.id) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const me = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!me) return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });

  const parsed = callSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid open call." }, { status: 400 });
  }

  const created = await prisma.artistOpenCall.create({
    data: { ...parsed.data, posterId: me.id },
    include: artistCallInclude,
  });

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "artist_call_create", category: "profile", level: "info",
    actorUserId: session.user.id, actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress, userAgent: requestMetadata.userAgent, requestId: requestMetadata.requestId,
    targetType: "ArtistOpenCall", targetId: created.id,
  });

  return NextResponse.json({ success: true, data: serializeArtistCall(created) }, { status: 201 });
}
