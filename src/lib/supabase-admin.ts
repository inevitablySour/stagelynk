import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
}
if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
}

/**
 * Server-only client. Never import this from client components — it holds the service-role key.
 * Node.js has no native WebSocket support until v22, so Realtime needs the `ws` transport explicitly.
 */
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
});

/** Broadcasts a realtime event on a conversation's channel so open chat threads update live. */
export async function broadcastMessage(conversationId: string, message: unknown) {
  const channel = supabaseAdmin.channel(`conversation:${conversationId}`);
  await channel.send({
    type: "broadcast",
    event: "message",
    payload: message,
  });
  await supabaseAdmin.removeChannel(channel);
}
