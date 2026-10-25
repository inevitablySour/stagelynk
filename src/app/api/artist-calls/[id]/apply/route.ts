import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";
import { sendArtistCallApplicationEmail } from "@/lib/email-templates";
import { broadcastMessage } from "@/lib/supabase-admin";
import { getLogger } from "@/lib/logger";

const log = getLogger("api-artist-call-apply");

function profileUrl(musicianId: string) {
  const origin = new URL(process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "https://www.indiecentral.eu").origin;
  return `${origin}/artists/${musicianId}`;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Sign in as a creative to apply." }, { status: 401 });
  }
  const { id } = await params;

  const me = await prisma.musicianProfile.findUnique({
    where: { userId: session.user.id },
    include: { categoryPicks: { include: { subtype: true, instrumentType: true } } },
  });
  if (!me) return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });

  const call = await prisma.artistOpenCall.findFirst({
    where: { id, status: "published", poster: { user: { deletedAt: null } } },
    include: { poster: { select: { id: true, stageName: true, user: { select: { email: true, notificationPreference: { select: { jobAlerts: true } } } } } } },
  });
  if (!call) return NextResponse.json({ success: false, message: "This open call is no longer available." }, { status: 404 });
  if (call.posterId === me.id) return NextResponse.json({ success: false, message: "You can't apply to your own open call." }, { status: 400 });

  const roles = [...new Set(me.categoryPicks.map((p) => p.instrumentType?.name ?? p.subtype.name))].slice(0, 4);
  const body = [
    `Hi ${call.poster.stageName}, I'd like to apply to your open call "${call.title}".`,
    roles.length ? `What I do: ${roles.join(", ")}` : null,
    `Portfolio: ${profileUrl(me.id)}`,
  ].filter(Boolean).join("\n");

  let result: { conversationId: string; message: { id: string; conversationId: string; senderId: string; body: string; createdAt: Date } };
  try {
    result = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: { kind: "open_call", participants: { create: [{ musicianId: me.id }, { musicianId: call.posterId }] } },
      });
      await tx.artistOpenCallApplication.create({ data: { callId: call.id, applicantId: me.id, conversationId: conversation.id } });
      const message = await tx.message.create({ data: { conversationId: conversation.id, senderId: me.id, body } });
      await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: message.createdAt } });
      return { conversationId: conversation.id, message };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ success: false, message: "You've already applied to this open call." }, { status: 409 });
    }
    throw error;
  }

  broadcastMessage(result.conversationId, result.message).catch((err) => log.error({ err }, "Failed to broadcast open-call message"));

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "artist_call_apply", category: "profile", level: "info",
    actorUserId: session.user.id, actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress, userAgent: requestMetadata.userAgent, requestId: requestMetadata.requestId,
    targetType: "ArtistOpenCall", targetId: call.id,
  });

  const posterUser = call.poster.user;
  if (posterUser.email && posterUser.notificationPreference?.jobAlerts !== false) {
    sendArtistCallApplicationEmail(
      { email: posterUser.email, name: call.poster.stageName },
      { applicantName: me.stageName, callTitle: call.title }
    ).catch((err) => log.error({ err }, "Failed to send artist call application email"));
  }

  return NextResponse.json({ success: true, data: { conversationId: result.conversationId } }, { status: 201 });
}
