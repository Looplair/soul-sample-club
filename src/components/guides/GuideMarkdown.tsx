import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lightbulb, AlertTriangle, Sparkles, PenLine } from "lucide-react";
import { remarkGuide } from "./remark-guide";
import { GuidePackEmbed, type GuidePack } from "./GuidePackEmbed";
import { slugify } from "@/lib/guide-utils";

// Callouts are glass boxes. Chrome stays black and white, so the kinds differ by
// icon, label and edge rather than colour; the SSC one gets a soft white glow.
const CALLOUTS = {
  tip: { label: "Tip", icon: Lightbulb, className: "ssc-glass ssc-glass--plain" },
  warning: { label: "Watch out", icon: AlertTriangle, className: "ssc-glass ssc-glass--plain !border-white/25" },
  ssc: { label: "The SSC way", icon: Sparkles, className: "ssc-glass !border-white/20" },
  // Draft-only gap for Chris to fill in; publishing is blocked while any remain
  chris: { label: "Chris to write", icon: PenLine, className: "ssc-glass ssc-glass--plain !border-dashed !border-white/45" },
} as const;

// Long-form reading: light 17-18px body on a ~68ch measure (set by the page),
// with calm sentence-case H2/H3 so the display face stays for the title
const LINK = "text-white underline decoration-white/40 decoration-1 underline-offset-[5px] transition-colors hover:decoration-white";

function textOf(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textOf).join("");
  if (children && typeof children === "object" && "props" in children) {
    return textOf((children as { props: { children?: React.ReactNode } }).props.children);
  }
  return "";
}

/**
 * liveGuideSlugs: on the public page, links to guides that aren't live yet
 * render as plain text (they become links on their go-live date). Omit it in
 * the admin preview to show every link.
 */
export function GuideMarkdown({
  body,
  packs,
  liveGuideSlugs,
}: {
  body: string;
  packs: Record<string, GuidePack>;
  liveGuideSlugs?: string[];
}) {
  const components = {
    h2: ({ children }) => (
      <h2
        id={slugify(textOf(children))}
        className="mb-5 mt-16 scroll-mt-28 text-[1.6rem] font-semibold leading-[1.2] tracking-[-0.02em] text-white sm:text-[1.9rem]"
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-3 mt-10 text-[1.2rem] font-semibold leading-snug tracking-[-0.01em] text-white sm:text-[1.3rem]">{children}</h3>
    ),
    p: ({ children }) => <p className="my-6 text-[17px] font-light leading-[1.8] text-white/75 sm:text-[18px]">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    a: ({ href = "", children }) => {
      const guideSlug = href.match(/^\/guides\/([^/#?]+)/)?.[1];
      if (guideSlug && liveGuideSlugs && !liveGuideSlugs.includes(guideSlug)) return <>{children}</>;
      return href.startsWith("/") ? (
        <Link href={href} className={LINK}>
          {children}
        </Link>
      ) : (
        <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
          {children}
        </a>
      );
    },
    ul: ({ children }) => (
      <ul className="my-6 list-disc space-y-3 pl-6 text-[17px] font-light leading-[1.75] text-white/75 marker:text-white/55 sm:text-[18px]">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-6 list-decimal space-y-3 pl-6 text-[17px] font-light leading-[1.75] text-white/75 marker:font-semibold marker:text-white/55 sm:text-[18px]">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1.5">{children}</li>,
    hr: () => <hr className="my-14 border-white/[0.08]" />,
    table: ({ children }) => (
      <div className="ssc-glass ssc-glass--plain my-10 overflow-x-auto rounded-[20px]">
        <table className="w-full text-left text-[15px]">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="text-white">{children}</thead>,
    th: ({ children }) => <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">{children}</th>,
    td: ({ children }) => <td className="border-t border-white/[0.08] px-5 py-3.5 align-top font-light leading-relaxed text-white/75">{children}</td>,
    blockquote: ({ node, children }) => {
      // hProperties keys arrive as written ("data-callout"), not camelCased
      const props = (node?.properties ?? {}) as Record<string, unknown>;
      const kind = (props["data-callout"] ?? props.dataCallout) as keyof typeof CALLOUTS | undefined;
      const callout = kind ? CALLOUTS[kind] : null;
      if (!callout) {
        return (
          <blockquote className="my-10 border-l-2 border-white/40 pl-6 [&>p]:text-[19px] [&>p]:italic [&>p]:text-white">{children}</blockquote>
        );
      }
      const Icon = callout.icon;
      return (
        <aside className={`relative my-10 rounded-[22px] px-6 py-2 sm:px-7 [&>p:last-child]:mb-5 [&>p]:my-4 [&>p]:text-[16px] sm:[&>p]:text-[17px] ${callout.className}`}>
          <p className="!mb-0 !mt-5 flex items-center gap-2.5 !text-[11px] !font-semibold uppercase !leading-none tracking-[0.2em] !text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.06]">
              <Icon className="h-3.5 w-3.5" />
            </span>
            {callout.label}
          </p>
          {children}
        </aside>
      );
    },
    "pack-embed": ({ node }: { node?: { properties?: Record<string, unknown> } }) => {
      const props = node?.properties ?? {};
      const pack = packs[String(props["data-pack-id"] ?? props.dataPackId ?? "")];
      return pack ? <GuidePackEmbed pack={pack} /> : null;
    },
  } as Components;

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkGuide]} components={components}>
      {body}
    </ReactMarkdown>
  );
}
