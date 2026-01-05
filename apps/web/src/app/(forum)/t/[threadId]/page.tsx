"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { threadApi, postApi } from "@/lib/forum-api";
import { ApiClientError } from "@/lib/api";
import { PostCard, PostComposer } from "@/components/forum";
import { Alert } from "@/components/ui";
import type { Thread, Post } from "@/lib/forum-types";

export default function ThreadPage() {
  const params = useParams();
  const threadId = params.threadId as string;
  const { isAuthenticated } = useAuth();

  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [threadData, postsData] = await Promise.all([
        threadApi.get(threadId),
        postApi.listByThread(threadId)
      ]);
      setThread(threadData);
      setPosts(postsData);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load thread");
      }
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNewPost = async (content: string) => {
    await postApi.create(threadId, { content });
    await loadData();
  };

  const handleReply = async (parentId: string, content: string) => {
    await postApi.create(threadId, { content, parentId });
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-2/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !thread) {
    return (
      <Alert variant="error">
        {error}
        <Link href="/communities" className="block mt-2 text-sm underline">
          Back to communities
        </Link>
      </Alert>
    );
  }

  if (!thread) return null;

  return (
    <div>
      {/* Thread header */}
      <div className="mb-6">
        {thread.subcommunity && (
          <Link
            href={`/c/${thread.subcommunity.slug}`}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {thread.subcommunity.name}
          </Link>
        )}

        <div className="flex items-start gap-3">
          {thread.isPinned && (
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded mt-1">
              Pinned
            </span>
          )}
          {thread.isLocked && (
            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded mt-1">
              Locked
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{thread.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span>by{" "}
                <Link
                  href={`/u/${thread.author.id}`}
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {thread.author.displayName}
                </Link>
              </span>
              <span>
                {new Date(thread.createdAt).toLocaleDateString()} at{" "}
                {new Date(thread.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
              <span>{thread.postCount} {thread.postCount === 1 ? "post" : "posts"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4 mb-6">
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            threadId={threadId}
            isLocked={thread.isLocked}
            isOriginalPost={index === 0}
            onReply={handleReply}
            onPostUpdated={loadData}
          />
        ))}
      </div>

      {/* Reply composer */}
      {isAuthenticated && !thread.isLocked && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Add a reply</h3>
          <PostComposer
            placeholder="Write your reply..."
            buttonText="Post Reply"
            onSubmit={handleNewPost}
          />
        </div>
      )}

      {thread.isLocked && (
        <Alert variant="warning" className="mt-6">
          This thread is locked. No new replies can be added.
        </Alert>
      )}

      {!isAuthenticated && (
        <div className="mt-6 text-center py-8 bg-white rounded-lg border border-gray-100">
          <p className="text-gray-600 mb-3">Sign in to join the discussion</p>
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
