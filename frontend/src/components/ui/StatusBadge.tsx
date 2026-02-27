type Props = {
  status: 'success' | 'danger' | 'warning' | 'neutral'
  label: string
}

const map = {
  success: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  danger: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
  warning: 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30',
  neutral: 'bg-white/10 text-slate-300 ring-1 ring-white/10',
}

export default function StatusBadge({ status, label }: Props) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status]}`}>{label}</span>
}

