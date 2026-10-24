import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const milestoneSchema = z.object({
  label: z.string().trim().min(1).max(200),
  amount: z.number().finite().positive(),
});

const bodySchema = z.discriminatedUnion("dealType", [
  z.object({
    matchId: z.string().min(1),
    dealType: z.literal("flat_fee"),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    payeeId: z.string().min(1),
    rateBasis: z.enum(["hourly", "daily"]),
    rateAmount: z.number().finite().positive(),
    currency: z.string().length(3).optional(),
  }),
  z.object({
    matchId: z.string().min(1),
    dealType: z.literal("milestone"),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    payeeId: z.string().min(1),
    milestones: z.array(milestoneSchema).min(1).max(20),
    currency: z.string().length(3).optional(),
  }),
  z.object({
    matchId: z.string().min(1),
    dealType: z.literal("split_50_50"),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
  }),
]);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!me) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const matchId = new URL(request.url).searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ success: false, message: "matchId is required" }, { status: 400 });
  }

  const match = await prisma.p2PMatch.findUnique({ where: { id: matchId } });
  if (!match || (match.musicianAId !== me.id && match.musicianBId !== me.id)) {
    return NextResponse.json({ success: false, message: "Match not found" }, { status: 404 });
  }

  const deals = await prisma.p2PDeal.findMany({
    where: { matchId },
    include: { milestones: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: deals });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!me) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid deal proposal.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const match = await prisma.p2PMatch.findUnique({ where: { id: data.matchId } });
  if (!match || match.status !== "mutual" || (match.musicianAId !== me.id && match.musicianBId !== me.id)) {
    return NextResponse.json({ success: false, message: "You can only propose deals within a mutual match." }, { status: 400 });
  }

  const otherMusicianId = match.musicianAId === me.id ? match.musicianBId : match.musicianAId;

  if (data.dealType === "split_50_50") {
    const deal = await prisma.p2PDeal.create({
      data: {
        matchId: data.matchId,
        proposedBy: me.id,
        dealType: "split_50_50",
        title: data.title,
        description: data.description ?? "",
        currency: "EUR",
      },
    });
    return NextResponse.json({ success: true, data: deal }, { status: 201 });
  }

  if (data.payeeId !== me.id && data.payeeId !== otherMusicianId) {
    return NextResponse.json({ success: false, message: "Invalid payee for this match." }, { status: 400 });
  }
  const payerId = data.payeeId === me.id ? otherMusicianId : me.id;

  if (data.dealType === "flat_fee") {
    const deal = await prisma.p2PDeal.create({
      data: {
        matchId: data.matchId,
        proposedBy: me.id,
        payerId,
        payeeId: data.payeeId,
        dealType: "flat_fee",
        title: data.title,
        description: data.description ?? "",
        rateBasis: data.rateBasis,
        rateAmount: data.rateAmount,
        currency: data.currency ?? "EUR",
      },
    });
    return NextResponse.json({ success: true, data: deal }, { status: 201 });
  }

  const deal = await prisma.$transaction(async (tx) => {
    const created = await tx.p2PDeal.create({
      data: {
        matchId: data.matchId,
        proposedBy: me.id,
        payerId,
        payeeId: data.payeeId,
        dealType: "milestone",
        title: data.title,
        description: data.description ?? "",
        currency: data.currency ?? "EUR",
      },
    });
    await tx.p2PMilestone.createMany({
      data: data.milestones.map((m, index) => ({ dealId: created.id, label: m.label, amount: m.amount, order: index })),
    });
    return tx.p2PDeal.findUnique({ where: { id: created.id }, include: { milestones: { orderBy: { order: "asc" } } } });
  });

  return NextResponse.json({ success: true, data: deal }, { status: 201 });
}
