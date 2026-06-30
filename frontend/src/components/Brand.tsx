import { CloudIcon } from "./Icons";

/** The app mark — a soft cloud in a glowing rounded square. */
export function BrandMark({ size = 64 }: { size?: number }) {
  return (
    <div
      className="relative grid place-items-center rounded-[28%] bg-gradient-to-b from-sky-400 to-sky-500 text-white shadow-lift"
      style={{ width: size, height: size }}
    >
      <CloudIcon className="w-[55%] h-[55%]" />
    </div>
  );
}

export function BrandWordmark() {
  return (
    <div className="inline-flex items-center gap-2 text-sky-600">
      <CloudIcon className="w-5 h-5" />
      <span className="text-[13px] font-semibold tracking-[0.12em] uppercase">
        Local AI Optimizer
      </span>
    </div>
  );
}
