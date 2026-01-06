"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { adminApi, profileApi, messageApi } from "@/lib/forum-api";
import { ApiClientError } from "@/lib/api";
import { ThreadCard } from "@/components/forum";
import { Button, Card, CardContent, Alert, Avatar, Input } from "@/components/ui";
import type { UserProfile, UserMembership, UserPost, Thread, AdminUser } from "@/lib/forum-types";

type Tab = "overview" | "communities" | "threads" | "posts";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { user, isAuthenticated, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [threadsPage, setThreadsPage] = useState(1);
  const [threadsTotalPages, setThreadsTotalPages] = useState(1);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoadingAdminUser, setIsLoadingAdminUser] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnProfile = user?.id === userId;
  const isAdminViewer = user?.role === "ADMIN";
  const canManageUser = isAdminViewer && !isOwnProfile && adminUser?.role !== "ADMIN";

  const loadProfile = useCallback(async () => {
    try {
      const data = await profileApi.getPublicProfile(userId);
      setProfile(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load profile");
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (activeTab === "communities" && memberships.length === 0) {
      loadMemberships();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "threads" && threads.length === 0) {
      loadThreads(1);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "posts" && posts.length === 0) {
      loadPosts(1);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadAdminUser();
      return;
    }
    setAdminUser(null);
  }, [user?.role, userId]);

  const loadMemberships = async () => {
    setIsLoadingMemberships(true);
    try {
      const data = await profileApi.getUserMemberships(userId);
      setMemberships(data);
    } catch (err) {
      console.error("Failed to load memberships", err);
    } finally {
      setIsLoadingMemberships(false);
    }
  };

  const loadThreads = async (page: number) => {
    setIsLoadingThreads(true);
    try {
      const data = await profileApi.getUserThreads(userId, page, 10);
      setThreads(data.threads);
      setThreadsPage(data.pagination.page);
      setThreadsTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error("Failed to load threads", err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const loadPosts = async (page: number) => {
    setIsLoadingPosts(true);
    try {
      const data = await profileApi.getUserPosts(userId, page, 10);
      setPosts(data.posts);
      setPostsPage(data.pagination.page);
      setPostsTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error("Failed to load posts", err);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const loadAdminUser = async () => {
    setIsLoadingAdminUser(true);
    try {
      const data = await adminApi.getUser(userId);
      setAdminUser(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load admin data");
      }
    } finally {
      setIsLoadingAdminUser(false);
    }
  };

  const handleSendMessage = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    setIsStartingConversation(true);
    try {
      const conversation = await messageApi.createConversation({ recipientId: userId });
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        try {
          const conversations = await messageApi.listConversations();
          const existing = conversations.find(c => c.otherUser.id === userId);
          if (existing) {
            router.push(`/messages/${existing.id}`);
            return;
          }
        } catch {
          // Ignore
        }
        setError(err.message);
      } else {
        setError("Failed to start conversation");
      }
    } finally {
      setIsStartingConversation(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;

    setIsDeleting(true);
    try {
      await profileApi.deleteAccount();
      await logout();
      router.push("/");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to delete account");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!adminUser) return;
    if (!confirm(`Suspend ${adminUser.displayName}?`)) return;

    setAdminActionLoading("suspend");
    try {
      await adminApi.suspendUser(adminUser.id);
      await loadAdminUser();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to suspend user");
      }
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleUnsuspendUser = async () => {
    if (!adminUser) return;

    setAdminActionLoading("unsuspend");
    try {
      await adminApi.unsuspendUser(adminUser.id);
      await loadAdminUser();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to unsuspend user");
      }
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!adminUser) return;
    if (!confirm(`Delete ${adminUser.displayName}? This cannot be undone.`)) return;

    setAdminActionLoading("delete");
    try {
      await adminApi.deleteUser(adminUser.id);
      await loadAdminUser();
      await loadProfile();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to delete user");
      }
    } finally {
      setAdminActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-24 h-24 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <Alert variant="error">
        {error}
        <Link href="/communities" className="block mt-2 text-sm underline">
          Back to communities
        </Link>
      </Alert>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar
              config={profile.avatarConfig ? {
                bodyType: profile.avatarConfig.bodyType,
                skinColor: profile.avatarConfig.skinColor,
                hairstyle: profile.avatarConfig.hairstyle,
                accessory: profile.avatarConfig.accessory
              } : null}
              size="lg"
            />

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.displayName}
                </h1>
                {isAdminViewer && adminUser?.role === "ADMIN" && (
                  <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded font-medium">
                    Admin
                  </span>
                )}
                {isAdminViewer && adminUser?.status === "SUSPENDED" && (
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded font-medium">
                    Suspended
                  </span>
                )}
                {isAdminViewer && adminUser?.isRestricted && (
                  <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded font-medium">
                    Restricted
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Member since {new Date(profile.memberSince).toLocaleDateString()}
              </p>

              {profile.bio && (
                <p className="text-gray-700 mb-4">{profile.bio}</p>
              )}

              {!isOwnProfile && isAuthenticated && (
                <Button
                  onClick={handleSendMessage}
                  isLoading={isStartingConversation}
                >
                  Send Message
                </Button>
              )}

              {!isOwnProfile && !isAuthenticated && (
                <p className="text-sm text-gray-500">
                  <Link href="/login" className="text-blue-600 hover:text-blue-800">
                    Sign in
                  </Link>
                  {" "}to send a message
                </p>
              )}
            </div>

            {isAdminViewer && (
              <div className="flex flex-col items-end gap-2 min-w-[140px]">
                {isLoadingAdminUser ? (
                  <div className="h-9 w-28 bg-gray-200 animate-pulse rounded-lg" />
                ) : canManageUser ? (
                  <>
                    {adminUser?.status === "SUSPENDED" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUnsuspendUser}
                        isLoading={adminActionLoading === "unsuspend"}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        Unsuspend
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSuspendUser}
                        isLoading={adminActionLoading === "suspend"}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        Suspend
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteUser}
                      isLoading={adminActionLoading === "delete"}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 border-b-2 font-medium text-sm ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("communities")}
            className={`py-3 border-b-2 font-medium text-sm ${
              activeTab === "communities"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Communities
          </button>
          <button
            onClick={() => setActiveTab("threads")}
            className={`py-3 border-b-2 font-medium text-sm ${
              activeTab === "threads"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Threads
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`py-3 border-b-2 font-medium text-sm ${
              activeTab === "posts"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Posts
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <Card>
          <CardContent className="p-6">
            {isOwnProfile ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Link href="/setup-avatar">
                    <Button variant="outline">Change Avatar</Button>
                  </Link>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete Account
                    </button>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 mb-3">
                        This action cannot be undone. Your display name will be changed to &quot;(deleted user)&quot; and you will be logged out.
                      </p>
                      <p className="text-sm text-red-800 mb-3">
                        Type <strong>DELETE</strong> to confirm:
                      </p>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE"
                        className="mb-3"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleDeleteAccount}
                          isLoading={isDeleting}
                          disabled={deleteConfirmText !== "DELETE"}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">
                View {profile.displayName}&apos;s communities, threads, and posts using the tabs above.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "communities" && (
        <div>
          {isLoadingMemberships ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
          ) : memberships.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No forum memberships yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {memberships.map((membership) => (
                <Link key={membership.id} href={`/c/${membership.slug}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{membership.name}</h3>
                          {membership.description && (
                            <p className="text-sm text-gray-600 mt-1">{membership.description}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span>{membership.memberCount} members</span>
                            <span>{membership.threadCount} threads</span>
                            <span>Joined {new Date(membership.joinedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          membership.role === "moderator"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {membership.role}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "threads" && (
        <div>
          {isLoadingThreads ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No threads yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {threads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  showSubcommunity
                  onThreadUpdated={() => loadThreads(threadsPage)}
                />
              ))}

              {threadsTotalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadThreads(threadsPage - 1)}
                    disabled={threadsPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="py-2 px-4 text-sm text-gray-600">
                    Page {threadsPage} of {threadsTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadThreads(threadsPage + 1)}
                    disabled={threadsPage >= threadsTotalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "posts" && (
        <div>
          {isLoadingPosts ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                {isOwnProfile ? "Here will appear your posts." : "No posts yet."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Link key={post.id} href={`/t/${post.thread.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="text-xs text-gray-500 mb-2">
                        <span className="text-blue-600">{post.thread.subcommunity.name}</span>
                        {" / "}
                        <span>{post.thread.title}</span>
                      </div>
                      <p className="text-gray-800 line-clamp-3">{post.content}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        {new Date(post.createdAt).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {/* Pagination */}
              {postsTotalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPosts(postsPage - 1)}
                    disabled={postsPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="py-2 px-4 text-sm text-gray-600">
                    Page {postsPage} of {postsTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPosts(postsPage + 1)}
                    disabled={postsPage >= postsTotalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}
    </div>
  );
}
