import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, HelpCircle } from 'lucide-react'

export type NavItem = {
  label: string
  path: string
  icon: ReactNode
}

type Props = {
  items: NavItem[]
  open: boolean
  onClose: () => void
}

export default function Sidebar({ items, open, onClose }: Props) {
  const location = useLocation()

  const content = (
    <div className="flex h-full flex-col justify-between p-4">
      <div>
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="h-9 w-9 rounded-xl bg-primary/20 ring-1 ring-primary/40" />
          <div>
            <p className="text-sm text-slate-400">AI Automation</p>
            <p className="text-lg font-semibold">NovaOps</p>
          </div>
        </div>

        <div className="space-y-1">
          {items.map((item) => {
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-primary/15 text-white ring-1 ring-primary/40'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-primary">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-400">
        <Link
          to="/docs"
          className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/5 hover:text-white"
        >
          <HelpCircle size={18} /> Help & Docs
        </Link>
        <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/5 hover:text-white">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden h-screen w-64 shrink-0 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 card-border lg:block">
        {content}
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-4 top-4 z-50 h-[calc(100vh-2rem)] w-64 rounded-2xl bg-slate-950/95 card-border shadow-glow lg:hidden"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

