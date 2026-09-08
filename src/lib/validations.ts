import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const jobListingSchema = z.object({
  title: z.string().min(4, "Job title must be at least 4 characters").max(140),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  eventType: z.string().min(2).max(80),
  eventDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  venueAddress: z.string().max(240).optional(),
  location: z.string().max(120).optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  genres: z.array(z.string()).optional(),
  requiredServices: z.array(z.string()).optional(),
  equipmentProvided: z.array(z.string()).optional(),
  applicationDeadline: z.string().optional(),
  status: z.enum(["draft", "published", "paused", "closed", "filled", "expired"]).optional(),
});

export const jobApplicationSchema = z.object({
  coverMessage: z.string().min(20, "Tell the venue why you are a good fit").max(3000),
  proposedFee: z.number().min(0).optional(),
  availabilityNotes: z.string().max(1500).optional(),
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
});

export const musicianProfileSchema = z.object({
  stageName: z.string().min(1, "Stage name is required"),
  bio: z.string().max(2000).optional(),
  experienceYears: z.number().min(0).max(100).optional(),
  location: z.string().optional(),
  genres: z.array(z.string()).optional(),
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
export type JobListingInput = z.infer<typeof jobListingSchema>;
export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;
export type PromotionCampaignInput = z.infer<typeof promotionCampaignSchema>;
