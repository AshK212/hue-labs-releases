import type { ReactNode } from "react";

/** A calm breathing mark with soft expanding rings, for waiting moments. */
export function Pulse({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "green";
}) {
  const ring = tone === "green" ? "bg-sage-500" : "bg-sky-500";
  const fill = tone === "green" ? "from-sage-400 to-sage-500" : "from-sky-400 to-sky-500";
  return (
    <div className="relative grid place-items-center" style={{ width: 96, height: 96 }}>
      <span className={`absolute inset-0 rounded-full ${ring} opacity-20 animate-ring`} />
      <span
        className={`absolute inset-0 rounded-full ${ring} opacity-20 animate-ring`}
        style={{ animationDelay: "1.3s" }}
      />
      <div
        className={`relative grid place-items-center w-20 h-20 rounded-card bg-gradient-to-b ${fill} text-carbon shadow-button animate-breathe`}
      >
        {children}
      </div>
    </div>
  );
}
