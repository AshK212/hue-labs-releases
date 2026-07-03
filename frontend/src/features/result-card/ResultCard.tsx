// The Shareable Result Card — a premium, monochrome, warm-dark, editorial card.
//
// It is intentionally "dumb": it receives ONLY ResultCardData and never imports
// OptimizationRun or any backend type. All styling is inline (no Tailwind) so the
// exporter can serialize the node to a self-contained PNG with full fidelity.
//
// The component forwards a ref to its root <div> so the exporter can capture it.

import { forwardRef } from "react";
import type { CSSProperties } from "react";
import type { ResultCardData } from "./types";

// --- Palette (Hue Labs warm charcoal, fully monochrome) -------------------
const PAPER = "#F2EEE7";
const MUTED = "rgba(242,238,231,0.54)";
const FAINT = "rgba(242,238,231,0.34)";
const HAIR = "rgba(242,238,231,0.10)";
const FONT =
  '-apple-system, "SF Pro Display", "SF Pro Text", Inter, system-ui, "Segoe UI", sans-serif';

const s: Record<string, CSSProperties> = {
  card: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: 640,
    padding: "clamp(28px, 5vw, 48px)",
    borderRadius: 24,
    background:
      "radial-gradient(130% 130% at 12% 0%, #241F1B 0%, #191512 55%, #110E0B 100%)",
    border: `1px solid ${HAIR}`,
    boxShadow:
      "0 30px 80px -40px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.045)",
    color: PAPER,
    fontFamily: FONT,
    fontVariantNumeric: "tabular-nums",
    WebkitFontSmoothing: "antialiased",
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 16,
  },
  wordmark: { fontSize: 15, fontWeight: 600, letterSpacing: "0.06em" },
  kicker: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: FAINT,
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "clamp(20px, 4vw, 40px)",
    marginTop: "clamp(26px, 4vw, 38px)",
  },
  metaLabel: {
    display: "block",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: FAINT,
    marginBottom: 6,
  },
  metaValue: { fontSize: 14, fontWeight: 500, color: PAPER },
  hero: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "clamp(18px, 4vw, 44px)",
    marginTop: "clamp(30px, 5vw, 44px)",
  },
  tpsBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  tpsLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: FAINT,
  },
  tpsValue: { fontSize: "clamp(40px, 9vw, 60px)", fontWeight: 300, lineHeight: 1 },
  tpsValueStrong: { fontWeight: 500 },
  tpsUnit: { fontSize: 12, color: MUTED },
  arrow: { fontSize: 24, fontWeight: 300, color: FAINT, paddingBottom: 14 },
  callouts: {
    display: "flex",
    alignItems: "center",
    gap: "clamp(20px, 5vw, 48px)",
    marginTop: "clamp(28px, 4vw, 40px)",
    paddingTop: "clamp(20px, 3vw, 28px)",
    borderTop: `1px solid ${HAIR}`,
  },
  callout: { display: "flex", flexDirection: "column", gap: 6 },
  calloutValue: { fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 400, lineHeight: 1 },
  calloutLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: MUTED,
  },
  scoreOut: { fontSize: 15, color: FAINT, marginLeft: 2 },
  vDivider: { width: 1, alignSelf: "stretch", background: HAIR },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: "clamp(24px, 3vw, 32px)",
    paddingTop: "clamp(16px, 2vw, 20px)",
    borderTop: `1px solid ${HAIR}`,
  },
  site: { fontSize: 13, fontWeight: 500, letterSpacing: "0.02em", color: PAPER },
  stamp: { fontSize: 11, color: FAINT },
};

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={s.metaLabel}>{label}</span>
      <span style={s.metaValue}>{value}</span>
    </div>
  );
}

export interface ResultCardProps {
  data: ResultCardData;
  /** Optional style overrides merged onto the card root. */
  style?: CSSProperties;
}

/**
 * Presentational result card. Forwards a ref to its root element so the exporter
 * can rasterize exactly this node.
 */
export const ResultCard = forwardRef<HTMLDivElement, ResultCardProps>(
  function ResultCard({ data, style }, ref) {
    const stamp = [data.generatedLabel, data.versionLabel].filter(Boolean).join(" · ");
    return (
      <div ref={ref} style={{ ...s.card, ...style }}>
        <div style={s.header}>
          <span style={s.wordmark}>{data.wordmark}</span>
          <span style={s.kicker}>Measured Optimization</span>
        </div>

        <div style={s.meta}>
          <Meta label="Hardware" value={data.hardware} />
          <Meta label="Model" value={data.model} />
          <Meta label="Quant" value={data.quant} />
        </div>

        <div style={s.hero}>
          <div style={s.tpsBlock}>
            <span style={s.tpsLabel}>Before</span>
            <span style={s.tpsValue}>{data.beforeTps}</span>
            <span style={s.tpsUnit}>tok/s</span>
          </div>
          <span style={s.arrow}>&rarr;</span>
          <div style={s.tpsBlock}>
            <span style={s.tpsLabel}>After</span>
            <span style={{ ...s.tpsValue, ...s.tpsValueStrong }}>{data.afterTps}</span>
            <span style={s.tpsUnit}>tok/s</span>
          </div>
        </div>

        <div style={s.callouts}>
          <div style={s.callout}>
            <span style={s.calloutValue}>{data.improvement}</span>
            <span style={s.calloutLabel}>{data.improvementCaption}</span>
          </div>
          <div style={s.vDivider} />
          <div style={s.callout}>
            <span style={s.calloutValue}>
              {data.score}
              <span style={s.scoreOut}>{data.scoreOutOf}</span>
            </span>
            <span style={s.calloutLabel}>Optimization Score</span>
          </div>
        </div>

        <div style={s.footer}>
          <span style={s.site}>{data.site}</span>
          {stamp && <span style={s.stamp}>{stamp}</span>}
        </div>
      </div>
    );
  }
);
