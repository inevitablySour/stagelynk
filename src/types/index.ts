// ── User & Auth ──────────────────────────────────────────────
export type UserRole = "musician" | "venue" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  createdAt: string;
}

// ── Musician / Artist ────────────────────────────────────────
export interface MusicianProfile {
  id: string;
  userId: string;
  stageName: string;
  bio: string;
  genres: Genre[];
  services: Genre[];
  experienceYears: number;
  location: string;
  profileImage?: string;
  bannerImage?: string;
  socialLinks: SocialLinks;
  availability: AvailabilitySlot[];
  instruments: string[];
  subgenres?: string[];
  influences?: string[];
  favorites?: string[];
  performanceFee?: number | null;
  hourlyFee?: number | null;
  dayFee?: number | null;
  credentials: Credential[];
  rating: number;
  weightedRating: number;
  reviewCount: number;
  discography: Album[];
  primaryCategory: string;
  createdAt: string;
}

export interface SocialLinks {
  website?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  youtube?: string;
  spotify?: string;
  appleMusic?: string;
  soundcloud?: string;
  tiktok?: string;
}

export interface AvailabilitySlot {
  id: string;
  startDate: string;
  endDate: string;
}

export type CredentialType = "degree" | "certificate" | "license" | "award";

export interface Credential {
  id: string;
  type: CredentialType;
  title: string;
  issuer: string;
  year?: number;
}

// ── Discography / Music ──────────────────────────────────────
export type MusicSource = "spotify" | "apple_music" | "manual";

export interface Album {
  id: string;
  title: string;
  coverArt?: string;
  releaseYear: number;
  source: MusicSource;
  externalUrl?: string;
  tracks: Track[];
}

export interface Track {
  id: string;
  title: string;
  duration: number; // seconds
  trackNumber: number;
  previewUrl?: string; // 30s preview or uploaded mp3
  genre?: string;
}

// ── Venue ────────────────────────────────────────────────────
export interface VenueProfile {
  id: string;
  userId: string;
  venueName: string;
  description: string;
  location: string;
  capacity: number;
  venueType: string;
  profileImage?: string;
  bannerImage?: string;
  membershipTier?: MembershipTier;
  createdAt: string;
}

// ── Booking ──────────────────────────────────────────────────
export type BookingStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "authorized" | "paid" | "failed" | "refunded" | "cancelled";
export type PayoutStatus = "pending" | "scheduled" | "paid" | "failed" | "cancelled";
export type BookingSource = "direct_request" | "job_application" | "manual";

export interface BookingServiceRequirement {
  label: string;
  included: boolean;
  notes?: string;
}

export interface Booking {
  id: string;
  musicianId: string;
  venueId: string;
  title: string;
  eventType: string;
  musician?: MusicianProfile;
  venue?: VenueProfile;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueAddress: string;
  audienceSize?: number;
  loadInTime?: string;
  soundcheckTime?: string;
  setupNotes?: string;
  requiredServices: BookingServiceRequirement[];
  equipmentProvided: string[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: BookingStatus;
  notes?: string;
  fee: number;
  currency: string;
  depositAmount: number;
  platformFeeRate: number;
  platformFeeAmount: number;
  processorFeeEstimate: number;
  totalChargeAmount: number;
  netPayoutAmount: number;
  paymentStatus: PaymentStatus;
  payoutStatus: PayoutStatus;
  cancellationPolicy?: string;
  source: BookingSource;
  createdAt: string;
}

// ── Jobs & Applications ──────────────────────────────────────
export type JobListingStatus = "draft" | "published" | "paused" | "closed" | "filled" | "expired";
export type JobApplicationStatus = "submitted" | "shortlisted" | "declined" | "accepted" | "withdrawn";

export interface JobListing {
  id: string;
  venueId: string;
  title: string;
  description: string;
  eventType: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  venueAddress?: string;
  location: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  genres: string[];
  requiredServices: string[];
  equipmentProvided: string[];
  applicationDeadline?: string;
  status: JobListingStatus;
  isPromoted: boolean;
  visibilityScore: number;
  applicantCount?: number;
  venueName?: string;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobListingId: string;
  musicianId: string;
  coverMessage: string;
  proposedFee?: number;
  availabilityNotes?: string;
  status: JobApplicationStatus;
  jobListing?: JobListing;
  musician?: MusicianProfile;
  createdAt: string;
}

// ── Transaction fees & promotions ────────────────────────────
export type PromotionPlacement = "talent_search" | "job_listing" | "homepage_featured" | "category_search";
export type PromotionBillingModel = "time_based" | "view_based";
export type PromotionStatus = "draft" | "scheduled" | "active" | "paused" | "completed" | "cancelled";

export interface MarketplaceFeeBreakdown {
  performanceFee: number;
  platformFeeRate: number;
  platformFeeAmount: number;
  processorFeeEstimate: number;
  totalChargeAmount: number;
  artistPayoutAmount: number;
  currency: string;
}

export interface PromotionCampaign {
  id: string;
  venueId: string;
  jobListingId?: string;
  placement: PromotionPlacement;
  billingModel: PromotionBillingModel;
  status: PromotionStatus;
  budgetAmount: number;
  spentAmount: number;
  currency: string;
  startsAt: string;
  endsAt?: string;
  viewLimit?: number;
  views: number;
  clicks: number;
}

// ── Review ───────────────────────────────────────────────────
export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  musicianId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  reviewer?: {
    name: string;
    image?: string;
    venueName?: string;
  };
}

// ── Membership ───────────────────────────────────────────────
export interface MembershipTier {
  id: string;
  name: "free" | "pro" | "enterprise";
  price: number; // monthly
  features: string[];
}

// ── Genre ────────────────────────────────────────────────────
export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  slug: string;
  category: string;
}

export interface EquipmentRequirement {
  equipmentId: string;
  name: string;
  category: string;
  quantity: number;
  notes: string;
}

export interface TechnicalGap {
  equipmentId: string;
  name: string;
  category: string;
  quantityNeeded: number;
  quantityAvailable: number;
  shortfall: number;
}

// ── Search & Filters ─────────────────────────────────────────
export interface ArtistSearchFilters {
  query?: string;
  genres?: string[];
  categories?: string[];
  instruments?: string[];
  hasCredentials?: boolean;
  minRating?: number;
  location?: string;
  experienceMin?: number;
  experienceMax?: number;
  /** ISO date — only artists with an open availability window covering this date. */
  availableOn?: string;
  sortBy?: "rating" | "experience" | "name" | "newest";
}

// ── API Response ─────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
