"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { subcommunityApi, threadApi } from "@/lib/forum-api";
import { ApiClientError } from "@/lib/api";
import { Button, FormField, Alert, Card, CardHeader, CardContent, CardFooter } from "@/components/ui";
import type { Subcommunity } from "@/lib/forum-types";

export default function NewThreadPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [subcommunity, setSubcommunity] = useState<Subcommunity | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    subcommunityApi
      .get(slug)
      .then(setSubcommunity)
      .catch((err) => {
        if (err instanceof ApiClientError) {
          setError(err.message);
        }
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const thread = await threadApi.create(slug, formData);
      router.push(`/t/${thread.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to create thread. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!subcommunity) {
    return (
      <Alert variant="error">
        {error || "Community not found"}
        <Link href="/communities" className="block mt-2 text-sm underline">
          Back to communities
        </Link>
      </Alert>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/c/${slug}`}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {subcommunity.name}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-900">Create New Thread</h1>
          <p className="text-gray-600 mt-1">
            in <span className="font-medium">{subcommunity.name}</span>
          </p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <FormField
              label="Title"
              name="title"
              placeholder="What do you want to discuss?"
              value={formData.title}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Share your thoughts, ask a question, or start a discussion..."
                rows={8}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white resize-none placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500">
                This will be the first post in your thread.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3">
            <Link href={`/c/${slug}`}>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!formData.title || !formData.content}
            >
              Create Thread
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
