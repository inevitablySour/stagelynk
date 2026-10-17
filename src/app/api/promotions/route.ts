import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPromotionsDashboard, promotionDraftSchema } from "@/lib/promotions";
import { writeAuditLog } from "@/lib/audit-log";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const data = await getPromotionsDashboard(session.user.id);
  return data ? NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } })
    : NextResponse.json({ success: false, message: "Client profile not found" }, { status: 404 });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const venue = await prisma.venueProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } }, select: { id: true } });
  if (!venue) return NextResponse.json({ success: false, message: "Client profile not found" }, { status: 404 });
  const parsed = promotionDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Choose a published call, a positive budget and a valid date range.", errors: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const job = await prisma.jobListing.findFirst({ where: { id: data.jobListingId, venueId: venue.id, status: "published" }, select: { id: true } });
  if (!job) return NextResponse.json({ success: false, message: "Choose one of your published open calls." }, { status: 404 });
  const option = data.pricingOptionId ? await prisma.promotionPricingOption.findFirst({
    where: { id: data.pricingOptionId, active: true, placement: "job_listing" },
  }) : null;
  if (data.pricingOptionId && !option) return NextResponse.json({ success: false, message: "That package is no longer available for this placement." }, { status: 400 });
  if (await prisma.promotionCampaign.count({ where: { venueId: venue.id, status: "draft" } }) >= 100) return NextResponse.json({ success: false, message: "Cancel unused drafts before creating more." }, { status: 429 });
  const campaign = await prisma.promotionCampaign.create({
    data: {
      venueId: venue.id, jobListingId: job.id, pricingOptionId: option?.id,
      placement: "job_listing", billingModel: option?.billingModel ?? "time_based",
      budgetAmount: option?.price ?? data.budgetAmount, currency: option?.currency ?? "EUR",
      startsAt: new Date(data.startsAt),
      endsAt: option?.durationDays ? new Date(Date.parse(data.startsAt) + option.durationDays * 86400000) : new Date(data.endsAt),
      viewLimit: option?.includedViews,
      status: "draft", spentAmount: 0,
    },
    select: { id: true },
  });
  await writeAuditLog({ event: "promotion_draft_create", category: "promotion", level: "info", actorUserId: session.user.id, targetType: "PromotionCampaign", targetId: campaign.id });
  return NextResponse.json({ success: true, data: campaign }, { status: 201 });
}
