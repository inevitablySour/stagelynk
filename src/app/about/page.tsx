import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { APP_NAME } from "@/config";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-page">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-stone-900">About {APP_NAME}</h1>
          <div className="mt-6 space-y-4 text-stone-600 text-sm leading-relaxed">
            <p>{APP_NAME} is the marketplace connecting creative talent — musicians, voice actors, animators, actors, DJs, photographers, and more — with the clients who need them.</p>
            <p>Whether you&apos;re a solo performer looking for your next gig, a voice actor auditioning for animation roles, or a production company searching for the perfect creative team, {APP_NAME} makes it simple to discover, book, and collaborate.</p>
            <p>Our platform charges a transparent 5% fee on completed bookings — no subscriptions, no hidden costs. Creatives keep 100% of their quoted rate, and clients see a full breakdown before confirming every transaction.</p>
            <p>{APP_NAME} is currently in beta. We&apos;re building the future of creative work, one booking at a time.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
