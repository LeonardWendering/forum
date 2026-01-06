"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { adminApi, threadApi } from "@/lib/forum-api";
import { Button } from "@/components/ui";
import type { Thread } from "@/lib/forum-types";

interface ThreadCardProps {
  thread: Thread;
  showSubcommunity?: boolean;
  onThreadUpdated?: () => void;
}

export function ThreadCard({ thread, showSubcommunity = false, onThreadUpdated }: ThreadCardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleToggleMute = async () => {
    if (!isAdmin) return;
    setActionLoading("mute");
    try {
      if (thread.isMuted) {
        await adminApi.unmuteThread(thread.id);
      } else {
        await adminApi.muteThread(thread.id);
      }
      onThreadUpdated?.();
    } catch (error) {
      console.error("Failed to update thread moderation status", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteThread = async () => {
    if (!confirm(`Delete "${thread.title}"? This cannot be undone.`)) return;
    setActionLoading("delete");
    try {
      await threadApi.delete(thread.id);
      onThreadUpdated?.();
    } catch (error) {
      console.error("Failed to delete thread", error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      className={`
        bg-white rounded-lg border p-4 transition-all
        ${thread.isPinned ? "border-blue-200 bg-blue-50/50" : "border-gray-100 hover:border-gray-200 hover:shadow-sm"}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Vote indicator (placeholder for admins) */}
        {thread.voteScore !== undefined && (
          <div className="flex flex-col items-center text-sm text-gray-500 min-w-[40px]">
            <span className="font-medium">{thread.voteScore}</span>
            <span className="text-xs">votes</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <Link href={`/t/${thread.id}`} className="block">
            <div className="flex items-center gap-2 mb-1">
              {thread.isPinned && (
                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                  Pinned
                </span>
              )}
              {thread.isLocked && (
                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                  Locked
                </span>
              )}
              {thread.isMuted && (
                <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded">
                  Muted
                </span>
              )}
            </div>

            <h3 className="text-base font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
              {thread.title}
            </h3>

            {thread.preview && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{thread.preview}</p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>by {thread.author.displayName}</span>
              <span>{formatDate(thread.createdAt)}</span>
              <span>{thread.postCount} {thread.postCount === 1 ? "post" : "posts"}</span>
              {showSubcommunity && thread.subcommunity && (
                <span className="text-blue-600">in {thread.subcommunity.name}</span>
              )}
            </div>
          </Link>
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleMute}
              isLoading={actionLoading === "mute"}
              className={thread.isMuted ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}
            >
              {thread.isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteThread}
              isLoading={actionLoading === "delete"}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
