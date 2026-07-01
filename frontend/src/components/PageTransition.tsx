import type { ReactNode } from "react";
import { motion } from "framer-motion";

/** The shared page/section fade+slide transition, used across the app. */
export const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const },
};

export function PageTransition({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} {...pageMotion}>
      {children}
    </motion.div>
  );
}
