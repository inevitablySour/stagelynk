import { sendEmail, MAIL_FROM } from "@/lib/mail";
import { renderEmailHtml } from "@/lib/email-layout";
import { formatMoney } from "@/lib/marketplace-fees";
import { APP_NAME } from "@/config";

function appUrl(path: string) {
  const origin = new URL(process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "https://www.indiecentral.eu").origin;
  return new URL(path, origin).toString();
}

export async function sendProfileReadyEmail(to: Recipient, role: "musician" | "venue") {
  await sendEmail({
    from: { email: MAIL_FROM.accounts, name: `${APP_NAME} Accounts` },
    to: [to],
    subject: `Your ${APP_NAME} ${role === "venue" ? "client" : "creative"} profile is ready`,
    text: `Your profile is ready. Open your dashboard at ${appUrl(role === "venue" ? "/venue" : "/musician")}.`,
    html: renderEmailHtml({
      heading: "Your profile is ready",
      bodyHtml: "<p>Your account setup is complete. You can now use your dashboard and keep your public profile up to date.</p>",
      button: { label: "Open your dashboard", url: appUrl(role === "venue" ? "/venue" : "/musician") },
    }),
  });
}

export async function sendPasswordResetEmail(to: Recipient, token: string) {
  const url = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  await sendEmail({
    from: { email: MAIL_FROM.accounts, name: `${APP_NAME} Accounts` },
    to: [to],
    subject: `Reset your ${APP_NAME} password`,
    text: `Reset your password using this single-use link, valid for 30 minutes: ${url}\n\nIf you did not request this, ignore this email. Your password has not changed.`,
    html: renderEmailHtml({
      heading: "Reset your password",
      bodyHtml: `<p>We received a request to reset your ${APP_NAME} password.</p><p>This link can be used once and expires in 30 minutes. If you did not request a reset, you can safely ignore this email.</p>`,
      button: { label: "Choose a new password", url },
    }),
  });
}

export async function sendPasswordSetupEmail(to: Recipient, token: string) {
  const url = appUrl(`/reset-password?token=${encodeURIComponent(token)}&setup=1`);
  await sendEmail({
    from: { email: MAIL_FROM.accounts, name: `${APP_NAME} Accounts` },
    to: [to],
    subject: `Set a password for your ${APP_NAME} account`,
    text: `Add a password to your account using this single-use link, valid for 30 minutes: ${url}\n\nYou can keep signing in with GitHub or Google too. If you didn't ask for this, ignore this email and nothing will change.`,
    html: renderEmailHtml({
      heading: "Set a password",
      bodyHtml: `<p>You asked to add a password to your ${APP_NAME} account, so you can sign in with your email as well as GitHub or Google.</p><p>This link can be used once and expires in 30 minutes. If you didn't ask for this, ignore this email and nothing will change.</p>`,
      button: { label: "Set my password", url },
    }),
  });
}

export async function sendPasswordAddedEmail(to: Recipient) {
  await sendEmail({
    from: { email: MAIL_FROM.accounts, name: `${APP_NAME} Accounts` },
    to: [to],
    subject: `A password was added to your ${APP_NAME} account`,
    text: `A password was added to your account, and other sessions were signed out. If this wasn't you, contact ${MAIL_FROM.support} immediately.`,
    html: renderEmailHtml({
      heading: "Password added",
      bodyHtml: `<p>You can now sign in with your email and password, as well as GitHub or Google. Other sessions were signed out.</p><p>If this wasn't you, contact ${MAIL_FROM.support} immediately.</p>`,
      button: { label: "Contact support", url: appUrl("/contact") },
    }),
  });
}

export async function sendPasswordChangedEmail(to: Recipient) {
  await sendEmail({
    from: { email: MAIL_FROM.accounts, name: `${APP_NAME} Accounts` },
    to: [to],
    subject: `Your ${APP_NAME} password was changed`,
    text: `Your password was changed and existing sessions were signed out. If this was not you, contact ${MAIL_FROM.support} immediately.`,
    html: renderEmailHtml({
      heading: "Your password was changed",
      bodyHtml: `<p>Your password has been changed. Existing sessions have been invalidated.</p><p>If this wasn't you, contact ${MAIL_FROM.support} immediately.</p>`,
      button: { label: "Contact support", url: appUrl("/contact") },
    }),
  });
}

interface Recipient {
  email: string;
  name?: string;
}

export async function sendWelcomeEmail(to: Recipient, role?: "musician" | "venue") {
  const dashboardPath = role === "venue" ? "/venue" : role === "musician" ? "/musician" : "/onboarding/role";
  return sendEmail({
    from: { email: MAIL_FROM.accounts, name: APP_NAME },
    to: [to],
    subject: `Welcome to ${APP_NAME}`,
    text: `Welcome to ${APP_NAME}! Your account is ready. Visit ${appUrl(dashboardPath)} to get started.`,
    html: renderEmailHtml({
      heading: `Welcome to ${APP_NAME}${to.name ? `, ${to.name}` : ""}!`,
      bodyHtml:
        role === undefined
          ? "<p>Your account has been created. Choose your profile type and complete your profile to get started.</p>"
          : role === "venue"
          ? "<p>Your account is ready. You can now search for creative talent and start sending booking requests.</p>"
          : "<p>Your account is ready. Build out your profile and portfolio so clients can find and book you.</p>",
      button: { label: role ? "Go to your dashboard" : "Complete your profile", url: appUrl(dashboardPath) },
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

export async function sendDisputeFiledEmail(
  to: Recipient,
  details: { otherPartyName: string; bookingTitle: string; reason: string; responseDeadline: Date }
) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: `${details.otherPartyName} filed a dispute on "${details.bookingTitle}"`,
    text: `${details.otherPartyName} filed a dispute on your booking "${details.bookingTitle}": ${details.reason}\n\nRespond before ${details.responseDeadline.toLocaleString()}.`,
    html: renderEmailHtml({
      heading: "A dispute was filed",
      bodyHtml: `<p><strong>${details.otherPartyName}</strong> filed a dispute on <strong>"${details.bookingTitle}"</strong>.</p>
        <p>${details.reason}</p>
        <p>Please respond before <strong>${details.responseDeadline.toLocaleString()}</strong>.</p>`,
      button: { label: "Respond to dispute", url: appUrl("/settings") },
    }),
  });
}

export async function sendDisputeResolvedEmail(
  to: Recipient,
  details: { bookingTitle: string; resolution: string; resolutionNotes: string }
) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: `Dispute resolved for "${details.bookingTitle}"`,
    text: `The dispute on "${details.bookingTitle}" has been resolved: ${details.resolution}.\n\n${details.resolutionNotes}`,
    html: renderEmailHtml({
      heading: "Dispute resolved",
      bodyHtml: `<p>The dispute on <strong>"${details.bookingTitle}"</strong> has been resolved: <strong>${details.resolution}</strong>.</p>
        <p>${details.resolutionNotes}</p>`,
      button: { label: "View booking", url: appUrl("/settings") },
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

export async function sendArtistCallApplicationEmail(
  to: Recipient,
  details: { applicantName: string; callTitle: string }
) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: `${details.applicantName} applied to "${details.callTitle}"`,
    text: `${details.applicantName} applied to your open call "${details.callTitle}" with their profile. A chat thread is waiting in your messages.`,
    html: renderEmailHtml({
      heading: "New applicant on your open call",
      bodyHtml: `<p><strong>${escapeHtml(details.applicantName)}</strong> applied to your open call <strong>"${escapeHtml(details.callTitle)}"</strong> with their profile attached. A chat thread is waiting in your messages.</p>`,
      button: { label: "Open messages", url: appUrl("/musician/p2p/messages") },
    }),
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendBalanceChargedEmail(
  to: Recipient,
  details: { otherPartyName: string; eventDate: Date; amount: number; currency: string }
) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: "Balance payment received",
    text: `The remaining balance of ${formatMoney(details.amount, details.currency)} for the booking with ${details.otherPartyName} was charged.`,
    html: renderEmailHtml({
      heading: "Balance payment received",
      bodyHtml: `<p>The remaining balance of <strong>${formatMoney(details.amount, details.currency)}</strong> for the booking with <strong>${escapeHtml(details.otherPartyName)}</strong> was charged. The booking is now paid in full.</p>`,
      button: { label: "View bookings", url: appUrl("/") },
    }),
  });
}

export async function sendBalanceFailedEmail(
  to: Recipient,
  details: { otherPartyName: string; eventDate: Date }
) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: "Balance payment failed",
    text: `The balance payment for the booking with ${details.otherPartyName} couldn't be charged. We'll retry automatically; please check the saved card.`,
    html: renderEmailHtml({
      heading: "Balance payment failed",
      bodyHtml: `<p>The balance payment for the booking with <strong>${escapeHtml(details.otherPartyName)}</strong> couldn't be charged. We'll keep retrying automatically until the event. Please check that the saved card is valid.</p>`,
      button: { label: "Check payment methods", url: appUrl("/venue/payment-methods") },
    }),
  });
}

export async function sendMilestoneEmail(
  to: Recipient,
  details: { heading: string; message: string }
) {
  await sendEmail({
    from: { email: MAIL_FROM.noreply, name: APP_NAME },
    to: [to],
    subject: details.heading,
    text: details.message,
    html: renderEmailHtml({ heading: details.heading, bodyHtml: `<p>${escapeHtml(details.message)}</p>`, button: { label: "Open IndieCentral", url: appUrl("/") } }),
  });
}
