import { Client, type SendEmailV3_1 } from "node-mailjet";
import { APP_NAME } from "@/config";
import { after } from "next/server";

const apiKey = process.env.MAILJET_API_KEY;
const apiSecret = process.env.MAILJET_API_SECRET;

let mailjet: Client | undefined;

function getClient() {
  if (!apiKey || !apiSecret) {
    throw new Error("MAILJET_API_KEY / MAILJET_API_SECRET are not configured");
  }
  if (!mailjet) {
    mailjet = new Client({ apiKey, apiSecret });
  }
  return mailjet;
}

/** Sender addresses by purpose. All addresses under the verified indiecentral.eu domain send without separate per-mailbox verification. */
export const MAIL_FROM = {
  noreply: process.env.MAIL_FROM_NOREPLY ?? "noreply@indiecentral.eu",
  accounts: process.env.MAIL_FROM_ACCOUNTS ?? "accounts@indiecentral.eu",
  support: process.env.MAIL_FROM_SUPPORT ?? "support@indiecentral.eu",
} as const;

export interface SendEmailInput {
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: { email: string; name?: string };
}

export function isDeliverableRecipient(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return Boolean(domain) && !["example.com", "example.net", "example.org", "localhost"].includes(domain)
    && !/\.(?:invalid|test|example|localhost)$/.test(domain);
}

export function createEmailMessage(input: SendEmailInput): SendEmailV3_1.Message | null {
  const recipients = input.to.filter((recipient) => isDeliverableRecipient(recipient.email));
  if (recipients.length === 0) return null;
  const senderName = input.from.email === MAIL_FROM.accounts ? `${APP_NAME} Accounts`
    : input.from.email === MAIL_FROM.support ? `${APP_NAME} Support` : `${APP_NAME} Notifications`;
  return {
    From: { Email: input.from.email, Name: input.from.name && input.from.name !== APP_NAME ? input.from.name : senderName },
    To: recipients.map((recipient) => ({ Email: recipient.email, Name: recipient.name })),
    Subject: input.subject,
    TextPart: input.text,
    HTMLPart: input.html,
    ReplyTo: input.replyTo
      ? { Email: input.replyTo.email, Name: input.replyTo.name }
      : { Email: MAIL_FROM.support, Name: `${APP_NAME} Support` },
  };
}

export async function sendEmail(input: SendEmailInput) {
  const message = createEmailMessage(input);
  if (!message) return { Status: "skipped" as const };
  const delivery = getClient()
    .post("send", { version: "v3.1" })
    .request<SendEmailV3_1.Response>({ Messages: [message] } satisfies SendEmailV3_1.Body)
    .catch((error: unknown) => {
      const status = (error as { statusCode?: number }).statusCode;
      // Provider errors can contain authentication headers or reset links.
      throw new Error(`Email provider request failed${status ? ` (HTTP ${status})` : ""}.`);
    });
  try {
    after(async () => { await delivery.catch(() => undefined); });
  } catch {
    // Scripts and isolated tests have no Next.js request context; their
    // callers await the returned delivery promise instead.
  }
  const result = await delivery;

  const status = result.body.Messages[0]?.Status;
  if (status !== "success") {
    throw new Error(`Mailjet send failed with status: ${status ?? "unknown"}`);
  }

  return result.body.Messages[0];
}
