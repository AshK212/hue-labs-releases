import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { ArrowUpIcon, CheckIcon } from "../components/Icons";

export function ResultsScreen() {
  const { baseline, optimized, profile, reset } = useJourney();
  if (!baseline || !optimized) return null;

  const before = baseline.tokens_per_sec;
  const after = optimized.tokens_per_sec;
  const pct = before > 0 ? ((after - before) / before) * 100 : 0;
  const improved = pct >= 1;
  const aboutSame = Math.abs(pct) < 1;

  return (
    <div className="flex flex-col items-center text-center">
      <Reveal index={0}>
        <p className="text-sky-600 text-sm font-semibold uppercase tracking-[0.12em]">
          The result
        </p>
      </Reveal>

      <Reveal index={1} className="mt-5">
        {improved ? (
          <div className="inline-flex items-center gap-2 text-emerald-600 animate-pop-in">
            <ArrowUpIcon className="w-9 h-9" />
            <span className="text-6xl font-bold tracking-tightest">+{pct.toFixed(0)}%</span>
          </div>
        ) : (
          <span className="text-5xl font-bold tracking-tightest text-ink-900 animate-pop-in">
            {aboutSame ? "About the same" : `${pct.toFixed(0)}%`}
          </span>
        )}
      </Reveal>

      <Reveal index={2} className="mt-3">
        <p className="text-ink-700 text-lg font-medium">
          {improved
            ? "faster after tuning"
            : aboutSame
            ? "and that’s perfectly okay"
            : "change after tuning"}
        </p>
      </Reveal>

      <Reveal index={3} className="mt-8 w-full">
        <div className="grid grid-cols-2 gap-3">
          <ResultTile label="Before" value={before.toFixed(1)} />
          <ResultTile label="After" value={after.toFixed(1)} highlight />
        </div>
      </Reveal>

      <Reveal index={4} className="mt-4">
        <p className="text-xs text-ink-400 max-w-sm mx-auto text-balance">
          Measured on this machine — same prompt, same model, only the runtime settings
          changed.
        </p>
      </Reveal>

      {profile && profile.changed_settings.length > 0 && (
        <Reveal index={5} className="mt-7 w-full">
          <div className="glass p-5 text-left">
            <p className="text-sm font-semibold text-ink-900 mb-3">What we changed</p>
            <ul className="space-y-2">
              {profile.changed_settings.map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <CheckIcon className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}

      <Reveal index={6} className="mt-9">
        <button className="btn-quiet" onClick={reset}>
          Start over
        </button>
      </Reveal>
    </div>
  );
}

function ResultTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl2 p-5 border",
        highlight ? "bg-sky-50/80 border-sky-200" : "bg-white/60 border-white/70",
      ].join(" ")}
    >
      <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className={`text-4xl font-bold tracking-tightest mt-1 ${highlight ? "text-sky-600" : "text-ink-900"}`}>
        {value}
      </div>
      <div className="text-xs text-ink-400 mt-1">tokens/sec</div>
    </div>
  );
}
