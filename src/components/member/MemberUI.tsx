import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ssc/Glass";

// Small pieces shared by the member area (library, account, dashboard,
// billing). Black and white only: every state is told apart by weight,
// border and icon rather than colour.

/** Page opener: pill, big headline, body, optional action on the right */
export function PageHead({ pill, title, body, action }: { pill: string; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <Pill>{pill}</Pill>
        <h1 className="ssc-display mt-4 break-words text-[clamp(2.4rem,5.4vw,4.4rem)]">{title}</h1>
        {body && <p className="ssc-body mt-3 max-w-2xl text-[clamp(1rem,1.3vw,1.125rem)] leading-relaxed">{body}</p>}
      </div>
      {action}
    </header>
  );
}

/** A number and what it counts, for stat rows */
export function StatTile({ value, label, icon }: { value: ReactNode; label: string; icon?: ReactNode }) {
  return (
    <div className="ssc-glass ssc-glass--plain rounded-[20px] px-5 py-4">
      <div className="flex items-center gap-2 text-white/55">
        {icon}
        <span className="ssc-label">{label}</span>
      </div>
      <p className="ssc-display mt-3 text-[clamp(1.6rem,3vw,2.2rem)] tabular-nums">{value}</p>
    </div>
  );
}

/** Dark glass text input with a label and optional hint */
export const Field = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }>(
  ({ label, hint, id, className, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        <label htmlFor={inputId} className="ssc-label mb-2 block">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-12 w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/55 focus:border-white/35 disabled:cursor-not-allowed disabled:text-white/55",
            className
          )}
          {...props}
        />
        {hint && <p className="mt-2 text-[12px] text-white/55">{hint}</p>}
      </div>
    );
  }
);
Field.displayName = "Field";

/** Inline status line: success, problem, or a plain note */
export function Notice({
  tone = "note",
  title,
  children,
  className,
}: {
  tone?: "success" | "warning" | "note";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = tone === "success" ? CheckCircle : AlertCircle;
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3.5",
        tone === "warning" ? "border-white/30 bg-white/[0.07]" : "border-white/12 bg-white/[0.04]",
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-white" />
      <div className="min-w-0 text-[14px]">
        {title && <p className="font-semibold text-white">{title}</p>}
        {children && <div className={cn("leading-relaxed text-white/75", title && "mt-1")}>{children}</div>}
      </div>
    </div>
  );
}

/** ssc-btn with a loading state; primary is white, ghost is glass */
export function ActionButton({
  variant = "primary",
  isLoading,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost"; isLoading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={cn("ssc-btn disabled:cursor-not-allowed disabled:opacity-70", variant === "primary" ? "ssc-btn--primary" : "ssc-btn--ghost", className)}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/** Small status chip: filled white for good standing, outlined otherwise */
export function StatusChip({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        strong ? "bg-white text-black" : "border border-white/20 text-white/75"
      )}
    >
      {children}
    </span>
  );
}
