import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface BlobProps {
  initialX: number
  initialY: number
  delay: number
  color: string
  size: number
  borderRadius: string
  eyesOffset: { x: number; y: number }
  mouthOffset: { x: number; y: number }
  loginState: 'success' | 'error' | null
  formState?: 'typing' | 'filled' | null
  focusedField?: string | null
}

function Blob({ initialX, initialY, delay, color, size, borderRadius, eyesOffset, mouthOffset, loginState, formState, focusedField }: BlobProps) {
  const blobRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(initialX)
  const y = useMotionValue(initialY)
  const eyeX = useMotionValue(0)
  const eyeY = useMotionValue(0)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Blob movement springs
  const springX = useSpring(x, { stiffness: 50, damping: 25 })
  const springY = useSpring(y, { stiffness: 50, damping: 25 })
  
  // Eye movement springs (faster, more responsive)
  const springEyeX = useSpring(eyeX, { stiffness: 150, damping: 20 })
  const springEyeY = useSpring(eyeY, { stiffness: 150, damping: 20 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!blobRef.current) return
      
      const rect = blobRef.current.getBoundingClientRect()
      const blobCenterX = rect.left + rect.width / 2
      const blobCenterY = rect.top + rect.height / 2
      
      // Calculate direction from blob center to cursor
      const deltaX = e.clientX - blobCenterX
      const deltaY = e.clientY - blobCenterY
      
      // Move blob towards cursor (moderate movement)
      const blobSpeed = 0.12
      x.set(initialX + deltaX * blobSpeed)
      y.set(initialY + deltaY * blobSpeed)
      
      // Eye movement relative to blob center (independent, smaller range)
      const maxEyeMovement = 6
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const normalizedX = distance > 0 ? (deltaX / distance) * Math.min(distance * 0.08, maxEyeMovement) : 0
      const normalizedY = distance > 0 ? (deltaY / distance) * Math.min(distance * 0.08, maxEyeMovement) : 0
      
      eyeX.set(normalizedX)
      eyeY.set(normalizedY)
      
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [initialX, initialY, x, y, eyeX, eyeY, mouseX, mouseY])

  // Determine mouth expression based on login state and form state
  const getMouthPath = () => {
    if (loginState === 'success') {
      // Happy/smile mouth (upturned)
      return "M 2 10 Q 12 16 22 10"
    } else if (loginState === 'error') {
      // "No" expression - X or straight line
      return "M 2 10 L 22 10"
    } else if (formState === 'filled') {
      // Excited/happy when all fields filled (wider smile)
      return "M 2 10 Q 12 18 22 10"
    } else if (formState === 'typing') {
      // Interested/curious when typing (neutral to slightly happy)
      return "M 2 10 Q 12 12 22 10"
    } else if (focusedField === 'full_name') {
      // Curious when typing name
      return "M 2 9 Q 12 11 22 9"
    } else if (focusedField === 'email') {
      // Interested when typing email
      return "M 2 9.5 Q 12 11.5 22 9.5"
    } else if (focusedField === 'password') {
      // Focused when typing password
      return "M 2 9 Q 12 10 22 9"
    } else {
      // Default sad mouth (downturned)
      return "M 2 8 Q 12 2 22 8"
    }
  }
  
  // Determine eye expression
  const getEyeExpression = () => {
    if (loginState === 'error') {
      return 'x' // X eyes for error
    } else if (formState === 'filled') {
      return 'excited' // Bigger, more excited eyes
    } else if (formState === 'typing' || focusedField) {
      return 'interested' // Slightly bigger eyes
    } else {
      return 'normal' // Normal eyes
    }
  }

  return (
    <motion.div
      ref={blobRef}
      style={{
        x: springX,
        y: springY,
      }}
      className="absolute"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: 1, 
        scale: loginState === 'error' ? 0.85 : 1,
      }}
      transition={{ delay, duration: 0.6, type: "spring" }}
    >
      <motion.div
        className="relative shadow-2xl"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          borderRadius: borderRadius,
          filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.2))',
        }}
        animate={{
          borderRadius: [
            borderRadius,
            borderRadius.split(' ').map((val, i) => {
              const num = parseFloat(val)
              return i % 2 === 0 ? `${num * 0.8}%` : `${num * 1.2}%`
            }).join(' '),
            borderRadius,
          ],
          scale: loginState === 'error' ? [1, 0.9, 1] : 1,
        }}
        transition={{
          borderRadius: {
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          },
          scale: loginState === 'error' ? {
            duration: 0.3,
            repeat: 2,
            ease: "easeInOut",
          } : undefined,
        }}
      >
        {/* Eyes - only these move with cursor */}
        <motion.div
          className="absolute"
          style={{
            left: `calc(50% + ${eyesOffset.x}px)`,
            top: `calc(50% + ${eyesOffset.y}px)`,
            x: springEyeX,
            y: springEyeY,
          }}
        >
          <div className="flex gap-2">
            {getEyeExpression() === 'x' ? (
              // X eyes for "no" reaction
              <>
                <motion.div
                  className="relative"
                  style={{ width: '12px', height: '12px' }}
                  animate={{
                    rotate: [0, -45, 0, 45, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: 2,
                    ease: "easeInOut",
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-white rotate-45 absolute" />
                    <div className="w-full h-0.5 bg-white -rotate-45 absolute" />
                  </div>
                </motion.div>
                <motion.div
                  className="relative"
                  style={{ width: '12px', height: '12px' }}
                  animate={{
                    rotate: [0, 45, 0, -45, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: 2,
                    ease: "easeInOut",
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-white rotate-45 absolute" />
                    <div className="w-full h-0.5 bg-white -rotate-45 absolute" />
                  </div>
                </motion.div>
              </>
            ) : (
              // Normal, interested, or excited eyes
              <>
                <motion.div
                  className="rounded-full bg-white"
                  style={{ 
                    width: getEyeExpression() === 'excited' ? '14px' : getEyeExpression() === 'interested' ? '13px' : '12px',
                    height: getEyeExpression() === 'excited' ? '14px' : getEyeExpression() === 'interested' ? '13px' : '12px',
                  }}
                  animate={
                    loginState === 'success' 
                      ? { scale: [1, 1.2, 1] }
                      : formState === 'filled'
                      ? { scale: [1, 1.15, 1, 1.15, 1] }
                      : formState === 'typing'
                      ? { scale: [1, 1.1, 1] }
                      : {}
                  }
                  transition={{
                    duration: loginState === 'success' ? 0.3 : formState === 'filled' ? 0.8 : formState === 'typing' ? 0.5 : 0,
                    repeat: loginState === 'success' ? 2 : formState === 'filled' ? Infinity : formState === 'typing' ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="rounded-full bg-white"
                  style={{ 
                    width: getEyeExpression() === 'excited' ? '14px' : getEyeExpression() === 'interested' ? '13px' : '12px',
                    height: getEyeExpression() === 'excited' ? '14px' : getEyeExpression() === 'interested' ? '13px' : '12px',
                  }}
                  animate={
                    loginState === 'success' 
                      ? { scale: [1, 1.2, 1] }
                      : formState === 'filled'
                      ? { scale: [1, 1.15, 1, 1.15, 1] }
                      : formState === 'typing'
                      ? { scale: [1, 1.1, 1] }
                      : {}
                  }
                  transition={{
                    duration: loginState === 'success' ? 0.3 : formState === 'filled' ? 0.8 : formState === 'typing' ? 0.5 : 0,
                    repeat: loginState === 'success' ? 2 : formState === 'filled' ? Infinity : formState === 'typing' ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                />
              </>
            )}
          </div>
        </motion.div>

        {/* Mouth - changes based on login state */}
        <motion.svg
          className="absolute"
          style={{
            left: `calc(50% + ${mouthOffset.x}px)`,
            top: `calc(50% + ${mouthOffset.y}px)`,
            transform: 'translate(-50%, -50%)',
          }}
          width="24"
          height="16"
          viewBox="0 0 24 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            d={getMouthPath()}
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            animate={{
              d: loginState === 'success' 
                ? ["M 2 10 Q 12 16 22 10", "M 2 10 Q 12 18 22 10", "M 2 10 Q 12 16 22 10"]
                : loginState === 'error'
                ? ["M 2 10 L 22 10", "M 2 10 L 22 10"]
                : formState === 'filled'
                ? ["M 2 10 Q 12 18 22 10", "M 2 10 Q 12 19 22 10", "M 2 10 Q 12 18 22 10"]
                : formState === 'typing'
                ? ["M 2 10 Q 12 12 22 10", "M 2 10 Q 12 13 22 10", "M 2 10 Q 12 12 22 10"]
                : focusedField === 'full_name'
                ? ["M 2 9 Q 12 11 22 9", "M 2 9 Q 12 12 22 9", "M 2 9 Q 12 11 22 9"]
                : focusedField === 'email'
                ? ["M 2 9.5 Q 12 11.5 22 9.5", "M 2 9.5 Q 12 12.5 22 9.5", "M 2 9.5 Q 12 11.5 22 9.5"]
                : focusedField === 'password'
                ? ["M 2 9 Q 12 10 22 9", "M 2 9 Q 12 11 22 9", "M 2 9 Q 12 10 22 9"]
                : ["M 2 8 Q 12 2 22 8", "M 2 9 Q 12 3 22 9", "M 2 8 Q 12 2 22 8"],
            }}
            transition={{
              duration: loginState === 'success' ? 0.5 
                : loginState === 'error' ? 0.3 
                : formState === 'filled' ? 1.5
                : formState === 'typing' ? 1
                : focusedField ? 0.8
                : 3,
              repeat: loginState === 'success' ? 2 
                : loginState === 'error' ? 0 
                : formState === 'filled' ? Infinity
                : formState === 'typing' ? Infinity
                : focusedField ? Infinity
                : Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.svg>

        {/* Face shrink effect on error */}
        {loginState === 'error' && (
          <motion.div
            className="absolute inset-0 rounded-full bg-white/10"
            initial={{ scale: 1 }}
            animate={{
              scale: [1, 0.7, 1],
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: 1,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.div>
    </motion.div>
  )
}

interface CursorFollowersProps {
  loginState?: 'success' | 'error' | null
  formState?: 'typing' | 'filled' | null
  focusedField?: string | null
}

export default function CursorFollowers({ loginState = null, formState = null, focusedField = null }: CursorFollowersProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Blob configurations matching the design
  const blobs = [
    {
      x: 120,
      y: 180,
      delay: 0,
      color: '#a855f7', // Purple
      size: 160,
      borderRadius: '30% 70% 50% 50% / 40% 60% 40% 60%',
      eyesOffset: { x: -15, y: -20 },
      mouthOffset: { x: 0, y: 15 },
    },
    {
      x: 180,
      y: 380,
      delay: 0.15,
      color: '#f59e0b', // Orange
      size: 140,
      borderRadius: '60% 40% 60% 40% / 70% 30% 70% 30%',
      eyesOffset: { x: -12, y: -18 },
      mouthOffset: { x: 0, y: 12 },
    },
    {
      x: 100,
      y: 520,
      delay: 0.3,
      color: '#1a1a1a', // Black
      size: 120,
      borderRadius: '50% 50% 50% 50% / 50% 50% 50% 50%',
      eyesOffset: { x: -10, y: -15 },
      mouthOffset: { x: 0, y: 10 },
    },
    {
      x: 220,
      y: 280,
      delay: 0.45,
      color: '#eab308', // Yellow
      size: 130,
      borderRadius: '70% 30% 70% 30% / 60% 40% 60% 40%',
      eyesOffset: { x: -12, y: -16 },
      mouthOffset: { x: 0, y: 12 },
    },
  ]

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed left-0 top-0 h-full w-1/2 overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {blobs.map((blob, index) => (
        <Blob
          key={index}
          initialX={blob.x}
          initialY={blob.y}
          delay={blob.delay}
          color={blob.color}
          size={blob.size}
          borderRadius={blob.borderRadius}
          eyesOffset={blob.eyesOffset}
          mouthOffset={blob.mouthOffset}
          loginState={loginState}
          formState={formState}
          focusedField={focusedField}
        />
      ))}
      
      {/* Additional floating particles for ambiance */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${15 + Math.random() * 20}px`,
            height: `${15 + Math.random() * 20}px`,
            backgroundColor: ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b'][i % 4],
            left: `${Math.random() * 30}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, Math.random() * 30 - 15, 0],
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
