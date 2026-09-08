import { requireAuth } from "@/lib/authorization";

export default async function MusicianLayout({ children }: { children: React.ReactNode }) {
  await requireAuth({ roles: ["musician", "admin"] });
  return children;
}
