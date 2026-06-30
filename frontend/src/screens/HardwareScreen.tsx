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
    <div>
      <Reveal index={0}>
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight2 text-ink-900">
          We found your computer
        </h1>
      </Reveal>

      <Reveal index={1} className="mt-3">
        <p className="text-[17px] leading-relaxed text-ink-500 max-w-[28rem]">
          {hardware.summary}
        </p>
      </Reveal>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Reveal index={2}>
          <StatTile icon={<MonitorIcon className="w-[18px] h-[18px]" />} label="System" value={hardware.os_name} />
        </Reveal>
        <Reveal index={3}>
          <StatTile icon={<ChipIcon className="w-[18px] h-[18px]" />} label="Processor" value={hardware.cpu_name} />
        </Reveal>
        <Reveal index={4}>
          <StatTile
            icon={<MemoryIcon className="w-[18px] h-[18px]" />}
            label="Memory"
            value={`${hardware.memory_total_gb} GB`}
            hint={`${hardware.memory_available_gb} GB free right now`}
          />
        </Reveal>
        <Reveal index={5}>
          <StatTile
            icon={<GpuIcon className="w-[18px] h-[18px]" />}
            label="Graphics"
            value={gpu?.name ?? "Built-in graphics"}
            hint={gpu?.vram_gb ? `${gpu.vram_gb} GB video memory` : undefined}
          />
        </Reveal>
      </div>

      <Reveal index={6} className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="neutral">{hardware.cpu_cores_physical} cores</Pill>
          {hardware.is_apple_silicon && <Pill tone="good">Apple Silicon</Pill>}
          {hardware.gpus.some((g) => g.vendor === "NVIDIA") && <Pill tone="good">NVIDIA graphics</Pill>}
        </div>
      </Reveal>

      <Reveal index={7} className="mt-9">
        <button className="btn-primary" onClick={next}>
          Continue
          <ArrowRightIcon className="w-[18px] h-[18px]" />
        </button>
      </Reveal>
    </div>
  );
}
