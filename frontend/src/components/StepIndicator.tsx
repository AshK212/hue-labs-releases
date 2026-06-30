/** The slim step dots shown in the top bar. */
export function StepIndicator({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={[
            "h-1.5 rounded-full transition-all duration-300 ease-out",
            i === current ? "w-5 bg-sky-500" : i < current ? "w-1.5 bg-sky-300" : "w-1.5 bg-mist-300",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
