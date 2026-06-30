import type { ReactNode } from "react";

/**
 * A calm "breathing" pulse with expanding rings and a centered icon.
 * Used for scanning and benchmark running states — never a harsh spinner.
 */
export function Pulse({ children, tone = "sky" }: { children: ReactNode; tone?: "sky" | "emerald" }) {
  const color = tone === "emerald" ? "bg-emerald-400" : "bg-sky-400";
  const glow =
    tone === "emerald"
      ? "from-emerald-300 to-emerald-500"
      : "from-sky-300 to-sky-500";
  return (
    <div className="relative grid place-items-center" style={{ width: 160, height: 160 }}>
      <span className={`absolute inset-0 rounded-full ${color} opacity-20 animate-ring`} />
      <span
        className={`absolute inset-0 rounded-full ${color} opacity-20 animate-ring`}
        style={{ animationDelay: "1.2s" }}
      />
      <div
        className={`relative grid place-items-center w-24 h-24 rounded-full bg-gradient-to-b ${glow} text-white shadow-lift animate-breathe`}
      >
        {children}
      </div>
    </div>
  );
}
