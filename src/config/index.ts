import type { MembershipTier, Genre, EquipmentItem } from "@/types";

export const APP_NAME = "IndieCentral";
export const APP_TAGLINE = "Connecting creative talent with opportunity.";
export const CURRENT_TERMS_VERSION = "2026-10-13";
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
  { label: "Calendar", href: "/musician/calendar", icon: "Calendar" },
  { label: "Bookings", href: "/musician/bookings", icon: "Calendar" },
  { label: "Open Projects", href: "/musician/jobs", icon: "Briefcase" },
  { label: "Deliverable Projects", href: "/musician/projects", icon: "FileText" },
  { label: "Applications", href: "/musician/applications", icon: "FileText" },
  { label: "Collaborate", href: "/musician/p2p/discover", icon: "Users" },
  { label: "Messages", href: "/musician/p2p/messages", icon: "MessageCircle" },
  { label: "Payouts", href: "/musician/payouts", icon: "Wallet" },
  { label: "Reviews", href: "/musician/reviews", icon: "Star" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;

export const DASHBOARD_NAV_VENUE = [
  { label: "Overview", href: "/venue", icon: "LayoutDashboard" },
  { label: "Profile", href: "/venue/profile", icon: "User" },
  { label: "Find Talent", href: "/venue/search", icon: "Search" },
  { label: "Calendar", href: "/venue/calendar", icon: "Calendar" },
  { label: "Bookings", href: "/venue/bookings", icon: "Calendar" },
  { label: "Job Listings", href: "/venue/jobs", icon: "Briefcase" },
  { label: "Project Listings", href: "/venue/projects", icon: "FileText" },
  { label: "Payment Methods", href: "/venue/payment-methods", icon: "Wallet" },
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
  { id: "audiovisual_crew", name: "Audiovisual Crew", slug: "audiovisual-crew", icon: "Video" },
  { id: "promotional_work", name: "Promotional Work", slug: "promotional-work", icon: "Megaphone" },
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

// ── Services ─────────────────────────────────────────────────
// What a creative offers as a bookable service — distinct from genre/style
// and from CREATIVE_CATEGORIES ("what kind of creative they are"). Applies
// across every profile type (musicians, DJs, voice actors, videographers,
// sound engineers, animators, photographers, etc.), not just musicians.
// PLACEHOLDER — Valm's final content pending.
export const SERVICES: Genre[] = [
  { id: "s1", name: "Session Recording", slug: "session-recording" },
  { id: "s2", name: "Live Sound Mixing", slug: "live-sound-mixing" },
  { id: "s3", name: "Music Lessons", slug: "music-lessons" },
  { id: "s4", name: "Video Editing", slug: "video-editing" },
  { id: "s5", name: "Event Photography", slug: "event-photography" },
];

// ── P2P compatibility questionnaire ──────────────────────────
// 7 questions, each skippable. Answers stored keyed by question id so
// wording can change without a migration. PLACEHOLDER — wording open to
// revision.
export interface P2PQuestionnaireQuestion {
  id: string;
  prompt: string;
  type: "single_choice" | "multi_choice" | "text";
  options?: string[];
  skippable: true;
}

export const P2P_QUESTIONNAIRE: P2PQuestionnaireQuestion[] = [
  {
    id: "q1",
    prompt: "When collaborating, do you prefer to lead or support?",
    type: "single_choice",
    options: ["Lead", "Support", "Depends on the project"],
    skippable: true,
  },
  {
    id: "q2",
    prompt: "What's your typical turnaround expectation for a collaboration?",
    type: "single_choice",
    options: ["Within days", "1-2 weeks", "A month or more", "Flexible"],
    skippable: true,
  },
  {
    id: "q3",
    prompt: "How do you prefer to stay in touch during a project?",
    type: "single_choice",
    options: ["Daily check-ins", "Weekly updates", "Only when needed"],
    skippable: true,
  },
  {
    id: "q4",
    prompt: "Which genres are you most interested in collaborating within?",
    type: "multi_choice",
    skippable: true,
  },
  {
    id: "q5",
    prompt: "Do you prefer remote or in-person collaboration?",
    type: "single_choice",
    options: ["Remote", "In-person", "Either works"],
    skippable: true,
  },
  {
    id: "q6",
    prompt: "How much experience do you have collaborating with other creatives?",
    type: "single_choice",
    options: ["Just starting out", "Some experience", "Very experienced"],
    skippable: true,
  },
  {
    id: "q7",
    prompt: "What are you hoping to get out of P2P collaboration?",
    type: "text",
    skippable: true,
  },
];

// ── Technical rider equipment catalog ───────────────────────
export const EQUIPMENT_CATEGORIES = ["Sound", "Lighting", "Staging", "Backline", "Power", "Other"] as const;

export const EQUIPMENT_ITEMS: EquipmentItem[] = [
  { id: "e1", name: "PA System", slug: "pa-system", category: "Sound" },
  { id: "e2", name: "Vocal Microphone", slug: "vocal-microphone", category: "Sound" },
  { id: "e3", name: "Instrument Microphone", slug: "instrument-microphone", category: "Sound" },
  { id: "e4", name: "DI Box", slug: "di-box", category: "Sound" },
  { id: "e5", name: "Monitor Wedge", slug: "monitor-wedge", category: "Sound" },
  { id: "e6", name: "In-Ear Monitor System", slug: "in-ear-monitor-system", category: "Sound" },
  { id: "e7", name: "Mixing Console", slug: "mixing-console", category: "Sound" },
  { id: "e8", name: "DJ Mixer / Controller", slug: "dj-mixer-controller", category: "Sound" },
  { id: "e9", name: "CDJ / Turntables", slug: "cdj-turntables", category: "Sound" },
  { id: "e10", name: "Stage Lighting Rig", slug: "stage-lighting-rig", category: "Lighting" },
  { id: "e11", name: "Follow Spot", slug: "follow-spot", category: "Lighting" },
  { id: "e12", name: "Haze / Fog Machine", slug: "haze-fog-machine", category: "Lighting" },
  { id: "e13", name: "Riser / Stage Platform", slug: "riser-stage-platform", category: "Staging" },
  { id: "e14", name: "Backdrop / Projection Screen", slug: "backdrop-projection-screen", category: "Staging" },
  { id: "e15", name: "Drum Kit", slug: "drum-kit", category: "Backline" },
  { id: "e16", name: "Bass Amp", slug: "bass-amp", category: "Backline" },
  { id: "e17", name: "Guitar Amp", slug: "guitar-amp", category: "Backline" },
  { id: "e18", name: "Keyboard / Piano", slug: "keyboard-piano", category: "Backline" },
  { id: "e19", name: "Power Distribution (generator/mains)", slug: "power-distribution", category: "Power" },
  { id: "e20", name: "Green Room / Dressing Area", slug: "green-room", category: "Other" },
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
