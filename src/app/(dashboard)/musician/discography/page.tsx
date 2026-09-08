"use client";

import { useState } from "react";
import { Apple, Music2, Plus, Upload, Link as LinkIcon, Disc3 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";

export default function DiscographyManagerPage() {
  const [mode, setMode] = useState<"connect" | "manual">("connect");

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-stone-900">Discography Manager</h1>
          <p className="mt-1 text-stone-500">Connect Spotify or Apple Music, or manually upload your own tracks.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button onClick={() => setMode("connect")} className={`rounded-xl border p-4 text-left transition-colors ${mode === "connect" ? "border-olive-500 bg-olive-50" : "border-stone-200 bg-sand-50"}`}>
              <LinkIcon className="h-6 w-6 text-olive-600" />
              <h3 className="mt-3 font-semibold">Connect platforms</h3>
              <p className="mt-1 text-sm text-stone-500">Import albums, tracks, artwork, and metadata automatically.</p>
            </button>
            <button onClick={() => setMode("manual")} className={`rounded-xl border p-4 text-left transition-colors ${mode === "manual" ? "border-olive-500 bg-olive-50" : "border-stone-200 bg-sand-50"}`}>
              <Upload className="h-6 w-6 text-olive-600" />
              <h3 className="mt-3 font-semibold">Manual upload</h3>
              <p className="mt-1 text-sm text-stone-500">Upload MP3 files, cover art, and track information yourself.</p>
            </button>
          </div>

          {mode === "connect" ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Platform imports</CardTitle>
                <CardDescription>Use artist IDs or OAuth in production to import verified catalog data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-stone-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700"><Music2 className="h-5 w-5" /></div>
                    <div className="flex-1">
                      <h4 className="font-medium">Spotify</h4>
                      <p className="text-sm text-stone-500">Pull albums, tracks, artwork, preview URLs, and Spotify links.</p>
                    </div>
                    <Button>Connect Spotify</Button>
                  </div>
                </div>
                <div className="rounded-lg border border-stone-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-900"><Apple className="h-5 w-5" /></div>
                    <div className="flex-1">
                      <h4 className="font-medium">Apple Music</h4>
                      <p className="text-sm text-stone-500">Pull releases, artwork, tracklists, and Apple Music catalog links.</p>
                    </div>
                    <Button variant="outline">Connect Apple Music</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Manual album upload</CardTitle>
                <CardDescription>Designed for independent artists who do not have a full streaming setup yet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1.5 block text-sm font-medium">Album / EP title</label><Input placeholder="Dawn Patterns" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Release year</label><Input placeholder="2026" type="number" /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Button variant="outline" type="button"><Upload className="mr-2 h-4 w-4" /> Upload cover art</Button>
                  <Button variant="outline" type="button"><Upload className="mr-2 h-4 w-4" /> Upload MP3 files</Button>
                </div>
                <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center">
                  <Disc3 className="mx-auto h-10 w-10 text-stone-300" />
                  <p className="mt-2 text-sm text-stone-500">Track editor will appear here after MP3 upload.</p>
                </div>
                <Button type="button"><Plus className="mr-2 h-4 w-4" /> Save album</Button>
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardHeader><CardTitle>Existing releases</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { title: "Midnight Frequencies", source: "Spotify", tracks: 3 },
                { title: "Dawn Patterns", source: "Uploaded", tracks: 2 },
              ].map((album) => (
                <div key={album.title} className="flex items-center justify-between rounded-lg border border-stone-100 p-3">
                  <div><h4 className="font-medium">{album.title}</h4><p className="text-sm text-stone-500">{album.tracks} tracks</p></div>
                  <Badge variant={album.source === "Spotify" ? "default" : "outline"}>{album.source}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
