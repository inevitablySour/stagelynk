import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { applySyncRun, SyncApplyError } from "@/lib/equipment-catalog/sync";
import { CatalogValidationError } from "@/lib/equipment-catalog/shopify";

export async function POST(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;
  const { runId } = await params;

  try {
    const summary = await applySyncRun(runId, session.user.id);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    if (error instanceof SyncApplyError || error instanceof CatalogValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 409 });
    }
    throw error;
  }
}
