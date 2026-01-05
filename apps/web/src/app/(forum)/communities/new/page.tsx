"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { subcommunityApi } from "@/lib/forum-api";
import { ApiClientError } from "@/lib/api";
import { Button, FormField, Alert, Card, CardHeader, CardContent, CardFooter } from "@/components/ui";
import type { SubcommunityType } from "@/lib/forum-types";

export default function NewCommunityPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    type: "PUBLIC" as SubcommunityType,
    password: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);

    // Auto-generate slug from name
    if (name === "name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50);
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        type: formData.type,
        password: formData.type === "PASSWORD_PROTECTED" ? formData.password : undefined
      };

      const subcommunity = await subcommunityApi.create(data);
      router.push(`/c/${subcommunity.slug}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to create community. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/communities"
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Communities
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-900">Create a Community</h1>
          <p className="text-gray-600 mt-1">Start a new discussion space</p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <FormField
              label="Community Name"
              name="name"
              placeholder="e.g., Research Discussion Group"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />

            <FormField
              label="URL Slug"
              name="slug"
              placeholder="research-discussion"
              value={formData.slug}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 -mt-3">
              This will be used in the URL: /c/{formData.slug || "your-slug"}
            </p>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What is this community about?"
                rows={3}
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white resize-none placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Privacy Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
              >
                <option value="PUBLIC">Public - Anyone can join</option>
                <option value="PASSWORD_PROTECTED">Password Protected - Requires password to join</option>
                <option value="INVITE_ONLY">Invite Only - Members must be invited</option>
              </select>
            </div>

            {formData.type === "PASSWORD_PROTECTED" && (
              <FormField
                label="Community Password"
                name="password"
                type="password"
                placeholder="Enter a password for joining"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            )}
          </CardContent>

          <CardFooter className="flex justify-end gap-3">
            <Link href="/communities">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!formData.name || !formData.slug}
            >
              Create Community
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
