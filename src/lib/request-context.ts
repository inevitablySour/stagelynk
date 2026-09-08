import { randomUUID } from "crypto";
import { headers } from "next/headers";

export interface RequestMetadata {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
}

function firstForwardedIp(value: string | null) {
  return value?.split(",")[0]?.trim() || undefined;
}

export function getRequestMetadataFromHeaders(headersList: Headers): RequestMetadata {
  return {
    requestId:
      headersList.get("x-request-id") ??
      headersList.get("x-correlation-id") ??
      headersList.get("x-vercel-id") ??
      randomUUID(),
    ipAddress:
      firstForwardedIp(headersList.get("x-forwarded-for")) ??
      headersList.get("x-real-ip") ??
      undefined,
    userAgent: headersList.get("user-agent") ?? undefined,
  };
}

export async function getRequestMetadata(): Promise<RequestMetadata> {
  const headersList = await headers();
  return getRequestMetadataFromHeaders(headersList);
}
