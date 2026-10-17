import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { discoverArtists } from "@/lib/discovery";
import { discoveryQuerySchema } from "@/lib/discovery-utils";
import { ArtistDirectory } from "@/components/artists/artist-directory";

export default async function VenueSearchPage() {
  const talent = await discoverArtists(discoveryQuerySchema.parse({}));

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Find Talent</h1>
            <p className="text-stone-500 mt-1">Search for creative professionals to book for your next project.</p>
          </div>

          <ArtistDirectory artists={talent} />
        </div>
      </main>
    </div>
  );
}
