"use client";

import { useState } from "react";
import { Share2, Check, Copy, Twitter, Facebook, Link2 } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
}

export function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || "");

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      setShowDropdown(!showDropdown);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleNativeShare}
        className="flex items-center gap-2 px-4 py-2 bg-grey-800 hover:bg-grey-700 border border-grey-700 rounded-lg text-sm text-white transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      {/* Dropdown for browsers without native share */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-grey-800 border border-grey-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <a
              href={shareLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-grey-700 transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              <Twitter className="w-4 h-4 text-[#1DA1F2]" />
              <span className="text-sm text-white">Share on X</span>
            </a>

            <a
              href={shareLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-grey-700 transition-colors border-t border-grey-700"
              onClick={() => setShowDropdown(false)}
            >
              <Facebook className="w-4 h-4 text-[#1877F2]" />
              <span className="text-sm text-white">Share on Facebook</span>
            </a>

            <button
              onClick={() => {
                handleCopyLink();
                setShowDropdown(false);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-grey-700 transition-colors border-t border-grey-700 w-full text-left"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-sm text-success">Copied!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 text-text-muted" />
                  <span className="text-sm text-white">Copy link</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Inline share buttons variant (no dropdown)
export function ShareButtonsInline({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-grey-800 hover:bg-[#1DA1F2]/20 border border-grey-700 hover:border-[#1DA1F2]/30 transition-colors"
        title="Share on X"
      >
        <Twitter className="w-4 h-4 text-text-muted hover:text-[#1DA1F2]" />
      </a>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-grey-800 hover:bg-[#1877F2]/20 border border-grey-700 hover:border-[#1877F2]/30 transition-colors"
        title="Share on Facebook"
      >
        <Facebook className="w-4 h-4 text-text-muted hover:text-[#1877F2]" />
      </a>

      <button
        onClick={handleCopyLink}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-grey-800 hover:bg-grey-700 border border-grey-700 transition-colors"
        title={copied ? "Copied!" : "Copy link"}
      >
        {copied ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <Copy className="w-4 h-4 text-text-muted" />
        )}
      </button>
    </div>
  );
}
