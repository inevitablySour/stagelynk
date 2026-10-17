import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { listOpenCalls } from "@/lib/open-calls";
import { OpenCallFeed } from "@/components/jobs/open-call-feed";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Open Calls & Projects" };

export default async function PublicJobsPage() {
  const jobs = await listOpenCalls();

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          <section className="page-intro mb-8">
            <CalendarDays aria-hidden="true" className="pointer-events-none absolute -right-5 top-6 hidden h-64 w-64 rotate-12 text-brand/5 sm:block" />
            <div className="relative max-w-2xl">
              <p className="eyebrow mb-4">Your next chapter starts here</p>
              <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-5xl">Open calls.<br className="hidden sm:block" /> New possibilities.</h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">Live stages, creative projects, and people looking for your kind of talent. Explore the brief, find your fit, and put yourself forward.</p>
              <Link href="/artists" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">Hiring for something? Discover creatives <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
          </section>

          <OpenCallFeed initial={jobs} />
        </div>
      </main>
      <Footer />
    </>
  );
}
