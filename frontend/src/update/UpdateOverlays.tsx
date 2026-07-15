/**
 * App-wide, non-modal update affordances:
 *   - RestartBanner: a subtle bottom bar shown when an update is downloaded.
 *   - UpdatedDialog: a one-time "what's new" card shown after an update installs.
 *
 * Both read the shared UpdateManager state; no update logic lives here. Warm
 * monochrome, editorial, minimal — no toast/modal spam, gentle motion only.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "../components/Button";
import { useUpdates } from "./UpdateManager";

// Static release highlights (content, not version data). Version comes from Electron.
const WHATS_NEW = [
  "Faster, measured optimization engine",
  "Polished shareable Result Card",
  "Refined onboarding and settings",
];

const EASE = [0.16, 1, 0.3, 1] as const;

function RestartBanner() {
  const { restartBannerVisible, availableVersion, restartNow, dismissRestart } = useUpdates();

  return (
    <AnimatePresence>
      {restartBannerVisible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[min(94vw,32rem)]"
          role="status"
        >
          <div className="flex items-center gap-4 rounded-panel border border-mist-200 bg-carbon/95 backdrop-blur-xl shadow-card px-5 py-3.5">
            <span className="flex-shrink-0 grid place-items-center w-9 h-9 rounded-tile bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100">
              <Sparkles className="w-[18px] h-[18px]" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-body font-semibold text-ink-900 leading-tight">
                A new version of Hue Labs is ready
              </div>
              {availableVersion && (
                <div className="text-caption text-ink-500 mt-0.5">Version {availableVersion}</div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="ghost" onClick={dismissRestart}>
                Later
              </Button>
              <Button variant="secondary" onClick={restartNow}>
                Restart now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function UpdatedDialog() {
  const { justUpdated, currentVersion, dismissUpdated } = useUpdates();

  return (
    <AnimatePresence>
      {justUpdated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-carbon/70 backdrop-blur-sm px-6"
          role="dialog"
          aria-modal="true"
          aria-label="Hue Labs updated"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="w-full max-w-[26rem] rounded-panel border border-mist-200 bg-carbon shadow-card p-8 text-center"
          >
            <span className="inline-grid place-items-center w-12 h-12 rounded-full bg-sky-50 text-sky-500 ring-1 ring-inset ring-sky-100">
              <Sparkles className="w-6 h-6" strokeWidth={1.8} />
            </span>
            <div className="text-micro font-mono uppercase tracking-wider text-sky-600 mt-4">
              Hue Labs updated
            </div>
            <p className="text-body text-ink-500 mt-2.5">You're now running</p>
            <div className="text-[32px] leading-none font-semibold tracking-tight2 text-ink-900 mt-1.5">
              Version {currentVersion || "—"}
            </div>

            <div className="mt-6 text-left surface-quiet rounded-tile p-5">
              <div className="text-caption font-semibold text-ink-700 mb-3">What's new</div>
              <ul className="space-y-2.5">
                {WHATS_NEW.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-caption text-ink-600">
                    <Check className="w-4 h-4 text-sage-500 mt-0.5 flex-shrink-0" strokeWidth={2.2} />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button className="mt-6" fullWidth onClick={dismissUpdated}>
              Continue
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function UpdateOverlays() {
  return (
    <>
      <RestartBanner />
      <UpdatedDialog />
    </>
  );
}
