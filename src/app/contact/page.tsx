import { Mail, MessageCircle, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { APP_NAME } from "@/config";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata = { title: "Contact" };

const highlights = [
  { icon: Clock, title: "Fast responses", description: "We reply to most messages within 24 hours." },
  { icon: MessageCircle, title: "Real people", description: "Your message goes straight to the team, not a ticket queue." },
];

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-soft via-surface to-page">
          <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-olive-200/40 blur-3xl" />
          <div className="relative mx-auto max-w-xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand text-surface">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
              Get in touch
            </h1>
            <p className="mt-3 text-stone-600">
              Have a question or need help? The {APP_NAME} team is here.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-xl border border-line bg-surface/80 p-4 text-left">
                  <item.icon className="h-4 w-4 text-brand" />
                  <p className="mt-2 text-sm font-medium text-stone-900">{item.title}</p>
                  <p className="text-xs text-stone-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-muted py-16 sm:py-20">
          <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
            <ContactForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
