import { Upload } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DASHBOARD_NAV_MUSICIAN, GENRES } from "@/config";

export default function MusicianProfilePage() {
  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-stone-900">Creative Profile</h1>
          <p className="mt-1 text-stone-500">Manage how clients see you in search and on your public profile.</p>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Keep your bio, location, and skills current.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Stage name</label>
                  <Input defaultValue="Nova Eclipse" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Location</label>
                  <Input defaultValue="London, UK" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Bio</label>
                <textarea
                  className="min-h-32 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
                  defaultValue="Electronic music producer blending ambient textures with driving beats."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.slice(0, 12).map((genre) => (
                    <Badge key={genre.slug} variant={["electronic", "indie", "pop"].includes(genre.slug) ? "default" : "outline"}>
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Button variant="outline" type="button"><Upload className="mr-2 h-4 w-4" /> Profile image</Button>
                <Button variant="outline" type="button"><Upload className="mr-2 h-4 w-4" /> Banner image</Button>
                <Button type="button">Save profile</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Social & Portfolio Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium">Website</label><Input placeholder="https://your-site.com" /></div>
              <div><label className="mb-1.5 block text-sm font-medium">Instagram</label><Input placeholder="@artistname" /></div>
              <div><label className="mb-1.5 block text-sm font-medium">Spotify</label><Input placeholder="Spotify artist URL" /></div>
              <div><label className="mb-1.5 block text-sm font-medium">Apple Music</label><Input placeholder="Apple Music artist URL" /></div>
              <Button className="sm:col-span-2" type="button">Save links</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
