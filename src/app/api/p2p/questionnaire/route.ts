import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { P2P_QUESTIONNAIRE } from "@/config";

const validIds = new Set(P2P_QUESTIONNAIRE.map((q) => q.id));

const bodySchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.null()])),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const response = await prisma.p2PQuestionnaireResponse.findUnique({ where: { musicianId: musician.id } });

  return NextResponse.json({
    success: true,
    data: {
      questions: P2P_QUESTIONNAIRE,
      answers: response?.answers ?? {},
      completedAt: response?.completedAt ?? null,
    },
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid answers." }, { status: 400 });
  }

  const answers: Record<string, string | string[] | null> = {};
  for (const [key, value] of Object.entries(parsed.data.answers)) {
    if (validIds.has(key)) answers[key] = value;
  }

  const hasAnyAnswer = Object.values(answers).some((v) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));

  const response = await prisma.p2PQuestionnaireResponse.upsert({
    where: { musicianId: musician.id },
    update: { answers, completedAt: hasAnyAnswer ? new Date() : null },
    create: { musicianId: musician.id, answers, completedAt: hasAnyAnswer ? new Date() : null },
  });

  return NextResponse.json({ success: true, data: response });
}
