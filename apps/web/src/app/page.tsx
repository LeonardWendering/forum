"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui";

export default function HomePage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Forum</h1>

          <nav className="flex items-center gap-4">
            {isLoading ? (
              <div className="h-9 w-24 bg-gray-200 animate-pulse rounded-lg" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-4">
                <Link href="/communities" className="text-sm text-gray-600 hover:text-gray-900">
                  Communities
                </Link>
                <Link href="/messages" className="text-sm text-gray-600 hover:text-gray-900">
                  Messages
                </Link>
                <span className="text-sm text-gray-600">
                  Welcome, <span className="font-medium text-gray-900">{user.displayName}</span>
                </span>
                <Button variant="outline" size="sm" onClick={() => logout()}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign up</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="inline-block mb-4 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
          Research Platform
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Privacy-First Discussion Forum
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          A secure platform for social science research with subcommunities,
          nested discussions, and privacy-focused design.
        </p>

        {!isAuthenticated && !isLoading && (
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
        )}

        {isAuthenticated && user && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center justify-center gap-4">
              <Link href="/communities">
                <Button size="lg">Browse Communities</Button>
              </Link>
              <Link href="/messages">
                <Button variant="outline" size="lg">Messages</Button>
              </Link>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Welcome back, {user.displayName}!
              </h3>
              <p className="text-gray-600 mb-4">
                Signed in as <span className="font-medium">{user.email}</span>
              </p>
              <div className="flex flex-col gap-2 text-sm text-gray-500">
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="font-medium text-gray-700">{user.role}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email Verified:</span>
                  <span className="font-medium text-gray-700">
                    {user.emailVerifiedAt ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">
          Platform Features
        </h3>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            title="Subcommunities"
            description="Create and join topic-based communities. Public, invite-only, or password-protected."
            icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
          <FeatureCard
            title="Nested Discussions"
            description="Threaded conversations with unlimited nesting depth. Reply to any post."
            icon="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
          <FeatureCard
            title="Private Messaging"
            description="Direct messages between users with read receipts and real-time updates."
            icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Privacy-first discussion forum for social science research</p>
        </div>
      </footer>
    </main>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={icon}
          />
        </svg>
      </div>
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
