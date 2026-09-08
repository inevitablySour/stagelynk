import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { APP_NAME } from "@/config";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-page">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-stone-900 text-center">Contact Us</h1>
          <p className="mt-2 text-center text-stone-500">Have a question or need help? Get in touch with the {APP_NAME} team.</p>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>We&apos;ll get back to you within 24 hours.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label htmlFor="contact-name" className="block text-sm font-medium text-stone-700 mb-1.5">Name</label><Input id="contact-name" placeholder="Your name" required /></div>
                  <div><label htmlFor="contact-email" className="block text-sm font-medium text-stone-700 mb-1.5">Email</label><Input id="contact-email" type="email" placeholder="you@example.com" required /></div>
                </div>
                <div><label htmlFor="contact-subject" className="block text-sm font-medium text-stone-700 mb-1.5">Subject</label><Input id="contact-subject" placeholder="What is this about?" required /></div>
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-stone-700 mb-1.5">Message</label>
                  <textarea id="contact-message" className="min-h-32 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" placeholder="Tell us how we can help..." required />
                </div>
                <Button type="submit" className="w-full"><Mail className="mr-2 h-4 w-4" /> Send Message</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
