import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

export default function RouteOverlay() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0.6 }}
        animate={{ clipPath: 'circle(140% at 50% 50%)', opacity: 0 }}
        exit={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0.6 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed inset-0 z-20 bg-gradient-to-br from-primary/40 via-emerald-400/30 to-cyan-500/25 blur-2xl"
      />
    </AnimatePresence>
  )
}


