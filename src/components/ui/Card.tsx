import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

export function Card({
  children,
  className,
  hover = false,
  glow = false,
  as: Component = "div",
}: CardProps) {
  return (
    <Component
      className={cn(
        "card",
        hover && "card-hover",
        glow && "card-glow",
        className
      )}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("mb-16", className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4";
}

export function CardTitle({ children, className, as: Component = "h3" }: CardTitleProps) {
  return (
    <Component className={cn("text-h3 text-snow", className)}>
      {children}
    </Component>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn("text-body text-snow/60 mt-4", className)}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn(className)}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn("mt-16 pt-16 border-t border-steel/50", className)}>
      {children}
    </div>
  );
}
