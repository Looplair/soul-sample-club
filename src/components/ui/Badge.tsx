import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "error";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  className,
}: BadgeProps) {
  const variants = {
    default: "badge-neutral",
    primary: "badge-primary",
    success: "badge-success",
    warning: "badge-warning",
    error: "badge-error",
  };

  const sizes = {
    sm: "text-[10px] px-2 py-0.5",
    md: "",
  };

  return (
    <span className={cn("badge", variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}
