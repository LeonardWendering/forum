"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { messageApi } from "@/lib/forum-api";
import { ApiClientError } from "@/lib/api";
import { Button, Alert } from "@/components/ui";
import type { Conversation, Message } from "@/lib/forum-types";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [convData, messagesData] = await Promise.all([
        messageApi.getConversation(conversationId),
        messageApi.getMessages(conversationId)
      ]);
      setConversation(convData);
      setMessages(messagesData.messages);

      // Mark as read
      if (convData.unreadCount > 0) {
        await messageApi.markAsRead(conversationId);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load conversation");
      }
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    } else if (!authLoading && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, loadData]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const sent = await messageApi.sendMessage(conversationId, { content: newMessage });
      setMessages((prev) => [...prev, sent]);
      setNewMessage("");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      }
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = formatDate(msg.createdAt);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date, messages: [msg] });
    }
  });

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in required</h2>
        <p className="text-gray-600 mb-4">Please sign in to view your messages.</p>
        <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
          Sign in
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}>
              <div className="h-16 bg-gray-200 rounded-lg w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <Alert variant="error">
        {error}
        <Link href="/messages" className="block mt-2 text-sm underline">
          Back to messages
        </Link>
      </Alert>
    );
  }

  if (!conversation) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <Link
          href="/messages"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
          <span className="text-gray-600 font-medium">
            {conversation.otherUser.displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">
          {conversation.otherUser.displayName}
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex items-center justify-center mb-4">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {group.date}
              </span>
            </div>
            <div className="space-y-3">
              {group.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isFromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
                      max-w-[70%] px-4 py-2 rounded-2xl
                      ${
                        msg.isFromMe
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-gray-100 text-gray-900 rounded-bl-md"
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.isFromMe ? "text-blue-200" : "text-gray-500"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                      {msg.isFromMe && msg.readAt && " · Read"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="pt-4 border-t border-gray-200">
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-blue-50 text-gray-900 border border-blue-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white placeholder:text-gray-400"
          />
          <Button
            type="submit"
            isLoading={isSending}
            disabled={!newMessage.trim()}
            className="rounded-full px-6"
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
