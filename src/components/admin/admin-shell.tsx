"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ShieldAlert, ShieldCheck } from "lucide-react";
import { APP_NAME } from "@/config";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/equipment", label: "Equipment catalog", icon: Package },
  { href: "/admin/disputes", label: "Disputes", icon: ShieldAlert },
];

export function AdminShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-surface"><ShieldCheck className="h-4 w-4" /></span>
            {APP_NAME} <span className="font-normal text-muted">Admin</span>
          </Link>
          <nav className="-mb-3 flex gap-1 overflow-x-auto">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors",
                  pathname.startsWith(href) ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="eyebrow mb-2">Administration</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
