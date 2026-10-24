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

// ── Creative Category Hierarchy ──────────────────────────────
// 3 broad groups, each with specific subcategories. One subcategory
// (Instrumentalist & Session Musician) has a further nested level of
// instrument types. Seeded into CategoryGroup/CategorySubtype/
// InstrumentType via scripts/seed-category-genre.ts — this constant
// is the single source of content, read by both the seed script and
// any place that needs the content shape without a DB round-trip.
export interface CategorySubtypeSpec {
  name: string;
  slug: string;
  instrumentTypes?: { name: string; slug: string }[];
}
export interface CategoryGroupSpec {
  name: string;
  slug: string;
  subcategories: CategorySubtypeSpec[];
}

export const CATEGORY_GROUPS: CategoryGroupSpec[] = [
  {
    name: "Music & Audio Production",
    slug: "music-audio-production",
    subcategories: [
      { name: "Audio Mixing & Mastering Engineer", slug: "audio-mixing-mastering-engineer" },
      { name: "Band / Musical Group", slug: "band-musical-group" },
      { name: "Boom Operator", slug: "boom-operator" },
      { name: "DJ", slug: "dj" },
      { name: "Film Composer & Scoring", slug: "film-composer-scoring" },
      {
        name: "Instrumentalist & Session Musician",
        slug: "instrumentalist-session-musician",
        instrumentTypes: [
          { name: "Guitarist", slug: "guitarist" },
          { name: "Bassist", slug: "bassist" },
          { name: "Keyboardist/Pianist", slug: "keyboardist-pianist" },
          { name: "Drummer", slug: "drummer" },
          { name: "Saxophonist", slug: "saxophonist" },
          { name: "Violinist", slug: "violinist" },
          { name: "Flautist", slug: "flautist" },
          { name: "Percussionists", slug: "percussionists" },
          { name: "Brass", slug: "brass" },
          { name: "Strings", slug: "strings" },
        ],
      },
      { name: "Music Producer", slug: "music-producer" },
      { name: "Rapper / MC", slug: "rapper-mc" },
      { name: "Songwriter / Lyricist", slug: "songwriter-lyricist" },
      { name: "Sound Designer / SFX", slug: "sound-designer-sfx" },
      { name: "Vocalist / Singer", slug: "vocalist-singer" },
    ],
  },
  {
    name: "Film & Audiovisual Crew",
    slug: "film-audiovisual-crew",
    subcategories: [
      { name: "Actors / Actresses", slug: "actors-actresses" },
      { name: "Hair & Makeup Artist", slug: "hair-makeup-artist" },
      { name: "Production Designer & Art Director", slug: "production-designer-art-director" },
      { name: "Wardrobe & Costume Designer", slug: "wardrobe-costume-designer" },
      { name: "Camera Operator & Focus Puller", slug: "camera-operator-focus-puller" },
      { name: "Director of Photography / Cinematography", slug: "director-of-photography-cinematography" },
      { name: "Gaffer / Lighting Technician", slug: "gaffer-lighting-technician" },
      { name: "Key Grip", slug: "key-grip" },
      { name: "Director", slug: "director" },
      { name: "Screenwriter", slug: "screenwriter" },
      { name: "Producer / Production Manager", slug: "producer-production-manager" },
      { name: "Colorist", slug: "colorist" },
      { name: "2D/3D/Stopmotion Animator", slug: "2d-3d-stopmotion-animator" },
      { name: "VFX Artist", slug: "vfx-artist" },
      { name: "Video & Film Editor", slug: "video-film-editor" },
    ],
  },
  {
    name: "Visual Artists & Creative Design",
    slug: "visual-artists-creative-design",
    subcategories: [
      { name: "Creative Director", slug: "creative-director" },
      { name: "Photographer", slug: "photographer" },
      { name: "Set & Stage Designer", slug: "set-stage-designer" },
      { name: "Visual & Digital Artist", slug: "visual-digital-artist" },
    ],
  },
];

// ── Film Formats ──────────────────────────────────────────────
// Portfolio/filter tags for filmmakers & audiovisual crew — distinct
// from category (role) and not a genre concept, since filmmakers tag
// work by format instead of musical genre.
export const FILM_FORMATS = [
  { name: "Short Film", slug: "short-film" },
  { name: "Feature Film", slug: "feature-film" },
  { name: "Music Video", slug: "music-video" },
  { name: "Commercial / Promo", slug: "commercial-promo" },
  { name: "Documentary", slug: "documentary" },
  { name: "Experimental / Avant-Garde Film", slug: "experimental-avant-garde-film" },
  { name: "Live Event / Session", slug: "live-event-session" },
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

// ── Genre Hierarchy ───────────────────────────────────────────
// 9 broad groups, each with specific subgenres plus one "Other"
// free-text row (isOther: true) for a custom tag. A musician picks
// exactly 1 main broad group, then 1-3 subgenres from within it.
// Filmmakers/AV crew don't get genre tags — see FILM_FORMATS above.
export interface GenreSubtypeSpec {
  name: string;
  slug: string;
  isOther?: true;
}
export interface GenreGroupSpec {
  name: string;
  slug: string;
  subgenres: GenreSubtypeSpec[];
}

function withOther(name: string, slug: string, subgenres: { name: string; slug: string }[]): GenreSubtypeSpec[] {
  return [...subgenres, { name: "Other", slug: `${slug}-other`, isOther: true }];
}

export const GENRE_GROUPS: GenreGroupSpec[] = [
  {
    name: "Rock",
    slug: "rock",
    subgenres: withOther("Rock", "rock", [
      { name: "Punk Rock", slug: "punk-rock" },
      { name: "Garage Rock", slug: "garage-rock" },
      { name: "Grunge", slug: "grunge" },
      { name: "Hardcore / Post-Hardcore", slug: "hardcore-post-hardcore" },
      { name: "Gothic Rock", slug: "gothic-rock" },
      { name: "Post-Punk", slug: "post-punk" },
      { name: "Noise Rock", slug: "noise-rock" },
      { name: "Shoegaze", slug: "shoegaze" },
      { name: "Post-Rock", slug: "post-rock" },
      { name: "Progressive Rock", slug: "progressive-rock" },
      { name: "Psychedelic Rock", slug: "psychedelic-rock" },
      { name: "Math Rock", slug: "math-rock" },
      { name: "Hard Rock", slug: "hard-rock" },
      { name: "Industrial", slug: "industrial" },
      { name: "Jangle pop", slug: "jangle-pop" },
      { name: "Blues Rock", slug: "blues-rock" },
      { name: "Alternative / Indie Rock", slug: "alternative-indie-rock" },
    ]),
  },
  {
    name: "Electronic & Dance",
    slug: "electronic-dance",
    subgenres: withOther("Electronic & Dance", "electronic-dance", [
      { name: "Ambient / Drone / Soundscape", slug: "ambient-drone-soundscape" },
      { name: "House", slug: "house" },
      { name: "Techno", slug: "techno" },
      { name: "Drum & Bass / Jungle", slug: "drum-and-bass-jungle" },
      { name: "EDM", slug: "edm" },
      { name: "Experimental / IDM", slug: "experimental-idm" },
      { name: "Trip-Hop", slug: "trip-hop" },
      { name: "Downtempo / Chillout", slug: "downtempo-chillout" },
      { name: "Dubstep", slug: "dubstep" },
      { name: "Trance", slug: "trance" },
      { name: "Electronica", slug: "electronica" },
      { name: "Synthwave", slug: "synthwave" },
      { name: "Vaporwave", slug: "vaporwave" },
      { name: "UK Garage / Grime", slug: "uk-garage-grime" },
    ]),
  },
  {
    name: "Metal",
    slug: "metal",
    subgenres: withOther("Metal", "metal", [
      { name: "Hardcore", slug: "metal-hardcore" },
      { name: "Black Metal", slug: "black-metal" },
      { name: "Death Metal", slug: "death-metal" },
      { name: "Thrash", slug: "thrash" },
      { name: "Doom", slug: "doom" },
      { name: "Progressive Metal", slug: "progressive-metal" },
      { name: "Heavy Metal", slug: "heavy-metal" },
      { name: "Grindcore / Deathcore / Metalcore", slug: "grindcore-deathcore-metalcore" },
    ]),
  },
  {
    name: "Hip-Hop & Rap",
    slug: "hip-hop-rap",
    subgenres: withOther("Hip-Hop & Rap", "hip-hop-rap", [
      { name: "Rap", slug: "rap" },
      { name: "Underground hip-hop", slug: "underground-hip-hop" },
      { name: "Instrumental hip-hop", slug: "instrumental-hip-hop" },
      { name: "Trap", slug: "trap" },
      { name: "Conscious", slug: "conscious" },
      { name: "Boom-bap", slug: "boom-bap" },
      { name: "Alternative hip-hop", slug: "alternative-hip-hop" },
      { name: "Drill", slug: "drill" },
      { name: "Experimental / Abstract Rap", slug: "experimental-abstract-rap" },
    ]),
  },
  {
    name: "Acoustic & Folk",
    slug: "acoustic-folk",
    subgenres: withOther("Acoustic & Folk", "acoustic-folk", [
      { name: "Singer-Songwriter", slug: "singer-songwriter" },
      { name: "Folk Rock", slug: "folk-rock" },
      { name: "Indie folk", slug: "indie-folk" },
      { name: "Experimental Folk", slug: "experimental-folk" },
      { name: "Acoustic & Delta Blues", slug: "acoustic-delta-blues" },
      { name: "Country / Bluegrass / Americana", slug: "country-bluegrass-americana" },
      { name: "Traditional Folk", slug: "traditional-folk" },
      { name: "Electric Blues", slug: "electric-blues" },
    ]),
  },
  {
    name: "Jazz",
    slug: "jazz",
    subgenres: withOther("Jazz", "jazz", [
      { name: "Bebop", slug: "bebop" },
      { name: "Vocal Jazz", slug: "vocal-jazz" },
      { name: "Spiritual Jazz", slug: "spiritual-jazz" },
      { name: "Latin Jazz", slug: "latin-jazz" },
      { name: "Free Jazz", slug: "free-jazz" },
      { name: "Big Band / Modern Swing", slug: "big-band-modern-swing" },
      { name: "Smooth Jazz", slug: "smooth-jazz" },
      { name: "Cool Jazz", slug: "cool-jazz" },
      { name: "Hard-Bop", slug: "hard-bop" },
      { name: "Modal Jazz", slug: "modal-jazz" },
      { name: "Modern Jazz trio / quartet", slug: "modern-jazz-trio-quartet" },
    ]),
  },
  {
    name: "Fusion & Experimental",
    slug: "fusion-experimental",
    subgenres: withOther("Fusion & Experimental", "fusion-experimental", [
      { name: "Jazz-Rock Fusion", slug: "jazz-rock-fusion" },
      { name: "Jazz-Funk Fusion", slug: "jazz-funk-fusion" },
      { name: "Soul-Jazz", slug: "soul-jazz" },
      { name: "Electric Jazz Fusion", slug: "electric-jazz-fusion" },
      { name: "Avant-Garde", slug: "avant-garde" },
      { name: "Musique Concrete", slug: "musique-concrete" },
      { name: "Experimental Rock", slug: "experimental-rock" },
      { name: "Noise", slug: "noise" },
      { name: "Contemporary Classical / Modern Minimalism", slug: "contemporary-classical-modern-minimalism" },
    ]),
  },
  {
    name: "Soundtrack",
    slug: "soundtrack",
    subgenres: withOther("Soundtrack", "soundtrack", [
      { name: "Film Music", slug: "film-music" },
      { name: "Video Game soundtrack", slug: "video-game-soundtrack" },
    ]),
  },
  {
    name: "Pop",
    slug: "pop",
    subgenres: withOther("Pop", "pop", [
      { name: "Pop Punk", slug: "pop-punk" },
      { name: "Contemporary R&B / Soul", slug: "contemporary-rnb-soul" },
      { name: "Indie Pop", slug: "indie-pop" },
      { name: "Pop-rock", slug: "pop-rock" },
      { name: "Synth pop", slug: "synth-pop" },
      { name: "Progressive / Art Pop", slug: "progressive-art-pop" },
      { name: "New Wave", slug: "new-wave" },
    ]),
  },
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
