"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui";

export function Header() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
            Forum
          </Link>
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/communities"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Communities
              </Link>
              <Link
                href="/messages"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Messages
              </Link>
            </nav>
          )}
        </div>

        <nav className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-24 bg-gray-200 animate-pulse rounded-lg" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-gray-600">
                {user.displayName}
              </span>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
