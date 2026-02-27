import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type Props = {
  label: string
  value: string
  helper?: string
  trend?: string
  icon?: ReactNode
}

export default function StatCard({ label, value, helper, trend, icon }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass relative overflow-hidden rounded-2xl p-4"
    >
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">{label}</div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
          {icon}
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
        {trend && <span className="text-emerald-400">{trend}</span>}
        {helper}
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/5" />
    </motion.div>
  )
}

