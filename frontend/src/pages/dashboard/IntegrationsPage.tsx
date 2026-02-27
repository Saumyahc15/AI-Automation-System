import { PlugZap, Mail, BotMessageSquare, MessageCircle, Github, Cloud, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import StatusBadge from '../../components/ui/StatusBadge'
import PageTransition from '../../components/animations/PageTransition'

const integrations = [
  { name: 'Gmail', status: 'connected', desc: 'Send + receive with OAuth', icon: <Mail size={18} /> },
  { name: 'Telegram', status: 'connected', desc: 'Bot + chat IDs ready', icon: <BotMessageSquare size={18} /> },
  { name: 'WhatsApp', status: 'warning', desc: 'Connect via Twilio/Meta', icon: <MessageCircle size={18} /> },
  { name: 'GitHub', status: 'connected', desc: 'Scrape trends & issues', icon: <Github size={18} /> },
  { name: 'Google Drive', status: 'warning', desc: 'OAuth + storage usage', icon: <Cloud size={18} /> },
]

export default function IntegrationsPage() {
  const navigate = useNavigate()

  const handleAddIntegration = () => {
    toast.success('Integration setup coming soon!')
  }

  const handleManageIntegration = (name: string, status: string) => {
    if (status === 'connected') {
      toast.success(`Managing ${name} integration`)
    } else {
      toast.info(`Setting up ${name} integration`)
    }
  }

  const handleOpenVault = () => {
    toast.success('Opening secure vault...')
  }

  return (
    <PageTransition>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Integrations</p>
          <h2 className="text-2xl font-bold">Connect your stack</h2>
        </div>
        <button 
          onClick={handleAddIntegration}
          className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10 transition"
        >
          <PlugZap size={16} /> Add Integration
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {integrations.map((int) => (
          <div key={int.name} className="glass space-y-3 rounded-3xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                  {int.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{int.name}</p>
                  <p className="text-xs text-slate-500">{int.desc}</p>
                </div>
              </div>
              <StatusBadge
                status={int.status === 'connected' ? 'success' : 'warning'}
                label={int.status === 'connected' ? 'Connected' : 'Configure'}
              />
            </div>
            <button 
              onClick={() => handleManageIntegration(int.name, int.status)}
              className="w-full rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
            >
              {int.status === 'connected' ? 'Manage' : 'Setup'}
            </button>
          </div>
        ))}
      </div>

      <div className="glass flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-white">Secure storage</p>
            <p className="text-xs text-slate-400">API keys stay encrypted. Rotate and mask with one click.</p>
          </div>
        </div>
        <button 
          onClick={handleOpenVault}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-glow hover:bg-primary/80 transition"
        >
          Open vault
        </button>
      </div>
      </div>
    </PageTransition>
  )
}

