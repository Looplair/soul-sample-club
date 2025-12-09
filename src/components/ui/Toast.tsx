"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: "border-success/50 bg-success/10",
  error: "border-error/50 bg-error/10",
  info: "border-velvet/50 bg-velvet/10",
  warning: "border-warning/50 bg-warning/10",
};

const iconStyles = {
  success: "text-success",
  error: "text-error",
  info: "text-velvet",
  warning: "text-warning",
};

export function Toast({
  id,
  message,
  type = "info",
  duration = 5000,
  onDismiss,
}: ToastProps) {
  const Icon = icons[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-12 bg-graphite rounded-card shadow-card-hover border p-16 min-w-[300px] max-w-md",
        styles[type]
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0", iconStyles[type])} />
      <p className="text-body text-snow flex-1">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="text-snow/50 hover:text-snow transition-colors p-4 -m-4"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type?: ToastType;
    duration?: number;
  }>;
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-24 right-24 z-50 flex flex-col gap-12">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
