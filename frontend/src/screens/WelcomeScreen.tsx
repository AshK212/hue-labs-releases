import { type ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Sparkles, Zap, Gauge } from "lucide-react";
import { useJourney } from "../journey/JourneyContext";
import { STEP } from "../journey/steps";
import { BrandLockup } from "../components/BrandMark";
import { BrandHeroVisual } from "../components/brand/BrandHeroVisual";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/Badge";
import { ArrowRightIcon } from "../components/Icons";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const FEATURES = [
  { icon: <Cpu className="w-[18px] h-[18px]" strokeWidth={1.8} />, title: "Smart Hardware Detection", desc: "A deep scan of your system's real capabilities." },
  { icon: <Sparkles className="w-[18px] h-[18px]" strokeWidth={1.8} />, title: "Intelligent Recommendations", desc: "The right model for the hardware you own." },
  { icon: <Zap className="w-[18px] h-[18px]" strokeWidth={1.8} />, title: "One-Click Optimization", desc: "Tune runtime settings without the terminal." },
  { icon: <Gauge className="w-[18px] h-[18px]" strokeWidth={1.8} />, title: "Accurate Benchmarking", desc: "Real, measured performance on this machine." },
];

export function WelcomeScreen() {
  const { next, enterFlowAt } = useJourney();
  const [bgFailed, setBgFailed] = useState(false);

  return (
    <section className="relative isolate min-h-[var(--vph)] w-full flex flex-col overflow-hidden">
      {/* Full-bleed terrain background + scrims */}
      <div className="absolute inset-0 z-0">
        {!bgFailed && (
          <img
            src="/brand_back.png"
            alt=""
            aria-hidden
            onError={() => setBgFailed(true)}
            className="w-full h-full object-cover"
            style={{ transform: "scale(1.22) translateX(11%)", transformOrigin: "center" }}
          />
        )}
        {/* left scrim for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-carbon via-carbon/85 to-transparent" />
        {/* top + bottom blend into the app */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-carbon to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-carbon to-transparent" />
        {/* faint valley glow */}
        <div
          className="absolute left-[58%] top-[46%] w-[520px] h-[360px] -translate-x-1/2 blur-[120px]"
          style={{ background: "radial-gradient(circle, rgb(var(--glow)/0.10), rgb(var(--glow)/0) 70%)" }}
        />
      </div>

      {/* Top bar (dragging is handled by the global title-bar strip) */}
      <header className="relative z-10 w-full">
        <div className="max-w-[1300px] mx-auto w-full px-8 lg:px-20 h-[84px] flex items-center justify-between">
          <div>
            <BrandLockup markSize={40} onClick={() => enterFlowAt(STEP.Welcome)} />
          </div>
          <StatusBadge tone="soft" dot>
            <span className="font-mono uppercase tracking-wide text-ink-500">100% Local · Private · Secure</span>
          </StatusBadge>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex items-center">
        <div className="max-w-[1300px] mx-auto w-full px-8 lg:px-20 py-8">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center">
            {/* Left: content */}
            <motion.div variants={container} initial="hidden" animate="show" className="lg:-mt-10">
              <motion.span
                variants={item}
                className="inline-flex items-center gap-2 rounded-badge bg-mist-100/80 backdrop-blur border border-mist-200 pl-2 pr-3 py-1.5 mb-7"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_8px_rgb(var(--glow)/0.9)]" />
                <span className="text-micro font-mono uppercase tracking-wider text-ink-500">
                  Local-first · Optimization tool
                </span>
              </motion.span>

              <motion.h1
                variants={item}
                className="text-[46px] sm:text-[56px] lg:text-[64px] font-semibold tracking-tight2 text-ink-900 leading-[1.02]"
              >
                Run Local AI.
                <br />
                <span className="text-brand">Optimized.</span>
              </motion.h1>

              <motion.p
                variants={item}
                className="mt-6 text-[18px] leading-relaxed text-ink-500 max-w-[32rem]"
              >
                We analyze your hardware, recommend the best model, and tune local performance
                so you get the most out of your machine.
              </motion.p>

              {/* Feature list */}
              <motion.ul variants={item} className="mt-9 space-y-4 max-w-[34rem]">
                {FEATURES.map((f) => (
                  <Feature key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
                ))}
              </motion.ul>

              <motion.div variants={item} className="mt-16 flex items-center gap-5">
                <Button onClick={next} rightIcon={<ArrowRightIcon className="w-5 h-5" />}>
                  Get Started
                </Button>
                <span className="text-micro font-mono uppercase tracking-wide text-ink-400">
                  Takes less than a minute
                </span>
              </motion.div>
            </motion.div>

            {/* Right: hero visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative hidden lg:block lg:mt-[84px]"
            >
              <BrandHeroVisual />
            </motion.div>
          </div>
        </div>
      </main>
    </section>
  );
}

function Feature({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3.5">
      <span className="mt-0.5 grid place-items-center w-9 h-9 rounded-tile bg-signal/10 text-signal ring-1 ring-inset ring-signal/25 flex-shrink-0">
        {icon}
      </span>
      <div>
        <div className="text-body font-semibold text-ink-900 leading-tight">{title}</div>
        <div className="text-caption text-ink-500 mt-0.5">{desc}</div>
      </div>
    </li>
  );
}
