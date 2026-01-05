"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient, ApiClientError } from "@/lib/api";
import { Avatar, Button, Alert, Card, CardHeader, CardContent } from "@/components/ui";

interface UserProfile {
  id: string;
  displayName: string;
  role: string;
  createdAt: string;
  profile?: {
    bio?: string;
    avatarBodyType?: "MASCULINE" | "NEUTRAL" | "FEMININE";
    avatarSkinTone?: "LIGHT" | "MEDIUM" | "DARK";
    avatarHairstyle?: number;
    avatarAccessory?: "NONE" | "EARRINGS" | "SUNGLASSES" | "PARROT";
  };
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { user: currentUser, isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // TODO: Add user profile endpoint to API
        // For now, we'll show a placeholder
        setError("User profiles are coming soon!");
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError("Failed to load profile");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const handleSendMessage = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    setIsCreatingConversation(true);
    try {
      // Create or find existing conversation
      const response = await apiClient.post("/conversations", {
        recipientId: userId
      });

      const conversationId = response.data.id;
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to create conversation");
      }
    } finally {
      setIsCreatingConversation(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded mb-4" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="info">
        {error}
      </Alert>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              config={profile?.profile?.avatarBodyType ? {
                bodyType: profile.profile.avatarBodyType,
                skinTone: profile.profile.avatarSkinTone || "MEDIUM",
                hairstyle: profile.profile.avatarHairstyle || 1,
                accessory: profile.profile.avatarAccessory || "NONE"
              } : undefined}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.displayName || "User"}
              </h1>
              {profile?.role === "ADMIN" && (
                <span className="inline-block mt-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  Admin
                </span>
              )}
              {profile?.role === "MODERATOR" && (
                <span className="inline-block mt-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                  Moderator
                </span>
              )}
            </div>
          </div>

          {!isOwnProfile && isAuthenticated && (
            <Button
              onClick={handleSendMessage}
              isLoading={isCreatingConversation}
              size="sm"
            >
              Send Message
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {profile?.profile?.bio && (
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-1">Bio</h2>
            <p className="text-gray-600">{profile.profile.bio}</p>
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-1">Member since</h2>
          <p className="text-gray-600">
            {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Unknown"}
          </p>
        </div>

        {isOwnProfile && (
          <div className="pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => router.push("/settings")}
              className="w-full"
            >
              Edit Profile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
