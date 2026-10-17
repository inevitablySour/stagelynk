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
          <p className="mt-2 text-sm text-stone-500">Last updated: October 2026</p>

          <div className="mt-6 space-y-6 text-stone-600 text-sm leading-relaxed">
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of {APP_NAME}. By
              creating an account or using the platform, you agree to be bound by these Terms. If you do not
              agree, do not use {APP_NAME}.
            </p>

            <section>
              <h2 className="text-lg font-semibold text-stone-900 pt-2">1. What {APP_NAME} is</h2>
              <p>
                {APP_NAME} is a marketplace that connects independent creative professionals
                (&quot;Creatives&quot;) with venues, clients, and organisations seeking to book them
                (&quot;Clients&quot;). {APP_NAME} provides the platform, facilitates introductions, and
                processes payments between Creatives and Clients. {APP_NAME} is not a party to the agreement
                formed between a Creative and a Client for the performance of services, and does not employ,
                supervise, or control any Creative. Creatives are independent contractors engaged directly by
                Clients; nothing in these Terms creates an employment, agency, joint venture, or partnership
                relationship between {APP_NAME} and any user.
              </p>
              <p className="mt-2">
                {APP_NAME} does not guarantee the quality, safety, legality, or suitability of any
                performance, service, or venue, and is not responsible for the conduct of any Creative or
                Client, on or off the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-stone-900 pt-2">2. Accounts</h2>
              <p>
                You must provide accurate information when creating an account and are responsible for
                maintaining the security of your credentials. Accounts must represent a real individual or
                organisation. You are responsible for all activity under your account. {APP_NAME} may
                suspend or terminate accounts that violate these Terms, provide false information, or
                present a risk to other users or to the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-stone-900 pt-2">3. Fees and payments</h2>
              <p>
                {APP_NAME} charges a platform fee (currently 5%) on completed bookings, applied to the
                Client&apos;s payment. Payment processing fees charged by our payment processor may also
                apply and will be shown before confirmation. All payments are processed through {APP_NAME}
                &apos;s third-party payment processor; {APP_NAME} does not store full payment card details.
              </p>
              <p className="mt-2">
                When a Client&apos;s booking request is accepted by a Creative, the Client&apos;s payment
                method is charged for the full booking amount. Funds are held by {APP_NAME} and released to
                the Creative after the scheduled event date has passed and a short clearance period has
                elapsed, less the platform fee and any processing fees. {APP_NAME} may vary the length of
                the clearance period at its discretion, including to respond to a specific dispute or
                suspected fraud risk.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-stone-900 pt-2">4. Cancellations and refunds</h2>
              <p>
                Bookings may be cancelled by either party before the scheduled event date, subject to the
                following default policy. {APP_NAME} may display a different policy at the time of booking,
                which will apply instead:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>More than 14 days before the event: full refund to the Client.</li>
                <li>Between 7 and 14 days before the event: 50% refund to the Client.</li>
                <li>Less than 72 hours before the event: no refund, unless the Creative cancels.</li>
                <li>
                  If the Creative cancels the booking for any reason, the Client receives a full refund
                  regardless of timing.
                </li>
              </ul>
              <p className="mt-2">
                Where one party requests a cancellation or refund before the event has taken place, the
                other party will be notified and given a defined window to respond. If there is no response
                within that window, the request may be automatically approved in accordance with the stated
                policy above.
              </p>
              <p className="mt-2">
                Requests relating to a booking <strong>after the scheduled event date has passed</strong>
                (for example, a dispute over whether a performance took place or met expectations) are not
                automatically resolved by non-response from either party. These are reviewed by
                {" "}{APP_NAME}, which may request evidence from both parties and will make a final
                determination, which may include a full refund, partial refund, or no refund.
              </p>
              <p className="mt-2">
                {APP_NAME} reserves the right, in its sole and final discretion, to approve, deny, or modify
                any refund or cancellation request, including in circumstances not addressed above.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-stone-900 pt-2">5. Chargebacks</h2>
              <p>
                If a Client disputes a charge directly with their bank or card issuer (a
                &quot;chargeback&quot;) rather than through {APP_NAME}, and the chargeback is upheld,
                {" "}{APP_NAME} may reverse the associated payout. If the Creative has already been paid out,
                the Creative agrees that {APP_NAME} may deduct the disputed amount, together with any
                associated processor or network fees, from the Creative&apos;s current balance or any future
                payouts. If amounts owed are not recovered this way, the Creative agrees to reimburse
                {" "}{APP_NAME} directly on request. {APP_NAME} may place a hold on a Creative&apos;s payouts
                while a chargeback or dispute is pending.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-stone-900 pt-2">6. Content</h2>
              <p>
                You retain ownership of content you upload. By uploading content, you grant {APP_NAME} a
                licence to display it on the platform for the purpose of your profile, search results, and
                bookings. You confirm you have the rights to any content you upload, including music,
                images, and biographical information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-stone-900 pt-2">7. Limitation of liability</h2>
              <p>
                To the fullest extent permitted by law, {APP_NAME}&apos;s total liability to you for any
                claim arising out of or relating to these Terms or your use of the platform will not exceed
                the greater of (a) the fees you paid to {APP_NAME} in the twelve months preceding the claim,
                or (b) €100. {APP_NAME} is not liable for indirect, incidental, special, or consequential
                damages, including lost profits or lost bookings, even if advised of the possibility of such
                damages. The platform is provided &quot;as is&quot; without warranties of any kind.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-stone-900 pt-2">8. Dispute resolution</h2>
              <p>
                Most concerns can be resolved informally by contacting {APP_NAME} support. Any dispute that
                cannot be resolved informally will be resolved by binding individual arbitration rather than
                in court, except that either party may bring an individual claim in small claims court, and
                either party may seek injunctive relief in court to prevent misuse of the platform or
                infringement of intellectual property rights. You agree to resolve disputes on an individual
                basis only; you waive any right to participate in a class, collective, or representative
                action.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-stone-900 pt-2">9. Governing law</h2>
              <p>
                These Terms are governed by the laws of the Netherlands, without regard to conflict of
                laws principles, except where mandatory local consumer protection law provides otherwise.
                (Placeholder: to be finalised once {APP_NAME}&apos;s operating entity and jurisdiction of
                incorporation are decided.)
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-stone-900 pt-2">10. Changes to these Terms</h2>
              <p>
                {APP_NAME} may update these Terms from time to time. Material changes will be notified
                through the platform or by email before taking effect. Continued use of {APP_NAME} after
                changes take effect constitutes acceptance of the updated Terms.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
