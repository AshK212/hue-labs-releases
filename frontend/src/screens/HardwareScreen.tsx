import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { SectionHeader } from "../components/Card";
import { StatTile } from "../components/Bits";
import { StatusBadge } from "../components/Badge";
import { Button } from "../components/Button";
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
        <SectionHeader
          title="We found your computer"
          subtitle="Here is what we detected. Everything looks good."
        />
      </Reveal>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Reveal index={1} className="h-full">
          <StatTile icon={<MonitorIcon className="w-[18px] h-[18px]" />} label="System" value={hardware.os_name} />
        </Reveal>
        <Reveal index={2} className="h-full">
          <StatTile
            icon={<ChipIcon className="w-[18px] h-[18px]" />}
            label="Processor"
            value={hardware.cpu_name}
            hint={`${hardware.cpu_cores_physical} cores`}
          />
        </Reveal>
        <Reveal index={3} className="h-full">
          <StatTile
            icon={<MemoryIcon className="w-[18px] h-[18px]" />}
            label="Memory"
            value={`${hardware.memory_total_gb} GB`}
            hint={`${hardware.memory_available_gb} GB free`}
          />
        </Reveal>
        <Reveal index={4} className="h-full">
          <StatTile
            icon={<GpuIcon className="w-[18px] h-[18px]" />}
            label="Graphics"
            value={gpu?.name ?? "Built-in graphics"}
            hint={gpu?.vram_gb ? `${gpu.vram_gb} GB graphics memory` : undefined}
          />
        </Reveal>
      </div>

      <Reveal index={5} className="mt-6 flex items-center gap-3">
        <StatusBadge tone="green" icon={<CheckIcon className="w-3.5 h-3.5" />}>
          Great match
        </StatusBadge>
        <span className="text-caption text-ink-500">Your computer is ready for local AI.</span>
      </Reveal>

      <Reveal index={6} className="mt-9">
        <Button onClick={next} rightIcon={<ArrowRightIcon className="w-[18px] h-[18px]" />}>
          Continue
        </Button>
      </Reveal>
    </Column>
  );
}
