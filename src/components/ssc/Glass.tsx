import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Core pieces of the redesign. One glass box means one idea; every section
// opens with pill, headline, body. Colour only ever comes in via `glow`
// ("r, g, b" taken from a pack cover).

export const glowStyle = (glow?: string, style?: CSSProperties): CSSProperties | undefined =>
  glow ? ({ ...style, "--glow": glow } as CSSProperties) : style;

export function GlassBox({
  glow,
  plain,
  className,
  style,
  children,
}: {
  glow?: string;
  plain?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative ssc-glass", plain && "ssc-glass--plain", className)} style={glowStyle(glow, style)}>
      {children}
    </div>
  );
}

export function Pill({ children, dot, glow, className }: { children: ReactNode; dot?: boolean; glow?: string; className?: string }) {
  return (
    <span className={cn("ssc-pill", className)} style={glowStyle(glow)}>
      {dot && <span className="ssc-pill__dot" />}
      {children}
    </span>
  );
}

export function SectionHead({
  pill,
  title,
  body,
  align = "left",
  glow,
  className,
  action,
}: {
  pill: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "left" | "center";
  glow?: string;
  className?: string;
  action?: ReactNode;
}) {
  const center = align === "center";
  return (
    <header className={cn("flex flex-col items-start gap-4", center && "items-center text-center", className)}>
      <Pill dot={!!glow} glow={glow}>
        {pill}
      </Pill>
      <div className={cn("flex w-full flex-col gap-4", !center && action && "md:flex-row md:items-end md:justify-between")}>
        <div className={cn("max-w-3xl", center && "mx-auto")}>
          <h2 className="ssc-display text-[clamp(1.9rem,4.2vw,3.3rem)]">{title}</h2>
          {body && <p className="ssc-body mt-4 max-w-2xl text-[clamp(1rem,1.3vw,1.125rem)] leading-relaxed">{body}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

/** Standard page section spacing, full-width black band with a centred container */
export function Section({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-24 px-5 py-[clamp(44px,5.5vw,80px)] sm:px-8", className)}>
      <div className="mx-auto max-w-[1240px]">{children}</div>
    </section>
  );
}
