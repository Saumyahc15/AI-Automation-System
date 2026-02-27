import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, Plus } from 'lucide-react'
import ProfileDropdown from './ProfileDropdown'

type Props = {
  onToggleSidebar: () => void
}

// Avatar options matching ProfileDropdown
const avatarOptions = [
  { id: 'avatar-1', gradient: 'from-blue-500 to-cyan-400', emoji: '👤' },
  { id: 'avatar-2', gradient: 'from-purple-500 to-pink-400', emoji: '🎭' },
  { id: 'avatar-3', gradient: 'from-green-500 to-emerald-400', emoji: '🤖' },
  { id: 'avatar-4', gradient: 'from-orange-500 to-red-400', emoji: '🚀' },
  { id: 'avatar-5', gradient: 'from-indigo-500 to-purple-400', emoji: '⭐' },
  { id: 'avatar-6', gradient: 'from-teal-500 to-cyan-400', emoji: '🎨' },
  { id: 'avatar-7', gradient: 'from-yellow-500 to-orange-400', emoji: '🌟' },
  { id: 'avatar-8', gradient: 'from-rose-500 to-pink-400', emoji: '💫' },
]

export default function Topbar({ onToggleSidebar }: Props) {
  const navigate = useNavigate()
  const [userName, setUserName] = useState<string>('User')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userAvatar, setUserAvatar] = useState<string>('avatar-1')
  const [profileOpen, setProfileOpen] = useState(false)
  const profileButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Get user info from localStorage
    const email = localStorage.getItem('user_email') || ''
    const storedName = localStorage.getItem('user_name') || ''
    const storedAvatar = localStorage.getItem('user_avatar') || 'avatar-1'
    
    setUserEmail(email)
    setUserAvatar(storedAvatar)
    
    // If we have a stored name, use it; otherwise extract name from email
    if (storedName) {
      setUserName(storedName)
    } else if (email) {
      // Extract name from email (part before @)
      const nameFromEmail = email.split('@')[0]
      // Capitalize first letter
      const capitalizedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1)
      setUserName(capitalizedName)
    }
  }, [])

  const handleAvatarChange = (avatarId: string) => {
    setUserAvatar(avatarId)
    localStorage.setItem('user_avatar', avatarId)
  }

  const selectedAvatar = avatarOptions.find(av => av.id === userAvatar) || avatarOptions[0]

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3 card-border backdrop-blur">
      <div className="flex items-center gap-2">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white shadow-sm ring-1 ring-white/5 lg:hidden"
          onClick={onToggleSidebar}
        >
          <Menu size={18} />
        </button>
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            placeholder="Search workflows, logs..."
            className="w-72 rounded-xl bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none ring-1 ring-white/5 placeholder:text-slate-500 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate('/app/logs')}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white ring-1 ring-white/5 hover:bg-white/10 transition"
          title="View notifications"
        >
          <Bell size={18} />
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
        </button>
        <button 
          onClick={() => navigate('/app/create')}
          className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:translate-y-[-1px] sm:flex"
        >
          <Plus size={16} />
          Create Workflow
        </button>
        <div className="relative">
          <button
            ref={profileButtonRef}
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${selectedAvatar.gradient} flex items-center justify-center text-sm shadow-lg`}>
              {selectedAvatar.emoji}
            </div>
            <div>
              <p className="text-xs text-slate-400">User</p>
              <p className="text-sm font-semibold">{userName}</p>
            </div>
          </button>
          
          <ProfileDropdown
            isOpen={profileOpen}
            onClose={() => setProfileOpen(false)}
            userName={userName}
            userEmail={userEmail}
            userAvatar={userAvatar}
            onAvatarChange={handleAvatarChange}
            buttonRef={profileButtonRef}
          />
        </div>
      </div>
    </div>
  )
}

