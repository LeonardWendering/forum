"use client";

import Link from "next/link";
import type { Thread } from "@/lib/forum-types";

interface ThreadCardProps {
  thread: Thread;
  showSubcommunity?: boolean;
}

export function ThreadCard({ thread, showSubcommunity = false }: ThreadCardProps) {
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

  return (
    <Link href={`/t/${thread.id}`}>
      <div
        className={`
          bg-white rounded-lg border p-4 hover:shadow-sm transition-all cursor-pointer
          ${thread.isPinned ? "border-blue-200 bg-blue-50/50" : "border-gray-100 hover:border-gray-200"}
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
          </div>
        </div>
      </div>
    </Link>
  );
}
