import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useJourney } from "../journey/JourneyContext";
import { BrandMark } from "../components/BrandMark";
import { BrandHeroVisual } from "../components/BrandHeroVisual";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/Badge";
import { ArrowRightIcon, ShieldIcon, GaugeIcon, TerminalOffIcon } from "../components/Icons";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export function WelcomeScreen() {
  const { next } = useJourney();

  return (
    <section className="relative min-h-[100dvh] w-full flex flex-col">
      {/* Top bar */}
      <header className="w-full">
        <div className="max-w-[1320px] mx-auto w-full px-8 lg:px-14 h-[84px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={32} />
            <span className="text-body font-semibold text-ink-800">Local AI Optimizer</span>
          </div>
          <StatusBadge tone="soft" dot>
            <span className="font-mono uppercase tracking-wide text-ink-500">Private · Local only</span>
          </StatusBadge>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="w-[92%] max-w-[1240px] mx-auto py-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: content */}
            <motion.div variants={container} initial="hidden" animate="show">
              <motion.span
                variants={item}
                className="inline-flex items-center gap-2 rounded-badge bg-mist-100 border border-mist-200 pl-2 pr-3 py-1.5 mb-8"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_8px_rgba(184,242,92,0.9)]" />
                <span className="text-micro font-mono uppercase tracking-wider text-ink-500">
                  Local-first · Optimization tool
                </span>
              </motion.span>

              <motion.h1
                variants={item}
                className="text-[44px] sm:text-[52px] lg:text-hero font-semibold tracking-tight2 text-ink-900 leading-[1.02]"
              >
                Local AI.
                <br />
                <span className="text-brand">Optimized.</span>
              </motion.h1>

              <motion.p
                variants={item}
                className="mt-6 text-[18px] leading-relaxed text-ink-500 max-w-[30rem]"
              >
                Detect your hardware, choose the right model, and tune local performance
                without using the terminal.
              </motion.p>

              <motion.div variants={item} className="mt-9 flex items-center gap-4">
                <Button onClick={next} rightIcon={<ArrowRightIcon className="w-5 h-5" />}>
                  Start optimization
                </Button>
              </motion.div>

              {/* Value points */}
              <motion.div variants={item} className="mt-12 flex items-center gap-8">
                <Value icon={<ShieldIcon className="w-[18px] h-[18px]" />} label="Private" />
                <span className="w-px h-8 bg-mist-200" />
                <Value icon={<GaugeIcon className="w-[18px] h-[18px]" />} label="Measured" />
                <span className="w-px h-8 bg-mist-200" />
                <Value icon={<TerminalOffIcon className="w-[18px] h-[18px]" />} label="Local" />
              </motion.div>
            </motion.div>

            {/* Right: precision graphic */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative hidden lg:block"
            >
              <BrandHeroVisual />
            </motion.div>
          </div>
        </div>
      </main>
    </section>
  );
}

function Value({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid place-items-center w-9 h-9 rounded-tile bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100">
        {icon}
      </span>
      <span className="text-body font-medium text-ink-800">{label}</span>
    </div>
  );
}
