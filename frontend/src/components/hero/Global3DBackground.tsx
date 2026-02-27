import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Float, Line, OrbitControls, Points, PointMaterial, Stars } from '@react-three/drei'
import * as THREE from 'three'

function NodeField() {
  const nodes = useMemo(
    () =>
      Array.from({ length: 14 }, () => new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 12)),
    [],
  )

  const particlePositions = useMemo(() => {
    const pts = Array.from({ length: 420 }, () => [
      (Math.random() - 0.5) * 28,
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 22,
    ])
    return new Float32Array(pts.flat())
  }, [])

  return (
    <>
      <Float speed={1.4} rotationIntensity={1} floatIntensity={0.6}>
        <Line points={nodes} color="#38bdf8" lineWidth={1.1} dashed dashSize={0.7} gapSize={0.5} />
        {nodes.map((point, idx) => (
          <mesh key={idx} position={point}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.45} />
          </mesh>
        ))}
      </Float>

      <Points positions={particlePositions} stride={3} frustumCulled>
        <PointMaterial transparent color="#c084fc" size={0.08} sizeAttenuation depthWrite={false} opacity={0.65} />
      </Points>
    </>
  )
}

export default function Global3DBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-50 w-screen h-screen">
      <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 1.6]} camera={{ position: [0, 0, 14], fov: 60 }} style={{ width: '100%', height: '100%' }}>
        <color attach="background" args={['#030712']} />
        <fog attach="fog" args={['#030712', 14, 32]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 8]} intensity={1.1} color="#7dd3fc" />
        <pointLight position={[-10, -8, -6]} intensity={0.9} color="#a855f7" />

        <Stars radius={180} depth={100} count={5200} factor={3.5} saturation={0} fade speed={0.25} />

        <Float speed={1.1} rotationIntensity={0.6} floatIntensity={0.8}>
          <mesh position={[2, 0, -2]}>
            <icosahedronGeometry args={[3.4, 1]} />
            <meshStandardMaterial
              color="#0ea5e9"
              metalness={0.25}
              roughness={0.1}
              wireframe
              transparent
              opacity={0.12}
              emissive="#22d3ee"
              emissiveIntensity={0.25}
            />
          </mesh>
        </Float>

        <Float speed={1.5} rotationIntensity={0.9} floatIntensity={1.1}>
          <mesh position={[-3.6, 1.2, 1.4]}>
            <dodecahedronGeometry args={[1.4, 0]} />
            <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.4} roughness={0.1} metalness={0.2} />
          </mesh>
          <mesh position={[3.2, -1.4, -0.6]}>
            <sphereGeometry args={[1.1, 36, 36]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.32} roughness={0.08} metalness={0.25} />
          </mesh>
        </Float>

        <NodeField />

        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.4} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b1224]/20 via-[#070d1c]/15 to-[#030712]/30" />
    </div>
  )
}


