import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { GlassBox, Pill } from "@/components/ssc/Glass";
import { cn } from "@/lib/utils";

// Shared presentation for the auth pages: one centred glass card, dark glass
// inputs, white buttons. Logic stays in each form.

export function AuthCard({ pill, title, body, children }: { pill?: string; title: ReactNode; body?: ReactNode; children: ReactNode }) {
  return (
    <GlassBox plain className="rounded-[28px] px-5 py-8 sm:px-9 sm:py-10">
      <header className="mb-8 flex flex-col items-center text-center">
        {pill && <Pill className="mb-5">{pill}</Pill>}
        <h1 className="ssc-display text-[clamp(1.55rem,5vw,2.05rem)]">{title}</h1>
        {body && <p className="ssc-body mt-3 text-[15px] leading-relaxed">{body}</p>}
      </header>
      {children}
    </GlassBox>
  );
}

export const inputClass =
  "h-[50px] w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/[0.55] focus:border-white/[0.35] focus:bg-white/[0.06]";

export function Field({ label, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-white/75">
        {label}
      </label>
      <input id={id} className={inputClass} {...props} />
      {hint && <p className="mt-2 text-[13px] text-white/55">{hint}</p>}
    </div>
  );
}

type Btn = ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; icon?: ReactNode; trailing?: ReactNode };

/** White primary action (uppercase, the site's button voice) */
export function PrimaryButton({ loading, icon, trailing, disabled, className, children, ...props }: Btn) {
  return (
    <button {...props} disabled={disabled || loading} className={cn("ssc-btn ssc-btn--primary w-full disabled:opacity-70", className)}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
      {!loading && trailing}
    </button>
  );
}

/** Glass secondary action, sentence case to sit with the Google button */
export function GhostButton({ loading, icon, trailing, disabled, className, children, ...props }: Btn) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "flex h-[52px] w-full items-center justify-center gap-3 rounded-[14px] border border-white/[0.14] bg-white/[0.04] text-[15px] font-semibold text-white transition-colors hover:border-white/[0.3] active:scale-[0.98] disabled:opacity-70",
        className
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
      {!loading && trailing}
    </button>
  );
}

/** White Google button with the full-colour mark */
export function GoogleButton({ loading, disabled, children, ...props }: Omit<Btn, "icon" | "trailing">) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[14px] bg-white text-[15px] font-semibold text-black transition-colors hover:bg-white/[0.88] active:scale-[0.98] disabled:opacity-70"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
      {children}
    </button>
  );
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function PatreonMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="#FF424D" aria-hidden>
      <path d="M14.82 2.41C18.78 2.41 22 5.65 22 9.62C22 13.58 18.78 16.8 14.82 16.8C10.85 16.8 7.61 13.58 7.61 9.62C7.61 5.65 10.85 2.41 14.82 2.41M2 21.6H5.5V2.41H2V21.6Z" />
    </svg>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[12px] font-medium uppercase tracking-[0.16em] text-white/55">
      <span className="h-px flex-1 bg-white/[0.1]" />
      {children}
      <span className="h-px flex-1 bg-white/[0.1]" />
    </div>
  );
}

export function Notice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-[14px] leading-relaxed",
        tone === "error" ? "border-red-400/30 bg-red-500/[0.08] text-red-300" : "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-300"
      )}
    >
      {children}
    </div>
  );
}

/** Round glass badge for the "check your email" states */
export function StateIcon({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-white">
      {children}
    </div>
  );
}
