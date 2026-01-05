import { api } from "./api";
import type {
  Subcommunity,
  CreateSubcommunityRequest,
  JoinSubcommunityRequest,
  Thread,
  ThreadsResponse,
  CreateThreadRequest,
  Post,
  CreatePostRequest,
  UpdatePostRequest,
  VoteRequest,
  Conversation,
  Message,
  MessagesResponse,
  CreateConversationRequest,
  SendMessageRequest,
  Member,
  MessageResponse,
  UserProfile,
  UpdateAvatarRequest,
  AvatarConfig
} from "./forum-types";

// Subcommunities API
export const subcommunityApi = {
  list: (): Promise<Subcommunity[]> =>
    api.get("/subcommunities"),

  get: (slug: string): Promise<Subcommunity> =>
    api.get(`/subcommunities/${slug}`),

  create: (data: CreateSubcommunityRequest): Promise<Subcommunity> =>
    api.post("/subcommunities", data, true),

  join: (slug: string, data?: JoinSubcommunityRequest): Promise<MessageResponse> =>
    api.post(`/subcommunities/${slug}/join`, data || {}, true),

  leave: (slug: string): Promise<MessageResponse> =>
    api.delete(`/subcommunities/${slug}/leave`),

  getMembers: (slug: string): Promise<Member[]> =>
    api.get(`/subcommunities/${slug}/members`, true)
};

// Threads API
export const threadApi = {
  listBySubcommunity: (
    slug: string,
    page = 1,
    limit = 20
  ): Promise<ThreadsResponse> =>
    api.get(`/subcommunities/${slug}/threads?page=${page}&limit=${limit}`),

  get: (threadId: string): Promise<Thread> =>
    api.get(`/threads/${threadId}`),

  create: (slug: string, data: CreateThreadRequest): Promise<Thread> =>
    api.post(`/subcommunities/${slug}/threads`, data, true),

  update: (
    threadId: string,
    data: Partial<{ title: string; isPinned: boolean; isLocked: boolean }>
  ): Promise<Thread> =>
    api.patch(`/threads/${threadId}`, data),

  delete: (threadId: string): Promise<MessageResponse> =>
    api.delete(`/threads/${threadId}`)
};

// Posts API
export const postApi = {
  listByThread: (threadId: string): Promise<Post[]> =>
    api.get(`/threads/${threadId}/posts`),

  get: (postId: string): Promise<Post> =>
    api.get(`/posts/${postId}`),

  create: (threadId: string, data: CreatePostRequest): Promise<Post> =>
    api.post(`/threads/${threadId}/posts`, data, true),

  update: (postId: string, data: UpdatePostRequest): Promise<Post> =>
    api.patch(`/posts/${postId}`, data),

  delete: (postId: string): Promise<MessageResponse> =>
    api.delete(`/posts/${postId}`),

  vote: (postId: string, data: VoteRequest): Promise<MessageResponse> =>
    api.post(`/posts/${postId}/vote`, data, true),

  removeVote: (postId: string): Promise<MessageResponse> =>
    api.delete(`/posts/${postId}/vote`)
};

// Conversations/Messages API
export const messageApi = {
  listConversations: (): Promise<Conversation[]> =>
    api.get("/conversations", true),

  getConversation: (conversationId: string): Promise<Conversation> =>
    api.get(`/conversations/${conversationId}`, true),

  getMessages: (
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<MessagesResponse> =>
    api.get(`/conversations/${conversationId}/messages?page=${page}&limit=${limit}`, true),

  createConversation: (data: CreateConversationRequest): Promise<Conversation> =>
    api.post("/conversations", data, true),

  sendMessage: (conversationId: string, data: SendMessageRequest): Promise<Message> =>
    api.post(`/conversations/${conversationId}/messages`, data, true),

  markAsRead: (conversationId: string): Promise<MessageResponse> =>
    api.patch(`/conversations/${conversationId}/read`, {}),

  getUnreadCount: (): Promise<{ unreadCount: number }> =>
    api.get("/conversations/unread", true)
};

// Profile API
export const profileApi = {
  getMyProfile: (): Promise<{ userId: string; displayName: string; bio: string | null; avatarConfig: AvatarConfig | null }> =>
    api.get("/profile/me", true),

  hasAvatar: (): Promise<{ hasAvatar: boolean }> =>
    api.get("/profile/me/has-avatar", true),

  updateAvatar: (data: UpdateAvatarRequest): Promise<{ avatarConfig: AvatarConfig }> =>
    api.patch("/profile/me/avatar", data),

  getPublicProfile: (userId: string): Promise<UserProfile> =>
    api.get(`/users/${userId}`),

  deleteAccount: (): Promise<MessageResponse> =>
    api.delete("/profile/me")
};
