import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { BrandMark } from "../components/Brand";
import { ArrowRightIcon, ShieldIcon, TerminalOffIcon, GaugeIcon } from "../components/Icons";

export function WelcomeScreen() {
  const { next } = useJourney();

  return (
    <div>
      <Reveal index={0}>
        <BrandMark size={52} />
      </Reveal>

      <Reveal index={1} className="mt-9">
        <h1 className="text-[42px] leading-[1.05] font-semibold tracking-tight2 text-ink-900">
          Run AI on your
          <br />
          own computer.
        </h1>
      </Reveal>

      <Reveal index={2} className="mt-5">
        <p className="text-[18px] leading-relaxed text-ink-500 max-w-[26rem]">
          It stays on your machine, and we help it run a little faster. There is nothing
          to configure and no terminal to open.
        </p>
      </Reveal>

      <Reveal index={3} className="mt-9">
        <button className="btn-primary" onClick={next}>
          Get started
          <ArrowRightIcon className="w-[18px] h-[18px]" />
        </button>
      </Reveal>

      <Reveal index={4} className="mt-12">
        <div className="flex items-center gap-7 text-ink-400">
          <Note icon={<ShieldIcon className="w-[18px] h-[18px]" />} label="Runs offline" />
          <Note icon={<TerminalOffIcon className="w-[18px] h-[18px]" />} label="No terminal" />
          <Note icon={<GaugeIcon className="w-[18px] h-[18px]" />} label="Real numbers" />
        </div>
      </Reveal>
    </div>
  );
}

function Note({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-medium">
      {icon}
      {label}
    </span>
  );
}
