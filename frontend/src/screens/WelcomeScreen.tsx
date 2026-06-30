import type { ReactNode } from "react";
import { useJourney } from "../journey/JourneyContext";
import { BrandMark } from "../components/Brand";
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
    <section className="relative min-h-[100dvh] w-full flex flex-col bg-gradient-to-b from-[#f6f9fd] via-[#eef3fb] to-[#e7eef7] animate-fade-in">
      {/* Top bar */}
      <header className="w-full">
        <div className="max-w-[1280px] mx-auto w-full px-8 lg:px-12 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={32} />
            <span className="text-body font-semibold text-ink-700">Local AI Optimizer</span>
          </div>
          <StatusBadge tone="soft" icon={<ShieldIcon className="w-4 h-4 text-sky-500" />}>
            Private · Local only
          </StatusBadge>
        </div>
      </header>

      {/* Hero, ~70% of the viewport width */}
      <main className="flex-1 flex items-center">
        <div className="w-[92%] max-w-[1240px] mx-auto py-10">
          <div className="flex flex-col lg:flex-row items-stretch">
            {/* Left: workspace image, the laptop is the visual hero */}
            <div className="lg:w-[54%] rounded-panel overflow-hidden shadow-card min-h-[300px] lg:min-h-[540px]">
              <img
                src="/background.png"
                alt="A laptop on a desk with a calm view of clouds and mountains"
                className="w-full h-full object-cover object-[center_65%]"
              />
            </div>

            {/* Right: content panel overlapping with a soft curved seam */}
            <div className="lg:flex-1 relative z-10 -mt-14 lg:mt-0 lg:-ml-16 mx-4 lg:mx-0 bg-white rounded-panel border border-mist-200 shadow-card px-9 sm:px-12 lg:px-16 py-12 lg:py-16 flex flex-col justify-center">
              <h1 className="text-[38px] sm:text-[44px] lg:text-hero font-semibold tracking-tight2 text-ink-900">
                Run AI on your own computer.
              </h1>
              <p className="mt-6 text-body lg:text-[18px] leading-relaxed text-ink-500 max-w-[27rem]">
                Keep everything local, choose the right model, and see real performance
                numbers without using the terminal.
              </p>
              <div className="mt-9">
                <Button onClick={next} rightIcon={<ArrowRightIcon className="w-[18px] h-[18px]" />}>
                  Get started
                </Button>
              </div>
            </div>
          </div>

          {/* Trust cards, larger */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6">
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
    <div className="rounded-card bg-white border border-mist-200 shadow-tile p-6 flex items-center gap-4">
      <span className="flex-shrink-0 grid place-items-center w-12 h-12 rounded-tile bg-sky-50 text-sky-500">
        {icon}
      </span>
      <div>
        <div className="text-[17px] font-semibold text-ink-900">{title}</div>
        <div className="text-caption text-ink-400 mt-0.5 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
