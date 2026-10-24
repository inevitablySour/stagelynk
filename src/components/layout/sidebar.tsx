"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, User, Music, Calendar, Star, Settings, Search, Crown,
  Briefcase, FileText, Megaphone, LogOut, Menu, X, Wallet, MessageCircle, Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/config";
import type { UserRole } from "@/types";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, User, Music, Calendar, Star, Settings, Search, Crown,
  Briefcase, FileText, Megaphone, Wallet, MessageCircle, Users,
};

interface SidebarProps {
  role: UserRole;
  navItems: readonly { label: string; href: string; icon: string }[];
}

export function Sidebar({ role, navItems }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);


  return (
    <>
      {/* Mobile toggle */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur-lg lg:hidden">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand"><Music className="h-5 w-5" />{APP_NAME}</Link>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close dashboard navigation" : "Open dashboard navigation"}
          aria-expanded={open}
          aria-controls="dashboard-navigation"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />} Menu
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <button type="button" aria-label="Close dashboard navigation" className="fixed inset-x-0 bottom-0 top-16 z-30 bg-olive-900/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar panel */}
      <aside
        id="dashboard-navigation"
        className={cn(
          "fixed bottom-0 left-0 top-16 z-40 flex w-64 shrink-0 flex-col border-r border-line bg-surface transition-transform duration-200 lg:sticky lg:top-0 lg:visible lg:h-dvh lg:translate-x-0",
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        )}
      >
        {/* Brand */}
        <Link href="/" className="hidden h-20 shrink-0 items-center gap-2 border-b border-line px-6 lg:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-surface">
            <Music className="h-4 w-4" />
          </div>
          <span className="brand-gradient bg-clip-text font-bold text-transparent">
            {APP_NAME}
          </span>
        </Link>

        {/* Nav items */}
        <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{role === "venue" ? "Client workspace" : "Creative workspace"}</p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] ?? LayoutDashboard;
              const fullHref = item.href.startsWith("/settings") ? "/settings" : `/${role}${item.href === `/${role}` ? "" : item.href.replace(`/${role}`, "")}`;
              const isActive = pathname === fullHref || (fullHref !== `/${role}` && pathname.startsWith(fullHref + "/"));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "border-brand/15 bg-brand-soft text-brand"
                        : "text-muted hover:bg-surface-strong hover:text-ink"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="border-t border-line p-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-strong hover:text-ink"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
