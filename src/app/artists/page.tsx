import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ArtistDirectory } from "@/components/artists/artist-directory";
import { discoverArtists } from "@/lib/discovery";
import { discoveryQuerySchema } from "@/lib/discovery-utils";
import { AudioLines, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Discover Talent" };

export default async function ArtistsPage() {
  const artists = await discoverArtists(discoveryQuerySchema.parse({}));

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          <section className="page-intro mb-8">
            <AudioLines aria-hidden="true" className="pointer-events-none absolute -right-5 top-6 hidden h-64 w-64 rotate-12 text-brand/5 sm:block" />
            <div className="relative max-w-2xl">
              <p className="eyebrow mb-4">Independent talent. Real connections.</p>
              <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-5xl">Find your next<br className="hidden sm:block" /> creative connection.</h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">Explore musicians, makers, and creative minds. Find a sound that stays with you, or the right person to bring your next idea to life.</p>
              <Link href="/jobs" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">Looking for a gig? Explore open calls <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
          </section>

          <ArtistDirectory artists={artists} />
        </div>
      </main>
      <Footer />
    </>
  );
}
