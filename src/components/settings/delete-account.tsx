"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CONFIRM_PHRASE = "DELETE";

export function DeleteAccount() {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/account", { method: "DELETE" });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to delete your account.");
        return;
      }

      await signOut({ redirect: false });
      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to delete your account right now.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isConfirming) {
    return (
      <Button variant="destructive" onClick={() => setIsConfirming(true)}>
        Delete Account
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <p className="text-sm text-stone-700">
        This will permanently remove your personal information and sign you out everywhere. Bookings and
        reviews tied to your account stay on record for the other party, but will no longer be linked to
        your name. Type <span className="font-semibold">{CONFIRM_PHRASE}</span> to confirm.
      </p>
      <Input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={CONFIRM_PHRASE}
        className="max-w-xs"
      />
      <div className="flex gap-3">
        <Button
          variant="destructive"
          disabled={confirmText !== CONFIRM_PHRASE || isLoading}
          onClick={handleDelete}
        >
          {isLoading ? "Deleting..." : "Permanently delete my account"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setIsConfirming(false);
            setConfirmText("");
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
