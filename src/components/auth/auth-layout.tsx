import Link from "next/link";
import { Music } from "lucide-react";
import { APP_NAME } from "@/config";

export function AuthLayout({ children, maxWidth = "max-w-md" }: { children: React.ReactNode; maxWidth?: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-brand-soft via-surface to-page px-4 py-12">
      <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-olive-200/40 blur-3xl" />
      <div className="absolute top-1/2 -left-40 h-[360px] w-[360px] rounded-full bg-copper-200/25 blur-3xl" />
      <div className={`relative w-full ${maxWidth}`}>
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-bold text-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-surface">
            <Music className="h-5 w-5" />
          </div>
          <span className="brand-gradient bg-clip-text text-transparent">{APP_NAME}</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
