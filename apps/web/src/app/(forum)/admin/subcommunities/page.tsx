"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { subcommunityApi, adminApi } from "@/lib/forum-api";
import { ApiClientError } from "@/lib/api";
import { Button, Card, CardContent, Alert } from "@/components/ui";
import type { Subcommunity, SubcommunityType } from "@/lib/forum-types";

interface ExtendedSubcommunity extends Subcommunity {
  isMuted?: boolean;
}

export default function SubcommunitiesAdminPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [subcommunities, setSubcommunities] = useState<ExtendedSubcommunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "ADMIN")) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      loadSubcommunities();
    }
  }, [isAuthenticated, user]);

  const loadSubcommunities = async () => {
    setIsLoading(true);
    try {
      const data = await subcommunityApi.list();
      setSubcommunities(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load subcommunities");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMute = async (id: string) => {
    setActionLoading(id);
    try {
      await adminApi.muteSubcommunity(id);
      await loadSubcommunities();
      setSuccessMessage("Subcommunity muted successfully");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to mute subcommunity");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnmute = async (id: string) => {
    setActionLoading(id);
    try {
      await adminApi.unmuteSubcommunity(id);
      await loadSubcommunities();
      setSuccessMessage("Subcommunity unmuted successfully");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to unmute subcommunity");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleVisibilityChange = async (id: string, newType: SubcommunityType) => {
    setActionLoading(id);
    try {
      await adminApi.updateSubcommunityVisibility(id, newType);
      await loadSubcommunities();
      setSuccessMessage("Visibility updated successfully");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to update visibility");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone and will delete all threads and posts.`)) return;

    setActionLoading(id);
    try {
      await adminApi.deleteSubcommunity(id);
      await loadSubcommunities();
      setSuccessMessage("Subcommunity deleted successfully");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to delete subcommunity");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getTypeColor = (type: SubcommunityType) => {
    switch (type) {
      case "PUBLIC":
        return "bg-green-100 text-green-800";
      case "INVITE_ONLY":
        return "bg-blue-100 text-blue-800";
      case "PASSWORD_PROTECTED":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
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
          <span>Subcommunities</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Subcommunity Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          {subcommunities.length} subcommunities
        </p>
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

      {subcommunities.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No subcommunities yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subcommunities.map((sub) => (
            <Card key={sub.id} className={sub.isMuted ? "border-red-200 bg-red-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/c/${sub.slug}`} className="font-semibold text-gray-900 hover:text-blue-600">
                        {sub.name}
                      </Link>
                      <span className={`px-2 py-0.5 text-xs rounded font-medium ${getTypeColor(sub.type)}`}>
                        {sub.type.replace("_", " ")}
                      </span>
                      {sub.isMuted && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded font-medium">
                          Muted
                        </span>
                      )}
                    </div>
                    {sub.description && (
                      <p className="text-sm text-gray-600 mb-2">{sub.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>{sub.memberCount} members</span>
                      <span>{sub.threadCount} threads</span>
                      <span>Created by {sub.createdBy.displayName}</span>
                      <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <select
                        value={sub.type}
                        onChange={(e) => handleVisibilityChange(sub.id, e.target.value as SubcommunityType)}
                        className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={actionLoading === sub.id}
                      >
                        <option value="PUBLIC">Public</option>
                        <option value="INVITE_ONLY">Invite Only</option>
                        <option value="PASSWORD_PROTECTED">Password Protected</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      {sub.isMuted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnmute(sub.id)}
                          isLoading={actionLoading === sub.id}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          Unmute
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMute(sub.id)}
                          isLoading={actionLoading === sub.id}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          Mute
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(sub.id, sub.name)}
                        isLoading={actionLoading === sub.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
