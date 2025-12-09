"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn("input", error && "input-error", className)}
          {...props}
        />
        {error && (
          <p className="mt-8 text-caption text-error">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-8 text-caption text-snow/50">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
