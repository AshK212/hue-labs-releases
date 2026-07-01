/**
 * A small, collapsed-by-default disclosure that surfaces the raw runtime
 * settings (e.g. num_gpu, num_batch) for curious users, while keeping the main
 * UI free of jargon. Reads real values straight from the optimization profile —
 * nothing invented.
 */
export function TechnicalDetails({ options }: { options: Record<string, unknown> }) {
  const entries = Object.entries(options ?? {}).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return null;

  return (
    <details className="group text-left rounded-tile border border-mist-200 bg-mist-50/50 open:bg-mist-50 transition-colors">
      <summary className="flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer list-none select-none">
        <span className="text-micro font-mono uppercase tracking-wider text-ink-400">
          Technical details
        </span>
        <span className="text-ink-400 transition-transform duration-200 group-open:rotate-90">›</span>
      </summary>
      <div className="px-4 pb-3.5 pt-1 space-y-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 font-mono text-micro">
            <span className="text-ink-500">{k}</span>
            <span className="text-sky-600 tnum">{String(v)}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
