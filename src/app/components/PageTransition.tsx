import { useLocation, useOutlet } from "react-router";
import { motion, AnimatePresence } from "motion/react";

const variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

/**
 * Crossfades between routed pages.
 */
export function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.18, ease: "easeInOut" }}
        className="min-h-full"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
