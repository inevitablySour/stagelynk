import { prisma } from "@/lib/db";
import { z } from "zod/v4";

export const promotionDraftSchema = z.strictObject({
  jobListingId: z.string().min(1).max(100),
  pricingOptionId: z.string().min(1).max(100).optional(),
  budgetAmount: z.number().finite().positive().max(100000).multipleOf(0.01),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
}).refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
  message: "End date must be after the start date",
  path: ["endsAt"],
});

export function promotionTotals(campaigns: { spentAmount: number; currency: string; views: number; clicks: number }[]) {
  const spend = new Map<string, number>();
  let views = 0;
  let clicks = 0;
  for (const campaign of campaigns) {
    spend.set(campaign.currency, (spend.get(campaign.currency) ?? 0) + campaign.spentAmount);
    views += campaign.views;
    clicks += campaign.clicks;
  }
  return {
    spend: [...spend].map(([currency, amount]) => ({ currency, amount })),
    views, clicks, clickRate: views > 0 ? clicks / views * 100 : 0,
  };
}

export async function getPromotionsDashboard(userId: string) {
  const venue = await prisma.venueProfile.findFirst({
    where: { userId, user: { deletedAt: null } },
    select: { id: true },
  });
  if (!venue) return null;
  const [campaigns, options, jobs] = await Promise.all([
    prisma.promotionCampaign.findMany({
      where: { venueId: venue.id },
      include: { jobListing: { select: { title: true } }, pricingOption: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.promotionPricingOption.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
    prisma.jobListing.findMany({
      where: { venueId: venue.id, status: "published" },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return {
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id, name: campaign.jobListing?.title ?? campaign.pricingOption?.name ?? "Venue campaign",
      placement: campaign.placement, billingModel: campaign.billingModel, status: campaign.status,
      budgetAmount: campaign.budgetAmount, spentAmount: campaign.spentAmount, currency: campaign.currency,
      startsAt: campaign.startsAt.toISOString(), endsAt: campaign.endsAt?.toISOString() ?? null,
      viewLimit: campaign.viewLimit, views: campaign.views, clicks: campaign.clicks,
    })),
    options: options.map((option) => ({
      id: option.id, name: option.name, price: option.price, currency: option.currency,
      placement: option.placement, billingModel: option.billingModel, description: option.description,
    })),
    jobs,
    totals: promotionTotals(campaigns),
  };
}

export type PromotionsDashboardData = NonNullable<Awaited<ReturnType<typeof getPromotionsDashboard>>>;
