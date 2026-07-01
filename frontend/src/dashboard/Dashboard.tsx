import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrandMark } from "../components/Brand";
import { StatusBadge } from "../components/Badge";
import { ShieldCheck } from "lucide-react";
import { useDashboardData } from "./useDashboardData";
import {
  OverviewSection,
  ModelsSection,
  PerformanceSection,
  HistorySection,
  BenchmarkSection,
  OptimizationSection,
  SettingsSection,
  SECTION_ICON,
  type SectionId,
} from "./sections";

const NAV: { id: SectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "models", label: "Models" },
  { id: "performance", label: "Performance" },
  { id: "benchmark", label: "Benchmark" },
  { id: "optimization", label: "Optimization" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
];

const TITLE: Record<SectionId, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Your local AI at a glance" },
  models: { title: "Models", subtitle: "Models installed on your computer" },
  performance: { title: "Performance", subtitle: "How your model is running" },
  benchmark: { title: "Benchmark", subtitle: "Measure your speed" },
  optimization: { title: "Optimization", subtitle: "Settings tuned for your machine" },
  history: { title: "History", subtitle: "Every measured run" },
  settings: { title: "Settings", subtitle: "Privacy and app preferences" },
};

export function Dashboard() {
  const [active, setActive] = useState<SectionId>("overview");
  const { history, models } = useDashboardData();

  const renderSection = () => {
    switch (active) {
      case "overview":
        return <OverviewSection history={history} models={models} onNavigate={setActive} />;
      case "models":
        return <ModelsSection models={models} />;
      case "performance":
        return <PerformanceSection history={history} />;
      case "history":
        return <HistorySection history={history} />;
      case "benchmark":
        return <BenchmarkSection />;
      case "optimization":
        return <OptimizationSection />;
      case "settings":
        return <SettingsSection />;
    }
  };

  return (
    <div className="min-h-[100dvh]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-[#0f1012]/90 backdrop-blur-xl border-r border-mist-200 flex flex-col px-4 py-6 z-20">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <BrandMark size={30} />
          <span className="text-body font-semibold text-ink-800">Local AI Optimizer</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const on = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={[
                  "relative w-full flex items-center gap-3 px-3 h-11 rounded-tile text-body font-medium transition-colors",
                  on ? "bg-sky-50 text-sky-600" : "text-ink-500 hover:bg-mist-100 hover:text-ink-800",
                ].join(" ")}
              >
                {on && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-signal shadow-[0_0_10px_rgba(184,242,92,0.8)]"
                  />
                )}
                <span className={on ? "text-sky-500" : "text-ink-400"}>{SECTION_ICON[item.id]}</span>
                {item.label}
                {on && (
                  <motion.span layoutId="navdot" className="ml-auto w-1.5 h-1.5 rounded-full bg-signal" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-2 pt-4 border-t border-mist-200">
          <StatusBadge tone="green" dot>
            <span className="font-mono uppercase tracking-wide">Private · Local only</span>
          </StatusBadge>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-64 min-w-0">
        <header className="sticky top-0 z-10 h-[72px] bg-[#0d0e10]/85 backdrop-blur border-b border-mist-200 flex items-center justify-between px-8">
          <div>
            <h1 className="text-cardtitle font-semibold text-ink-900 leading-tight">
              {TITLE[active].title}
            </h1>
            <p className="text-micro font-mono uppercase tracking-wide text-ink-400">{TITLE[active].subtitle}</p>
          </div>
          <StatusBadge tone="soft" icon={<ShieldCheck className="w-4 h-4 text-sky-500" strokeWidth={1.8} />}>
            <span className="font-mono uppercase tracking-wide">Private · Local only</span>
          </StatusBadge>
        </header>

        <main className="px-8 py-8">
          <div className="max-w-[1080px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
