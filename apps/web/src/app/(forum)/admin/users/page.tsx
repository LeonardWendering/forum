"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { adminApi } from "@/lib/forum-api";
import { ApiClientError } from "@/lib/api";
import { Button, Card, CardContent, Alert, Input } from "@/components/ui";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  isRestricted: boolean;
  createdAt: string;
  _count?: {
    posts: number;
    memberships: number;
  };
}

interface UserListResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function UsersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [usersData, setUsersData] = useState<UserListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "ADMIN")) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      loadUsers(page);
    }
  }, [isAuthenticated, user, page]);

  const loadUsers = async (pageNum: number) => {
    setIsLoading(true);
    try {
      const data = await adminApi.listUsers(pageNum, 20) as UserListResponse;
      setUsersData(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load users");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (!confirm("Are you sure you want to suspend this user?")) return;

    setActionLoading(userId);
    try {
      await adminApi.suspendUser(userId);
      await loadUsers(page);
      setSuccessMessage("User suspended successfully");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to suspend user");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminApi.unsuspendUser(userId);
      await loadUsers(page);
      setSuccessMessage("User unsuspended successfully");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to unsuspend user");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to delete user "${displayName}"? This action cannot be undone.`)) return;

    setActionLoading(userId);
    try {
      await adminApi.deleteUser(userId);
      await loadUsers(page);
      setSuccessMessage("User deleted successfully");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to delete user");
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return (
      <Alert variant="error">
        You do not have permission to access this page.
      </Alert>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">Admin</Link>
          <span>/</span>
          <span>Users</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        {usersData && (
          <p className="text-sm text-gray-600 mt-1">
            {usersData.pagination.total} total users
          </p>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-sm underline">
            Dismiss
          </button>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="mb-4">
          {successMessage}
          <button onClick={() => setSuccessMessage(null)} className="ml-2 text-sm underline">
            Dismiss
          </button>
        </Alert>
      )}

      {!usersData || usersData.users.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No users found.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {usersData.users.map((u) => (
              <Card key={u.id} className={u.status === "SUSPENDED" ? "border-red-200 bg-red-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/u/${u.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                          {u.displayName}
                        </Link>
                        {u.role === "ADMIN" && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded font-medium">
                            Admin
                          </span>
                        )}
                        {u.status === "SUSPENDED" && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded font-medium">
                            Suspended
                          </span>
                        )}
                        {u.isRestricted && (
                          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded font-medium">
                            Restricted
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">{u.email}</div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                        {u._count && (
                          <>
                            <span>{u._count.posts} posts</span>
                            <span>{u._count.memberships} communities</span>
                          </>
                        )}
                      </div>
                    </div>
                    {u.role !== "ADMIN" && u.id !== user?.id && (
                      <div className="flex gap-2">
                        {u.status === "SUSPENDED" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnsuspendUser(u.id)}
                            isLoading={actionLoading === u.id}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            Unsuspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuspendUser(u.id)}
                            isLoading={actionLoading === u.id}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            Suspend
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(u.id, u.displayName)}
                          isLoading={actionLoading === u.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {usersData.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="py-2 px-4 text-sm text-gray-600">
                Page {page} of {usersData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(usersData.pagination.totalPages, p + 1))}
                disabled={page >= usersData.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
