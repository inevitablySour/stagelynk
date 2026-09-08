import Link from "next/link";
import {
  Search, Calendar, Star, Shield, ArrowRight, CheckCircle2, Disc3, Mic2, Globe, Users, LayoutDashboard, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { APP_NAME } from "@/config";
import { auth } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

const features = [
  { icon: Disc3, title: "Creative Portfolios", description: "Musicians, voice actors, animators, actors, and DJs showcase their work with portfolios, reels, and media — import from platforms or upload directly." },
  { icon: Search, title: "Smart Discovery", description: "Clients search and filter talent by category, skills, rating, availability, and location to find the perfect creative match." },
  { icon: Calendar, title: "Seamless Booking", description: "Request bookings with dates, times, and fees. Track status from pending to completed — all in one place." },
  { icon: Star, title: "Reviews & Ratings", description: "After every project, clients leave reviews that build a creative's reputation and help future hirers." },
  { icon: Shield, title: "Trusted Marketplace", description: "Every booking is protected with transparent fees, clear payment breakdowns, and a 5% platform commission — no hidden costs." },
  { icon: Globe, title: "Connect Your Platforms", description: "Link Spotify, Apple Music, demo reels, portfolios, or social profiles to auto-import your body of work." },
];

const stats = [
  { value: "10K+", label: "Creatives" },
  { value: "2K+", label: "Clients" },
  { value: "50K+", label: "Projects Booked" },
  { value: "4.8", label: "Avg Rating" },
];
function getDashboardHref(role?: UserRole) {
  return role === "venue" ? "/venue" : "/musician";
}

export default async function LandingPage() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);
  const dashboardHref = getDashboardHref(session?.user.role);
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-soft via-surface to-page">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-olive-200/40 blur-3xl" />
          <div className="absolute top-60 -left-40 h-[400px] w-[400px] rounded-full bg-copper-200/30 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="mb-6">
                {isAuthenticated ? "Welcome back — continue booking" : "Now in Beta — Join Free"}
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
                Book creative talent.{" "}
                <span className="bg-gradient-to-r from-olive-600 to-copper-600 bg-clip-text text-transparent">
                  Get discovered.
                </span>
              </h1>
              <p className="mt-6 text-lg text-stone-600 sm:text-xl max-w-2xl mx-auto">
                {APP_NAME} is the marketplace where musicians, voice actors, animators, actors, and
                creative professionals connect with clients who need talent.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                {isAuthenticated ? (
                  <>
                    <Button size="lg" asChild>
                      <Link href={dashboardHref}>
                        <LayoutDashboard className="mr-2 h-5 w-5" />
                        Go to dashboard
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link href="/settings">
                        <Settings className="mr-2 h-5 w-5" />
                        Account settings
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" asChild>
                      <Link href="/register">
                        <Mic2 className="mr-2 h-5 w-5" />
                        I&apos;m a Creative
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link href="/register">
                        <Users className="mr-2 h-5 w-5" />
                        I&apos;m Hiring
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mx-auto mt-20 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-extrabold text-brand">{stat.value}</div>
                  <div className="mt-1 text-sm text-muted">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────── */}
        <section className="section-brand relative overflow-hidden py-20 sm:py-28">
          <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -right-24 bottom-4 h-80 w-80 rounded-full bg-copper-400/15 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-surface sm:text-4xl">
                Everything you need to connect talent with opportunity
              </h2>
              <p className="mt-4 text-olive-100">
                Whether you&apos;re a musician, voice actor, animator, actor — or a client looking for creative talent — {APP_NAME} has you covered.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="border-accent/35 bg-olive-50/95 hover:-translate-y-1 hover:border-accent hover:shadow-[0_24px_60px_-35px_rgba(214,123,40,0.38)] transition-all">
                  <CardHeader>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-surface shadow-[0_12px_30px_-18px_rgba(214,123,40,0.9)]">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="mt-3 text-ink">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────── */}
        <section className="section-muted py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              How it works
            </h2>
            <div className="mt-16 grid gap-12 md:grid-cols-3">
              {[
                { step: "01", title: "Create your profile", desc: "Creatives build a portfolio with media, reels, and work samples. Clients set up their organisation and project needs." },
                { step: "02", title: "Discover & connect", desc: "Clients browse talent by category, skills, and rating. Post projects and receive applications from qualified creatives." },
                { step: "03", title: "Book & deliver", desc: "Creatives accept bookings, deliver their work, and receive reviews that build their reputation." },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-olive-600 text-white font-bold text-lg">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-stone-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────── */}
        <section id="pricing" className="section-raised py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-stone-500">
                Creatives join free. {APP_NAME} earns a 5% fee on completed bookings — no subscriptions required.
              </p>
            </div>
            <div className="mt-14 grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>For Creatives</CardTitle>
                  <div className="mt-2"><span className="text-4xl font-extrabold text-stone-900">Free</span></div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {["Create your profile & portfolio", "Apply to unlimited projects", "Get discovered by clients", "Receive bookings & reviews", "Connect Spotify, reels, & more"].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-stone-600"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button className="mt-6 w-full" asChild><Link href={isAuthenticated ? dashboardHref : "/register"}>{isAuthenticated ? "Go to dashboard" : "Join free"}</Link></Button>
                </CardContent>
              </Card>
              <Card className="border-brand/35 shadow-[0_24px_65px_-36px_rgba(47,59,29,0.55)] ring-2 ring-brand">
                <CardHeader>
                  <Badge className="w-fit mb-2">How it works</Badge>
                  <CardTitle>5% Transaction Fee</CardTitle>
                  <div className="mt-2"><span className="text-4xl font-extrabold text-stone-900">5%</span><span className="text-sm text-stone-500"> per booking</span></div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {["Only charged on completed bookings", "Transparent fee breakdown on every transaction", "No monthly subscriptions", "Processing fees shown separately", "Creatives receive 100% of their quoted fee"].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-stone-600"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button className="mt-6 w-full" asChild><Link href="/pricing">Learn more</Link></Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Paid Boosts</CardTitle>
                  <div className="mt-2"><span className="text-4xl font-extrabold text-stone-900">Optional</span></div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {["Promote job listings in search", "Boost visibility with time or view packs", "Homepage featured placement", "Category-level sponsorship", "Track views, clicks, and conversions"].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-stone-600"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button className="mt-6 w-full" variant="outline" asChild><Link href={isAuthenticated ? "/venue/promotions" : "/register"}>View boost options</Link></Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <section className="brand-gradient py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to connect talent with opportunity?</h2>
            <p className="mx-auto mt-4 max-w-xl text-olive-100">
              Join thousands of creatives and clients already using {APP_NAME} to discover, book, and collaborate.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="onGradient" asChild>
                <Link href={isAuthenticated ? dashboardHref : "/register"}>
                  {isAuthenticated ? "Go to dashboard" : "Sign up free"} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outlineOnGradient" asChild>
                <Link href="/artists">Browse talent</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
