import { useLocation, useOutlet } from "react-router";
import { motion, AnimatePresence } from "motion/react";

const variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

/**
 * Crossfades between routed pages.
 *
 * This deliberately does NOT use AnimatePresence mode="wait" with
 * <Outlet /> rendered as a child. React Router already swaps the
 * Outlet's rendered component the instant the route changes, so by the
 * time this component re-renders, the "old" page is already gone, the
 * "new" page is already mounted, and AnimatePresence never actually sees
 * two children to cross between. mode="wait" then waits for an exit
 * animation that has nothing real to animate out, which can leave the
 * page stuck in its exited (invisible) state until a full reload remounts
 * everything from scratch. That is the most likely cause of the blank
 * screen after navigating without a refresh.
 *
 * useOutlet() lets each rendered route element be captured as its own
 * keyed node here, so AnimatePresence has a real previous/next pair to
 * animate between, and default mode (children cross fade simultaneously,
 * no waiting) keeps it from ever parking on a fully-exited, blank state.
 */
export function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence initial={false}>
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
