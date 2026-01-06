"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { subcommunityApi, threadApi } from "@/lib/forum-api";
import { ApiClientError } from "@/lib/api";
import { ThreadCard } from "@/components/forum";
import { Button, Alert, Input } from "@/components/ui";
import type { Subcommunity, Thread, ThreadsResponse } from "@/lib/forum-types";

export default function SubcommunityPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { isAuthenticated } = useAuth();

  const [subcommunity, setSubcommunity] = useState<Subcommunity | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinPassword, setJoinPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  const loadData = useCallback(async (page = 1) => {
    try {
      const [subData, threadsData] = await Promise.all([
        subcommunityApi.get(slug),
        threadApi.listBySubcommunity(slug, page)
      ]);
      setSubcommunity(subData);
      setThreads(threadsData.threads);
      setPagination({
        page: threadsData.pagination.page,
        totalPages: threadsData.pagination.totalPages
      });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load community");
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJoin = async () => {
    if (!subcommunity) return;

    if (subcommunity.type === "PASSWORD_PROTECTED" && !showPasswordInput) {
      setShowPasswordInput(true);
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await subcommunityApi.join(slug, { password: joinPassword || undefined });
      await loadData();
      setShowPasswordInput(false);
      setJoinPassword("");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to join community");
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this community?")) return;

    try {
      await subcommunityApi.leave(slug);
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-8" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !subcommunity) {
    return (
      <Alert variant="error">
        {error}
        <Link href="/communities" className="block mt-2 text-sm underline">
          Back to communities
        </Link>
      </Alert>
    );
  }

  if (!subcommunity) return null;

  const isMember = !!subcommunity.membership;
  const canPost = isMember || subcommunity.type === "PUBLIC";

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{subcommunity.name}</h1>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  subcommunity.type === "PUBLIC"
                    ? "bg-green-100 text-green-700"
                    : subcommunity.type === "PASSWORD_PROTECTED"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {subcommunity.type.replace("_", " ")}
              </span>
            </div>
            {subcommunity.description && (
              <p className="text-gray-600 mb-3">{subcommunity.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{subcommunity.memberCount} members</span>
              <span>{subcommunity.threadCount} threads</span>
              <span>Created by {subcommunity.createdBy.displayName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                {isMember ? (
                  <>
                    <Link href={`/c/${slug}/new`}>
                      <Button>New Thread</Button>
                    </Link>
                    <Button variant="outline" onClick={handleLeave}>
                      Leave
                    </Button>
                  </>
                ) : subcommunity.type !== "INVITE_ONLY" ? (
                  <div className="flex items-center gap-2">
                    {showPasswordInput && (
                      <Input
                        type="password"
                        placeholder="Enter password"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        className="w-40"
                      />
                    )}
                    <Button onClick={handleJoin} isLoading={isJoining}>
                      Join
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Invite only</span>
                )}
              </>
            )}
          </div>
        </div>

        {error && <Alert variant="error" className="mt-4">{error}</Alert>}
      </div>

      {/* Threads */}
      <div className="space-y-3">
        {threads.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No threads yet</h3>
            <p className="text-gray-600 mb-4">Be the first to start a discussion!</p>
            {isAuthenticated && canPost && (
              <Link href={`/c/${slug}/new`}>
                <Button>Create Thread</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {isAuthenticated && canPost && (
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Threads</h2>
                <Link href={`/c/${slug}/new`}>
                  <Button size="sm">New Thread</Button>
                </Link>
              </div>
            )}
            {threads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                onThreadUpdated={() => loadData(pagination.page)}
              />
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => loadData(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => loadData(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
