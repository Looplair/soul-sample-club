"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { Send, ArrowLeft, MessageCircle, User, AlertCircle, RefreshCw } from "lucide-react";
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
  const [sendError, setSendError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>("connecting");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create supabase client once
  const supabase = useMemo(() => createClient(), []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages via API
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/chat");
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        console.error("Failed to fetch messages:", response.status);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);

        // Fetch profile using raw query to avoid type issues
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", user.id)
          .single();

        if (profile && !error) {
          setCurrentProfile(profile as UserProfile);
          if (!(profile as UserProfile).username) {
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

    // Create unique channel name
    const channelName = `chat-realtime-${Date.now()}`;

    // Subscribe to new messages using postgres_changes
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          console.log("Realtime INSERT received:", payload);

          // Check if we already have this message (from optimistic update)
          const newMessageId = (payload.new as { id: string }).id;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessageId)) {
              return prev;
            }

            // Fetch the full message with profile
            fetchMessageById(newMessageId);
            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        setRealtimeStatus(status);
      });

    return () => {
      console.log("Unsubscribing from channel");
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchMessages]);

  // Fetch a single message by ID
  const fetchMessageById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(
          `
          *,
          profile:profiles(id, username, avatar_url)
        `
        )
        .eq("id", id)
        .single();

      if (data && !error) {
        setMessages((prev) => {
          // Check if already exists
          if (prev.some((m) => m.id === id)) {
            return prev;
          }
          return [...prev, data as ChatMessage];
        });
      }
    } catch (error) {
      console.error("Failed to fetch message:", error);
    }
  };

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
        setCurrentProfile((prev) => (prev ? { ...prev, username } : null));
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

    if (!currentProfile?.username) {
      setShowUsernameSetup(true);
      return;
    }

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsSending(true);
    setSendError(null);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      user_id: currentUserId!,
      content: messageContent,
      created_at: new Date().toISOString(),
      profile: currentProfile,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      });

      if (response.ok) {
        const data = await response.json();
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data.message as ChatMessage) : m))
        );
      } else {
        const data = await response.json();
        console.error("Send error:", data.error);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setNewMessage(messageContent);
        setSendError(data.error || "Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(messageContent);
      setSendError("Failed to send message. Check your connection.");
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-charcoal flex flex-col pb-20">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/feed"
              className="flex items-center gap-2 text-text-muted hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-white" />
              <h1 className="text-body sm:text-h4 font-semibold text-white">Member Chat</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {realtimeStatus !== "SUBSCRIBED" && (
              <button
                onClick={fetchMessages}
                className="p-2 text-text-muted hover:text-white transition-colors"
                title="Refresh messages"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {currentProfile?.username && (
              <span className="text-caption sm:text-body-sm text-text-muted hidden sm:block">
                @{currentProfile.username}
              </span>
            )}
          </div>
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
                Pick a username to use in the chat.
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
                onChange={(e) =>
                  setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                placeholder="username"
                maxLength={20}
                disabled={isSettingUsername}
              />
              <p className="text-caption text-text-subtle">
                Lowercase letters, numbers, and underscores only.
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
        <div className="container-app py-4 space-y-3 sm:space-y-4">
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
              const isOptimistic = message.id.startsWith("temp-");

              return (
                <div
                  key={message.id}
                  className={cn("flex gap-2 sm:gap-3", isOwnMessage && "flex-row-reverse")}
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
                  <div className={cn("max-w-[80%] sm:max-w-[75%]", isOwnMessage && "text-right")}>
                    <div
                      className={cn("flex items-center gap-2 mb-1", isOwnMessage && "justify-end")}
                    >
                      <span
                        className={cn(
                          "text-caption font-medium",
                          isOwnMessage ? "text-white" : "text-text-secondary"
                        )}
                      >
                        @{username}
                      </span>
                      <span className="text-[10px] text-text-subtle">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "inline-block px-3 sm:px-4 py-2 rounded-2xl text-body",
                        isOwnMessage
                          ? "bg-white text-charcoal rounded-br-md"
                          : "bg-grey-800 text-white rounded-bl-md",
                        isOptimistic && "opacity-70"
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
      <div className="fixed bottom-20 sm:bottom-0 left-0 right-0 border-t border-grey-700 bg-charcoal/95 backdrop-blur-xl z-30">
        <form onSubmit={handleSend} className="container-app py-3 sm:py-4">
          {sendError && (
            <div className="flex items-center gap-2 text-error text-body-sm bg-error/10 border border-error/30 rounded-lg p-3 mb-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {sendError}
            </div>
          )}
          {!currentProfile?.username && (
            <p className="text-body-sm text-text-muted mb-2">
              <button
                type="button"
                onClick={() => setShowUsernameSetup(true)}
                className="text-white underline hover:no-underline"
              >
                Set a username
              </button>{" "}
              to start chatting
            </p>
          )}
          <div className="flex gap-2 sm:gap-3">
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                if (sendError) setSendError(null);
              }}
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
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
