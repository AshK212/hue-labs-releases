import { CloudIcon } from "./Icons";

/** The app mark: a soft cloud in a gently rounded, lightly shadowed square. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-[30%] bg-gradient-to-b from-sky-400 to-sky-500 text-white shadow-button"
      style={{ width: size, height: size }}
    >
      <CloudIcon className="w-[58%] h-[58%]" />
    </div>
  );
}
