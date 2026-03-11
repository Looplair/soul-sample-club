import { type SVGProps } from "react";

export function DrumIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Drum body */}
      <ellipse cx="12" cy="13" rx="9" ry="4" />
      <path d="M3 13v5c0 2.2 4 4 9 4s9-1.8 9-4v-5" />
      {/* Tension hoop line */}
      <line x1="3" y1="16" x2="21" y2="16" />
      {/* Drumstick left */}
      <line x1="7" y1="3" x2="11" y2="11" />
      {/* Drumstick right */}
      <line x1="17" y1="3" x2="13" y2="11" />
      {/* Stick tips */}
      <circle cx="7" cy="3" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="3" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
