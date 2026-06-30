// Icon layer backed by lucide-react. The app keeps a small, stable set of named
// icons (each accepting `className`) so call sites stay unchanged while the
// actual glyphs come from Lucide for a consistent, professional icon system.

import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CircuitBoard,
  Cloud,
  Cpu,
  Download,
  Gauge,
  Loader2,
  MemoryStick,
  Monitor,
  ShieldCheck,
  Sparkles,
  SquareTerminal,
  type LucideProps,
} from "lucide-react";

type IconProps = { className?: string };
const STROKE = 1.8;

const make =
  (Glyph: React.ComponentType<LucideProps>, defaultStroke = STROKE) =>
  ({ className = "w-5 h-5" }: IconProps) =>
    <Glyph className={className} strokeWidth={defaultStroke} absoluteStrokeWidth={false} />;

export const CloudIcon = make(Cloud);
export const ChipIcon = make(Cpu);
export const MonitorIcon = make(Monitor);
export const MemoryIcon = make(MemoryStick);
export const GpuIcon = make(CircuitBoard);
export const SparkIcon = make(Sparkles);
export const GaugeIcon = make(Gauge);
export const CheckIcon = make(Check, 2.2);
export const ArrowRightIcon = make(ArrowRight, 2);
export const ArrowLeftIcon = make(ArrowLeft, 2);
export const ArrowUpIcon = make(ArrowUp, 2.2);
export const DownloadIcon = make(Download);
export const ShieldIcon = make(ShieldCheck);
export const TerminalOffIcon = make(SquareTerminal);

export const Spinner = ({ className = "w-5 h-5" }: IconProps) => (
  <Loader2 className={`${className} animate-spin`} strokeWidth={2} />
);
