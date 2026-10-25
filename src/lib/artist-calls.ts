import type { ArtistCallDealType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEAL_TYPE_LABELS, GENRE_OPTIONS, ROLE_OPTIONS, genreName, roleName } from "@/lib/artist-call-options";

export { DEAL_TYPE_LABELS, GENRE_OPTIONS, ROLE_OPTIONS };

export const artistCallInclude = {
  poster: { select: { id: true, stageName: true, profileImage: true, location: true } },
  _count: { select: { applications: true } },
} satisfies Prisma.ArtistOpenCallInclude;

export function serializeArtistCall(call: Prisma.ArtistOpenCallGetPayload<{ include: typeof artistCallInclude }>) {
  return {
    id: call.id, title: call.title, description: call.description, timeline: call.timeline,
    roleSlug: call.roleSlug, roleName: roleName(call.roleSlug),
    genreSlug: call.genreSlug, genreName: call.genreSlug ? genreName(call.genreSlug) : null,
    dealType: call.dealType, dealLabel: DEAL_TYPE_LABELS[call.dealType], dealDetails: call.dealDetails,
    status: call.status, applicantCount: call._count.applications, createdAt: call.createdAt.toISOString(),
    poster: call.poster,
  };
}
export type ArtistCallRow = ReturnType<typeof serializeArtistCall>;

export async function listArtistCalls(
  filters: { q?: string; role?: string; genre?: string; dealType?: ArtistCallDealType } = {},
  viewerMusicianId?: string
) {
  const calls = await prisma.artistOpenCall.findMany({
    where: {
      status: "published",
      poster: { user: { deletedAt: null } },
      ...(viewerMusicianId ? { posterId: { not: viewerMusicianId } } : {}),
      ...(filters.role ? { roleSlug: filters.role } : {}),
      ...(filters.genre ? { genreSlug: filters.genre } : {}),
      ...(filters.dealType ? { dealType: filters.dealType } : {}),
      ...(filters.q ? { OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { timeline: { contains: filters.q, mode: "insensitive" } },
      ] } : {}),
    },
    include: artistCallInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return calls.map(serializeArtistCall);
}
