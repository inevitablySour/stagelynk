import { z } from "zod/v4";
import { calendarDate, normalizeCategory, normalizeTags } from "@/lib/discovery-utils";

const money = z.number().finite().min(0).max(1000000).multipleOf(0.01);
const tags = z.array(z.string().trim().min(1).max(80)).max(20).transform(normalizeTags);
const optionalUrl = z.union([z.url().refine((value) => /^https?:\/\//i.test(value), "Use an HTTP(S) URL"), z.literal("")]).optional();
const timeOfDay = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const jobListingSchema = z.object({
  title: z.string().trim().min(4, "Job title must be at least 4 characters").max(140),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(5000),
  eventType: z.string().trim().min(2).max(80),
  eventDate: z.union([calendarDate, z.literal("")]).optional(),
  startTime: timeOfDay.optional(),
  endTime: timeOfDay.optional(),
  timeZone: z.string().max(80).refine((value) => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
  }, "Choose a valid IANA time zone").optional(),
  externalVenueName: z.string().trim().max(160).optional(),
  stageSpecs: z.string().trim().max(3000).optional(),
  useVenueEquipment: z.boolean().optional(),
  eventEquipment: z.array(z.object({
    equipmentId: z.string().min(1), quantity: z.number().int().min(1).max(50),
  })).max(100).refine((items) => new Set(items.map((item) => item.equipmentId)).size === items.length, "Do not repeat equipment").optional(),
  venueAddress: z.string().max(240).optional(),
  location: z.string().max(120).optional(),
  budgetMin: money.optional(),
  budgetMax: money.optional(),
  hideBudget: z.boolean().optional(),
  currency: z.literal("EUR").optional(),
  categories: tags.optional(),
  genres: tags.optional(),
  requiredServices: z.array(z.string().trim().min(1).max(160)).max(30).optional(),
  equipmentProvided: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  applicationDeadline: z.union([z.iso.datetime({ offset: true }), z.literal("")]).optional(),
  status: z.enum(["draft", "published", "paused", "closed", "filled", "expired"]).optional(),
  slotLabels: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  slots: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    budgetMin: money.refine((value) => value > 0, "Slot fees must be positive").nullable().optional(),
    budgetMax: money.refine((value) => value > 0, "Slot fees must be positive").nullable().optional(),
    startTime: timeOfDay.nullable().optional(),
    endTime: timeOfDay.nullable().optional(),
  }).refine((slot) => (slot.budgetMin == null) === (slot.budgetMax == null)
    && (slot.budgetMin == null || slot.budgetMax! >= slot.budgetMin), "Provide both slot budget limits in ascending order")
    .refine((slot) => (slot.startTime == null) === (slot.endTime == null), "Provide both a start and end time, or neither")
    .refine((slot) => slot.startTime == null || slot.startTime !== slot.endTime, "Slot start and end time cannot be identical"))
    .min(1).max(20).optional(),
});

export const jobApplicationSchema = z.object({
  coverMessage: z.string().trim().max(3000).default(""),
  proposedFee: money.refine((value) => value > 0, "Propose a positive artist fee").optional(),
  availabilityNotes: z.string().max(1500).optional(),
  slotId: z.string().optional(),
  availabilityConfirmed: z.literal(true, { message: "Confirm you are available for this slot" }),
});

export const promotionCampaignSchema = z.object({
  jobListingId: z.string().optional(),
  placement: z.enum(["talent_search", "job_listing", "homepage_featured", "category_search"]),
  billingModel: z.enum(["time_based", "view_based"]),
  budgetAmount: z.number().min(1),
  currency: z.string().length(3).optional(),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  viewLimit: z.number().min(1).optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be 128 characters or fewer"),
  role: z.enum(["musician", "venue"]),
  venueName: z.string().min(2, "Venue name must be at least 2 characters").max(120).optional(),
  acceptedTerms: z.literal(true, { message: "You must accept the Terms of Service to create an account." }),
});

export const socialLinksSchema = z.object({
  website: z.string().max(300).optional(),
  instagram: z.string().max(300).optional(),
  twitter: z.string().max(300).optional(),
  facebook: z.string().max(300).optional(),
  youtube: z.string().max(300).optional(),
  spotify: z.string().max(300).optional(),
  appleMusic: z.string().max(300).optional(),
  soundcloud: z.string().max(300).optional(),
  tiktok: z.string().max(300).optional(),
});

export const musicianProfileSchema = z.object({
  stageName: z.string().min(1, "Stage name is required"),
  bio: z.string().max(2000).optional(),
  experienceYears: z.number().min(0).max(100).optional(),
  location: z.string().optional(),
  genres: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  socialLinks: socialLinksSchema.optional(),
  instruments: z.array(z.string().max(60)).max(20).optional(),
  primaryCategory: z.string().refine((value) => Boolean(normalizeCategory(value)), "Choose a creative category").transform((value) => normalizeCategory(value)!).optional(),
  subgenres: tags.optional(),
  influences: tags.optional(),
  favorites: z.array(z.string().trim().min(1).max(160)).max(4).optional(),
  performanceFee: money.nullable().optional(),
  hourlyFee: money.nullable().optional(),
  dayFee: money.nullable().optional(),
  profileImage: optionalUrl,
  bannerImage: optionalUrl,
});

export const venueProfileSchema = z.object({
  venueName: z.string().min(1, "Venue name is required"),
  description: z.string().max(2000).optional(),
  location: z.string().optional(),
  capacity: z.number().min(0).optional(),
  venueType: z.string().optional(),
});

export const bookingRequestSchema = z.object({
  musicianId: z.string(),
  jobApplicationId: z.string().optional(),
  title: z.string().min(2).max(120).optional(),
  eventType: z.string().min(2).max(80).optional(),
  eventDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  venueAddress: z.string().max(240).optional(),
  audienceSize: z.number().min(0).max(500000).optional(),
  loadInTime: z.string().optional(),
  soundcheckTime: z.string().optional(),
  setupNotes: z.string().max(2000).optional(),
  requiredServices: z.array(z.string()).optional(),
  equipmentProvided: z.array(z.string()).optional(),
  hospitality: z.record(z.string(), z.unknown()).optional(),
  contactName: z.string().max(120).optional(),
  contactEmail: z.email().optional(),
  contactPhone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  fee: z.number().min(0),
  currency: z.string().length(3).optional(),
  depositAmount: z.number().min(0).optional(),
  cancellationPolicy: z.string().max(2000).optional(),
  paymentMethodId: z.string().min(1, "A saved payment method is required"),
});

export const reviewSchema = z.object({
  bookingId: z.string(),
  musicianId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const trackUploadSchema = z.object({
  title: z.string().min(1, "Track title is required"),
  genre: z.string().optional(),
  trackNumber: z.number().min(1).optional(),
});

export const albumSchema = z.object({
  title: z.string().min(1, "Album title is required"),
  releaseYear: z.number().min(1900).max(new Date().getFullYear() + 1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MusicianProfileInput = z.infer<typeof musicianProfileSchema>;
export type VenueProfileInput = z.infer<typeof venueProfileSchema>;
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export const projectListingSchema = z.object({
  title: z.string().trim().min(4, "Project title must be at least 4 characters").max(140),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(5000),
  deadline: z.union([z.iso.datetime({ offset: true }), z.literal("")]).optional(),
  budgetMin: money.optional(),
  budgetMax: money.optional(),
  hideBudget: z.boolean().optional(),
  currency: z.literal("EUR").optional(),
  categories: tags.optional(),
  genres: tags.optional(),
  requiredServices: z.array(z.string().trim().min(1).max(160)).max(30).optional(),
  status: z.enum(["draft", "published", "paused", "closed", "filled", "expired"]).optional(),
});

export const projectApplicationSchema = z.object({
  coverMessage: z.string().trim().max(2000).optional(),
  proposedFee: money.optional(),
});

export type JobListingInput = z.infer<typeof jobListingSchema>;
export type ProjectListingInput = z.infer<typeof projectListingSchema>;
export type ProjectApplicationInput = z.infer<typeof projectApplicationSchema>;
export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;
export type PromotionCampaignInput = z.infer<typeof promotionCampaignSchema>;
