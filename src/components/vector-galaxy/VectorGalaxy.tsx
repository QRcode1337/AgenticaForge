import { Canvas, useFrame, extend } from '@react-three/fiber'
import { OrbitControls, Html, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useState, useRef, useMemo } from 'react'
import { useMemory } from '../../hooks/use-memory.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VectorPointData {
  id: string
  label: string
  position: [number, number, number]
  cluster: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLUSTER_COLORS: Record<number, string> = {
  0: '#22C55E',
  1: '#3B82F6',
  2: '#F59E0B',
  3: '#A855F7',
}

const CLUSTER_NAMES: Record<number, string> = {
  0: 'Memory Patterns',
  1: 'Tool Actions',
  2: 'Reward Signals',
  3: 'Decision Trees',
}

const NAMESPACE_CLUSTERS: Record<string, number> = {
  reasoning: 0,
  tools: 1,
  memory: 2,
  signals: 3,
  research: 0,
  analysis: 2,
  reports: 3,
}

// ---------------------------------------------------------------------------
// Custom Shader: Gradient Orb (3D radial gradient sphere)
// ---------------------------------------------------------------------------

const GradientOrbMaterial = shaderMaterial(
  {
    uColor: new THREE.Color('#22C55E'),
    uIntensity: 0.5,
    uTime: 0,
  },
  // Vertex shader
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vUv = uv;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment shader
  /* glsl */ `
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uTime;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      // Fresnel rim glow
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = 1.0 - abs(dot(viewDir, vNormal));
      fresnel = pow(fresnel, 2.5);

      // Core-to-edge gradient: bright center, fading to rim
      float coreBrightness = 1.0 - fresnel;
      coreBrightness = pow(coreBrightness, 0.6);

      // Subtle pulse
      float pulse = 1.0 + sin(uTime * 2.0) * 0.05 * uIntensity;

      // Core color (brighter, whiter)
      vec3 coreColor = mix(uColor, vec3(1.0), 0.6);
      // Edge color (deeper, saturated)
      vec3 edgeColor = uColor * 0.3;

      // Final gradient
      vec3 finalColor = mix(edgeColor, coreColor, coreBrightness) * pulse;

      // Add rim glow
      finalColor += uColor * fresnel * uIntensity * 1.5;

      // Inner glow emission
      float emission = coreBrightness * uIntensity * 0.8;
      finalColor += uColor * emission;

      gl_FragColor = vec4(finalColor, 0.95);
    }
  `,
)

extend({ GradientOrbMaterial })

// TypeScript declaration
declare module '@react-three/fiber' {
  interface ThreeElements {
    gradientOrbMaterial: {
      ref?: React.Ref<THREE.ShaderMaterial & { uColor: THREE.Color; uIntensity: number; uTime: number }>
      uColor?: THREE.Color
      uIntensity?: number
      uTime?: number
      transparent?: boolean
      depthWrite?: boolean
    }
  }
}

// ---------------------------------------------------------------------------
// Custom Shader: Nebula Background
// ---------------------------------------------------------------------------

const NebulaMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor1: new THREE.Color('#0a0618'),
    uColor2: new THREE.Color('#120a2a'),
    uColor3: new THREE.Color('#0d1a2f'),
    uColor4: new THREE.Color('#1a0a28'),
  },
  // Vertex shader
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    // Simplex-style noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    float fbm(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return value;
    }

    void main() {
      vec3 pos = vWorldPos * 0.04;
      float t = uTime * 0.015;

      // Layered nebula clouds
      float n1 = fbm(pos + vec3(t, 0.0, t * 0.5));
      float n2 = fbm(pos * 1.5 + vec3(-t * 0.7, t * 0.3, 0.0));
      float n3 = fbm(pos * 0.7 + vec3(0.0, -t * 0.4, t * 0.8));

      // Remap noise to 0-1 range
      n1 = n1 * 0.5 + 0.5;
      n2 = n2 * 0.5 + 0.5;
      n3 = n3 * 0.5 + 0.5;

      // Mix nebula colors
      vec3 nebulaColor = mix(uColor1, uColor2, n1);
      nebulaColor = mix(nebulaColor, uColor3, n2 * 0.6);
      nebulaColor = mix(nebulaColor, uColor4, n3 * 0.4);

      // Subtle bright wisps
      float wisps = pow(n1 * n2, 3.0) * 2.0;
      vec3 wispColor = mix(vec3(0.15, 0.05, 0.25), vec3(0.05, 0.12, 0.25), n3);
      nebulaColor += wispColor * wisps;

      // Dim star-like sparkle
      float sparkle = pow(snoise(pos * 8.0 + t * 0.1), 8.0) * 0.15;
      nebulaColor += vec3(sparkle);

      // Very subtle vignette from center
      float dist = length(vUv - 0.5) * 2.0;
      nebulaColor *= 1.0 - dist * 0.3;

      gl_FragColor = vec4(nebulaColor, 1.0);
    }
  `,
)

extend({ NebulaMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    nebulaMaterial: {
      ref?: React.Ref<THREE.ShaderMaterial & { uTime: number }>
      uTime?: number
      uColor1?: THREE.Color
      uColor2?: THREE.Color
      uColor3?: THREE.Color
      uColor4?: THREE.Color
      side?: THREE.Side
    }
  }
}

// ---------------------------------------------------------------------------
// Mock data generator (Fallback)
// ---------------------------------------------------------------------------

function generateMockData(): VectorPointData[] {
  const clusters: { center: [number, number, number]; labels: string[] }[] = [
    {
      center: [2, 2, 1],
      labels: ['session-recall', 'ctx-merge', 'long-term-enc', 'retrieval-cue'],
    },
    {
      center: [-2, 1, -1],
      labels: ['tool-select', 'action-dispatch', 'invoke-chain', 'fallback-route'],
    },
  ]
  const pseudoRandom = (seed: number): number => {
    const x = Math.sin(seed * 9301 + 49297) * 49297
    return x - Math.floor(x)
  }
  const points: VectorPointData[] = []
  let seed = 0
  clusters.forEach((cluster, clusterIdx) => {
    cluster.labels.forEach((label) => {
      points.push({
        id: `vec-${clusterIdx}-${++seed}`,
        label,
        position: [
          cluster.center[0] + (pseudoRandom(seed++) - 0.5) * 2,
          cluster.center[1] + (pseudoRandom(seed++) - 0.5) * 2,
          cluster.center[2] + (pseudoRandom(seed++) - 0.5) * 2,
        ],
        cluster: clusterIdx,
      })
    })
  })
  return points
}

// ---------------------------------------------------------------------------
// Helper: compute cluster centers
// ---------------------------------------------------------------------------

function computeClusterCenters(points: VectorPointData[]): Record<number, [number, number, number]> {
  const sums: Record<number, { x: number; y: number; z: number; n: number }> = {}
  for (const p of points) {
    if (!sums[p.cluster]) sums[p.cluster] = { x: 0, y: 0, z: 0, n: 0 }
    sums[p.cluster].x += p.position[0]
    sums[p.cluster].y += p.position[1]
    sums[p.cluster].z += p.position[2]
    sums[p.cluster].n += 1
  }
  const centers: Record<number, [number, number, number]> = {}
  for (const [id, s] of Object.entries(sums)) {
    centers[Number(id)] = [s.x / s.n, s.y / s.n, s.z / s.n]
  }
  return centers
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NebulaBackground() {
  const matRef = useRef<THREE.ShaderMaterial & { uTime: number }>(null)
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uTime = clock.getElapsedTime()
  })
  return (
    <mesh>
      <sphereGeometry args={[60, 64, 64]} />
      <nebulaMaterial
        ref={matRef}
        uTime={0}
        uColor1={new THREE.Color('#0a0618')}
        uColor2={new THREE.Color('#120a2a')}
        uColor3={new THREE.Color('#0d1a2f')}
        uColor4={new THREE.Color('#1a0a28')}
        side={THREE.BackSide}
      />
    </mesh>
  )
}

function VoidParticles() {
  const particlesRef = useRef<THREE.Points>(null)
  const count = 300
  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const sz = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 5 + Math.random() * 35
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      sz[i] = 0.5 + Math.random() * 1.5
    }
    return { positions: pos, sizes: sz }
  }, [])
  useFrame(({ clock }) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = clock.getElapsedTime() * 0.003
      particlesRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.005) * 0.02
    }
  })
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial color="#2a1f4e" size={0.08} transparent opacity={0.4} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function VectorPoint({ point, clusterCenter }: { point: VectorPointData; clusterCenter: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial & { uColor: THREE.Color; uIntensity: number; uTime: number }>(null)
  const [hovered, setHovered] = useState(false)
  const color = CLUSTER_COLORS[point.cluster] ?? '#ffffff'
  const threeColor = useMemo(() => new THREE.Color(color), [color])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (matRef.current) {
      matRef.current.uTime = t
      matRef.current.uIntensity = hovered ? 1.2 : 0.6
    }
    if (meshRef.current) {
      meshRef.current.scale.setScalar(hovered ? 1.6 + Math.sin(t * 4) * 0.15 : 1)
    }
  })

  const radialGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([point.position[0], point.position[1], point.position[2], clusterCenter[0] ?? 0, clusterCenter[1] ?? 0, clusterCenter[2] ?? 0], 3))
    return geo
  }, [point.position, clusterCenter])

  return (
    <group>
      <lineSegments geometry={radialGeometry}>
        <lineBasicMaterial color={threeColor} transparent opacity={0.08} depthWrite={false} />
      </lineSegments>
      <mesh position={point.position} scale={hovered ? 2.5 : 1.8}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial color={threeColor.clone().multiplyScalar(0.3)} transparent opacity={hovered ? 0.15 : 0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={meshRef} position={point.position} onPointerOver={(e) => (e.stopPropagation(), setHovered(true))} onPointerOut={() => setHovered(false)}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <gradientOrbMaterial ref={matRef} uColor={threeColor} uIntensity={0.6} uTime={0} transparent depthWrite={false} />
        {hovered && (
          <Html distanceFactor={8} center style={{ pointerEvents: 'none' }}>
            <div className="whitespace-nowrap bg-forge-bg/95 border border-forge-border rounded-none px-3 py-2 font-mono text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block h-2 w-2 rounded-none" style={{ backgroundColor: color }} />
                <span className="text-forge-dim uppercase tracking-wider text-[9px]">{CLUSTER_NAMES[point.cluster]}</span>
              </div>
              <span className="text-forge-text">{point.label}</span>
            </div>
          </Html>
        )}
      </mesh>
    </group>
  )
}

function Scene({ points }: { points: VectorPointData[] }) {
  const clusterCenters = useMemo(() => computeClusterCenters(points), [points])
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={0.6} color="#4a3a7a" />
      <NebulaBackground />
      <VoidParticles />
      {points.map((p) => (
        <VectorPoint key={p.id} point={p} clusterCenter={clusterCenters[p.cluster]} />
      ))}
      <OrbitControls enableDamping dampingFactor={0.12} minDistance={3} maxDistance={20} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function VectorGalaxy() {
  const { vectorPoints, stats } = useMemory()

  const points: VectorPointData[] = useMemo(() => {
    if (vectorPoints.length >= 4) {
      return vectorPoints.map((p) => ({
        id: p.id,
        label: p.label,
        position: p.position,
        cluster: NAMESPACE_CLUSTERS[p.namespace] ?? 0,
      }))
    }
    return generateMockData()
  }, [vectorPoints])

  return (
    <div className="relative h-full w-full bg-[#050310]">
      <div className="absolute left-4 top-4 z-10 border border-forge-border bg-forge-bg/90 rounded-none p-3">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-forge-text">VECTOR GALAXY</h2>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-forge-dim">REAL-TIME EMBEDDING SPACE</p>
      </div>

      <div className="absolute right-4 top-4 z-10 border border-forge-border bg-forge-bg/90 rounded-none p-3">
        <ul className="space-y-1.5">
          {Object.entries(CLUSTER_NAMES).map(([id, name]) => (
            <li key={id} className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-none" style={{ backgroundColor: CLUSTER_COLORS[Number(id)] }} />
              <span className="font-mono text-xs text-forge-text">{name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute bottom-4 left-4 z-10 border border-forge-border bg-forge-bg/90 rounded-none p-3">
        <div className="flex items-center gap-4 font-mono text-xs text-forge-dim uppercase tracking-wider">
          <span>Vectors: <span className="text-forge-text">{points.length}</span></span>
          <span>|</span>
          <span>HNSW Layers: <span className="text-forge-cta">{stats.hnswLayers}</span></span>
        </div>
      </div>

      <Canvas camera={{ position: [6, 4, 6], fov: 50 }}>
        <Scene points={points} />
      </Canvas>
    </div>
  )
}
