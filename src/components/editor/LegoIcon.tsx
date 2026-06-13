import type { ComponentType } from "@/types/appmap";
import { COMPONENT_META } from "@/types/appmap";

export type LegoIconType = ComponentType | "action";

export function LegoIcon({
  type,
  className = "h-4 w-4",
}: {
  type: LegoIconType;
  className?: string;
}) {
  const icon =
    type === "action" ? "bolt" : COMPONENT_META[type].icon;
  const accent =
    type === "action" ? "text-emerald-400" : COMPONENT_META[type].accent;

  switch (icon) {
    case "section":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} ${accent}`}
          aria-hidden
        >
          <rect x="2" y="5" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="5" cy="8" r="1" fill="currentColor" />
        </svg>
      );
    case "diamond":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`${className} ${accent}`}
          aria-hidden
        >
          <path d="M8 2l5 6-5 6-5-6 5-6z" />
        </svg>
      );
    case "database":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} ${accent}`}
          aria-hidden
        >
          <ellipse cx="8" cy="4.5" rx="5" ry="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 4.5v4c0 1.1 2.24 2 5 2s5-.9 5-2v-4M3 8.5v4c0 1.1 2.24 2 5 2s5-.9 5-2v-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "bolt":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`${className} ${accent}`}
          aria-hidden
        >
          <path d="M9.2 1.5L4 9h3.3L6.8 14.5 12 7H8.7L9.2 1.5z" />
        </svg>
      );
    case "input":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${className} ${accent}`}
          aria-hidden
        >
          <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 7h8M4 9.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
