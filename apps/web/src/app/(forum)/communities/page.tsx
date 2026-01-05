"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { subcommunityApi } from "@/lib/forum-api";
import { SubcommunityCard } from "@/components/forum";
import { Button, Alert } from "@/components/ui";
import type { Subcommunity } from "@/lib/forum-types";

export default function CommunitiesPage() {
  const { isAuthenticated } = useAuth();
  const [subcommunities, setSubcommunities] = useState<Subcommunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubcommunities();
  }, []);

  const loadSubcommunities = async () => {
    try {
      const data = await subcommunityApi.list();
      setSubcommunities(data);
    } catch (err) {
      setError("Failed to load communities");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communities</h1>
          <p className="text-gray-600 mt-1">Browse and join discussion communities</p>
        </div>
        {isAuthenticated && (
          <Link href="/communities/new">
            <Button>Create Community</Button>
          </Link>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : subcommunities.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No communities yet</h3>
          <p className="text-gray-600 mb-4">Be the first to create a community!</p>
          {isAuthenticated && (
            <Link href="/communities/new">
              <Button>Create Community</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {subcommunities.map((sub) => (
            <SubcommunityCard key={sub.id} subcommunity={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
