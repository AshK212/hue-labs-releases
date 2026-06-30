import type { ReactNode } from "react";
import { useJourney } from "../journey/JourneyContext";
import { BrandMark } from "../components/Brand";
import {
  ArrowRightIcon,
  GaugeIcon,
  ShieldIcon,
  TerminalOffIcon,
} from "../components/Icons";

export function WelcomeScreen() {
  const { next } = useJourney();

  return (
    <section className="relative min-h-[100dvh] w-full flex flex-col bg-gradient-to-b from-[#f6f9fd] via-[#eef3fb] to-[#e8eef7] animate-fade-in">
      {/* Top bar */}
      <header className="w-full">
        <div className="max-w-[1160px] mx-auto w-full px-6 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={32} />
            <span className="text-[15px] font-semibold text-ink-700">Local AI Optimizer</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-mist-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink-600 shadow-sm">
            <ShieldIcon className="w-4 h-4 text-sky-500" />
            Private · Local only
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="max-w-[1160px] mx-auto w-full px-6 sm:px-8 py-8">
          <div className="flex flex-col md:flex-row items-stretch">
            {/* Left: workspace image, elegantly cropped */}
            <div className="md:w-[52%] rounded-[28px] overflow-hidden shadow-card min-h-[260px] md:min-h-[460px]">
              <img
                src="/background.png"
                alt="A laptop on a desk with a calm view of clouds and mountains"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Right: content panel, overlapping the image with a soft curved seam */}
            <div className="md:flex-1 relative z-10 -mt-12 md:mt-0 md:-ml-14 mx-4 md:mx-0 bg-white rounded-[28px] border border-mist-200 shadow-card px-8 sm:px-10 lg:px-14 py-10 lg:py-14 flex flex-col justify-center">
              <h1 className="text-[34px] md:text-[40px] lg:text-[46px] leading-[1.07] font-semibold tracking-tight2 text-ink-900">
                Run AI on your own computer.
              </h1>
              <p className="mt-5 text-[17px] lg:text-[18px] leading-relaxed text-ink-500 max-w-[26rem]">
                Keep everything local, choose the right model, and see real performance
                numbers without using the terminal.
              </p>
              <div className="mt-8">
                <button className="btn-primary h-12 px-7 text-[16px]" onClick={next}>
                  Get started
                  <ArrowRightIcon className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
          </div>

          {/* Trust / feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
            <Feature
              icon={<ShieldIcon className="w-5 h-5" />}
              title="Runs offline"
              body="Everything stays on your computer."
            />
            <Feature
              icon={<TerminalOffIcon className="w-5 h-5" />}
              title="No terminal"
              body="We handle the setup for you."
            />
            <Feature
              icon={<GaugeIcon className="w-5 h-5" />}
              title="Real numbers"
              body="You'll see honest performance results."
            />
          </div>
        </div>
      </main>
    </section>
  );
}

function Feature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[18px] bg-white border border-mist-200 shadow-tile p-5 flex items-start gap-3.5">
      <span className="flex-shrink-0 grid place-items-center w-10 h-10 rounded-tile bg-sky-50 text-sky-500">
        {icon}
      </span>
      <div>
        <div className="text-[15px] font-semibold text-ink-900">{title}</div>
        <div className="text-[13px] text-ink-400 mt-0.5 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
