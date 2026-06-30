import type { ReactNode } from "react";

/**
 * A calm breathing mark with two soft expanding rings. Used for waiting moments
 * (scanning, downloading, measuring). Left-aligned to match the composition.
 */
export function Pulse({
  children,
  tone = "sky",
}: {
  children: ReactNode;
  tone?: "sky" | "sage";
}) {
  const ring = tone === "sage" ? "bg-sage-500" : "bg-sky-400";
  const fill =
    tone === "sage" ? "from-sage-500 to-sage-600" : "from-sky-400 to-sky-500";
  return (
    <div className="relative grid place-items-center" style={{ width: 88, height: 88 }}>
      <span className={`absolute inset-0 rounded-full ${ring} opacity-10 animate-ring`} />
      <span
        className={`absolute inset-0 rounded-full ${ring} opacity-10 animate-ring`}
        style={{ animationDelay: "1.4s" }}
      />
      <div
        className={`relative grid place-items-center w-[72px] h-[72px] rounded-[26px] bg-gradient-to-b ${fill} text-white shadow-button animate-breathe`}
      >
        {children}
      </div>
    </div>
  );
}
