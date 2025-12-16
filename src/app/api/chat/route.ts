import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch recent messages
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch last 50 messages with user profiles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages, error } = await (supabase as any)
    .from("chat_messages")
    .select(`
      *,
      profile:profiles(id, username, avatar_url)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Chat fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  // Reverse to get chronological order
  return NextResponse.json({ messages: (messages || []).reverse() });
}

// POST - Send a message
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: "Message too long (max 500 chars)" }, { status: 400 });
    }

    // Insert message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: message, error } = await (supabase as any)
      .from("chat_messages")
      .insert({
        user_id: user.id,
        content: content.trim(),
      })
      .select(`
        *,
        profile:profiles(id, username, avatar_url)
      `)
      .single();

    if (error) {
      console.error("Chat insert error:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
