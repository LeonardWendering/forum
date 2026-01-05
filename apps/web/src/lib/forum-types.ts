// Subcommunity types
export type SubcommunityType = "PUBLIC" | "INVITE_ONLY" | "PASSWORD_PROTECTED";

export interface Subcommunity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: SubcommunityType;
  createdBy: {
    id: string;
    displayName: string;
  };
  createdAt: string;
  memberCount: number;
  threadCount: number;
  membership?: {
    role: string;
    joinedAt: string;
  } | null;
}

export interface CreateSubcommunityRequest {
  name: string;
  slug: string;
  description?: string;
  type?: SubcommunityType;
  password?: string;
}

export interface JoinSubcommunityRequest {
  password?: string;
}

// Thread types
export interface Thread {
  id: string;
  title: string;
  author: {
    id: string;
    displayName: string;
  };
  subcommunity?: {
    id: string;
    name: string;
    slug: string;
  };
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  postCount: number;
  preview?: string;
  voteScore?: number;
}

export interface ThreadsResponse {
  threads: Thread[];
  pagination: Pagination;
}

export interface CreateThreadRequest {
  title: string;
  content: string;
}

// Post types
export interface Post {
  id: string;
  content: string;
  author: {
    id: string;
    displayName: string;
  };
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  replyCount?: number;
  userVote?: number;
  voteScore?: number;
  replies?: Post[];
}

export interface CreatePostRequest {
  content: string;
  parentId?: string;
}

export interface UpdatePostRequest {
  content: string;
}

export interface VoteRequest {
  value: 1 | -1;
}

// Messaging types
export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    displayName: string;
  };
  lastMessage?: {
    content: string;
    isFromMe: boolean;
    createdAt: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    displayName: string;
  };
  isFromMe: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: Pagination;
}

export interface CreateConversationRequest {
  recipientId: string;
}

export interface SendMessageRequest {
  content: string;
}

// Member types
export interface Member {
  user: {
    id: string;
    displayName: string;
    role: string;
  };
  role: string;
  joinedAt: string;
}

// Common types
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MessageResponse {
  message: string;
}
