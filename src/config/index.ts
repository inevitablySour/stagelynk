import type { MembershipTier, Genre } from "@/types";

export const APP_NAME = "StageLynk";
export const APP_TAGLINE = "Connecting creative talent with opportunity.";
export const APP_DESCRIPTION =
  "The marketplace connecting musicians, voice actors, animators, actors, and creative professionals with venues, studios, agencies, and clients who need talent.";

// ── Navigation ──────────────────────────────────────────────
export const NAV_LINKS = [
  { label: "Discover Talent", href: "/artists" },
  { label: "Open Projects", href: "/jobs" },
  { label: "Pricing", href: "/pricing" },
] as const;

export const DASHBOARD_NAV_MUSICIAN = [
  { label: "Overview", href: "/musician", icon: "LayoutDashboard" },
  { label: "Profile", href: "/musician/profile", icon: "User" },
  { label: "Portfolio", href: "/musician/discography", icon: "Music" },
  { label: "Bookings", href: "/musician/bookings", icon: "Calendar" },
  { label: "Open Projects", href: "/musician/jobs", icon: "Briefcase" },
  { label: "Applications", href: "/musician/applications", icon: "FileText" },
  { label: "Reviews", href: "/musician/reviews", icon: "Star" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;

export const DASHBOARD_NAV_VENUE = [
  { label: "Overview", href: "/venue", icon: "LayoutDashboard" },
  { label: "Find Talent", href: "/venue/search", icon: "Search" },
  { label: "Bookings", href: "/venue/bookings", icon: "Calendar" },
  { label: "Job Listings", href: "/venue/jobs", icon: "Briefcase" },
  { label: "Promotions", href: "/venue/promotions", icon: "Megaphone" },
  { label: "Reviews", href: "/venue/reviews", icon: "Star" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;

// ── Creative Categories ─────────────────────────────────────
export const CREATIVE_CATEGORIES = [
  { id: "musician", name: "Musician / Band", slug: "musician", icon: "Mic2" },
  { id: "dj", name: "DJ", slug: "dj", icon: "Disc3" },
  { id: "voice_actor", name: "Voice Actor", slug: "voice-actor", icon: "AudioLines" },
  { id: "actor", name: "Actor / Performer", slug: "actor", icon: "Drama" },
  { id: "animator", name: "Animator", slug: "animator", icon: "Film" },
  { id: "producer", name: "Music Producer", slug: "producer", icon: "Headphones" },
  { id: "sound_engineer", name: "Sound Engineer", slug: "sound-engineer", icon: "SlidersHorizontal" },
  { id: "theater", name: "Theatre / Stage", slug: "theater", icon: "Theater" },
  { id: "dancer", name: "Dancer / Choreographer", slug: "dancer", icon: "Footprints" },
  { id: "photographer", name: "Photographer / Videographer", slug: "photographer", icon: "Camera" },
  { id: "model", name: "Model", slug: "model", icon: "User" },
  { id: "other", name: "Other Creative", slug: "other", icon: "Sparkles" },
] as const;

// ── Client Types ────────────────────────────────────────────
export const CLIENT_TYPES = [
  "Venue",
  "Production Company",
  "Ad Agency",
  "Game Studio",
  "Film / TV Studio",
  "Event Planner",
  "Corporation",
  "Individual",
  "Non-Profit",
  "Other",
] as const;

// ── Genres ───────────────────────────────────────────────────
export const GENRES: Genre[] = [
  { id: "1", name: "Rock", slug: "rock" },
  { id: "2", name: "Pop", slug: "pop" },
  { id: "3", name: "Jazz", slug: "jazz" },
  { id: "4", name: "Blues", slug: "blues" },
  { id: "5", name: "Hip Hop", slug: "hip-hop" },
  { id: "6", name: "R&B", slug: "rnb" },
  { id: "7", name: "Electronic", slug: "electronic" },
  { id: "8", name: "Country", slug: "country" },
  { id: "9", name: "Classical", slug: "classical" },
  { id: "10", name: "Reggae", slug: "reggae" },
  { id: "11", name: "Metal", slug: "metal" },
  { id: "12", name: "Folk", slug: "folk" },
  { id: "13", name: "Latin", slug: "latin" },
  { id: "14", name: "Indie", slug: "indie" },
  { id: "15", name: "Soul", slug: "soul" },
  { id: "16", name: "Funk", slug: "funk" },
  { id: "17", name: "Afrobeats", slug: "afrobeats" },
  { id: "18", name: "Gospel", slug: "gospel" },
  { id: "19", name: "Punk", slug: "punk" },
  { id: "20", name: "Acoustic", slug: "acoustic" },
];

// ── Membership Tiers ────────────────────────────────────────
export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    id: "free",
    name: "free",
    price: 0,
    features: [
      "Browse artist previews",
      "Up to 3 booking requests / month",
      "Basic search filters",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "pro",
    price: 49,
    features: [
      "Full artist directory access",
      "Unlimited booking requests",
      "Advanced filters (genre, rating, availability)",
      "Direct messaging with artists",
      "Priority in search results",
      "Booking analytics dashboard",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "enterprise",
    price: 149,
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Bulk booking tools",
      "Custom artist recommendations",
      "API access for integrations",
      "Multi-venue management",
      "White-label booking pages",
      "24/7 phone support",
    ],
  },
];

// ── Venue Types (legacy, kept for venue-specific profiles) ──
export const VENUE_TYPES = [
  "Bar / Pub",
  "Club / Nightclub",
  "Concert Hall",
  "Restaurant",
  "Hotel / Resort",
  "Festival Grounds",
  "Private Event Space",
  "Theater",
  "Café",
  "Outdoor Venue",
  "Corporate Event",
  "Wedding Venue",
  "Recording Studio",
  "Broadcast Studio",
  "Other",
] as const;
