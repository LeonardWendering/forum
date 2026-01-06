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
              {user?.role === "ADMIN" && (
                <>
                  <Link
                    href="/admin"
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
                  >
                    Admin
                  </Link>
                  <Link
                    href="/admin/invite-codes"
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
                  >
                    Invite
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        <nav className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-24 bg-gray-200 animate-pulse rounded-lg" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link
                href={`/u/${user.id}`}
                className="hidden sm:flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                <span>Welcome,</span>
                <span className="font-medium text-gray-900">{user.displayName}</span>
                {user.role === "ADMIN" && (
                  <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded font-medium">
                    Admin
                  </span>
                )}
                {user.isRestricted && (
                  <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded font-medium">
                    Restricted
                  </span>
                )}
              </Link>
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
