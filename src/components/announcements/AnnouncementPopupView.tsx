import type React from "react";
import { X } from "lucide-react";
import type { PopupContent } from "@/lib/announcement-popup";

const isExternal = (url: string) => /^https?:\/\//i.test(url) && !/^https?:\/\/(www\.)?soulsampleclub\.com/i.test(url);

/**
 * The popup's look, shared by the live popup and the admin preview.
 * "card": the small bottom-right card. "bar": the slim bottom bar for narrow screens.
 */
export function AnnouncementPopupView({
  content,
  layout,
  onClose,
  onFollow,
}: {
  content: PopupContent;
  layout: "card" | "bar";
  onClose?: () => void;
  onFollow?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  const external = isExternal(content.buttonUrl);
  const linkProps = {
    href: content.buttonUrl,
    onClick: onFollow,
    ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
  };
  const close = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Hide for today"
      className="shrink-0 rounded-full p-[6px] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
    >
      <X className="h-[15px] w-[15px]" />
    </button>
  );

  if (layout === "bar") {
    return (
      <div className="flex items-center gap-[10px] border-t border-white/10 bg-[#0d0d0d]/95 pt-[10px] pb-[max(10px,env(safe-area-inset-bottom))] pl-[16px] pr-[8px] shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {content.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.imageUrl} alt="" className="h-[44px] w-[44px] shrink-0 rounded-[10px] object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{content.title}</p>
          {content.line && <p className="line-clamp-2 text-[12px] leading-snug text-white/55">{content.line}</p>}
        </div>
        <a
          {...linkProps}
          className="shrink-0 rounded-full bg-white px-[12px] py-[7px] text-[11px] font-bold uppercase tracking-[0.08em] text-black transition-colors hover:bg-white/90"
        >
          {content.buttonText}
        </a>
        {close}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[340px] overflow-hidden rounded-[20px] border border-white/10 bg-[#0d0d0d]/95 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.07)] backdrop-blur-xl">
      {content.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={content.imageUrl} alt="" className="block aspect-[16/9] w-full object-cover" />
      )}
      <div className="p-[16px]">
      <div className="flex items-start gap-[8px]">
        <div className="min-w-0 flex-1 pt-[2px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Announcement</p>
          <p className="mt-[6px] text-[14px] font-semibold leading-snug text-white">{content.title}</p>
        </div>
        {close}
      </div>
      {content.line && <p className="mt-[6px] text-[13px] leading-relaxed text-white/60">{content.line}</p>}
      <a
        {...linkProps}
        className="mt-[14px] inline-flex items-center rounded-full bg-white px-[14px] py-[8px] text-[11px] font-bold uppercase tracking-[0.1em] text-black transition-colors hover:bg-white/90"
      >
        {content.buttonText}
      </a>
      </div>
    </div>
  );
}
