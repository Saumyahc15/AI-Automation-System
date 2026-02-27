import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/45 to-slate-950/65" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6 rounded-3xl bg-white/[0.04] p-8 card-border"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Reset password</p>
          <h1 className="text-2xl font-bold">Send reset link</h1>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
            <Mail size={18} className="text-slate-400" />
            <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" placeholder="you@email.com" />
          </label>
          <button className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:translate-y-[-1px]">
            Send reset link
          </button>
        </div>

        <p className="text-center text-sm text-slate-400">
          Back to{' '}
          <Link to="/login" className="text-primary">
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

