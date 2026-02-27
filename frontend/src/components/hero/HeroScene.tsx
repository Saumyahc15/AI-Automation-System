import { Canvas } from '@react-three/fiber'
import { Float, OrbitControls, Sphere, Stars } from '@react-three/drei'

type HeroSceneProps = {
  className?: string
  height?: string
}

export default function HeroScene({ className = '', height = 'h-[360px]' }: HeroSceneProps) {
  return (
    <div className={`${height} w-full overflow-hidden rounded-3xl bg-slate-950/60 card-border ${className}`}>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <color attach="background" args={['#030712']} />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <Stars radius={80} depth={40} count={4000} factor={4} saturation={0} fade />

        <Float speed={1.2} rotationIntensity={1.2} floatIntensity={1.6}>
          <Sphere args={[1.5, 64, 64]} position={[0, 0, 0]}>
            <meshStandardMaterial
              color="#3B82F6"
              metalness={0.25}
              roughness={0.2}
              wireframe
              transparent
              opacity={0.8}
            />
          </Sphere>
        </Float>

        <Float speed={1.8} rotationIntensity={1.4} floatIntensity={2}>
          <Sphere args={[0.8, 32, 32]} position={[-2, 1.2, 1]}>
            <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.4} roughness={0.1} />
          </Sphere>
        </Float>

        <Float speed={2.1} rotationIntensity={1.6} floatIntensity={2.2}>
          <Sphere args={[0.6, 32, 32]} position={[2.2, -0.8, -1]}>
            <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.5} roughness={0.1} />
          </Sphere>
        </Float>

        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  )
}

