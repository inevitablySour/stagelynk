import Link from "next/link";
import { Mic2, Search, ShieldCheck, Sparkles, ArrowRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { APP_NAME } from "@/config";

export const metadata = { title: "About" };

const values = [
  {
    icon: Mic2,
    title: "Creatives come first",
    description:
      "Joining and building a profile is always free. Creatives keep 100% of their quoted rate — the platform fee is paid by the client, never deducted from your earnings.",
  },
  {
    icon: Search,
    title: "Discovery that actually works",
    description:
      "Search and filters are built around how clients actually hire — by category, skill, rating, availability, and location — not a generic listings page.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent by default",
    description:
      "Every booking shows a full cost breakdown before money moves: the creative's fee, the platform fee, and the processing estimate — no surprises on either side.",
  },
  {
    icon: Sparkles,
    title: "Built for every kind of creative",
    description:
      "Musicians, voice actors, animators, actors, DJs, photographers, and more — one platform, built around the reality that creative work isn't one-size-fits-all.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-soft via-surface to-page">
          <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-olive-200/40 blur-3xl" />
          <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl">
              About {APP_NAME}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
              {APP_NAME} is the marketplace connecting creative talent with the clients who need
              them — built to make discovering, booking, and getting paid for creative work as
              simple as it should be.
            </p>
          </div>
        </section>

        <section className="section-muted py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                What we believe
              </h2>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {values.map((value) => (
                <Card key={value.title}>
                  <CardHeader>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-olive-100 text-olive-600">
                      <value.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="mt-3">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-stone-500">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="section-raised py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-copper-100 text-copper-600">
              <Heart className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-stone-900 sm:text-3xl">
              Still early, built in the open
            </h2>
            <p className="mt-4 text-stone-500">
              {APP_NAME} is currently in beta. We&apos;re building this alongside the people who
              use it — creatives and clients booking real work, every day. If something&apos;s
              missing or broken, we want to hear about it.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">
                  Join free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Get in touch</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
