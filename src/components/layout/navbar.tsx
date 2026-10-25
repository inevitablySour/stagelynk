"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, LogIn, LogOut, Menu, Music, Settings, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, NAV_LINKS } from "@/config";
function getDashboardHref(role?: string | null) {
  if (role === "admin") return "/admin/equipment";
  return role === "venue" ? "/venue" : "/musician";
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const user = session?.user;
  const isAuthenticated = status === "authenticated" && Boolean(user);
  const dashboardHref = getDashboardHref(user?.role);
  const displayName = user?.name ?? user?.email ?? "Account";

  function handleSignOut() {
    void signOut({ callbackUrl: "/" });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-surface/90 shadow-sm backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-surface">
            <Music className="h-5 w-5" />
          </div>
          <span className="brand-gradient bg-clip-text text-transparent">
            {APP_NAME}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {status === "loading" ? (
            <div className="h-9 w-36 animate-pulse rounded-md bg-surface-strong" aria-hidden="true" />
          ) : isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={dashboardHref}>
                  <LayoutDashboard className="mr-1 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="mr-1 h-4 w-4" />
                  <span className="max-w-32 truncate">{displayName}</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">
                  <LogIn className="mr-1 h-4 w-4" />
                  Log in
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">
                  <UserPlus className="mr-1 h-4 w-4" />
                  Sign up
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-stone-600"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          aria-controls="public-mobile-navigation"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div id="public-mobile-navigation" className="md:hidden border-t border-stone-200 bg-sand-50 px-4 pb-4">
          <nav className="flex flex-col gap-3 pt-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-stone-600 hover:text-stone-900"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-stone-200" />
            {status === "loading" ? (
              <div className="h-9 animate-pulse rounded-md bg-surface-strong" aria-hidden="true" />
            ) : isAuthenticated ? (
              <>
                <Link
                  href={dashboardHref}
                  className="text-sm font-medium text-stone-600"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className="text-sm font-medium text-stone-600"
                  onClick={() => setMobileOpen(false)}
                >
                  Account settings
                </Link>
                <button
                  type="button"
                  className="text-left text-sm font-medium text-stone-600"
                  onClick={() => {
                    setMobileOpen(false);
                    handleSignOut();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-stone-600" onClick={() => setMobileOpen(false)}>
                  Log in
                </Link>
                <Button size="sm" asChild>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>Sign up free</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
