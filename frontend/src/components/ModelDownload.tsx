import { useEffect } from "react";
import { Reveal } from "./Screen";
import { IconBadge } from "./Bits";
import {
  ArrowRightIcon,
  CheckIcon,
  DownloadIcon,
} from "./Icons";
import {
  useModelDownload,
  isDownloadActive,
  type DownloadStatus,
} from "../journey/useModelDownload";

interface Props {
  model: string;
  label: string;
  sizeGb?: number;
  /** Fires once when the download finishes, e.g. to refresh installed models. */
  onComplete?: () => void;
  /** Advances the flow from the success state. */
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

function formatBytes(n: number): string {
  if (!n || n <= 0) return "0 MB";
  const gb = n / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.max(1, Math.round(n / 1024 ** 2))} MB`;
}

/**
 * The full model download experience: a clear prompt, real streamed progress
 * with cancel, and a success state with Continue. Reusable for any model.
 */
export function ModelDownload({ model, label, sizeGb, onComplete, onContinue }: Props) {
  const dl = useModelDownload();

  useEffect(() => {
    if (dl.status === "complete") onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dl.status]);

  // --- Active download ---------------------------------------------------
  if (isDownloadActive(dl.status)) {
    const hasSizes = dl.totalBytes > 0;
    return (
      <div>
        <Reveal index={0}>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight2 text-ink-900">
            Adding {label}
          </h1>
        </Reveal>

        <Reveal index={1} className="mt-7">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <IconBadge>
                  <DownloadIcon className="w-6 h-6" />
                </IconBadge>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-ink-900 truncate">{label}</div>
                  <div className="text-[13px] text-ink-400">{STATUS_LABEL[dl.status]}</div>
                </div>
              </div>
              {dl.percent !== null && (
                <div className="text-[15px] font-semibold text-ink-900 tabular-nums">
                  {Math.round(dl.percent)}%
                </div>
              )}
            </div>

            <ProgressBar percent={dl.percent} className="mt-5" />

            <div className="mt-3 flex items-center justify-between text-[13px] text-ink-400">
              <span>{hasSizes ? `${formatBytes(dl.completedBytes)} of ${formatBytes(dl.totalBytes)}` : "Calculating size"}</span>
              <button
                onClick={dl.cancel}
                className="text-ink-400 hover:text-ink-700 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    );
  }

  // --- Complete ----------------------------------------------------------
  if (dl.status === "complete") {
    return (
      <div>
        <Reveal index={0}>
          <IconBadge tone="sage">
            <CheckIcon className="w-6 h-6" />
          </IconBadge>
        </Reveal>
        <Reveal index={1} className="mt-6">
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight2 text-ink-900">
            {label} is ready
          </h1>
        </Reveal>
        <Reveal index={2} className="mt-3">
          <p className="text-[17px] leading-relaxed text-ink-500 max-w-[26rem]">
            It's installed on your computer and runs offline from now on.
          </p>
        </Reveal>
        <Reveal index={3} className="mt-8">
          <button className="btn-primary" onClick={onContinue}>
            Continue
            <ArrowRightIcon className="w-[18px] h-[18px]" />
          </button>
        </Reveal>
      </div>
    );
  }

  // --- Idle / cancelled / error -----------------------------------------
  const isError = dl.status === "error";
  const isCancelled = dl.status === "cancelled";

  return (
    <div>
      <Reveal index={0}>
        <IconBadge>
          <DownloadIcon className="w-6 h-6" />
        </IconBadge>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight2 text-ink-900">
          {isCancelled ? `Download ${label} again?` : `Add ${label} to your computer`}
        </h1>
      </Reveal>
      <Reveal index={2} className="mt-3">
        <p className="text-[17px] leading-relaxed text-ink-500 max-w-[28rem]">
          {isCancelled
            ? "The download was canceled. You can start it again whenever you're ready."
            : `We download it once${sizeGb ? `, about ${sizeGb} GB` : ""}. After that it runs offline and you won't need to download it again.`}
        </p>
      </Reveal>
      {isError && dl.error && (
        <Reveal index={3} className="mt-4">
          <p className="text-[14px] text-sky-600">{dl.error}</p>
        </Reveal>
      )}
      <Reveal index={3} className="mt-8">
        <button className="btn-primary" onClick={() => dl.start(model)}>
          <DownloadIcon className="w-[18px] h-[18px]" />
          {isError ? "Try again" : isCancelled ? "Download again" : `Download ${label}`}
        </button>
      </Reveal>
    </div>
  );
}

function ProgressBar({ percent, className = "" }: { percent: number | null; className?: string }) {
  return (
    <div className={`h-2 rounded-full bg-mist-200 overflow-hidden ${className}`}>
      {percent === null ? (
        // Size not known yet: an honest, indeterminate "working" bar.
        <div className="h-full w-full bg-sky-100">
          <div className="h-full w-full sheen animate-shimmer" />
        </div>
      ) : (
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      )}
    </div>
  );
}
