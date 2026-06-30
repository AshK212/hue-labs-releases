import type { ReactNode } from "react";

type Tone = "neutral" | "blue" | "green" | "soft";

const tones: Record<Tone, string> = {
  neutral: "bg-mist-100 text-ink-500",
  blue: "bg-sky-50 text-sky-600",
  green: "bg-sage-50 text-sage-600",
  soft: "bg-white border border-mist-200 text-ink-600 shadow-soft",
};

export function StatusBadge({
  children,
  tone = "neutral",
  dot = false,
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  icon?: ReactNode;
}) {
  return (
    <span className={`badge ${tones[tone]}`}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            tone === "green" ? "bg-sage-500" : tone === "blue" ? "bg-sky-500" : "bg-ink-400"
          }`}
        />
      )}
      {icon}
      {children}
    </span>
  );
}
