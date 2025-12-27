import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeDate(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffDays = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function isWithinRollingWindow(releaseDate: string | Date, months: number = 3): boolean {
  const release = new Date(releaseDate);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return release >= cutoff;
}

// Pack status utilities
export function isPackNew(releaseDate: string | Date, days: number = 7): boolean {
  const release = new Date(releaseDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return release >= cutoff;
}

export function isPackExpired(releaseDate: string | Date, months: number = 3): boolean {
  return !isWithinRollingWindow(releaseDate, months);
}

export function getPackStatus(releaseDate: string | Date): "new" | "active" | "expired" {
  if (isPackNew(releaseDate)) return "new";
  if (isPackExpired(releaseDate)) return "expired";
  return "active";
}

export function getDaysUntilExpiry(releaseDate: string | Date, months: number = 3): number {
  const release = new Date(releaseDate);
  const expiryDate = new Date(release);
  expiryDate.setMonth(expiryDate.getMonth() + months);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// New utilities for explicit end_date support
export function getPackEndDate(
  releaseDate: string | Date,
  endDate: string | null,
  defaultMonths: number = 3
): Date {
  if (endDate) {
    return new Date(endDate);
  }
  // Fallback to release date + default months
  const release = new Date(releaseDate);
  const expiryDate = new Date(release);
  expiryDate.setMonth(expiryDate.getMonth() + defaultMonths);
  return expiryDate;
}

export function isPackExpiredWithEndDate(
  releaseDate: string | Date,
  endDate: string | null
): boolean {
  const expiry = getPackEndDate(releaseDate, endDate);
  return new Date() > expiry;
}

export function getDaysUntilEndDate(
  releaseDate: string | Date,
  endDate: string | null,
  defaultMonths: number = 3
): number {
  const expiry = getPackEndDate(releaseDate, endDate, defaultMonths);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getExpiryBadgeText(daysRemaining: number): string | null {
  if (daysRemaining <= 0) return null;
  if (daysRemaining === 1) return "Expires tomorrow";
  if (daysRemaining <= 7) return `Expires in ${daysRemaining} days`;
  if (daysRemaining <= 14) return "Expires in ~2 weeks";
  return null;
}
