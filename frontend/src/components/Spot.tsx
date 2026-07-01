import { motion } from "framer-motion";
import {
  Check,
  CircuitBoard,
  Cloud,
  Cpu,
  Gauge,
  ShieldCheck,
  Sparkles,
  type LucideProps,
} from "lucide-react";

export type SpotMotif =
  | "chip"
  | "hardware"
  | "optimize"
  | "speed"
  | "privacy"
  | "cloud"
  | "success";

const GLYPH: Record<SpotMotif, React.ComponentType<LucideProps>> = {
  chip: Cpu,
  hardware: CircuitBoard,
  optimize: Sparkles,
  speed: Gauge,
  privacy: ShieldCheck,
  cloud: Cloud,
  success: Check,
};

/**
 * A signature "spot illustration": one consistent composition — a soft stage
 * tile with a gradient wash, an orbit ring, a central brand-gradient disc with a
 * glyph, drifting sparks and an aura glow. Every motif shares this exact anatomy
 * so the whole set reads as one illustration family that belongs to this product.
 */
export function Spot({
  motif,
  tone = "brand",
  size = 112,
}: {
  motif: SpotMotif;
  tone?: "brand" | "green";
  size?: number;
}) {
  const Glyph = GLYPH[motif];
  const green = tone === "green";
  // Both tones now read in the signal-green family; "green" is a touch brighter.
  const aura = green
    ? "radial-gradient(circle, rgba(184,242,92,0.34) 0%, rgba(184,242,92,0) 70%)"
    : "radial-gradient(circle, rgba(147,210,74,0.28) 0%, rgba(147,210,74,0) 70%)";
  const wash = green
    ? "linear-gradient(135deg, #b8f25c 0%, #93d24a 100%)"
    : "linear-gradient(135deg, #93d24a 0%, #6f9a2f 100%)";

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {/* aura glow */}
      <div
        aria-hidden
        className="absolute inset-[-14%] rounded-[36%] blur-2xl opacity-70 animate-breathe"
        style={{ background: aura }}
      />
      {/* stage tile */}
      <div className="relative w-full h-full rounded-[30%] surface grid place-items-center overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: wash }} />
        {/* orbit ring */}
        <div
          aria-hidden
          className={`absolute rounded-full border ${green ? "border-sage-100" : "border-iris-200/70"}`}
          style={{ width: "72%", height: "72%" }}
        />
        {/* central gradient disc + glyph */}
        <div
          className="relative grid place-items-center rounded-full text-carbon shadow-button"
          style={{ width: "46%", height: "46%", backgroundImage: wash }}
        >
          <Glyph className="w-[52%] h-[52%]" strokeWidth={2} />
        </div>
        {/* drifting sparks */}
        <motion.span
          aria-hidden
          className={`absolute w-2 h-2 rounded-full ${green ? "bg-sage-400" : "bg-iris-400"}`}
          style={{ top: "17%", right: "20%" }}
          animate={{ y: [0, -4, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          aria-hidden
          className="absolute w-1.5 h-1.5 rounded-full bg-sky-300"
          style={{ bottom: "22%", left: "18%" }}
          animate={{ y: [0, 4, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
      </div>
    </div>
  );
}
