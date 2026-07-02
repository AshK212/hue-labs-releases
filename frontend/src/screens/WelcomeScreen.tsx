import { type ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Sparkles, Zap, Gauge } from "lucide-react";
import { useJourney } from "../journey/JourneyContext";
import { STEP } from "../journey/steps";
import { BrandLockup } from "../components/BrandMark";
import { BrandHeroVisual } from "../components/brand/BrandHeroVisual";
import { MascotHero } from "../components/brand/MascotHero";
import { useTheme } from "../ThemeProvider";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/Badge";
import { ArrowRightIcon } from "../components/Icons";

// A tiny fractal-noise tile, inlined so it ships offline. Used at a very low
// opacity for a subtle paper texture on the Hue Labs backdrop.
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const EASE = [0.16, 1, 0.3, 1] as const;

// Calm, staggered entrance - a gentle rise + fade, nothing flashy.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.085, delayChildren: 0.12 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.62, ease: EASE } },
};

const FEATURES = [
  { icon: <Cpu className="w-[18px] h-[18px]" strokeWidth={1.8} />, title: "Smart Hardware Detection", desc: "A deep scan of your system's real capabilities." },
  { icon: <Sparkles className="w-[18px] h-[18px]" strokeWidth={1.8} />, title: "Intelligent Recommendations", desc: "The right model for the hardware you own." },
  { icon: <Zap className="w-[18px] h-[18px]" strokeWidth={1.8} />, title: "One-Click Optimization", desc: "Tune runtime settings without the terminal." },
  { icon: <Gauge className="w-[18px] h-[18px]" strokeWidth={1.8} />, title: "Accurate Benchmarking", desc: "Real, measured performance on this machine." },
];

export function WelcomeScreen() {
  const { next, enterFlowAt } = useJourney();
  const { theme } = useTheme();
  const [bgFailed, setBgFailed] = useState(false);
  const isHue = theme === "huelabs";

  return (
    <section className="relative isolate min-h-[var(--vph)] w-full flex flex-col overflow-hidden">
      {/* Background. Hue Labs gets a calm, editorial field - soft warm radials,
          a gentle vignette and a whisper of paper grain (no photo, no glow); the
          dev themes keep the terrain photo + scrims. */}
      {isHue ? (
        <motion.div
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        >
          {/* soft warm radial lifts: one behind the mascot, one at top-left */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(760px 560px at 70% 44%, rgb(var(--surface1) / 0.6) 0%, rgb(var(--surface1) / 0) 62%)," +
                "radial-gradient(1000px 720px at 6% -6%, rgb(var(--bg-top) / 0.9) 0%, rgb(var(--bg-top) / 0) 55%)",
            }}
          />
          {/* warm vignette - edges settle a touch darker to frame the content */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(135% 125% at 50% 40%, rgb(var(--bg-bottom) / 0) 52%, rgb(var(--bg-bottom) / 0.55) 100%)",
            }}
          />
          {/* subtle paper grain */}
          <div
            className="absolute inset-0 opacity-[0.035] mix-blend-soft-light"
            style={{ backgroundImage: NOISE, backgroundSize: "150px 150px" }}
          />
        </motion.div>
      ) : (
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
      )}

      {/* Top bar (dragging is handled by the global title-bar strip) */}
      <header className="relative z-10 w-full">
        <div className="max-w-[1300px] mx-auto w-full px-8 lg:px-20 h-[84px] flex items-center justify-between">
          <div>
            <BrandLockup markSize={40} onClick={() => enterFlowAt(STEP.Welcome)} />
          </div>
          <StatusBadge tone="soft" dot className="!bg-mist-100/50 !border-mist-200/70 !shadow-none">
            <span className="font-mono uppercase tracking-wide text-ink-400">100% Local · Private · Secure</span>
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
                className="inline-flex items-center gap-2 rounded-badge bg-mist-100/60 backdrop-blur border border-mist-200/70 pl-2 pr-3 py-1.5 mb-8"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-signal/90" />
                <span className="text-micro font-mono uppercase tracking-wider text-ink-400">
                  Local-first · Optimization tool
                </span>
              </motion.span>

              <motion.h1
                variants={item}
                className="text-[46px] sm:text-[56px] lg:text-[64px] font-semibold tracking-tight2 text-ink-900 leading-[1.06]"
              >
                Run Local AI.
                <br />
                <span className="text-brand">Optimized.</span>
              </motion.h1>

              <motion.p
                variants={item}
                className="mt-7 text-[18px] leading-[1.7] text-ink-500 max-w-[30rem]"
              >
                We analyze your hardware, recommend the best model, and tune local performance
                so you get the most out of your machine.
              </motion.p>

              {/* Feature list */}
              <motion.ul variants={item} className="mt-11 space-y-[22px] max-w-[34rem]">
                {FEATURES.map((f) => (
                  <Feature key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
                ))}
              </motion.ul>

              <motion.div variants={item} className="mt-14 flex items-center gap-5">
                <Button onClick={next} rightIcon={<ArrowRightIcon className="w-5 h-5" />}>
                  Get Started
                </Button>
                <span className="text-micro font-mono uppercase tracking-wide text-ink-400">
                  Takes less than a minute
                </span>
              </motion.div>
            </motion.div>

            {/* Right: hero visual — the pixel mascot for Hue Labs, the wireframe
                cube for the development themes. Mascot fades in smoothly; its
                idle float / breathing / shadow live inside the component. */}
            <motion.div
              initial={{ opacity: 0, y: isHue ? 10 : 0, scale: isHue ? 1 : 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: isHue ? 1 : 0.8, delay: isHue ? 0.25 : 0, ease: EASE }}
              className={`relative hidden lg:flex lg:items-center lg:justify-center ${isHue ? "" : "lg:mt-[84px]"}`}
            >
              {isHue ? <MascotHero /> : <BrandHeroVisual />}
            </motion.div>
          </div>
        </div>
      </main>
    </section>
  );
}

function Feature({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-4">
      {/* Quiet, supporting icon - muted, borderless, so it doesn't compete with
          the text. */}
      <span className="mt-[3px] grid place-items-center w-6 h-6 text-ink-400 flex-shrink-0">
        {icon}
      </span>
      <div>
        <div className="text-body font-semibold text-ink-900 leading-snug">{title}</div>
        <div className="text-caption text-ink-500 mt-1 leading-relaxed">{desc}</div>
      </div>
    </li>
  );
}
