"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface PostComposerProps {
  placeholder?: string;
  buttonText?: string;
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function PostComposer({
  placeholder = "Write your post...",
  buttonText = "Post",
  onSubmit,
  disabled = false
}: PostComposerProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent("");
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={4}
        disabled={disabled || isSubmitting}
        className="w-full px-3 py-2 bg-blue-50 text-gray-900 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white resize-none placeholder:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      <div className="flex justify-end mt-3">
        <Button
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!content.trim() || disabled}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
