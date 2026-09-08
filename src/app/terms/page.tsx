import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { APP_NAME } from "@/config";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-page">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-stone-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-stone-500">Last updated: May 2026</p>
          <div className="mt-6 space-y-4 text-stone-600 text-sm leading-relaxed">
            <p>By using {APP_NAME}, you agree to these terms. This is a placeholder — full legal terms will be published before the platform exits beta.</p>
            <h2 className="text-lg font-semibold text-stone-900 pt-2">Platform usage</h2>
            <p>{APP_NAME} provides a marketplace for creative professionals and clients. We facilitate connections and bookings but are not a party to the agreements between creatives and clients.</p>
            <h2 className="text-lg font-semibold text-stone-900 pt-2">Fees</h2>
            <p>A 5% platform fee is applied to completed bookings and is paid by the client. Payment processing fees may also apply and are shown before confirmation.</p>
            <h2 className="text-lg font-semibold text-stone-900 pt-2">Accounts</h2>
            <p>You are responsible for maintaining the security of your account credentials. Accounts must represent real individuals or organisations.</p>
            <h2 className="text-lg font-semibold text-stone-900 pt-2">Content</h2>
            <p>You retain ownership of content you upload. By uploading, you grant {APP_NAME} a licence to display it on the platform for the purpose of your profile and bookings.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
