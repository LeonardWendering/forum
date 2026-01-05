"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { profileApi, messageApi } from "@/lib/forum-api";
import { ApiClientError } from "@/lib/api";
import { Button, Card, CardContent, Alert, Avatar } from "@/components/ui";
import type { UserProfile } from "@/lib/forum-types";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { user, isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    async function loadProfile() {
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
    }

    loadProfile();
  }, [userId]);

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
        // If conversation already exists, the API might return it or an error
        // Let's try to find an existing conversation
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
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <Avatar
              config={profile.avatarConfig ? {
                bodyType: profile.avatarConfig.bodyType,
                skinColor: profile.avatarConfig.skinColor,
                hairstyle: profile.avatarConfig.hairstyle,
                accessory: profile.avatarConfig.accessory
              } : null}
              size="lg"
            />

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {profile.displayName}
              </h1>
              <p className="text-sm text-gray-500 mb-4">
                Member since {new Date(profile.memberSince).toLocaleDateString()}
              </p>

              {profile.bio && (
                <p className="text-gray-700 mb-4">{profile.bio}</p>
              )}

              {/* Actions */}
              {!isOwnProfile && isAuthenticated && (
                <Button
                  onClick={handleSendMessage}
                  isLoading={isStartingConversation}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
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

              {isOwnProfile && (
                <Link
                  href="/setup-avatar"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit avatar
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}
    </div>
  );
}
