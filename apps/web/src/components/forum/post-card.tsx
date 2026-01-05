"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { postApi } from "@/lib/forum-api";
import { Button, Avatar } from "@/components/ui";
import type { Post } from "@/lib/forum-types";
import type { AvatarConfig } from "@/components/ui";

interface PostCardProps {
  post: Post;
  threadId: string;
  isLocked?: boolean;
  depth?: number;
  isFirstPost?: boolean;
  onReply?: (parentId: string, content: string) => Promise<void>;
  onPostUpdated?: () => void;
}

export function PostCard({
  post,
  threadId,
  isLocked = false,
  depth = 0,
  isFirstPost = false,
  onReply,
  onPostUpdated
}: PostCardProps) {
  const { user, isAuthenticated } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentVote, setCurrentVote] = useState(post.userVote || 0);
  const [isVoting, setIsVoting] = useState(false);

  const isAuthor = user?.id === post.author.id;
  const isAdmin = user?.role === "ADMIN";
  const maxDepth = 5;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleVote = async (value: 1 | -1) => {
    if (!isAuthenticated || isVoting) return;

    setIsVoting(true);
    try {
      if (currentVote === value) {
        await postApi.removeVote(post.id);
        setCurrentVote(0);
      } else {
        await postApi.vote(post.id, { value });
        setCurrentVote(value);
      }
    } catch (error) {
      console.error("Vote error:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !onReply) return;

    setIsSubmitting(true);
    try {
      await onReply(post.id, replyContent);
      setReplyContent("");
      setShowReplyForm(false);
    } catch (error) {
      console.error("Reply error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`
        ${depth > 0 ? "ml-4 pl-4 border-l-2 border-gray-300" : ""}
      `}
    >
      <div className={`rounded-lg border ${isFirstPost ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"} p-4 mb-3 shadow-sm`}>
        <div className="flex gap-3">
          {/* Vote buttons */}
          {isAuthenticated && (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => handleVote(1)}
                disabled={isVoting}
                className={`
                  p-1 rounded hover:bg-gray-100 transition-colors
                  ${currentVote === 1 ? "text-blue-600" : "text-gray-400"}
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              {isAdmin && post.voteScore !== undefined && (
                <span className="text-xs font-medium text-gray-600">{post.voteScore}</span>
              )}
              <button
                onClick={() => handleVote(-1)}
                disabled={isVoting}
                className={`
                  p-1 rounded hover:bg-gray-100 transition-colors
                  ${currentVote === -1 ? "text-red-600" : "text-gray-400"}
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex-1">
            {/* Author and date */}
            <div className="flex items-center gap-2 mb-2">
              <Link href={`/u/${post.author.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar
                  config={post.author.profile?.avatarBodyType ? {
                    bodyType: post.author.profile.avatarBodyType,
                    skinTone: post.author.profile.avatarSkinTone,
                    hairstyle: post.author.profile.avatarHairstyle || 1,
                    accessory: post.author.profile.avatarAccessory || "NONE"
                  } : undefined}
                  size="sm"
                />
                <span className="font-medium text-gray-900 text-sm hover:text-blue-600 transition-colors">
                  {post.author.displayName}
                </span>
              </Link>
              {isAuthor && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">You</span>
              )}
              <span className="text-gray-400 text-sm">•</span>
              <span className="text-gray-500 text-sm">{formatDate(post.createdAt)}</span>
              {post.updatedAt !== post.createdAt && (
                <span className="text-gray-400 text-xs">(edited)</span>
              )}
            </div>

            {/* Content */}
            <div className="text-gray-700 whitespace-pre-wrap break-words">{post.content}</div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-3">
              {isAuthenticated && !isLocked && depth < maxDepth && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Reply
                </button>
              )}
              {post.replyCount !== undefined && post.replyCount > 0 && (
                <span className="text-sm text-gray-400">
                  {post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}
                </span>
              )}
            </div>

            {/* Reply form */}
            {showReplyForm && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply..."
                  rows={3}
                  className="w-full px-3 py-2 bg-blue-50 text-gray-900 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white resize-none placeholder:text-gray-400"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReply}
                    isLoading={isSubmitting}
                    disabled={!replyContent.trim()}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {post.replies && post.replies.length > 0 && (
        <div className="mt-2">
          {post.replies.map((reply) => (
            <PostCard
              key={reply.id}
              post={reply}
              threadId={threadId}
              isLocked={isLocked}
              depth={depth + 1}
              isFirstPost={false}
              onReply={onReply}
              onPostUpdated={onPostUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
