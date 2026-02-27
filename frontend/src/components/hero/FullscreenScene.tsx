import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Float, Stars, Line, OrbitControls, Sphere } from '@react-three/drei'
import * as THREE from 'three'

type FullscreenSceneProps = {
  className?: string
  fixed?: boolean
  interactive?: boolean
}

export default function FullscreenScene({ className = '', fixed = true, interactive = true }: FullscreenSceneProps) {
  const connections = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 12; i++) {
      pts.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 10,
        ),
      )
    }
    return pts
  }, [])

  const positionClass = fixed ? 'fixed inset-0' : 'absolute inset-0'

  return (
    <div className={`pointer-events-none ${positionClass} -z-10 w-screen h-screen ${className}`}>
      <Canvas
        gl={{ antialias: true }}
        dpr={[1, 1.8]}
        camera={{ position: [0, 0, 9], fov: 52 }}
        style={{ pointerEvents: interactive ? 'auto' : 'none' }}
      >
        <color attach="background" args={['#050716']} />
        <fog attach="fog" args={['#050716', 10, 28]} />
        <ambientLight intensity={0.55} />
        <pointLight position={[6, 6, 6]} intensity={1.3} color="#7dd3fc" />
        <pointLight position={[-6, -4, -6]} intensity={1} color="#c084fc" />
        <Stars radius={120} depth={80} count={4200} factor={4.2} saturation={0} fade speed={0.25} />

        <Float speed={1.4} rotationIntensity={1.2} floatIntensity={0.9}>
          <Sphere args={[2.4, 64, 64]}>
            <meshStandardMaterial
              color="#0ea5e9"
              metalness={0.25}
              roughness={0.12}
              emissive="#22d3ee"
              emissiveIntensity={0.18}
              wireframe
              transparent
              opacity={0.3}
            />
          </Sphere>
        </Float>

        <Float speed={1.6} rotationIntensity={1.3} floatIntensity={1.2}>
          <Sphere args={[1.1, 32, 32]} position={[-3.4, 1.6, 1]}>
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} roughness={0.08} />
          </Sphere>
          <Sphere args={[0.9, 32, 32]} position={[3.3, -1.4, -1.1]}>
            <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.55} roughness={0.08} />
          </Sphere>
        </Float>

        <group>
          <Line points={connections} color="#38bdf8" lineWidth={1.4} dashed dashSize={0.6} gapSize={0.4} />
          {connections.map((p, idx) => (
            <mesh key={idx} position={p}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.6} />
            </mesh>
          ))}
        </group>

        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.4} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050716]/35 via-[#050716]/35 to-[#050716]/78" />
    </div>
  )
}


