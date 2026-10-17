import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { APP_NAME } from "@/config";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-page">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-stone-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-stone-500">Last updated: October 2026</p>
          <div className="mt-6 space-y-4 text-stone-600 text-sm leading-relaxed">
            <p>This policy explains how {APP_NAME} collects, uses, and protects your personal information.</p>
            <h2 className="text-lg font-semibold text-stone-900 pt-2">Data we collect</h2>
            <p>We collect information you provide when registering, creating a profile, or booking talent — including name, email, and location. Payment card details are collected and processed directly by our third-party payment processor; {APP_NAME} does not store full card numbers.</p>
            <h2 className="text-lg font-semibold text-stone-900 pt-2">How we use it</h2>
            <p>Your data is used to operate the platform, process bookings and payouts, send notifications, prevent fraud, and improve the service. We do not sell personal data to third parties.</p>
            <h2 className="text-lg font-semibold text-stone-900 pt-2">Security</h2>
            <p>Passwords are hashed with Argon2id. Sensitive fields in audit logs are redacted. All connections to our database are encrypted.</p>
            <h2 className="text-lg font-semibold text-stone-900 pt-2">Your rights</h2>
            <p>You can request access to, correction of, or deletion of your personal data at any time by contacting us.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
