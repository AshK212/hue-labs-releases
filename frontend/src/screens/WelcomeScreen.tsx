import type { ReactNode } from "react";
import { useJourney } from "../journey/JourneyContext";
import { BrandMark, BrandGlyph } from "../components/Brand";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/Badge";
import {
  ArrowRightIcon,
  GaugeIcon,
  ShieldIcon,
  TerminalOffIcon,
} from "../components/Icons";

export function WelcomeScreen() {
  const { next } = useJourney();

  return (
    <section className="relative min-h-[100dvh] w-full flex flex-col animate-fade-in">
      {/* Top bar */}
      <header className="w-full">
        <div className="max-w-[1320px] mx-auto w-full px-8 lg:px-14 h-[84px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={34} />
            <span className="text-body font-semibold text-ink-700">Local AI Optimizer</span>
          </div>
          <StatusBadge tone="soft" icon={<ShieldIcon className="w-4 h-4 text-sky-500" />}>
            Private · Local only
          </StatusBadge>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="w-[92%] max-w-[1280px] mx-auto py-10">
          <div className="flex flex-col lg:flex-row items-stretch">
            {/* Left: workspace image (~55%), the laptop is the visual hero */}
            <div className="relative lg:w-[55%]">
              {/* Signature glow behind the hero image */}
              <div
                aria-hidden
                className="absolute -inset-6 rounded-panel blur-2xl opacity-70 animate-breathe"
                style={{ background: "radial-gradient(60% 60% at 40% 40%, rgba(111,102,236,0.28), rgba(111,102,236,0) 70%)" }}
              />
              <div className="relative rounded-panel overflow-hidden shadow-card ring-1 ring-white/50 min-h-[320px] lg:min-h-[580px]">
                <img
                  src="/background.png"
                  alt="A laptop on a desk with a calm view of clouds and mountains"
                  className="w-full h-full object-cover object-[center_65%]"
                />
              </div>
            </div>

            {/* Right: content panel (~45%) overlapping with a soft curved seam */}
            <div className="lg:flex-1 relative z-10 -mt-14 lg:mt-0 lg:-ml-16 mx-4 lg:mx-0 bg-white/95 backdrop-blur-sm rounded-panel border border-mist-200 shadow-card px-10 sm:px-12 lg:px-16 py-14 lg:py-20 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 self-start rounded-badge bg-iris-50 border border-iris-100 pl-1.5 pr-3 py-1.5 mb-6">
                <span className="grid place-items-center w-5 h-5 rounded-full brand-gradient">
                  <BrandGlyph className="w-3.5 h-3.5" />
                </span>
                <span className="text-micro font-semibold text-iris-700">Local-first AI, tuned for you</span>
              </span>
              <h1 className="text-[40px] sm:text-[46px] lg:text-hero font-semibold tracking-tight2 text-ink-900">
                Run AI on your own computer.
              </h1>
              <p className="mt-6 text-[18px] leading-relaxed text-ink-500 max-w-[28rem]">
                Keep everything local, choose the right model, and see real performance
                numbers without using the terminal.
              </p>
              <div className="mt-10">
                <Button onClick={next} rightIcon={<ArrowRightIcon className="w-5 h-5" />}>
                  Get started
                </Button>
              </div>
            </div>
          </div>

          {/* Trust cards, larger */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-7">
            <Trust
              icon={<ShieldIcon className="w-6 h-6" />}
              title="Runs offline"
              body="Everything stays on your computer."
            />
            <Trust
              icon={<TerminalOffIcon className="w-6 h-6" />}
              title="No terminal"
              body="We handle the setup for you."
            />
            <Trust
              icon={<GaugeIcon className="w-6 h-6" />}
              title="Real numbers"
              body="You'll see honest performance results."
            />
          </div>
        </div>
      </main>
    </section>
  );
}

function Trust({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="surface-tile p-6 flex items-center gap-4 transition-all duration-200 hover:-translate-y-[2px] hover:border-iris-200 hover:shadow-glowSoft">
      <span className="flex-shrink-0 grid place-items-center w-12 h-12 rounded-tile bg-gradient-to-br from-sky-50 to-iris-100 text-sky-600 ring-1 ring-inset ring-white/70">
        {icon}
      </span>
      <div>
        <div className="text-[17px] font-semibold text-ink-900">{title}</div>
        <div className="text-caption text-ink-400 mt-0.5 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
