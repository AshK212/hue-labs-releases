import { useJourney } from "../journey/JourneyContext";
import { Reveal } from "../components/Screen";
import { Pill, StatTile } from "../components/Bits";
import {
  ArrowRightIcon,
  ChipIcon,
  GpuIcon,
  MemoryIcon,
  MonitorIcon,
} from "../components/Icons";

export function HardwareScreen() {
  const { hardware, next } = useJourney();
  if (!hardware) return null;

  const gpu = hardware.gpus[0];

  return (
    <div className="flex flex-col items-center text-center">
      <Reveal index={0}>
        <p className="text-sky-600 text-sm font-semibold uppercase tracking-[0.12em]">
          Your computer
        </p>
      </Reveal>

      <Reveal index={1} className="mt-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tightest text-ink-900">
          Here’s your machine
        </h1>
      </Reveal>

      <Reveal index={2} className="mt-4">
        <p className="text-ink-500 max-w-md mx-auto text-balance">{hardware.summary}</p>
      </Reveal>

      <div className="mt-9 grid grid-cols-2 gap-3 w-full">
        <Reveal index={3}>
          <StatTile icon={<MonitorIcon className="w-4 h-4" />} label="System" value={hardware.os_name} />
        </Reveal>
        <Reveal index={4}>
          <StatTile icon={<ChipIcon className="w-4 h-4" />} label="Processor" value={hardware.cpu_name} />
        </Reveal>
        <Reveal index={5}>
          <StatTile
            icon={<MemoryIcon className="w-4 h-4" />}
            label="Memory"
            value={`${hardware.memory_total_gb} GB`}
            hint={`${hardware.memory_available_gb} GB free right now`}
          />
        </Reveal>
        <Reveal index={6}>
          <StatTile
            icon={<GpuIcon className="w-4 h-4" />}
            label="Graphics"
            value={gpu?.name ?? "Integrated graphics"}
            hint={gpu?.vram_gb ? `${gpu.vram_gb} GB video memory` : undefined}
          />
        </Reveal>
      </div>

      <Reveal index={7} className="mt-5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Pill tone="info">{hardware.cpu_cores_physical} cores</Pill>
          {hardware.is_apple_silicon && <Pill tone="good">Apple Silicon</Pill>}
          {hardware.gpus.some((g) => g.vendor === "NVIDIA") && <Pill tone="good">NVIDIA GPU</Pill>}
        </div>
      </Reveal>

      <Reveal index={8} className="mt-9">
        <button className="btn-primary" onClick={next}>
          Looks good
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </Reveal>
    </div>
  );
}
