"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { nyInputToIso } from "@/lib/announcement-popup";

interface CreateNotificationButtonProps {
  onCreated?: () => void;
}

export function CreateNotificationButton({ onCreated }: CreateNotificationButtonProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"announcement" | "custom">("announcement");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [showAt, setShowAt] = useState(""); // New York time, "YYYY-MM-DDTHH:mm"
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const showAtIso = scheduled ? nyInputToIso(showAt) : null;
    if (scheduled && !showAtIso) {
      setError("Pick the date and time it should go out.");
      return;
    }
    if (showAtIso && new Date(showAtIso).getTime() <= Date.now()) {
      setError("That time has already passed. Pick a time in the future, or send it now.");
      return;
    }
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("notifications") as any).insert({
        title,
        message,
        type,
        link_url: linkUrl || null,
        link_new_tab: linkUrl ? linkNewTab : false,
        created_by: user?.id,
        // Only sent when scheduling, so sending now works even before the schedule column exists
        ...(showAtIso ? { show_at: showAtIso } : {}),
      });

      if (error) throw error;

      setIsOpen(false);
      setTitle("");
      setMessage("");
      setType("announcement");
      setLinkUrl("");
      setLinkNewTab(false);
      setScheduled(false);
      setShowAt("");
      onCreated?.();
    } catch (error) {
      console.error("Error creating notification:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Create Notification
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create Notification"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., New feature available!"
            required
          />

          <div>
            <label className="label">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message..."
              rows={3}
              className="input resize-none"
              required
            />
          </div>

          <Input
            label="Link URL (Optional)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="e.g., /blog/new-feature or https://example.com"
          />

          {linkUrl && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={linkNewTab}
                onChange={(e) => setLinkNewTab(e.target.checked)}
                className="w-4 h-4 rounded border-grey-600 bg-grey-800 text-velvet focus:ring-velvet"
              />
              <span className="text-sm text-text-muted">Open link in new tab</span>
            </label>
          )}

          <div>
            <label className="label">Type</label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as "announcement" | "custom")
              }
              className="input"
            >
              <option value="announcement">Announcement</option>
              <option value="custom">Custom / Info</option>
            </select>
          </div>

          <div>
            <label className="label">When</label>
            <div className="flex gap-2">
              {[
                { on: false, label: "Send now" },
                { on: true, label: "Schedule" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setScheduled(o.on)}
                  className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                    scheduled === o.on ? "bg-white text-black font-semibold" : "border border-white/15 text-text-muted hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {scheduled && (
              <div className="mt-3">
                <input type="datetime-local" value={showAt} onChange={(e) => setShowAt(e.target.value)} className="input" />
                <p className="mt-1 text-xs text-text-muted">New York time. Members see it from then on.</p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {scheduled ? "Schedule" : "Send now"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
