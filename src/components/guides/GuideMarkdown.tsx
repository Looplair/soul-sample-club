import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lightbulb, AlertTriangle, Sparkles, PenLine } from "lucide-react";
import { remarkGuide } from "./remark-guide";
import { GuidePackEmbed, type GuidePack } from "./GuidePackEmbed";
import { slugify } from "@/lib/guide-utils";

const CALLOUTS = {
  tip: { label: "Tip", icon: Lightbulb, className: "border-white/15 bg-white/[0.04]" },
  warning: { label: "Watch out", icon: AlertTriangle, className: "border-amber-400/30 bg-amber-400/[0.06]" },
  ssc: { label: "The SSC way", icon: Sparkles, className: "border-white/25 bg-white/[0.06]" },
  // Draft-only gap for Chris to fill in; publishing is blocked while any remain
  chris: { label: "Chris to write", icon: PenLine, className: "border-yellow-300/60 bg-yellow-300/10 border-dashed" },
} as const;

function textOf(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textOf).join("");
  if (children && typeof children === "object" && "props" in children) {
    return textOf((children as { props: { children?: React.ReactNode } }).props.children);
  }
  return "";
}

export function GuideMarkdown({ body, packs }: { body: string; packs: Record<string, GuidePack> }) {
  const components = {
    h2: ({ children }) => (
      <h2
        id={slugify(textOf(children))}
        className="mt-14 mb-4 scroll-mt-28 text-2xl sm:text-[1.75rem] font-bold tracking-tight text-white"
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => <h3 className="mt-8 mb-3 text-lg font-semibold text-white">{children}</h3>,
    p: ({ children }) => <p className="my-5 text-[17px] leading-[1.75] text-white/75">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    a: ({ href = "", children }) =>
      href.startsWith("/") ? (
        <Link href={href} className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
          {children}
        </Link>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
        >
          {children}
        </a>
      ),
    ul: ({ children }) => <ul className="my-5 space-y-2.5 pl-5 text-[17px] leading-[1.7] text-white/75 list-disc marker:text-white/30">{children}</ul>,
    ol: ({ children }) => <ol className="my-5 space-y-2.5 pl-5 text-[17px] leading-[1.7] text-white/75 list-decimal marker:text-white/40">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    hr: () => <hr className="my-12 border-white/10" />,
    table: ({ children }) => (
      <div className="my-8 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-white/[0.05] text-white">{children}</thead>,
    th: ({ children }) => <th className="px-4 py-3 font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-t border-white/[0.07] px-4 py-3 text-white/70">{children}</td>,
    blockquote: ({ node, children }) => {
      // hProperties keys arrive as written ("data-callout"), not camelCased
      const props = (node?.properties ?? {}) as Record<string, unknown>;
      const kind = (props["data-callout"] ?? props.dataCallout) as keyof typeof CALLOUTS | undefined;
      const callout = kind ? CALLOUTS[kind] : null;
      if (!callout) {
        return <blockquote className="my-8 border-l-2 border-white/30 pl-5 text-white/80 italic">{children}</blockquote>;
      }
      const Icon = callout.icon;
      return (
        <aside className={`my-8 rounded-2xl border px-5 py-1 [&>p]:text-[16px] ${callout.className}`}>
          <p className="!mb-0 mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] !text-white/60">
            <Icon className="h-3.5 w-3.5" /> {callout.label}
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
