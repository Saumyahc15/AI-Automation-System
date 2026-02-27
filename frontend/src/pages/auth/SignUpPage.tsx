import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { User, Mail, LockKeyhole, Sparkles } from 'lucide-react'
import { useRegister } from '../../lib/hooks'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sphere, Stars } from '@react-three/drei'
import * as THREE from 'three'
import CursorFollowers from '../../components/animations/CursorFollowers'

// Floating particles component
function FloatingParticles() {
  const particles = useRef<THREE.Points>(null)
  
  useFrame((state) => {
    if (particles.current) {
      particles.current.rotation.x = state.clock.elapsedTime * 0.1
      particles.current.rotation.y = state.clock.elapsedTime * 0.15
    }
  })

  const particleCount = 200
  const positions = new Float32Array(particleCount * 3)
  
  for (let i = 0; i < particleCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 20
  }

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#3b82f6" transparent opacity={0.6} />
    </points>
  )
}

// 3D Background Scene
function SignUpBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <color attach="background" args={['#030712']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#3b82f6" />
        <pointLight position={[-10, -10, -10]} intensity={0.8} color="#8b5cf6" />
        
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
        
        <FloatingParticles />
        
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.8}>
          <Sphere args={[0.8, 32, 32]} position={[-3, 2, -2]}>
            <meshStandardMaterial
              color="#3b82f6"
              emissive="#3b82f6"
              emissiveIntensity={0.3}
              transparent
              opacity={0.4}
            />
          </Sphere>
        </Float>
        
        <Float speed={2} rotationIntensity={0.7} floatIntensity={1}>
          <Sphere args={[0.6, 32, 32]} position={[3, -2, -1]}>
            <meshStandardMaterial
              color="#8b5cf6"
              emissive="#8b5cf6"
              emissiveIntensity={0.4}
              transparent
              opacity={0.5}
            />
          </Sphere>
        </Float>
        
        <Float speed={1.8} rotationIntensity={0.6} floatIntensity={0.9}>
          <Sphere args={[0.5, 32, 32]} position={[0, 3, -3]}>
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={0.35}
              transparent
              opacity={0.45}
            />
          </Sphere>
        </Float>
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/60 to-slate-950/80" />
    </div>
  )
}

export default function SignUpPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  })
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [signupState, setSignupState] = useState<'success' | 'error' | null>(null)
  const [formState, setFormState] = useState<'typing' | 'filled' | null>(null)

  const registerMutation = useRegister()

  // Mouse tracking for 3D tilt effect
  const cardRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) / rect.width)
    y.set((e.clientY - centerY) / rect.height)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value,
      }
      
      // Check if all fields are filled
      const allFilled = newData.full_name.trim() !== '' && 
                       newData.email.trim() !== '' && 
                       newData.password.trim() !== ''
      
      if (allFilled) {
        setFormState('filled')
      } else if (value.trim() !== '') {
        setFormState('typing')
      } else {
        setFormState(null)
      }
      
      return newData
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!formData.full_name || !formData.email || !formData.password) {
      setError('Please fill in all fields')
      setSignupState('error')
      setLoading(false)
      setTimeout(() => setSignupState(null), 2000)
      return
    }

    if (!agreeToTerms) {
      setError('Please agree to the terms and privacy policy')
      setSignupState('error')
      setLoading(false)
      setTimeout(() => setSignupState(null), 2000)
      return
    }

    // Password validation
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setSignupState('error')
      setLoading(false)
      setTimeout(() => setSignupState(null), 2000)
      return
    }

    try {
      const result = await registerMutation.mutateAsync(formData) as any
      
      // Success - blobs smile
      setSignupState('success')
      
      // Store user ID in localStorage
      localStorage.setItem('user_id', String(result.id))
      localStorage.setItem('user_email', result.email)
      // Store user name (full_name if available, otherwise extract from email)
      const userName = result.full_name || result.email?.split('@')[0] || 'User'
      localStorage.setItem('user_name', userName)
      // Store avatar from backend (default to avatar-1 if not set)
      if (result.avatar) {
        localStorage.setItem('user_avatar', result.avatar)
      } else {
        localStorage.setItem('user_avatar', 'avatar-1')
      }
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/app/overview')
      }, 2000) // Give time to see the smile animation
      
    } catch (err: any) {
      // Error - blobs show "no" reaction and shrink
      setSignupState('error')
      setError(err.message || 'Registration failed. Please try again.')
      setLoading(false)
      
      // Reset error state after animation
      setTimeout(() => {
        setSignupState(null)
      }, 2000)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  }

  return (
    <div className="relative flex min-h-screen items-center justify-start overflow-hidden px-4 py-10 text-white">
      <SignUpBackground />
      <CursorFollowers loginState={signupState} formState={formState} focusedField={focusedField} />
      
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-5">
        <motion.div
          className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 ml-[45%] w-full max-w-md space-y-6 rounded-3xl bg-white/5 p-8 ring-1 ring-white/10 backdrop-blur-2xl shadow-2xl shadow-blue-500/10"
      >
        {/* Glowing border effect */}
        <div className="pointer-events-none absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
        
        <motion.div variants={itemVariants} className="space-y-4">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-4 py-2 text-sm"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles size={16} className="text-blue-400" />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-semibold">
              Create account
            </span>
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
            Join NovaOps
          </h1>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.label
            variants={itemVariants}
            className={`group relative flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 transition-all duration-300 ${
              focusedField === 'full_name'
                ? 'ring-blue-500/50 bg-white/10 shadow-lg shadow-blue-500/20'
                : 'ring-white/10 hover:ring-white/20'
            }`}
          >
            <User size={18} className={`transition-colors ${focusedField === 'full_name' ? 'text-blue-400' : 'text-slate-400'}`} />
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              onFocus={() => setFocusedField('full_name')}
              onBlur={() => setFocusedField(null)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Full name"
            />
            {focusedField === 'full_name' && (
              <motion.div
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </motion.label>

          <motion.label
            variants={itemVariants}
            className={`group relative flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 transition-all duration-300 ${
              focusedField === 'email'
                ? 'ring-blue-500/50 bg-white/10 shadow-lg shadow-blue-500/20'
                : 'ring-white/10 hover:ring-white/20'
            }`}
          >
            <Mail size={18} className={`transition-colors ${focusedField === 'email' ? 'text-blue-400' : 'text-slate-400'}`} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="you@email.com"
            />
            {focusedField === 'email' && (
              <motion.div
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </motion.label>

          <motion.label
            variants={itemVariants}
            className={`group relative flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 transition-all duration-300 ${
              focusedField === 'password'
                ? 'ring-blue-500/50 bg-white/10 shadow-lg shadow-blue-500/20'
                : 'ring-white/10 hover:ring-white/20'
            }`}
          >
            <LockKeyhole size={18} className={`transition-colors ${focusedField === 'password' ? 'text-blue-400' : 'text-slate-400'}`} />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Create password"
            />
            {focusedField === 'password' && (
              <motion.div
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </motion.label>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20"
            >
              {error}
            </motion.div>
          )}

          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 text-sm text-slate-400"
          >
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 cursor-pointer group-hover:border-blue-500 transition-colors"
              />
              <span className="group-hover:text-white transition-colors">I agree to the terms and privacy policy</span>
            </label>
          </motion.div>

          <motion.button
            variants={itemVariants}
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600"
              initial={{ x: '-100%' }}
              animate={loading ? { x: '100%' } : { x: '-100%' }}
              transition={{ duration: 2, repeat: loading ? Infinity : 0 }}
            />
            <span className="relative z-10">{loading ? 'Creating account...' : 'Create account'}</span>
          </motion.button>
        </form>

        <motion.p
          variants={itemVariants}
          className="text-center text-sm text-slate-400"
        >
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Login
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
