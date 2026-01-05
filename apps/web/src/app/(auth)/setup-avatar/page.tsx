"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { profileApi } from "@/lib/forum-api";
import { Button, Card, CardHeader, CardContent, CardFooter, AvatarSelector } from "@/components/ui";
import type { AvatarConfig } from "@/components/ui/avatar";

export default function SetupAvatarPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    bodyType: "NEUTRAL",
    skinColor: "MEDIUM",
    hairstyle: "NEUTRAL_BOB",
    accessory: "NONE"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await profileApi.updateAvatar({
        bodyType: avatarConfig.bodyType!,
        skinColor: avatarConfig.skinColor!,
        hairstyle: avatarConfig.hairstyle!,
        accessory: avatarConfig.accessory || undefined
      });
      router.push("/communities");
    } catch {
      setError("Failed to save avatar. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.push("/communities");
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <h1 className="text-2xl font-bold text-gray-900">Create Your Avatar</h1>
        <p className="text-gray-600 mt-1">
          Customize how you appear in the forum
        </p>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <AvatarSelector value={avatarConfig} onChange={setAvatarConfig} />
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <Button
          className="w-full"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!avatarConfig.bodyType || !avatarConfig.skinColor || !avatarConfig.hairstyle}
        >
          Save Avatar
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={handleSkip}
          disabled={isSubmitting}
        >
          Skip for now
        </Button>
      </CardFooter>
    </Card>
  );
}
