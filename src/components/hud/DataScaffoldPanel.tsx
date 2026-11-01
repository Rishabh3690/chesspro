import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEmotion } from '../../context/EmotionContext';

// Hyper-dimensional geometric cage vertices with secondary structural bracing
function generateScaffoldLattice(): {
  innerVertices: Float32Array;
  innerLines: Float32Array;
  midVertices: Float32Array;
  midLines: Float32Array;
  secondaryBracingLines: Float32Array;
  secondaryBracingVertices: Float32Array;
  outerLines: Float32Array;
  particles: Float32Array;
} {
  // Layer 1: Crystalline 3D Octahedron / Polyhedral Core
  const coreCorners: [number, number, number][] = [
    [0, 0.75, 0],
    [0, -0.75, 0],
    [0.75, 0, 0],
    [-0.75, 0, 0],
    [0, 0, 0.75],
    [0, 0, -0.75],
  ];

  const coreEdges: [number, number][] = [
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 4], [4, 3], [3, 5], [5, 2],
  ];

  const innerLines = new Float32Array(coreEdges.length * 2 * 3);
  let p = 0;
  for (const [i1, i2] of coreEdges) {
    innerLines[p++] = coreCorners[i1][0];
    innerLines[p++] = coreCorners[i1][1];
    innerLines[p++] = coreCorners[i1][2];

    innerLines[p++] = coreCorners[i2][0];
    innerLines[p++] = coreCorners[i2][1];
    innerLines[p++] = coreCorners[i2][2];
  }

  const innerVertices = new Float32Array(coreCorners.length * 3);
  for (let i = 0; i < coreCorners.length; i++) {
    innerVertices[i * 3] = coreCorners[i][0];
    innerVertices[i * 3 + 1] = coreCorners[i][1];
    innerVertices[i * 3 + 2] = coreCorners[i][2];
  }

  // Layer 2: Mid-layer Isometric Space-Frame Cage (Primary Perimeter Framing)
  const midSize = 1.25;
  const midCorners: [number, number, number][] = [
    [-midSize, -midSize, -midSize], // 0
    [midSize, -midSize, -midSize],  // 1
    [midSize, midSize, -midSize],   // 2
    [-midSize, midSize, -midSize],  // 3
    [-midSize, -midSize, midSize],  // 4
    [midSize, -midSize, midSize],   // 5
    [midSize, midSize, midSize],    // 6
    [-midSize, midSize, midSize],   // 7
  ];

  const midEdges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0], // Back loop
    [4, 5], [5, 6], [6, 7], [7, 4], // Front loop
    [0, 4], [1, 5], [2, 6], [3, 7], // Longitudinal struts
  ];

  const midLines = new Float32Array(midEdges.length * 2 * 3);
  p = 0;
  for (const [i1, i2] of midEdges) {
    midLines[p++] = midCorners[i1][0];
    midLines[p++] = midCorners[i1][1];
    midLines[p++] = midCorners[i1][2];

    midLines[p++] = midCorners[i2][0];
    midLines[p++] = midCorners[i2][1];
    midLines[p++] = midCorners[i2][2];
  }

  const midVertices = new Float32Array(midCorners.length * 3);
  for (let i = 0; i < midCorners.length; i++) {
    midVertices[i * 3] = midCorners[i][0];
    midVertices[i * 3 + 1] = midCorners[i][1];
    midVertices[i * 3 + 2] = midCorners[i][2];
  }

  // Layer 2.5: Secondary Structural Bracing (Face cross-braces, internal radial tie-rods, outriggers)
  const secondaryPairs: [number, number][] = [
    // Face Cross-Bracing (Tension diagonals across cube faces)
    [0, 2], [1, 3], // Back face X
    [4, 6], [5, 7], // Front face X
    [0, 5], [1, 4], // Bottom face X
    [3, 6], [2, 7], // Top face X
    [0, 7], [3, 4], // Left face X
    [1, 6], [2, 5], // Right face X
  ];

  const secondaryBracingLinesArr: number[] = [];
  for (const [i1, i2] of secondaryPairs) {
    secondaryBracingLinesArr.push(
      midCorners[i1][0], midCorners[i1][1], midCorners[i1][2],
      midCorners[i2][0], midCorners[i2][1], midCorners[i2][2]
    );
  }

  // Radial Internal Tension Tie-Rods: Connecting outer cage corners to the 6 core octahedron nodes
  // Creates an authentic hyper-dimensional structural space-truss
  const tieConnections: [number, number][] = [
    [0, 1], [0, 3], [0, 5],
    [1, 1], [1, 2], [1, 5],
    [2, 0], [2, 2], [2, 5],
    [3, 0], [3, 3], [3, 5],
    [4, 1], [4, 3], [4, 4],
    [5, 1], [5, 2], [5, 4],
    [6, 0], [6, 2], [6, 4],
    [7, 0], [7, 3], [7, 4],
  ];

  for (const [midIdx, coreIdx] of tieConnections) {
    secondaryBracingLinesArr.push(
      midCorners[midIdx][0], midCorners[midIdx][1], midCorners[midIdx][2],
      coreCorners[coreIdx][0], coreCorners[coreIdx][1], coreCorners[coreIdx][2]
    );
  }

  // Mid-span gusset nodes for secondary bracing
  const midSpanNodes: [number, number, number][] = [
    [0, 0, -midSize], // Back face center
    [0, 0, midSize],  // Front face center
    [0, -midSize, 0], // Bottom face center
    [0, midSize, 0],  // Top face center
    [-midSize, 0, 0], // Left face center
    [midSize, 0, 0],  // Right face center
  ];

  const secondaryBracingVertices = new Float32Array(midSpanNodes.length * 3);
  for (let i = 0; i < midSpanNodes.length; i++) {
    secondaryBracingVertices[i * 3] = midSpanNodes[i][0];
    secondaryBracingVertices[i * 3 + 1] = midSpanNodes[i][1];
    secondaryBracingVertices[i * 3 + 2] = midSpanNodes[i][2];
  }

  // Layer 3: Outer Ghost Wireframe & Cantilever Brackets
  const outerSize = 1.7;
  const outerLinesArr: number[] = [];
  const offsets = [-outerSize, outerSize];
  for (const ox of offsets) {
    for (const oy of offsets) {
      for (const oz of offsets) {
        const span = 0.45;
        const signX = Math.sign(ox);
        const signY = Math.sign(oy);
        const signZ = Math.sign(oz);

        // tick on x
        outerLinesArr.push(ox, oy, oz, ox - signX * span, oy, oz);
        // tick on y
        outerLinesArr.push(ox, oy, oz, ox, oy - signY * span, oz);
        // tick on z
        outerLinesArr.push(ox, oy, oz, ox, oy, oz - signZ * span);
      }
    }
  }

  // Assembly Spark Particles
  const PARTICLE_COUNT = 56;
  const particles = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI;
    const rad = 0.85 + Math.random() * 1.1;
    particles[i * 3] = Math.cos(theta) * Math.cos(phi) * rad;
    particles[i * 3 + 1] = Math.sin(phi) * rad;
    particles[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * rad;
  }

  return {
    innerVertices,
    innerLines,
    midVertices,
    midLines,
    secondaryBracingLines: new Float32Array(secondaryBracingLinesArr),
    secondaryBracingVertices,
    outerLines: new Float32Array(outerLinesArr),
    particles,
  };
}

// ----------------------------------------------------------------------------
// 3D PARTICLE EXPLOSION EFFECT (Mate-in-2 Puzzle Victory Detonation)
// ----------------------------------------------------------------------------
const EXPLOSION_PARTICLE_COUNT = 300;

interface VictoryExplosionProps {
  victoryTrigger?: number;
  isVictory?: boolean;
}

const VictoryParticleExplosion: React.FC<VictoryExplosionProps> = ({
  victoryTrigger = 0,
  isVictory = false,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const detonationLightRef = useRef<THREE.PointLight>(null);

  const prevTriggerRef = useRef(0);
  const prevIsVictoryRef = useRef(false);
  const explosionStateRef = useRef<{
    active: boolean;
    progress: number;
    duration: number;
  }>({
    active: false,
    progress: 1,
    duration: 2.2,
  });

  const velocitiesRef = useRef<Float32Array>(
    new Float32Array(EXPLOSION_PARTICLE_COUNT * 3)
  );

  // Pre-allocated static buffers for high 60fps performance and zero GC pauses
  const { initialPositions, colors } = useMemo(() => {
    const pos = new Float32Array(EXPLOSION_PARTICLE_COUNT * 3);
    const col = new Float32Array(EXPLOSION_PARTICLE_COUNT * 3);

    const palette = [
      [0.06, 0.88, 0.52], // Emerald green (#10b981)
      [0.22, 0.74, 0.97], // Cyber cyan (#38bdf8)
      [1.0, 0.82, 0.2],   // Luminous gold (#fbbf24)
      [1.0, 1.0, 1.0],    // Solar white core spark
    ];

    for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      const chosenColor = palette[i % palette.length];
      col[i * 3] = chosenColor[0];
      col[i * 3 + 1] = chosenColor[1];
      col[i * 3 + 2] = chosenColor[2];
    }

    return { initialPositions: pos, colors: col };
  }, []);

  const pointsMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const shockwaveMaterial1 = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#38bdf8'),
        transparent: true,
        opacity: 0,
        wireframe: true,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const shockwaveMaterial2 = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#10b981'),
        transparent: true,
        opacity: 0,
        wireframe: true,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame((_, delta) => {
    // Trigger explosion only when user successfully completes a Mate-in-2 puzzle
    const isNewTrigger =
      victoryTrigger > 0 && victoryTrigger !== prevTriggerRef.current;
    const isNewVictory = isVictory && !prevIsVictoryRef.current;

    prevTriggerRef.current = victoryTrigger;
    prevIsVictoryRef.current = isVictory;

    if (isNewTrigger || isNewVictory) {
      explosionStateRef.current.active = true;
      explosionStateRef.current.progress = 0;

      const velocities = velocitiesRef.current;
      const posAttr = pointsRef.current?.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute | undefined;
      const posArray = posAttr?.array as Float32Array | undefined;

      for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
        if (posArray) {
          posArray[i * 3] = (Math.random() - 0.5) * 0.08;
          posArray[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
          posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
        }

        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const speed = 2.4 + Math.random() * 4.6;

        velocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
        velocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
        velocities[i * 3 + 2] = speed * Math.cos(phi);
      }

      if (posAttr) {
        posAttr.needsUpdate = true;
      }
    }

    const state = explosionStateRef.current;
    const ptsMat = pointsRef.current?.material as THREE.PointsMaterial | undefined;
    const swMat1 = ring1Ref.current?.material as THREE.MeshBasicMaterial | undefined;
    const swMat2 = ring2Ref.current?.material as THREE.MeshBasicMaterial | undefined;

    if (!state.active) {
      if (ptsMat && ptsMat.opacity > 0) ptsMat.opacity = 0;
      if (swMat1 && swMat1.opacity > 0) swMat1.opacity = 0;
      if (swMat2 && swMat2.opacity > 0) swMat2.opacity = 0;
      if (detonationLightRef.current && detonationLightRef.current.intensity > 0) {
        detonationLightRef.current.intensity = 0;
      }
      return;
    }

    state.progress += delta / state.duration;

    if (state.progress >= 1.0) {
      state.active = false;
      state.progress = 1.0;
      if (ptsMat) ptsMat.opacity = 0;
      if (swMat1) swMat1.opacity = 0;
      if (swMat2) swMat2.opacity = 0;
      if (detonationLightRef.current) detonationLightRef.current.intensity = 0;
      return;
    }

    const t = state.progress;
    // Cubic fade-out: strong bright initial burst that smoothly dissipates
    const fade = Math.pow(1.0 - t, 1.8);
    if (ptsMat) {
      ptsMat.opacity = Math.min(1.0, fade * 1.35);
    }

    // Update particle positions with drag
    const drag = Math.pow(0.55, delta);
    const velocities = velocitiesRef.current;
    const posAttr = pointsRef.current?.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute | undefined;
    const posArray = posAttr?.array as Float32Array | undefined;

    for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
      velocities[i * 3] *= drag;
      velocities[i * 3 + 1] *= drag;
      velocities[i * 3 + 2] *= drag;

      if (posArray) {
        posArray[i * 3] += velocities[i * 3] * delta;
        posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta;
        posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta;
      }
    }

    if (posAttr) {
      posAttr.needsUpdate = true;
    }

    // Expanding Shockwave Rings
    if (ring1Ref.current) {
      const ringScale = Math.pow(t, 0.6) * 3.8;
      ring1Ref.current.scale.set(ringScale, ringScale, ringScale);
      ring1Ref.current.rotation.z += delta * 1.5;
      if (swMat1) swMat1.opacity = Math.max(0, (1 - t) * 0.85);
    }

    if (ring2Ref.current) {
      const ringScale = Math.pow(t, 0.6) * 3.2;
      ring2Ref.current.scale.set(ringScale, ringScale, ringScale);
      ring2Ref.current.rotation.y += delta * 1.2;
      if (swMat2) swMat2.opacity = Math.max(0, (1 - t) * 0.7);
    }

    // Detonation Flash
    if (detonationLightRef.current) {
      detonationLightRef.current.intensity = Math.max(0, Math.pow(1 - t * 2, 2) * 7.5);
    }
  });

  return (
    <group>
      <pointLight ref={detonationLightRef} position={[0, 0, 0]} color="#38bdf8" distance={6} intensity={0} />

      <points ref={pointsRef} material={pointsMaterial}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[initialPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
      </points>

      {/* Primary Equatorial Shockwave Ring */}
      <mesh ref={ring1Ref} material={shockwaveMaterial1} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1.05, 48]} />
      </mesh>

      {/* Secondary Tilted Shockwave Ring */}
      <mesh ref={ring2Ref} material={shockwaveMaterial2} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <ringGeometry args={[0.95, 1.05, 48]} />
      </mesh>
    </group>
  );
};

// ----------------------------------------------------------------------------
// SCAFFOLD SCENE WITH DYNAMIC EMISSION AND VICTORY EXPLOSION
// ----------------------------------------------------------------------------
interface ScaffoldSceneProps {
  victoryTrigger?: number;
  isVictory?: boolean;
}

const ScaffoldScene: React.FC<ScaffoldSceneProps> = ({
  victoryTrigger = 0,
  isVictory = false,
}) => {
  const { currentEmotion, theme } = useEmotion();
  const lattice = useMemo(() => generateScaffoldLattice(), []);

  const rootGroupRef = useRef<THREE.Group>(null);
  const corePolyRef = useRef<THREE.Mesh>(null);
  const midGroupRef = useRef<THREE.Group>(null);
  const secondaryGroupRef = useRef<THREE.Group>(null);
  const bracingLinesRef = useRef<THREE.LineSegments>(null);
  const outerGroupRef = useRef<THREE.Group>(null);
  const orbitRingRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);

  // Core Solid Material
  const coreSolidMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(theme.scaffoldCore),
        emissive: new THREE.Color(theme.scaffoldCore),
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.3 : 0.72,
        roughness: 0.15,
        metalness: 0.85,
      }),
    [theme.scaffoldCore, currentEmotion]
  );

  const coreLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.textGlow),
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.35 : 0.95,
        linewidth: 2,
      }),
    [theme.textGlow, currentEmotion]
  );

  const midLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.scaffoldMid),
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.25 : 0.85,
        linewidth: 1.5,
      }),
    [theme.scaffoldMid, currentEmotion]
  );

  // Secondary Bracing Material (Subtle structural lattice with dynamic luminescence)
  const bracingLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.secondary3d),
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.18 : 0.55,
        linewidth: 1,
      }),
    [theme.secondary3d, currentEmotion]
  );

  const outerLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.scaffoldOuter),
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.15 : 0.45,
      }),
    [theme.scaffoldOuter, currentEmotion]
  );

  const nodePointMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(theme.primary3d),
        size: 0.08,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      }),
    [theme.primary3d]
  );

  const bracingNodeMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(theme.secondary3d),
        size: 0.06,
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.25 : 0.75,
        blending: THREE.AdditiveBlending,
      }),
    [theme.secondary3d, currentEmotion]
  );

  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(theme.secondary3d),
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.12 : 0.35,
        wireframe: true,
      }),
    [theme.secondary3d, currentEmotion]
  );

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const speedMult = theme.rotationSpeed;

    // ------------------------------------------------------------------------
    // DYNAMIC EMISSION INTENSITY SHIFTS BASED ON currentEmotion
    // ------------------------------------------------------------------------
    let dynamicIntensity = 0.6;
    let dynamicPulseScale = 1.0;

    if (currentEmotion === 'confident') {
      // High pulse frequency: sharp, laser-like high-rate resonance
      const highFreqPulse = Math.sin(time * 7.5);
      const sharpSpike = Math.sin(time * 15.0) > 0.85 ? 0.5 : 0;
      dynamicIntensity = 1.1 + highFreqPulse * 0.65 + sharpSpike; // Peaks up to 2.25
      dynamicPulseScale = 1.0 + highFreqPulse * 0.08;
    } else if (currentEmotion === 'sad') {
      // Slower, dim building sequences: sluggish, dimmed-down breath
      const slowPulse = Math.sin(time * 0.85);
      dynamicIntensity = 0.22 + slowPulse * 0.12; // Dim ranges 0.10 to 0.34
      dynamicPulseScale = 0.94 + slowPulse * 0.03;
    } else if (currentEmotion === 'angry') {
      // Violent erratic shifts with sudden high-energy spikes
      const violentFlicker = Math.sin(time * 18.0) * 0.5;
      const erraticSpike = Math.random() < 0.14 ? 0.9 : 0;
      dynamicIntensity = 1.2 + violentFlicker + erraticSpike;
      dynamicPulseScale = 1.05 + (Math.random() - 0.5) * 0.08;
    } else {
      // Calm: smooth, meditative harmonic breathing
      const calmPulse = Math.sin(time * 2.2);
      dynamicIntensity = 0.65 + calmPulse * 0.25; // Smooth 0.40 to 0.90
      dynamicPulseScale = 1.0 + calmPulse * 0.04;
    }

    // Apply dynamic emission to core material
    if (corePolyRef.current) {
      (corePolyRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        dynamicIntensity;
    }

    // Apply matching luminescence to inner point light
    if (pointLightRef.current) {
      pointLightRef.current.intensity = Math.max(0.4, dynamicIntensity * 2.2);
    }

    // Dynamically shift secondary bracing opacity
    if (bracingLinesRef.current) {
      const bMat = bracingLinesRef.current.material as THREE.LineBasicMaterial;
      if (currentEmotion === 'confident') {
        bMat.opacity = 0.5 + Math.sin(time * 6.0) * 0.25;
      } else if (currentEmotion === 'sad') {
        bMat.opacity = 0.14 + Math.sin(time * 0.7) * 0.06;
      } else if (currentEmotion === 'angry') {
        bMat.opacity = 0.6 + (Math.random() - 0.5) * 0.3;
      } else {
        bMat.opacity = 0.42 + Math.sin(time * 1.8) * 0.12;
      }
    }

    // ------------------------------------------------------------------------
    // KINEMATIC ROTATION OF THE OVERALL SCAFFOLD
    // ------------------------------------------------------------------------
    if (rootGroupRef.current) {
      if (currentEmotion === 'angry') {
        const glitch = (Math.random() - 0.5) * 0.06;
        rootGroupRef.current.rotation.y += delta * 2.8;
        rootGroupRef.current.rotation.x = 0.52 + Math.sin(time * 18) * 0.15;
        rootGroupRef.current.scale.setScalar(1.05 + glitch);
      } else if (currentEmotion === 'sad') {
        rootGroupRef.current.position.set(0, -0.06, 0);
        rootGroupRef.current.rotation.y += delta * 0.35;
        rootGroupRef.current.rotation.x = 0.52 + Math.sin(time * 0.5) * 0.04;
        rootGroupRef.current.scale.setScalar(0.94);
      } else if (currentEmotion === 'confident') {
        rootGroupRef.current.position.set(0, 0, 0);
        rootGroupRef.current.rotation.y += delta * 1.5;
        rootGroupRef.current.rotation.x = 0.6;
        rootGroupRef.current.scale.setScalar(1.08 + Math.sin(time * 3) * 0.03);
      } else {
        // Calm
        rootGroupRef.current.position.set(0, 0, 0);
        rootGroupRef.current.rotation.y += delta * 0.65;
        rootGroupRef.current.rotation.x = 0.55;
        rootGroupRef.current.scale.setScalar(1.0);
      }
    }

    // Inner Crystalline Core Breathing
    if (corePolyRef.current) {
      corePolyRef.current.rotation.y -= delta * 1.2 * speedMult;
      corePolyRef.current.rotation.z += delta * 0.8 * speedMult;
      corePolyRef.current.scale.setScalar(dynamicPulseScale);
    }

    // Mid Assembly Frame Modulation
    if (midGroupRef.current) {
      const buildPulse = 1 + Math.sin(time * 1.8 * speedMult) * 0.07;
      midGroupRef.current.scale.setScalar(buildPulse);
      midGroupRef.current.rotation.z = Math.sin(time * 0.7) * 0.1;
    }

    // Secondary Bracing Kinematics
    if (secondaryGroupRef.current) {
      const bracePulse = 1 + Math.cos(time * 2.0 * speedMult) * 0.05;
      secondaryGroupRef.current.scale.setScalar(bracePulse);
    }

    // Outer Ghost Brackets Subtle Fluctuation
    if (outerGroupRef.current) {
      const ghostPulse = 1 + Math.cos(time * 2.2) * 0.05;
      outerGroupRef.current.scale.setScalar(ghostPulse);
    }

    // Orbital Calibration Ring
    if (orbitRingRef.current) {
      orbitRingRef.current.rotation.x += delta * 0.9 * speedMult;
      orbitRingRef.current.rotation.y += delta * 0.6 * speedMult;
    }

    // Swirling Sparks
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.4 * speedMult;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 4]} intensity={1.4} color={theme.primary3d} />
      <directionalLight position={[-4, -5, -3]} intensity={0.8} color={theme.secondary3d} />
      <pointLight ref={pointLightRef} position={[0, 0, 0]} intensity={2.0} color={theme.scaffoldCore} distance={3.8} />

      {/* 3D Particle Explosion - Triggers ONLY when user successfully completes a Mate-in-2 puzzle */}
      <VictoryParticleExplosion victoryTrigger={victoryTrigger} isVictory={isVictory} />

      <group ref={rootGroupRef}>
        {/* Layer 1: Solid Glowing Polyhedral Core */}
        <mesh ref={corePolyRef} material={coreSolidMat}>
          <octahedronGeometry args={[0.7, 0]} />
        </mesh>

        <lineSegments material={coreLineMat}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[lattice.innerLines, 3]}
            />
          </bufferGeometry>
        </lineSegments>

        <points material={nodePointMat}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[lattice.innerVertices, 3]}
            />
          </bufferGeometry>
        </points>

        {/* Layer 2: Mid-tier Space-Frame Assembly Cage */}
        <group ref={midGroupRef}>
          <lineSegments material={midLineMat}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[lattice.midLines, 3]}
              />
            </bufferGeometry>
          </lineSegments>

          <points material={nodePointMat}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[lattice.midVertices, 3]}
              />
            </bufferGeometry>
          </points>
        </group>

        {/* Layer 2.5: Secondary Structural Bracing (Face cross-braces, internal radial tie-struts) */}
        <group ref={secondaryGroupRef}>
          <lineSegments ref={bracingLinesRef} material={bracingLineMat}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[lattice.secondaryBracingLines, 3]}
              />
            </bufferGeometry>
          </lineSegments>

          <points material={bracingNodeMat}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[lattice.secondaryBracingVertices, 3]}
              />
            </bufferGeometry>
          </points>
        </group>

        {/* Layer 3: Outer Ghost Calibration Brackets */}
        <group ref={outerGroupRef}>
          <lineSegments material={outerLineMat}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[lattice.outerLines, 3]}
              />
            </bufferGeometry>
          </lineSegments>
        </group>

        {/* Orbital Gyroscope Ring for Dimensional Calibration */}
        <mesh ref={orbitRingRef} material={ringMat}>
          <torusGeometry args={[1.9, 0.015, 12, 64]} />
        </mesh>

        {/* Assembly Sparks */}
        <points ref={particlesRef} material={nodePointMat}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[lattice.particles, 3]}
            />
          </bufferGeometry>
        </points>
      </group>
    </>
  );
};

export interface DataScaffoldPanelProps {
  victoryTrigger?: number;
  isVictory?: boolean;
}

export const DataScaffoldPanel: React.FC<DataScaffoldPanelProps> = ({
  victoryTrigger = 0,
  isVictory = false,
}) => {
  const { currentEmotion, theme } = useEmotion();

  return (
    <div
      data-testid="data-scaffold-panel"
      data-emotion={currentEmotion}
      data-victory={isVictory ? 'true' : 'false'}
      className="relative w-full h-full min-h-[160px] sm:min-h-[195px] rounded-xl overflow-hidden border transition-colors duration-300"
      style={{
        backgroundColor: theme.surfaceBg,
        borderColor: theme.uiBorder,
        boxShadow: `0 0 20px -4px ${theme.uiBorderGlow}`,
      }}
    >
      {/* 3D Isometric WebGL Canvas via React Three Fiber - Clean unoccluded viewport */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [3.2, 3.2, 3.2], fov: 42 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <ScaffoldScene victoryTrigger={victoryTrigger} isVictory={isVictory} />
        </Canvas>
      </div>
    </div>
  );
};
export default DataScaffoldPanel;
