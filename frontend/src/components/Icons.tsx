// Minimal, calm line icons (no icon-library dependency). 1.7 stroke, rounded.

type IconProps = { className?: string };
const d = "w-5 h-5";
const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const CloudIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common}>
    <path d="M7 18a4 4 0 1 1 .6-7.96A5 5 0 0 1 17.5 9 3.5 3.5 0 0 1 17 18H7z" />
  </svg>
);

export const ChipIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common}>
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
    <path d="M9.5 1.5v3M14.5 1.5v3M9.5 19.5v3M14.5 19.5v3M1.5 9.5h3M1.5 14.5h3M19.5 9.5h3M19.5 14.5h3" />
  </svg>
);

export const MonitorIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);

export const MemoryIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common}>
    <rect x="3" y="7" width="18" height="10" rx="2" />
    <path d="M7 7V5M12 7V5M17 7V5M7 21v-2M12 21v-2M17 21v-2" />
  </svg>
);

export const GpuIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="9" cy="12" r="2.5" />
    <path d="M14 10h4M14 13.5h4" />
  </svg>
);

export const SparkIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common}>
    <path d="M12 3l1.9 5L19 10l-5.1 2L12 17l-1.9-5L5 10l5.1-2L12 3z" />
    <path d="M19 14.5l.9 2.4 2.4.9-2.4.9L19 22l-.9-2.3-2.4-.9 2.4-.9.9-2.4z" />
  </svg>
);

export const GaugeIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common}>
    <path d="M4 18a8 8 0 1 1 16 0" />
    <path d="M12 18l4.5-5.5" />
    <circle cx="12" cy="18" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const CheckIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common} strokeWidth={2.1}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

export const ArrowRightIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common} strokeWidth={2}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowLeftIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common} strokeWidth={2}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const ArrowUpIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common} strokeWidth={2.1}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

export const DownloadIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common}>
    <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />
  </svg>
);

export const ShieldIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common}>
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const TerminalOffIcon = ({ className = d }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" {...common}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 10l3 2-3 2M13 15h4" />
  </svg>
);

export const Spinner = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
