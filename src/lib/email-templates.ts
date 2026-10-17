import { sendEmail, MAIL_FROM } from "@/lib/mail";
import { renderEmailHtml } from "@/lib/email-layout";
import { formatMoney } from "@/lib/marketplace-fees";
import { APP_NAME } from "@/config";

function appUrl(path: string) {
  const origin = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${origin}${path}`;
}

interface Recipient {
  email: string;
  name?: string;
}

export async function sendWelcomeEmail(to: Recipient, role: "musician" | "venue") {
  const dashboardPath = role === "venue" ? "/venue" : "/musician";
  await sendEmail({
    from: { email: MAIL_FROM.accounts, name: APP_NAME },
    to: [to],
    subject: `Welcome to ${APP_NAME}`,
    text: `Welcome to ${APP_NAME}! Your account is ready. Visit ${appUrl(dashboardPath)} to get started.`,
    html: renderEmailHtml({
      heading: `Welcome to ${APP_NAME}${to.name ? `, ${to.name}` : ""}!`,
      bodyHtml:
        role === "venue"
          ? "<p>Your account is ready. You can now search for creative talent and start sending booking requests.</p>"
          : "<p>Your account is ready. Build out your profile and portfolio so clients can find and book you.</p>",
      button: { label: "Go to your dashboard", url: appUrl(dashboardPath) },
    }),
  });
}

export async function sendAccountDeletionEmail(to: Recipient) {
  await sendEmail({
    from: { email: MAIL_FROM.accounts, name: APP_NAME },
    to: [to],
    subject: `Your ${APP_NAME} account has been deleted`,
    text: `Your ${APP_NAME} account has been permanently deleted. If this wasn't you, contact us immediately.`,
    html: renderEmailHtml({
      heading: "Your account has been deleted",
      bodyHtml:
        "<p>Your account and personal information have been removed from " +
        APP_NAME +
        ". Any bookings or reviews tied to your account remain on record for the other party, but are no longer linked to your name.</p>" +
        "<p>If you didn't request this, please contact us right away.</p>",
      button: { label: "Contact support", url: appUrl("/contact") },
    }),
  });
}

export async function sendBookingRequestEmail(
  to: Recipient,
  details: { venueName: string; eventDate: Date; fee: number; currency: string; bookingId: string }
) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: `New booking request from ${details.venueName}`,
    text: `${details.venueName} wants to book you for ${details.eventDate.toLocaleDateString()} — ${formatMoney(details.fee, details.currency)}. Review the request at ${appUrl("/musician/bookings")}.`,
    html: renderEmailHtml({
      heading: "You have a new booking request",
      bodyHtml: `<p><strong>${details.venueName}</strong> would like to book you.</p>
        <p>Date: ${details.eventDate.toLocaleDateString()}<br />Fee: ${formatMoney(details.fee, details.currency)}</p>
        <p>Review and respond within your dashboard.</p>`,
      button: { label: "View booking request", url: appUrl("/musician/bookings") },
    }),
  });
}

export async function sendBookingAcceptedEmail(
  to: Recipient,
  details: { artistName: string; eventDate: Date; totalChargeAmount: number; currency: string }
) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: `${details.artistName} accepted your booking`,
    text: `${details.artistName} accepted your booking for ${details.eventDate.toLocaleDateString()}. Your card has been charged ${formatMoney(details.totalChargeAmount, details.currency)}.`,
    html: renderEmailHtml({
      heading: "Your booking was accepted",
      bodyHtml: `<p><strong>${details.artistName}</strong> accepted your booking request for ${details.eventDate.toLocaleDateString()}.</p>
        <p>Your card has been charged <strong>${formatMoney(details.totalChargeAmount, details.currency)}</strong>.</p>`,
      button: { label: "View booking", url: appUrl("/venue/bookings") },
    }),
  });
}

export async function sendBookingDeclinedEmail(to: Recipient, details: { artistName: string; eventDate: Date }) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: `${details.artistName} declined your booking request`,
    text: `${details.artistName} declined your booking request for ${details.eventDate.toLocaleDateString()}. No payment was taken.`,
    html: renderEmailHtml({
      heading: "Booking request declined",
      bodyHtml: `<p><strong>${details.artistName}</strong> declined your booking request for ${details.eventDate.toLocaleDateString()}.</p>
        <p>No payment was taken. You can find another artist to book instead.</p>`,
      button: { label: "Find more artists", url: appUrl("/artists") },
    }),
  });
}

export async function sendBookingCancelledEmail(
  to: Recipient,
  details: { otherPartyName: string; eventDate: Date }
) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: "A booking has been cancelled",
    text: `Your booking with ${details.otherPartyName} for ${details.eventDate.toLocaleDateString()} has been cancelled.`,
    html: renderEmailHtml({
      heading: "Booking cancelled",
      bodyHtml: `<p>Your booking with <strong>${details.otherPartyName}</strong> for ${details.eventDate.toLocaleDateString()} has been cancelled.</p>`,
    }),
  });
}

export async function sendPaymentFailedEmail(to: Recipient, details: { artistName: string; eventDate: Date }) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: "We couldn't process your booking payment",
    text: `${details.artistName} tried to accept your booking for ${details.eventDate.toLocaleDateString()}, but your payment method was declined. Please update it and try again.`,
    html: renderEmailHtml({
      heading: "Payment couldn't be processed",
      bodyHtml: `<p><strong>${details.artistName}</strong> tried to accept your booking for ${details.eventDate.toLocaleDateString()}, but your payment method was declined.</p>
        <p>The booking has not been accepted. Please check your payment details.</p>`,
      button: { label: "Review payment details", url: appUrl("/venue/bookings") },
    }),
  });
}

export async function sendPayoutReleasedEmail(
  to: Recipient,
  details: { venueName: string; amount: number; currency: string }
) {
  await sendEmail({
    from: { email: MAIL_FROM.accounts, name: APP_NAME },
    to: [to],
    subject: "Your payout has been sent",
    text: `A payout of ${formatMoney(details.amount, details.currency)} for your booking with ${details.venueName} has been sent to your Stripe account.`,
    html: renderEmailHtml({
      heading: "Payout sent",
      bodyHtml: `<p>A payout of <strong>${formatMoney(details.amount, details.currency)}</strong> for your booking with ${details.venueName} has been sent to your connected Stripe account.</p>`,
      button: { label: "View payouts", url: appUrl("/musician/payouts") },
    }),
  });
}

export async function sendJobApplicationReceivedEmail(
  to: Recipient,
  details: { artistName: string; jobTitle: string }
) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: `New application for "${details.jobTitle}"`,
    text: `${details.artistName} applied to your job listing "${details.jobTitle}".`,
    html: renderEmailHtml({
      heading: "New job application",
      bodyHtml: `<p><strong>${details.artistName}</strong> applied to your job listing <strong>"${details.jobTitle}"</strong>.</p>`,
      button: { label: "Review application", url: appUrl("/venue/jobs") },
    }),
  });
}

export async function sendJobApplicationStatusEmail(
  to: Recipient,
  details: { jobTitle: string; venueName: string; status: "accepted" | "declined" }
) {
  const isAccepted = details.status === "accepted";
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: isAccepted
      ? `You were accepted for "${details.jobTitle}"`
      : `Update on your application for "${details.jobTitle}"`,
    text: isAccepted
      ? `${details.venueName} accepted your application for "${details.jobTitle}".`
      : `${details.venueName} declined your application for "${details.jobTitle}".`,
    html: renderEmailHtml({
      heading: isAccepted ? "Your application was accepted" : "Application update",
      bodyHtml: isAccepted
        ? `<p><strong>${details.venueName}</strong> accepted your application for <strong>"${details.jobTitle}"</strong>.</p>`
        : `<p><strong>${details.venueName}</strong> declined your application for <strong>"${details.jobTitle}"</strong>.</p>`,
      button: { label: "View applications", url: appUrl("/musician/applications") },
    }),
  });
}

export async function sendAccountLinkedEmail(to: Recipient, provider: "github" | "google") {
  const providerLabel = provider === "github" ? "GitHub" : "Google";
  await sendEmail({
    from: { email: MAIL_FROM.accounts, name: APP_NAME },
    to: [to],
    subject: `${providerLabel} connected to your ${APP_NAME} account`,
    text: `${providerLabel} has been connected to your ${APP_NAME} account as a sign-in method. If this wasn't you, contact us immediately.`,
    html: renderEmailHtml({
      heading: `${providerLabel} connected`,
      bodyHtml: `<p><strong>${providerLabel}</strong> has been connected to your account as a sign-in method.</p>
        <p>If this wasn't you, please contact us immediately.</p>`,
      button: { label: "Review account settings", url: appUrl("/settings") },
    }),
  });
}
