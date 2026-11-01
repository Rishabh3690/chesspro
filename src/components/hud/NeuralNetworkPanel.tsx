import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEmotion } from '../../context/EmotionContext';

// Pre-generate 120 holographic neural nodes in a deep 3D corridor
const NODE_COUNT = 120;
const CORRIDOR_LENGTH = 32;
const MAX_EMISSION_PARTICLES = 360;

interface NodeDef {
  x: number;
  y: number;
  z: number;
  layer: number;
  phase: number;
  baseScale: number;
}

interface SynapseConnection {
  fromIdx: number;
  toIdx: number;
}

function generateNetworkTopology(): {
  nodes: NodeDef[];
  synapseConnections: SynapseConnection[];
  synapsePositions: Float32Array;
} {
  const nodes: NodeDef[] = [];

  for (let i = 0; i < NODE_COUNT; i++) {
    const angle = (i * 0.52) % (Math.PI * 2);
    const radius = 0.8 + ((i * 7) % 11) * 0.16;
    const x = Math.cos(angle) * radius + Math.sin(i * 1.3) * 0.4;
    const y = Math.sin(angle) * radius + Math.cos(i * 1.7) * 0.4;
    const z = (i / NODE_COUNT) * CORRIDOR_LENGTH - CORRIDOR_LENGTH / 2;

    nodes.push({
      x,
      y,
      z,
      layer: Math.floor((i / NODE_COUNT) * 6),
      phase: i * 0.37,
      baseScale: 0.85 + ((i * 3) % 5) * 0.1,
    });
  }

  // Connect nearby nodes within layer distance to form synaptic lines
  const linePoints: number[] = [];
  const synapseConnections: SynapseConnection[] = [];

  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = i + 1; j < Math.min(NODE_COUNT, i + 8); j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dz = nodes[i].z - nodes[j].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 2.8) {
        synapseConnections.push({ fromIdx: i, toIdx: j });
        linePoints.push(
          nodes[i].x,
          nodes[i].y,
          nodes[i].z,
          nodes[j].x,
          nodes[j].y,
          nodes[j].z
        );
      }
    }
  }

  return {
    nodes,
    synapseConnections,
    synapsePositions: new Float32Array(linePoints),
  };
}

const NeuralWebScene: React.FC = () => {
  const { currentEmotion, theme } = useEmotion();
  const topology = useMemo(() => generateNetworkTopology(), []);

  const cameraFlyZRef = useRef(10);
  const webGroupRef = useRef<THREE.Group>(null);
  const instancedNodesRef = useRef<THREE.InstancedMesh>(null);
  const instancedParticlesRef = useRef<THREE.InstancedMesh>(null);
  const lineGeoRef = useRef<THREE.BufferGeometry>(null);

  const dummyObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Pre-allocate particle emission state in a ref synced with emotion (maximized on 'confident')
  const particleSeedsRef = useRef<
    | {
        connectionIndex: number;
        progress: number;
        speed: number;
        radialJitter: number;
      }[]
    | null
  >(null);

  const activeParticleRatioRef = useRef<number>(0.35);

  // Shared Geometries & Materials for InstancedMesh Nodes and Particles
  const nodeGeometry = useMemo(() => new THREE.SphereGeometry(0.058, 12, 12), []);
  const particleGeometry = useMemo(
    () => new THREE.SphereGeometry(0.028, 8, 8),
    []
  );

  const nodeInstancedMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(theme.primary3d),
        emissive: new THREE.Color(theme.primary3d),
        emissiveIntensity:
          currentEmotion === 'confident'
            ? 1.55
            : currentEmotion === 'sad'
            ? 0.35
            : 0.95,
        roughness: 0.18,
        metalness: 0.8,
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.45 : 0.96,
      }),
    [theme.primary3d, currentEmotion]
  );

  const particleInstancedMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(theme.particleColor || theme.secondary3d),
        transparent: true,
        opacity:
          currentEmotion === 'confident'
            ? 0.98
            : currentEmotion === 'sad'
            ? 0.25
            : 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [theme.particleColor, theme.secondary3d, currentEmotion]
  );

  const synapseMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.secondary3d),
        transparent: true,
        opacity:
          currentEmotion === 'confident'
            ? 0.68
            : currentEmotion === 'sad'
            ? 0.14
            : 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [theme.secondary3d, currentEmotion]
  );

  // Initialize node instance colors and initial matrices immediately on mount/theme change
  useEffect(() => {
    if (!instancedNodesRef.current) return;
    const primaryCol = new THREE.Color(theme.primary3d);
    const secondaryCol = new THREE.Color(theme.secondary3d);

    for (let i = 0; i < NODE_COUNT; i++) {
      const n = topology.nodes[i];
      dummyObj.position.set(n.x, n.y, n.z);
      dummyObj.scale.setScalar(n.baseScale);
      dummyObj.updateMatrix();
      instancedNodesRef.current.setMatrixAt(i, dummyObj.matrix);

      tempColor.copy(i % 3 === 0 ? secondaryCol : primaryCol);
      instancedNodesRef.current.setColorAt(i, tempColor);
    }
    instancedNodesRef.current.instanceMatrix.needsUpdate = true;
    if (instancedNodesRef.current.instanceColor) {
      instancedNodesRef.current.instanceColor.needsUpdate = true;
    }
  }, [topology.nodes, theme.primary3d, theme.secondary3d, dummyObj, tempColor]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const speedMult = theme.rotationSpeed;

    // Camera flythrough animation along Z corridor
    let flySpeed = 1.6 * speedMult;
    if (currentEmotion === 'confident') {
      flySpeed = 2.85;
    } else if (currentEmotion === 'angry') {
      flySpeed = 3.8;
    } else if (currentEmotion === 'sad') {
      flySpeed = 0.65;
    }

    cameraFlyZRef.current -= delta * flySpeed;
    if (cameraFlyZRef.current < -CORRIDOR_LENGTH / 2 + 3) {
      cameraFlyZRef.current = CORRIDOR_LENGTH / 2 - 2;
    }

    state.camera.position.z = cameraFlyZRef.current;
    state.camera.position.x = Math.sin(time * 0.8) * 0.35;
    state.camera.position.y = Math.cos(time * 0.6) * 0.3;

    // Look slightly ahead in the corridor
    state.camera.lookAt(
      Math.sin(time * 0.8) * 0.1,
      Math.cos(time * 0.6) * 0.1,
      state.camera.position.z - 5
    );

    // 1. Update InstancedMesh Neural Nodes (pulsing clearly without overlays)
    if (instancedNodesRef.current) {
      const pulseFreq =
        currentEmotion === 'confident'
          ? 5.2
          : currentEmotion === 'angry'
          ? 9.0
          : currentEmotion === 'sad'
          ? 1.1
          : 2.4;
      const pulseAmp =
        currentEmotion === 'confident'
          ? 0.28
          : currentEmotion === 'angry'
          ? 0.34
          : 0.14;

      for (let i = 0; i < NODE_COUNT; i++) {
        const n = topology.nodes[i];
        const s =
          n.baseScale * (1 + Math.sin(time * pulseFreq + n.phase) * pulseAmp);
        dummyObj.position.set(n.x, n.y, n.z);
        dummyObj.scale.setScalar(s);
        dummyObj.updateMatrix();
        instancedNodesRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      instancedNodesRef.current.instanceMatrix.needsUpdate = true;
    }

    // 2. Sync Particle Emission Density with the 'confident' emotion state
    const targetDensityRatio =
      currentEmotion === 'confident'
        ? 1.0 // Full 100% high-density synaptic particle surge in 'confident' state
        : currentEmotion === 'angry'
        ? 0.65
        : currentEmotion === 'calm'
        ? 0.35
        : 0.12; // Minimal sparse emission in 'sad' state

    activeParticleRatioRef.current = THREE.MathUtils.lerp(
      activeParticleRatioRef.current,
      targetDensityRatio,
      Math.min(1, delta * 5.0)
    );

    const activeParticleCount = Math.floor(
      MAX_EMISSION_PARTICLES * activeParticleRatioRef.current
    );

    if (
      instancedParticlesRef.current &&
      topology.synapseConnections.length > 0
    ) {
      // Dynamically adjust instancedMesh count to match synced emission density
      instancedParticlesRef.current.count = activeParticleCount;

      const emissionVelocityBoost =
        currentEmotion === 'confident'
          ? 2.4
          : currentEmotion === 'angry'
          ? 2.8
          : currentEmotion === 'sad'
          ? 0.45
          : 1.0;

      if (!particleSeedsRef.current) {
        const connCount = Math.max(1, topology.synapseConnections.length);
        particleSeedsRef.current = Array.from(
          { length: MAX_EMISSION_PARTICLES },
          (_, idx) => ({
            connectionIndex: (idx * 7) % connCount,
            progress: (idx / MAX_EMISSION_PARTICLES) % 1,
            speed: 0.55 + ((idx * 13) % 17) * 0.06,
            radialJitter: ((idx % 5) - 2) * 0.015,
          })
        );
      }
      const seeds = particleSeedsRef.current;

      for (let i = 0; i < activeParticleCount; i++) {
        const seed = seeds[i];
        seed.progress =
          (seed.progress + delta * seed.speed * emissionVelocityBoost) % 1.0;

        const conn = topology.synapseConnections[seed.connectionIndex];
        const fromNode = topology.nodes[conn.fromIdx];
        const toNode = topology.nodes[conn.toIdx];

        const t = seed.progress;
        const px =
          fromNode.x + (toNode.x - fromNode.x) * t + seed.radialJitter;
        const py =
          fromNode.y + (toNode.y - fromNode.y) * t + seed.radialJitter;
        const pz = fromNode.z + (toNode.z - fromNode.z) * t;

        // Arching synaptic spark scale (peaks mid-flight along the axon)
        const sparkEnvelope = Math.sin(t * Math.PI);
        const confidentBoost = currentEmotion === 'confident' ? 1.45 : 1.0;

        dummyObj.position.set(px, py, pz);
        dummyObj.scale.setScalar(
          Math.max(0.15, sparkEnvelope * confidentBoost)
        );
        dummyObj.updateMatrix();
        instancedParticlesRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      instancedParticlesRef.current.instanceMatrix.needsUpdate = true;
    }

    // Subtle gentle twist on the whole web
    if (webGroupRef.current) {
      webGroupRef.current.rotation.z = Math.sin(time * 0.25) * 0.2;
      webGroupRef.current.position.set(0, 0, 0);
    }
  });

  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight
        position={[2, 3, 6]}
        intensity={currentEmotion === 'confident' ? 2.2 : 1.3}
        color={theme.primary3d}
      />
      <pointLight
        position={[-2, -3, -4]}
        intensity={currentEmotion === 'confident' ? 1.8 : 0.9}
        color={theme.secondary3d}
      />

      <group ref={webGroupRef}>
        {/* Holographic Synapse Lines */}
        <lineSegments material={synapseMaterial}>
          <bufferGeometry ref={lineGeoRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[topology.synapsePositions, 3]}
            />
          </bufferGeometry>
        </lineSegments>

        {/* High-Efficiency InstancedMesh Holographic Nodes (Zero Overlays or Text Artifacts) */}
        <instancedMesh
          ref={instancedNodesRef}
          args={[nodeGeometry, nodeInstancedMaterial, NODE_COUNT]}
          frustumCulled={false}
        />

        {/* Instanced Synaptic Particle Emission Stream (Density Synced with 'confident' Emotion) */}
        <instancedMesh
          ref={instancedParticlesRef}
          args={[
            particleGeometry,
            particleInstancedMaterial,
            MAX_EMISSION_PARTICLES,
          ]}
          frustumCulled={false}
        />
      </group>
    </>
  );
};

export interface NeuralNetworkPanelProps {
  baseNodesValue?: number;
}

export const NeuralNetworkPanel: React.FC<NeuralNetworkPanelProps> = () => {
  const { currentEmotion, theme } = useEmotion();

  return (
    <div
      data-testid="neural-network-panel"
      data-emotion={currentEmotion}
      className="neural-network-panel relative w-full h-full min-h-[160px] sm:min-h-[195px] rounded-xl overflow-hidden border transition-colors duration-300"
      style={{
        backgroundColor: theme.surfaceBg,
        borderColor: theme.uiBorder,
        boxShadow: `0 0 20px -4px ${theme.uiBorderGlow}`,
      }}
    >
      {/* 3D WebGL Canvas with Camera Flythrough & Instanced Nodes - Clean unoccluded viewport without overlays or text artifacts */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 60 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
        >
          <NeuralWebScene />
        </Canvas>
      </div>
    </div>
  );
};
export default NeuralNetworkPanel;
