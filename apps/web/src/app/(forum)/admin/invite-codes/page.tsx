"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { adminApi, subcommunityApi } from "@/lib/forum-api";
import { ApiClientError } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, Alert, Input, FormField } from "@/components/ui";
import type { InviteCode, Subcommunity } from "@/lib/forum-types";

export default function InviteCodesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [subcommunities, setSubcommunities] = useState<Subcommunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSubcommunity, setSelectedSubcommunity] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);
  const [usesRemaining, setUsesRemaining] = useState<string>("");
  const [expiresIn, setExpiresIn] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "ADMIN")) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      loadData();
    }
  }, [isAuthenticated, user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [codes, communities] = await Promise.all([
        adminApi.listInviteCodes(),
        subcommunityApi.list()
      ]);
      setInviteCodes(codes);
      setSubcommunities(communities);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load data");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubcommunity) {
      setError("Please select a subcommunity");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const data: { subcommunityId: string; isRestricted?: boolean; usesRemaining?: number; expiresAt?: string } = {
        subcommunityId: selectedSubcommunity,
        isRestricted
      };

      if (usesRemaining) {
        data.usesRemaining = parseInt(usesRemaining, 10);
      }

      if (expiresIn) {
        const hours = parseInt(expiresIn, 10);
        const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
        data.expiresAt = expiresAt.toISOString();
      }

      const newCode = await adminApi.createInviteCode(data);
      setInviteCodes([newCode, ...inviteCodes]);
      setSuccessMessage(`Invite code created: ${newCode.code}`);
      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to create invite code");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInviteCode = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invite code?")) return;

    try {
      await adminApi.deleteInviteCode(id);
      setInviteCodes(inviteCodes.filter((c) => c.id !== id));
      setSuccessMessage("Invite code deleted");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to delete invite code");
      }
    }
  };

  const resetForm = () => {
    setSelectedSubcommunity("");
    setIsRestricted(false);
    setUsesRemaining("");
    setExpiresIn("");
  };

  const copyToClipboard = (code: string) => {
    const registerUrl = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(registerUrl);
    setSuccessMessage("Registration link copied to clipboard!");
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin" className="hover:text-gray-700">Admin</Link>
            <span>/</span>
            <span>Invite Codes</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Invite Codes</h1>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? "Cancel" : "Create Invite Code"}
        </Button>
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

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Create Invite Code</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInviteCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcommunity *
                </label>
                <select
                  value={selectedSubcommunity}
                  onChange={(e) => setSelectedSubcommunity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a subcommunity</option>
                  {subcommunities.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRestricted"
                  checked={isRestricted}
                  onChange={(e) => setIsRestricted(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="isRestricted" className="text-sm text-gray-700">
                  Restricted (user can only access this subcommunity)
                </label>
              </div>

              <FormField
                label="Uses Remaining (optional)"
                name="usesRemaining"
                type="number"
                placeholder="Leave empty for unlimited"
                value={usesRemaining}
                onChange={(e) => setUsesRemaining(e.target.value)}
                min={1}
              />

              <FormField
                label="Expires In Hours (optional)"
                name="expiresIn"
                type="number"
                placeholder="Leave empty for no expiration"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                min={1}
              />

              <div className="flex gap-2">
                <Button type="submit" isLoading={isCreating}>
                  Create Code
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {inviteCodes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No invite codes yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {inviteCodes.map((code) => (
            <Card key={code.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-lg font-mono font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {code.code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                        title="Copy registration link"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      {code.isRestricted && (
                        <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded font-medium">
                          Restricted
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      For: <span className="font-medium">{code.subcommunity.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>
                        Uses: {code.usesRemaining !== null ? code.usesRemaining : "Unlimited"}
                        {code._count?.usedBy !== undefined && ` (${code._count.usedBy} used)`}
                      </span>
                      <span>
                        Expires: {code.expiresAt ? new Date(code.expiresAt).toLocaleString() : "Never"}
                      </span>
                      <span>
                        Created: {new Date(code.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteInviteCode(code.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
