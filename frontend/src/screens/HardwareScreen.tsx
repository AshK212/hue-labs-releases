import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { StatTile } from "../components/Bits";
import {
  ArrowRightIcon,
  CheckIcon,
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
    <Column>
      <Reveal index={0}>
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight2 text-ink-900">
          We found your computer
        </h1>
      </Reveal>
      <Reveal index={1} className="mt-2">
        <p className="text-[16px] text-ink-500">Here's what we detected. Everything looks good.</p>
      </Reveal>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <Reveal index={2}>
          <StatTile icon={<MonitorIcon className="w-[18px] h-[18px]" />} label="System" value={hardware.os_name} />
        </Reveal>
        <Reveal index={3}>
          <StatTile
            icon={<ChipIcon className="w-[18px] h-[18px]" />}
            label="Processor"
            value={hardware.cpu_name}
            hint={`${hardware.cpu_cores_physical} cores`}
          />
        </Reveal>
        <Reveal index={4}>
          <StatTile
            icon={<MemoryIcon className="w-[18px] h-[18px]" />}
            label="Memory"
            value={`${hardware.memory_total_gb} GB`}
            hint={`${hardware.memory_available_gb} GB free`}
          />
        </Reveal>
        <Reveal index={5}>
          <StatTile
            icon={<GpuIcon className="w-[18px] h-[18px]" />}
            label="Graphics"
            value={gpu?.name ?? "Built-in graphics"}
            hint={gpu?.vram_gb ? `${gpu.vram_gb} GB graphics memory` : undefined}
          />
        </Reveal>
      </div>

      <Reveal index={6} className="mt-6 flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-50 text-sage-600 px-3 py-1.5 text-[13px] font-semibold">
          <CheckIcon className="w-4 h-4" />
          Great match
        </span>
        <span className="text-[14px] text-ink-500">Your computer is ready for local AI.</span>
      </Reveal>

      <Reveal index={7} className="mt-8">
        <button className="btn-primary" onClick={next}>
          Continue
          <ArrowRightIcon className="w-[18px] h-[18px]" />
        </button>
      </Reveal>
    </Column>
  );
}
