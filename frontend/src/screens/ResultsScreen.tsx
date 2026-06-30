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
    <div>
      <Reveal index={0}>
        <p className="text-[15px] text-ink-500">
          {improved ? "Your model is faster now" : "Here is the result"}
        </p>
      </Reveal>

      <Reveal index={1} className="mt-3">
        {improved ? (
          <div className="inline-flex items-center gap-2 text-sage-600 animate-pop-in">
            <ArrowUpIcon className="w-8 h-8" />
            <span className="text-[64px] leading-none font-semibold tracking-tight2">
              {pct.toFixed(0)}%
            </span>
          </div>
        ) : (
          <span className="text-[44px] leading-tight font-semibold tracking-tight2 text-ink-900 animate-pop-in">
            {aboutSame ? "About the same" : `${pct.toFixed(0)}%`}
          </span>
        )}
      </Reveal>

      <Reveal index={2} className="mt-2">
        <p className="text-[17px] text-ink-500">
          {improved
            ? "faster than before, measured on your computer"
            : aboutSame
            ? "and that is okay, the gain depends on your machine"
            : "change after tuning"}
        </p>
      </Reveal>

      <Reveal index={3} className="mt-8">
        <div className="grid grid-cols-2 gap-3 max-w-[24rem]">
          <ResultTile label="Before" value={before.toFixed(1)} />
          <ResultTile label="After" value={after.toFixed(1)} highlight />
        </div>
      </Reveal>

      <Reveal index={4} className="mt-4">
        <p className="text-[13px] text-ink-400 max-w-[28rem] leading-relaxed">
          Same prompt, same model. We only changed the settings.
        </p>
      </Reveal>

      {profile && profile.changed_settings.length > 0 && (
        <Reveal index={5} className="mt-7">
          <p className="text-[14px] font-semibold text-ink-900 mb-3">What we changed</p>
          <ul className="space-y-2.5">
            {profile.changed_settings.map((s) => (
              <li key={s} className="flex items-start gap-2.5 text-[15px] text-ink-700">
                <CheckIcon className="w-[18px] h-[18px] text-sage-500 mt-0.5 flex-shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      <Reveal index={6} className="mt-9">
        <button className="btn-secondary" onClick={reset}>
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
    <div className={highlight ? "tile p-5 bg-sky-50/80" : "tile p-5"}>
      <div className="text-[12px] text-ink-400">{label}</div>
      <div
        className={`text-[34px] font-semibold tracking-tight2 mt-1 ${
          highlight ? "text-sky-600" : "text-ink-900"
        }`}
      >
        {value}
      </div>
      <div className="text-[12px] text-ink-400 mt-0.5">tokens/sec</div>
    </div>
  );
}
