"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Apple, Music2, Plus, LinkIcon, Disc3, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TrackDraft {
  title: string;
  genre: string;
}

export interface AlbumRow {
  id: string;
  title: string;
  source: string;
  tracks: { id: string; title: string }[];
}

export function DiscographyManager({ albums }: { albums: AlbumRow[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"connect" | "manual">("connect");
  const [albumTitle, setAlbumTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState(String(new Date().getFullYear()));
  const [tracks, setTracks] = useState<TrackDraft[]>([{ title: "", genre: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState(albums);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [spotifyArtistId, setSpotifyArtistId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const updateTrack = (index: number, field: keyof TrackDraft, value: string) => {
    setTracks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const addTrack = () => setTracks((prev) => [...prev, { title: "", genre: "" }]);
  const removeTrack = (index: number) => setTracks((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    setError(null);
    const validTracks = tracks.filter((t) => t.title.trim().length > 0);
    if (albumTitle.trim().length < 1) {
      setError("Album title is required.");
      return;
    }
    if (validTracks.length === 0) {
      setError("Add at least one track with a title.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/discography", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          album: { title: albumTitle.trim(), releaseYear: Number(releaseYear) },
          tracks: validTracks.map((t, i) => ({
            title: t.title.trim(),
            genre: t.genre.trim() || undefined,
            trackNumber: i + 1,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to save album.");
        return;
      }
      setRows((prev) => [{ id: json.data.id, title: json.data.title, source: "manual", tracks: json.data.tracks }, ...prev]);
      setAlbumTitle("");
      setReleaseYear(String(new Date().getFullYear()));
      setTracks([{ title: "", genre: "" }]);
      router.refresh();
    } catch {
      setError("Unable to save album.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpotifyImport = async () => {
    if (spotifyArtistId.trim().length === 0) {
      setImportMessage({ ok: false, text: "Enter a Spotify artist ID first." });
      return;
    }
    setImporting(true);
    setImportMessage(null);
    try {
      const res = await fetch("/api/integrations/spotify/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyArtistId: spotifyArtistId.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setImportMessage({ ok: false, text: json.message ?? "Unable to import from Spotify." });
        return;
      }
      setRows((prev) => [
        ...json.data.map((a: { id: string; title: string; source: string; tracks: { id: string; title: string }[] }) => ({
          id: a.id,
          title: a.title,
          source: a.source,
          tracks: a.tracks,
        })),
        ...prev,
      ]);
      setImportMessage({ ok: true, text: json.message });
      setSpotifyArtistId("");
      router.refresh();
    } catch {
      setImportMessage({ ok: false, text: "Unable to import from Spotify." });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (albumId: string) => {
    setDeletingId(albumId);
    try {
      const res = await fetch(`/api/discography/${albumId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setRows((prev) => prev.filter((a) => a.id !== albumId));
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => setMode("connect")}
          className={`rounded-xl border p-4 text-left transition-colors ${mode === "connect" ? "border-olive-500 bg-olive-50" : "border-stone-200 bg-sand-50"}`}
        >
          <LinkIcon className="h-6 w-6 text-olive-600" />
          <h3 className="mt-3 font-semibold">Connect platforms</h3>
          <p className="mt-1 text-sm text-stone-500">Import albums, tracks, artwork, and metadata automatically.</p>
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`rounded-xl border p-4 text-left transition-colors ${mode === "manual" ? "border-olive-500 bg-olive-50" : "border-stone-200 bg-sand-50"}`}
        >
          <Disc3 className="h-6 w-6 text-olive-600" />
          <h3 className="mt-3 font-semibold">Manual entry</h3>
          <p className="mt-1 text-sm text-stone-500">Add your own album and track listing.</p>
        </button>
      </div>

      {mode === "connect" ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Platform imports</CardTitle>
            <CardDescription>Import your public catalog using your artist ID on each platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-stone-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700 shrink-0"><Music2 className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium">Spotify</h4>
                  <p className="text-sm text-stone-500">Paste your Spotify artist ID to pull albums, tracks, artwork, and preview URLs.</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Spotify artist ID (from open.spotify.com/artist/...)"
                  value={spotifyArtistId}
                  onChange={(e) => setSpotifyArtistId(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSpotifyImport} disabled={importing}>
                  {importing ? "Importing..." : "Import"}
                </Button>
              </div>
              {importMessage && (
                <p className={`mt-2 text-sm ${importMessage.ok ? "text-emerald-600" : "text-red-600"}`}>{importMessage.text}</p>
              )}
            </div>
            <div className="rounded-lg border border-stone-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-900"><Apple className="h-5 w-5" /></div>
                <div className="flex-1">
                  <h4 className="font-medium">Apple Music</h4>
                  <p className="text-sm text-stone-500">Pull releases, artwork, tracklists, and Apple Music catalog links.</p>
                </div>
                <Button variant="outline" disabled>Coming soon</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Add an album</CardTitle>
            <CardDescription>List your tracks manually. You can add cover art and audio uploads later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Album / EP title</label>
                <Input placeholder="Dawn Patterns" value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Release year</label>
                <Input type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">Tracks</label>
              {tracks.map((track, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Track ${i + 1} title`}
                    value={track.title}
                    onChange={(e) => updateTrack(i, "title", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Genre (optional)"
                    value={track.genre}
                    onChange={(e) => updateTrack(i, "genre", e.target.value)}
                    className="w-40"
                  />
                  {tracks.length > 1 && (
                    <Button type="button" variant="outline" size="icon" onClick={() => removeTrack(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTrack}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add track
              </Button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="button" onClick={handleSave} disabled={submitting}>
              <Plus className="mr-2 h-4 w-4" /> {submitting ? "Saving..." : "Save album"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader><CardTitle>Existing releases</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-stone-500 text-center py-6">No releases yet. Add your first album above.</p>}
          {rows.map((album) => (
            <div key={album.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-3">
              <div>
                <h4 className="font-medium">{album.title}</h4>
                <p className="text-sm text-stone-500">{album.tracks.length} track{album.tracks.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={album.source === "spotify" ? "default" : album.source === "apple_music" ? "secondary" : "outline"}>
                  {album.source === "spotify" ? "Spotify" : album.source === "apple_music" ? "Apple Music" : "Manual"}
                </Badge>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(album.id)}
                  disabled={deletingId === album.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
