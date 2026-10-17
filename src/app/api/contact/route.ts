import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { sendEmail, MAIL_FROM } from "@/lib/mail";
import { getLogger } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadataFromHeaders } from "@/lib/request-context";
import { APP_NAME } from "@/config";

const log = getLogger("api-contact");

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
});

export async function POST(request: Request) {
  const requestMetadata = getRequestMetadataFromHeaders(request.headers);
  const destination = process.env.CONTACT_FORM_DESTINATION_EMAIL;

  if (!destination) {
    log.error("CONTACT_FORM_DESTINATION_EMAIL is not configured");
    return NextResponse.json({ success: false, message: "Contact form is not available right now." }, { status: 500 });
  }

  const parsed = contactSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Please check your details and try again." },
      { status: 400 }
    );
  }

  const { name, email, subject, message } = parsed.data;

  try {
    await sendEmail({
      from: { email: MAIL_FROM.noreply, name: APP_NAME },
      to: [{ email: destination }],
      replyTo: { email, name },
      subject: `[Contact form] ${subject}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
    });
  } catch (error) {
    log.error({ err: error }, "Failed to send contact form email");
    return NextResponse.json(
      { success: false, message: "Unable to send your message right now. Please try again shortly." },
      { status: 502 }
    );
  }

  await writeAuditLog({
    event: "contact_form_submitted",
    category: "system",
    level: "info",
    actorEmail: email,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    metadata: { subject },
  });

  return NextResponse.json({ success: true });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
