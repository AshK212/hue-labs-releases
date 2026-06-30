import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { BrandMark } from "../components/Brand";
import { ArrowRightIcon, ShieldIcon, TerminalOffIcon, GaugeIcon } from "../components/Icons";

export function WelcomeScreen() {
  const { next } = useJourney();

  return (
    <div className="flex flex-col items-center text-center">
      <Reveal index={0}>
        <BrandMark size={76} />
      </Reveal>

      <Reveal index={1} className="mt-8">
        <h1 className="text-4xl sm:text-[2.75rem] font-bold tracking-tightest text-ink-900 leading-[1.08] text-balance">
          Local AI, perfectly tuned
          <br />
          for your computer.
        </h1>
      </Reveal>

      <Reveal index={2} className="mt-5">
        <p className="text-ink-500 text-lg max-w-md mx-auto text-balance">
          Run powerful AI models privately on your own machine — and let us make them
          faster. No setup headaches, no terminal.
        </p>
      </Reveal>

      <Reveal index={3} className="mt-9">
        <button className="btn-primary" onClick={next}>
          Get started
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </Reveal>

      <Reveal index={4} className="mt-12">
        <div className="flex items-center gap-6 text-ink-400">
          <Reassurance icon={<ShieldIcon className="w-4 h-4" />} label="Private" />
          <span className="w-1 h-1 rounded-full bg-cloud-300" />
          <Reassurance icon={<TerminalOffIcon className="w-4 h-4" />} label="No terminal" />
          <span className="w-1 h-1 rounded-full bg-cloud-300" />
          <Reassurance icon={<GaugeIcon className="w-4 h-4" />} label="Honest results" />
        </div>
      </Reveal>
    </div>
  );
}

function Reassurance({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      {icon}
      {label}
    </span>
  );
}
