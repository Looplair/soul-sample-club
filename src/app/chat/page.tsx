"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { Send, ArrowLeft, MessageCircle, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/chat");
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get current user and profile
  useEffect(() => {
    async function getUserAndProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);

        // Fetch profile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", user.id)
          .single();

        if (profile) {
          const userProfile = profile as UserProfile;
          setCurrentProfile(userProfile);
          // Show username setup if no username
          if (!userProfile.username) {
            setShowUsernameSetup(true);
          }
        }
      }
    }
    getUserAndProfile();
  }, [supabase]);

  // Fetch messages and subscribe to realtime
  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          // Fetch the full message with profile
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await (supabase as any)
            .from("chat_messages")
            .select(`
              *,
              profile:profiles(id, username, avatar_url)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as ChatMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || isSettingUsername) return;

    const username = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return;
    }

    setIsSettingUsername(true);
    setUsernameError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ username })
        .eq("id", currentUserId);

      if (error) {
        if (error.code === "23505") {
          setUsernameError("Username already taken");
        } else {
          setUsernameError(error.message);
        }
      } else {
        setCurrentProfile((prev) => prev ? { ...prev, username } : null);
        setShowUsernameSetup(false);
      }
    } catch (error) {
      console.error("Failed to set username:", error);
      setUsernameError("Failed to set username");
    } finally {
      setIsSettingUsername(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    // Check if user has a username
    if (!currentProfile?.username) {
      setShowUsernameSetup(true);
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });

      if (response.ok) {
        setNewMessage("");
      } else {
        const data = await response.json();
        console.error("Send error:", data.error);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-charcoal flex flex-col">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/feed"
              className="flex items-center gap-2 text-text-muted hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-white" />
              <h1 className="text-h4 text-white">Member Chat</h1>
            </div>
          </div>
          {currentProfile?.username && (
            <span className="text-body-sm text-text-muted">
              Chatting as <span className="text-white">@{currentProfile.username}</span>
            </span>
          )}
        </div>
      </header>

      {/* Username Setup Modal */}
      {showUsernameSetup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal-elevated border border-grey-700 rounded-2xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-grey-700 flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-h3 text-white mb-2">Choose a Username</h2>
              <p className="text-body-sm text-text-muted">
                Pick a username to use in the chat. This will be visible to other members.
              </p>
            </div>

            <form onSubmit={handleSetUsername} className="space-y-4">
              {usernameError && (
                <div className="flex items-center gap-2 text-error text-body-sm bg-error/10 border border-error/30 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {usernameError}
                </div>
              )}

              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="username"
                maxLength={20}
                disabled={isSettingUsername}
              />
              <p className="text-caption text-text-subtle">
                Only lowercase letters, numbers, and underscores. 3-20 characters.
              </p>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowUsernameSetup(false)}
                  className="flex-1"
                  disabled={isSettingUsername}
                >
                  Later
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!newUsername.trim() || newUsername.length < 3 || isSettingUsername}
                  isLoading={isSettingUsername}
                >
                  Set Username
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="container-app py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-text-subtle mx-auto mb-4" />
              <p className="text-body text-text-muted">No messages yet</p>
              <p className="text-body-sm text-text-subtle mt-1">Be the first to say something!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.user_id === currentUserId;
              const username = message.profile?.username || "Anonymous";

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isOwnMessage && "flex-row-reverse"
                  )}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-grey-700 flex items-center justify-center flex-shrink-0">
                    {message.profile?.avatar_url ? (
                      <img
                        src={message.profile.avatar_url}
                        alt={username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-text-muted" />
                    )}
                  </div>

                  {/* Message */}
                  <div className={cn("max-w-[75%]", isOwnMessage && "text-right")}>
                    <div className={cn("flex items-center gap-2 mb-1", isOwnMessage && "justify-end")}>
                      <span className={cn(
                        "text-caption font-medium",
                        isOwnMessage ? "text-white" : "text-text-secondary"
                      )}>
                        @{username}
                      </span>
                      <span className="text-[10px] text-text-subtle">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "inline-block px-4 py-2 rounded-2xl text-body",
                        isOwnMessage
                          ? "bg-white text-charcoal rounded-br-md"
                          : "bg-grey-800 text-white rounded-bl-md"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Message Input */}
      <div className="border-t border-grey-700 bg-charcoal/90 backdrop-blur-xl">
        <form onSubmit={handleSend} className="container-app py-4">
          {!currentProfile?.username && (
            <p className="text-body-sm text-text-muted mb-2">
              <button
                type="button"
                onClick={() => setShowUsernameSetup(true)}
                className="text-white underline hover:no-underline"
              >
                Set a username
              </button>
              {" "}to start chatting
            </p>
          )}
          <div className="flex gap-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={currentProfile?.username ? "Type a message..." : "Set username first..."}
              maxLength={500}
              className="flex-1"
              disabled={isSending || !currentProfile?.username}
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || isSending || !currentProfile?.username}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
