import { useState } from 'react'
import { KeyRound, Bell, User, Palette, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '../../components/animations/PageTransition'

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')
  const [apiKey] = useState('sk_live_••••••••••••••••')

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      toast.success('API key copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy API key')
    }
  }

  const handleRegenerateKey = () => {
    if (window.confirm('Are you sure you want to regenerate your API key? This will invalidate the current key.')) {
      toast.success('API key regenerated!')
    }
  }

  const handleDeleteAllWorkflows = () => {
    if (window.confirm('Are you sure you want to delete ALL workflows? This action cannot be undone.')) {
      toast.success('All workflows deleted')
    }
  }

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion is not yet implemented')
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Settings</p>
            <h2 className="text-2xl font-bold">Personalize NovaOps</h2>
          </div>
        </div>

        <div className="space-y-4">
        <div className="flex flex-wrap gap-2 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
          {[
            { value: 'profile', label: 'Profile', icon: <User size={16} /> },
            { value: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
            { value: 'keys', label: 'API Keys', icon: <KeyRound size={16} /> },
            { value: 'preferences', label: 'Preferences', icon: <Palette size={16} /> },
            { value: 'security', label: 'Danger Zone', icon: <Shield size={16} /> },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                tab === item.value ? 'bg-primary/20 text-white' : 'text-slate-300'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="glass rounded-3xl p-4">
            <p className="text-sm font-semibold text-white">Profile</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                placeholder="Name"
              />
              <input
                className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                placeholder="Email"
              />
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="glass rounded-3xl p-4">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              {['Email notifications', 'Workflow failure alerts', 'Daily summary'].map((item) => (
                <label
                  key={item}
                  className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10"
                >
                  <span>{item}</span>
                  <input type="checkbox" className="rounded border-slate-600 bg-slate-900" />
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'keys' && (
          <div className="glass rounded-3xl p-4">
            <p className="text-sm font-semibold text-white">API Keys</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                value={apiKey}
                readOnly
              />
              <button 
                onClick={handleCopyKey}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/15 transition"
              >
                Copy
              </button>
              <button 
                onClick={handleRegenerateKey}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-glow hover:bg-primary/80 transition"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}

        {tab === 'preferences' && (
          <div className="glass rounded-3xl p-4">
            <p className="text-sm font-semibold text-white">Preferences</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10">
                <option>Theme: Auto</option>
                <option>Theme: Light</option>
                <option>Theme: Dark</option>
              </select>
              <select className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10">
                <option>Timezone: UTC</option>
                <option>Timezone: PST</option>
                <option>Timezone: CET</option>
              </select>
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="glass rounded-3xl p-4">
            <p className="text-sm font-semibold text-white">Danger Zone</p>
            <div className="mt-3 space-y-3">
              <button
                onClick={handleDeleteAllWorkflows}
                className="w-full rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-200 ring-1 ring-red-500/30 hover:bg-red-500/20 transition"
              >
                Delete all workflows
              </button>
              <button
                onClick={handleDeleteAccount}
                className="w-full rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-200 ring-1 ring-red-500/30 hover:bg-red-500/20 transition"
              >
                Delete account
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </PageTransition>
  )
}

