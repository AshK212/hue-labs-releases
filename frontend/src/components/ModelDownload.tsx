import { useEffect } from "react";
import { Reveal } from "./Screen";
import { IconBadge } from "./Bits";
import { Button } from "./Button";
import { CircularProgress } from "./CircularProgress";
import { Spot } from "./Spot";
import { ArrowRightIcon, DownloadIcon } from "./Icons";
import {
  useModelDownload,
  isDownloadActive,
  type DownloadStatus,
} from "../journey/useModelDownload";

interface Props {
  model: string;
  label: string;
  sizeGb?: number;
  onComplete?: () => void;
  onContinue: () => void;
}

const STATUS_LABEL: Record<DownloadStatus, string> = {
  idle: "",
  preparing: "Preparing",
  downloading: "Downloading",
  verifying: "Verifying",
  finalizing: "Finishing up",
  complete: "Complete",
  error: "Error",
  cancelled: "Canceled",
};

function gb(n: number): string {
  if (!n || n <= 0) return "0 GB";
  const v = n / 1024 ** 3;
  if (v >= 1) return `${v.toFixed(1)} GB`;
  return `${Math.max(1, Math.round(n / 1024 ** 2))} MB`;
}
function speedText(bps: number): string {
  if (bps <= 0) return "—";
  const mb = bps / 1024 ** 2;
  return mb >= 1 ? `${mb.toFixed(1)} MB/s` : `${Math.max(1, Math.round(bps / 1024))} KB/s`;
}
function etaText(sec: number | null): string {
  if (sec === null || !isFinite(sec) || sec <= 0) return "—";
  if (sec >= 90) return `about ${Math.round(sec / 60)} min`;
  return `${Math.max(1, Math.round(sec))} sec`;
}

export function ModelDownload({ model, label, sizeGb, onComplete, onContinue }: Props) {
  const dl = useModelDownload();

  useEffect(() => {
    if (dl.status === "complete") onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dl.status]);

  // --- Active download: the glowing ring ---------------------------------
  if (isDownloadActive(dl.status)) {
    const remaining = Math.max(0, dl.totalBytes - dl.completedBytes);
    return (
      <div className="flex flex-col items-center text-center">
        <Reveal index={0}>
          <h1 className="text-page font-semibold text-ink-900">Adding {label}</h1>
        </Reveal>
        <Reveal index={1} className="mt-1.5">
          <p className="text-body text-ink-500">{STATUS_LABEL[dl.status]}</p>
        </Reveal>

        <Reveal index={2} className="mt-8">
          <CircularProgress percent={dl.percent}>
            {dl.percent !== null ? (
              <div>
                <div className="text-[44px] leading-none font-semibold text-ink-900 tnum">
                  {Math.round(dl.percent)}
                  <span className="text-cardtitle text-ink-400">%</span>
                </div>
              </div>
            ) : (
              <div className="text-body font-medium text-ink-500">Preparing</div>
            )}
          </CircularProgress>
        </Reveal>

        <Reveal index={3} className="mt-8 w-full max-w-[26rem]">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Downloaded" value={gb(dl.completedBytes)} />
            <Metric label="Remaining" value={dl.totalBytes > 0 ? gb(remaining) : "—"} />
            <Metric label="Speed" value={speedText(dl.speedBytesPerSec)} />
            <Metric label="Time left" value={etaText(dl.etaSeconds)} />
          </div>
        </Reveal>

        <Reveal index={4} className="mt-7">
          <Button variant="secondary" onClick={dl.cancel}>
            Cancel
          </Button>
        </Reveal>
      </div>
    );
  }

  // --- Complete: model ready ---------------------------------------------
  if (dl.status === "complete") {
    return <ModelReady label={label} onContinue={onContinue} />;
  }

  // --- Idle / cancelled / error ------------------------------------------
  const isError = dl.status === "error";
  const isCancelled = dl.status === "cancelled";
  return (
    <div>
      <Reveal index={0}>
        <IconBadge size="lg">
          <DownloadIcon className="w-7 h-7" />
        </IconBadge>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-page font-semibold text-ink-900">
          {isCancelled ? `Download ${label} again?` : `Add ${label} to your computer`}
        </h1>
      </Reveal>
      <Reveal index={2} className="mt-3">
        <p className="text-body leading-relaxed text-ink-500 max-w-[30rem]">
          {isCancelled
            ? "The download was canceled. You can start it again whenever you're ready."
            : `We download it once${sizeGb ? `, about ${sizeGb} GB` : ""}. After that it runs offline and you won't need to download it again.`}
        </p>
      </Reveal>
      {isError && dl.error && (
        <Reveal index={3} className="mt-4">
          <p className="text-caption text-sky-600">{dl.error}</p>
        </Reveal>
      )}
      <Reveal index={3} className="mt-8">
        <Button onClick={() => dl.start(model)} leftIcon={<DownloadIcon className="w-[18px] h-[18px]" />}>
          {isError ? "Try again" : isCancelled ? "Download again" : `Download ${label}`}
        </Button>
      </Reveal>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-quiet px-4 py-3 text-left">
      <div className="text-micro text-ink-400">{label}</div>
      <div className="text-body font-semibold text-ink-900 mt-0.5 tnum">{value}</div>
    </div>
  );
}

function ModelReady({ label, onContinue }: { label: string; onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Reveal index={0}>
        <Spot motif="success" tone="green" size={120} />
      </Reveal>
      <Reveal index={1} className="mt-7">
        <h1 className="text-page font-semibold text-ink-900">Your model is ready</h1>
      </Reveal>
      <Reveal index={2} className="mt-3">
        <p className="text-body leading-relaxed text-ink-500 max-w-[26rem]">
          {label} is installed on your computer. Everything runs locally, so no internet is
          required from here.
        </p>
      </Reveal>
      <Reveal index={3} className="mt-8">
        <Button onClick={onContinue} rightIcon={<ArrowRightIcon className="w-[18px] h-[18px]" />}>
          Continue
        </Button>
      </Reveal>
    </div>
  );
}
