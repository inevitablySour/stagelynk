import { Client, type SendEmailV3_1 } from "node-mailjet";

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

/** Sender addresses by purpose. All addresses under the verified stagelynk.co domain send without separate per-mailbox verification. */
export const MAIL_FROM = {
  noreply: process.env.MAIL_FROM_NOREPLY ?? "noreply@stagelynk.co",
  accounts: process.env.MAIL_FROM_ACCOUNTS ?? "accounts@stagelynk.co",
  support: process.env.MAIL_FROM_SUPPORT ?? "support@stagelynk.co",
} as const;

export interface SendEmailInput {
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: { email: string; name?: string };
}

export async function sendEmail(input: SendEmailInput) {
  const message: SendEmailV3_1.Message = {
    From: { Email: input.from.email, Name: input.from.name },
    To: input.to.map((recipient) => ({ Email: recipient.email, Name: recipient.name })),
    Subject: input.subject,
    TextPart: input.text,
    HTMLPart: input.html,
    ...(input.replyTo ? { ReplyTo: { Email: input.replyTo.email, Name: input.replyTo.name } } : {}),
  };

  const result = await getClient()
    .post("send", { version: "v3.1" })
    .request<SendEmailV3_1.Response>({ Messages: [message] } satisfies SendEmailV3_1.Body);

  const status = result.body.Messages[0]?.Status;
  if (status !== "success") {
    throw new Error(`Mailjet send failed with status: ${status ?? "unknown"}`);
  }

  return result.body.Messages[0];
}
