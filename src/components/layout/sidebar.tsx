"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, User, Music, Calendar, Star, Settings, Search, Crown,
  Briefcase, FileText, Megaphone, LogOut, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/config";
import type { UserRole } from "@/types";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, User, Music, Calendar, Star, Settings, Search, Crown,
  Briefcase, FileText, Megaphone,
};

interface SidebarProps {
  role: UserRole;
  navItems: readonly { label: string; href: string; icon: string }[];
}

export function Sidebar({ role, navItems }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);


  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 rounded-lg border border-line bg-surface p-2 shadow-md lg:hidden"
        onClick={() => setOpen(!open)}
        aria-label="Toggle sidebar"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <Link href="/" className="flex h-16 items-center gap-2 border-b border-line px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-surface">
            <Music className="h-4 w-4" />
          </div>
          <span className="brand-gradient bg-clip-text font-bold text-transparent">
            {APP_NAME}
          </span>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] ?? LayoutDashboard;
              const fullHref = item.href.startsWith("/settings") ? "/settings" : `/${role}${item.href === `/${role}` ? "" : item.href.replace(`/${role}`, "")}`;
              const isActive = pathname === fullHref || pathname.startsWith(fullHref + "/");

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-soft text-brand"
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
