import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, LogOut, Settings, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../lib/api-client'

interface ProfileDropdownProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  userEmail: string
  userAvatar: string
  onAvatarChange: (avatar: string) => void
  buttonRef: React.RefObject<HTMLButtonElement>
}

// Avatar options with gradient backgrounds
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

export default function ProfileDropdown({
  isOpen,
  onClose,
  userName,
  userEmail,
  userAvatar,
  onAvatarChange,
  buttonRef,
}: ProfileDropdownProps) {
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userId = localStorage.getItem('user_id') || 'N/A'
  const [position, setPosition] = useState({ top: 0, right: 0 })

  // Calculate dropdown position based on button position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: buttonRect.bottom + window.scrollY + 8,
        right: window.innerWidth - buttonRect.right,
      })
    }
  }, [isOpen, buttonRef])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, buttonRef])

  const handleLogout = () => {
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_name')
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_avatar')
    navigate('/login')
  }

  const selectedAvatar = avatarOptions.find(av => av.id === userAvatar) || avatarOptions[0]

  if (!isOpen) return null

  const dropdownContent = (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          right: `${position.right}px`,
        }}
        className="z-[101] w-80 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
      >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Profile</h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
              
              {/* User Avatar and Info */}
              <div className="flex items-center gap-4">
                <div className={`h-16 w-16 rounded-full bg-gradient-to-br ${selectedAvatar.gradient} flex items-center justify-center text-2xl shadow-lg`}>
                  {selectedAvatar.emoji}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{userName}</p>
                  <p className="text-xs text-slate-400 mt-1">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Avatar Selection */}
            <div className="p-6 border-b border-white/10">
              <h4 className="text-sm font-semibold text-white mb-3">Choose Avatar</h4>
              <div className="grid grid-cols-4 gap-3">
                {avatarOptions.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={async () => {
                      const userId = localStorage.getItem('user_id')
                      if (userId) {
                        try {
                          // Save avatar to backend
                          await apiClient.updateUserProfile(parseInt(userId, 10), {
                            avatar: avatar.id
                          })
                          // Update local state and storage
                          onAvatarChange(avatar.id)
                          localStorage.setItem('user_avatar', avatar.id)
                        } catch (error) {
                          console.error('Failed to update avatar:', error)
                          // Still update locally even if backend fails
                          onAvatarChange(avatar.id)
                          localStorage.setItem('user_avatar', avatar.id)
                        }
                      } else {
                        // Fallback if no user ID (shouldn't happen)
                        onAvatarChange(avatar.id)
                        localStorage.setItem('user_avatar', avatar.id)
                      }
                    }}
                    className={`relative h-12 w-12 rounded-full bg-gradient-to-br ${avatar.gradient} flex items-center justify-center text-xl transition-all hover:scale-110 ${
                      userAvatar === avatar.id
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-slate-900 scale-110'
                        : 'hover:ring-2 hover:ring-white/20'
                    }`}
                  >
                    {avatar.emoji}
                    {userAvatar === avatar.id && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary border-2 border-slate-900" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* User Information */}
            <div className="p-6 border-b border-white/10 space-y-3">
              <h4 className="text-sm font-semibold text-white mb-3">Account Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <User size={16} className="text-slate-400" />
                  <div>
                    <p className="text-slate-400 text-xs">Full Name</p>
                    <p className="text-white">{userName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-slate-400" />
                  <div>
                    <p className="text-slate-400 text-xs">Email</p>
                    <p className="text-white">{userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center">
                    <span className="text-[8px] text-primary">ID</span>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">User ID</p>
                    <p className="text-white font-mono text-xs">{userId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  navigate('/app/settings')
                  onClose()
                }}
                className="w-full flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
              >
                <Settings size={16} />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </motion.div>
    </>
  )

  // Render using portal to avoid overflow issues
  return createPortal(
    <AnimatePresence>
      {isOpen && dropdownContent}
    </AnimatePresence>,
    document.body
  )
}

