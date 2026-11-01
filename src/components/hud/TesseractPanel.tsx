import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { useEmotion, EmotionType } from '../../context/EmotionContext';

// 4D Tesseract Geometry Definitions: 16 vertices in 4D & 32 hyper-edges
const TESSERACT_4D_VERTICES: [number, number, number, number][] = [];
for (let i = 0; i < 16; i++) {
  TESSERACT_4D_VERTICES.push([
    (i & 1 ? 1 : -1) * 0.72,
    (i & 2 ? 1 : -1) * 0.72,
    (i & 4 ? 1 : -1) * 0.72,
    (i & 8 ? 1 : -1) * 0.72,
  ]);
}

const TESSERACT_EDGES: [number, number][] = [];
for (let i = 0; i < 16; i++) {
  for (let bit = 0; bit < 4; bit++) {
    const j = i ^ (1 << bit);
    if (i < j) {
      TESSERACT_EDGES.push([i, j]);
    }
  }
}

// Emotion-specific real-time kinematic & bloom parameters
const EMOTION_KINEMATICS: Record<
  EmotionType,
  {
    wSpeed: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    bloomStrength: number;
    bloomRadius: number;
    bloomThreshold: number;
    wireOpacity: number;
    haloOpacity: number;
  }
> = {
  calm: {
    wSpeed: 0.75,
    rotX: 0.55,
    rotY: 0.75,
    rotZ: 0.32,
    bloomStrength: 1.15,
    bloomRadius: 0.55,
    bloomThreshold: 0.12,
    wireOpacity: 0.9,
    haloOpacity: 0.35,
  },
  confident: {
    wSpeed: 2.15,
    rotX: 1.85,
    rotY: 2.45,
    rotZ: 1.15,
    bloomStrength: 1.95,
    bloomRadius: 0.72,
    bloomThreshold: 0.06,
    wireOpacity: 1.0,
    haloOpacity: 0.65,
  },
  angry: {
    wSpeed: 3.65,
    rotX: 3.25,
    rotY: 3.95,
    rotZ: 1.95,
    bloomStrength: 2.45,
    bloomRadius: 0.85,
    bloomThreshold: 0.04,
    wireOpacity: 1.0,
    haloOpacity: 0.8,
  },
  sad: {
    wSpeed: 0.28,
    rotX: 0.2,
    rotY: 0.26,
    rotZ: 0.09,
    bloomStrength: 0.55,
    bloomRadius: 0.35,
    bloomThreshold: 0.25,
    wireOpacity: 0.42,
    haloOpacity: 0.15,
  },
};

/**
 * Real-time UnrealBloomPass post-processing pipeline responsive to currentEmotion
 */
const TesseractBloomComposer: React.FC<{ emotion: EmotionType }> = ({
  emotion,
}) => {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    const params = EMOTION_KINEMATICS.calm;

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      params.bloomStrength,
      params.bloomRadius,
      params.bloomThreshold
    );
    const outputPass = new OutputPass();

    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    composerRef.current = composer;
    bloomPassRef.current = bloomPass;

    return () => {
      composer.dispose();
      composerRef.current = null;
      bloomPassRef.current = null;
    };
  }, [gl, scene, camera]);

  useEffect(() => {
    if (composerRef.current) {
      composerRef.current.setSize(
        Math.max(1, size.width),
        Math.max(1, size.height)
      );
    }
    if (bloomPassRef.current) {
      bloomPassRef.current.resolution.set(
        Math.max(1, size.width),
        Math.max(1, size.height)
      );
    }
  }, [size.width, size.height]);

  useFrame((state, delta) => {
    const target = EMOTION_KINEMATICS[emotion] || EMOTION_KINEMATICS.calm;
    if (bloomPassRef.current) {
      const lerpAlpha = Math.min(1, delta * 6);
      const pulseBoost =
        emotion === 'confident'
          ? Math.sin(state.clock.getElapsedTime() * 5.5) * 0.25
          : emotion === 'angry'
          ? Math.sin(state.clock.getElapsedTime() * 18.0) * 0.4
          : 0;
      bloomPassRef.current.strength = THREE.MathUtils.lerp(
        bloomPassRef.current.strength,
        target.bloomStrength + pulseBoost,
        lerpAlpha
      );
      bloomPassRef.current.radius = THREE.MathUtils.lerp(
        bloomPassRef.current.radius,
        target.bloomRadius,
        lerpAlpha
      );
      bloomPassRef.current.threshold = THREE.MathUtils.lerp(
        bloomPassRef.current.threshold,
        target.bloomThreshold,
        lerpAlpha
      );
    }
    if (composerRef.current) {
      composerRef.current.render(delta);
    }
  }, 1);

  return null;
};

interface TesseractSceneProps {
  targetVertexIndex?: number;
}

const TesseractScene: React.FC<TesseractSceneProps> = ({
  targetVertexIndex = 7,
}) => {
  const { currentEmotion, theme } = useEmotion();

  const groupRef = useRef<THREE.Group>(null);
  const gyroRef1 = useRef<THREE.Mesh>(null);
  const gyroRef2 = useRef<THREE.Mesh>(null);
  const reticleRef = useRef<THREE.Group>(null);
  const stressMeshRef = useRef<THREE.Mesh>(null);
  const vertexInstancesRef = useRef<THREE.InstancedMesh>(null);
  const linePositionsRef = useRef<Float32Array>(
    new Float32Array(TESSERACT_EDGES.length * 2 * 3)
  );
  const initialLinePositions = useMemo(
    () => new Float32Array(TESSERACT_EDGES.length * 2 * 3),
    []
  );
  const initialHaloPositions = useMemo(
    () => new Float32Array(TESSERACT_EDGES.length * 2 * 3),
    []
  );
  const lineGeoRef = useRef<THREE.BufferGeometry>(null);
  const haloLineGeoRef = useRef<THREE.BufferGeometry>(null);

  // Smoothly interpolated real-time velocity state for responsive emotion changes
  const liveVelocityRef = useRef({
    wSpeed: EMOTION_KINEMATICS.calm.wSpeed,
    rotX: EMOTION_KINEMATICS.calm.rotX,
    rotY: EMOTION_KINEMATICS.calm.rotY,
    rotZ: EMOTION_KINEMATICS.calm.rotZ,
    speedMult: theme.rotationSpeed,
  });

  // 3D Projected vertices holder for reticle tracking & vertex glow nodes
  const projected3DRef = useRef<THREE.Vector3[]>(
    Array.from({ length: 16 }, () => new THREE.Vector3())
  );
  const dummyMatrix = useMemo(() => new THREE.Object3D(), []);

  const angleWRef = useRef<number>(0);
  const glitchTimerRef = useRef<number>(0);

  // High-contrast additive wireframe materials for crisp bloom rendering
  const wireMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.primary3d).multiplyScalar(1.35),
        transparent: true,
        opacity: EMOTION_KINEMATICS[currentEmotion]?.wireOpacity ?? 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [theme.primary3d, currentEmotion]
  );

  const wireHaloMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.secondary3d).multiplyScalar(1.5),
        transparent: true,
        opacity: EMOTION_KINEMATICS[currentEmotion]?.haloOpacity ?? 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [theme.secondary3d, currentEmotion]
  );

  const vertexNodeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(theme.textGlow).multiplyScalar(1.4),
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.45 : 0.95,
        blending: THREE.AdditiveBlending,
      }),
    [theme.textGlow, currentEmotion]
  );

  const gyroMaterial1 = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(theme.gyroColor),
        emissive: new THREE.Color(theme.gyroColor),
        emissiveIntensity: currentEmotion === 'confident' ? 1.1 : 0.65,
        wireframe: false,
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.25 : 0.72,
        roughness: 0.2,
        metalness: 0.85,
      }),
    [theme.gyroColor, currentEmotion]
  );

  const gyroMaterial2 = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(theme.secondary3d),
        emissive: new THREE.Color(theme.secondary3d),
        emissiveIntensity: currentEmotion === 'confident' ? 0.95 : 0.55,
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.2 : 0.6,
        roughness: 0.3,
        metalness: 0.7,
      }),
    [theme.secondary3d, currentEmotion]
  );

  const reticleMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(theme.reticleColor).multiplyScalar(1.3),
        wireframe: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      }),
    [theme.reticleColor]
  );

  const stressMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(theme.stressColor),
        emissive: new THREE.Color(theme.primary3d),
        emissiveIntensity:
          currentEmotion === 'angry'
            ? 1.25
            : currentEmotion === 'confident'
            ? 0.75
            : 0.35,
        wireframe: true,
        transparent: true,
        opacity: currentEmotion === 'sad' ? 0.15 : 0.48,
      }),
    [theme.stressColor, theme.primary3d, currentEmotion]
  );

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const targetKinematics =
      EMOTION_KINEMATICS[currentEmotion] || EMOTION_KINEMATICS.calm;

    // Real-time responsive interpolation to currentEmotion state changes
    const responseRate = Math.min(1, delta * 9.5);
    const vel = liveVelocityRef.current;
    vel.wSpeed = THREE.MathUtils.lerp(
      vel.wSpeed,
      targetKinematics.wSpeed * (theme.rotationSpeed / 1.2),
      responseRate
    );
    vel.rotX = THREE.MathUtils.lerp(
      vel.rotX,
      targetKinematics.rotX * (theme.rotationSpeed / 1.1),
      responseRate
    );
    vel.rotY = THREE.MathUtils.lerp(
      vel.rotY,
      targetKinematics.rotY * (theme.rotationSpeed / 1.1),
      responseRate
    );
    vel.rotZ = THREE.MathUtils.lerp(
      vel.rotZ,
      targetKinematics.rotZ * (theme.rotationSpeed / 1.1),
      responseRate
    );
    vel.speedMult = THREE.MathUtils.lerp(
      vel.speedMult,
      theme.rotationSpeed,
      responseRate
    );

    // 4D Rotation in XW and ZW planes driven by real-time emotion velocity
    angleWRef.current += delta * vel.wSpeed;
    const cosW = Math.cos(angleWRef.current);
    const sinW = Math.sin(angleWRef.current);

    // Stereographic 4D -> 3D projection
    const projected = projected3DRef.current;
    for (let i = 0; i < 16; i++) {
      const [x, y, z, w] = TESSERACT_4D_VERTICES[i];
      const x4 = x * cosW - w * sinW;
      const w4 = x * sinW + w * cosW;
      const z4 = z * cosW - w4 * sinW;
      const wFinal = z * sinW + w4 * cosW;

      // Stereographic factor (denominator avoids singularity)
      const factor = 1.25 / (2.2 - wFinal * 0.75);
      projected[i].set(x4 * factor, y * factor, z4 * factor);

      if (vertexInstancesRef.current) {
        dummyMatrix.position.copy(projected[i]);
        const nodeScale = 0.85 + (factor - 0.5) * 0.6;
        dummyMatrix.scale.setScalar(nodeScale);
        dummyMatrix.updateMatrix();
        vertexInstancesRef.current.setMatrixAt(i, dummyMatrix.matrix);
      }
    }

    if (vertexInstancesRef.current) {
      vertexInstancesRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update line buffer geometry
    const positions = linePositionsRef.current;
    let ptr = 0;
    for (let e = 0; e < TESSERACT_EDGES.length; e++) {
      const [i1, i2] = TESSERACT_EDGES[e];
      const p1 = projected[i1];
      const p2 = projected[i2];

      positions[ptr++] = p1.x;
      positions[ptr++] = p1.y;
      positions[ptr++] = p1.z;

      positions[ptr++] = p2.x;
      positions[ptr++] = p2.y;
      positions[ptr++] = p2.z;
    }

    if (lineGeoRef.current) {
      const attr = lineGeoRef.current.attributes.position as THREE.BufferAttribute;
      (attr.array as Float32Array).set(positions);
      attr.needsUpdate = true;
    }
    if (haloLineGeoRef.current) {
      const attr = haloLineGeoRef.current.attributes.position as THREE.BufferAttribute;
      (attr.array as Float32Array).set(positions);
      attr.needsUpdate = true;
    }

    // Apply real-time Emotion-driven kinematics to the main Tesseract group
    if (groupRef.current) {
      if (currentEmotion === 'angry') {
        glitchTimerRef.current += delta;
        const glitchJump = Math.sin(time * 28) > 0.85 ? 0.22 : 0;
        const jitter = (Math.random() - 0.5) * 0.08;
        groupRef.current.position.set(jitter * 0.4, jitter * 0.4, 0);
        groupRef.current.scale.setScalar(1 + glitchJump + jitter);
        groupRef.current.rotation.x +=
          delta * vel.rotX * (1 + (Math.random() - 0.5) * 0.6);
        groupRef.current.rotation.y +=
          delta * vel.rotY * (1 + (Math.random() - 0.5) * 0.6);
        groupRef.current.rotation.z += delta * vel.rotZ;
      } else if (currentEmotion === 'sad') {
        groupRef.current.position.lerp(new THREE.Vector3(0, -0.08, 0), responseRate);
        groupRef.current.scale.setScalar(
          THREE.MathUtils.lerp(groupRef.current.scale.x, 0.92, responseRate)
        );
        groupRef.current.rotation.x += delta * vel.rotX;
        groupRef.current.rotation.y += delta * vel.rotY;
        groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.08;
      } else if (currentEmotion === 'confident') {
        groupRef.current.position.lerp(new THREE.Vector3(0, 0, 0), responseRate);
        const pulse = 1 + Math.sin(time * 4.5) * 0.07;
        groupRef.current.scale.setScalar(pulse);
        groupRef.current.rotation.x += delta * vel.rotX;
        groupRef.current.rotation.y += delta * vel.rotY;
        groupRef.current.rotation.z += delta * vel.rotZ;
      } else {
        // Calm: smooth, balanced rotations
        groupRef.current.position.lerp(new THREE.Vector3(0, 0, 0), responseRate);
        groupRef.current.scale.setScalar(
          THREE.MathUtils.lerp(groupRef.current.scale.x, 1.0, responseRate)
        );
        groupRef.current.rotation.x += delta * vel.rotX;
        groupRef.current.rotation.y += delta * vel.rotY;
        groupRef.current.rotation.z += delta * vel.rotZ;
      }
    }

    // 1. Gyroscope Rings Orbiting Tesseract (Euler Angle visualizer)
    if (gyroRef1.current) {
      gyroRef1.current.rotation.x += delta * 1.2 * vel.speedMult;
      gyroRef1.current.rotation.y += delta * 0.8 * vel.speedMult;
    }
    if (gyroRef2.current) {
      gyroRef2.current.rotation.y -= delta * 1.4 * vel.speedMult;
      gyroRef2.current.rotation.z += delta * 1.1 * vel.speedMult;
    }

    // 2. Targeting Reticle Dynamically Locking Onto Outer Vertex
    if (reticleRef.current && groupRef.current) {
      const vertexIdx = targetVertexIndex % 16;
      const targetPosLocal = projected[vertexIdx];

      const worldPos = targetPosLocal
        .clone()
        .applyEuler(groupRef.current.rotation);
      worldPos.multiply(groupRef.current.scale);
      worldPos.add(groupRef.current.position);

      reticleRef.current.position.lerp(worldPos, 0.28);
      reticleRef.current.rotation.z += delta * 2.5 * vel.speedMult;
      const reticlePulse = 1 + Math.sin(time * 6) * 0.15;
      reticleRef.current.scale.setScalar(reticlePulse);
    }

    // 3. Pulsing Stress Mesh Around Geometry
    if (stressMeshRef.current) {
      const pulseRate = theme.pulseSpeed;
      const stressScale = 1.35 + Math.sin(time * pulseRate) * 0.12;
      stressMeshRef.current.scale.setScalar(stressScale);
      stressMeshRef.current.rotation.x -= delta * 0.4 * vel.speedMult;
      stressMeshRef.current.rotation.y += delta * 0.5 * vel.speedMult;
    }
  });

  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[4, 5, 4]} intensity={1.4} color={theme.primary3d} />
      <pointLight
        position={[-4, -3, -2]}
        intensity={0.95}
        color={theme.secondary3d}
      />

      {/* Real-Time UnrealBloom Post-Processing Effect */}
      <TesseractBloomComposer emotion={currentEmotion} />

      {/* Main Rotating Tesseract Group */}
      <group ref={groupRef}>
        {/* Primary Crisp Tesseract 4D Wireframe Edges */}
        <lineSegments material={wireMaterial}>
          <bufferGeometry ref={lineGeoRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[initialLinePositions, 3]}
            />
          </bufferGeometry>
        </lineSegments>

        {/* Secondary Luminous Bloom Halo Wireframe Pass */}
        <lineSegments material={wireHaloMaterial} scale={1.018}>
          <bufferGeometry ref={haloLineGeoRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[initialHaloPositions, 3]}
            />
          </bufferGeometry>
        </lineSegments>

        {/* 16 Instanced 4D Vertex Glow Nodes */}
        <instancedMesh
          ref={vertexInstancesRef}
          args={[undefined, undefined, 16]}
          material={vertexNodeMaterial}
        >
          <sphereGeometry args={[0.032, 10, 10]} />
        </instancedMesh>

        {/* Inner Luminous Core Node */}
        <mesh>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshBasicMaterial
            color={theme.core3d}
            transparent
            opacity={currentEmotion === 'sad' ? 0.35 : 0.9}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 1. Rotating Translucent Gyroscope Rings (Euler Angle Visualization) */}
      <mesh ref={gyroRef1} material={gyroMaterial1}>
        <torusGeometry args={[1.65, 0.018, 16, 80]} />
      </mesh>
      <mesh ref={gyroRef2} material={gyroMaterial2}>
        <torusGeometry args={[1.82, 0.016, 16, 80]} />
      </mesh>

      {/* 2. Glowing Targeting Reticle (Locks onto Outer Vertex) */}
      <group ref={reticleRef}>
        <mesh material={reticleMaterial}>
          <ringGeometry args={[0.08, 0.11, 24]} />
        </mesh>
        <mesh material={reticleMaterial}>
          <circleGeometry args={[0.02, 12]} />
        </mesh>
        {/* Diamond crosshair corners */}
        <mesh material={reticleMaterial} rotation={[0, 0, Math.PI / 4]}>
          <ringGeometry args={[0.14, 0.155, 4]} />
        </mesh>
      </group>

      {/* 3. Pulsing Stress Mesh Around Geometry */}
      <mesh ref={stressMeshRef} material={stressMaterial}>
        <icosahedronGeometry args={[1, 1]} />
      </mesh>
    </>
  );
};

export const TesseractPanel: React.FC = () => {
  const { currentEmotion, theme } = useEmotion();

  return (
    <div
      data-testid="tesseract-panel"
      data-emotion={currentEmotion}
      className="tesseract-panel-container relative w-full h-full min-h-[160px] sm:min-h-[195px] rounded-xl overflow-hidden border transition-colors duration-300"
      style={{
        backgroundColor: theme.surfaceBg,
        borderColor: theme.uiBorder,
        boxShadow: `0 0 24px -4px ${theme.uiBorderGlow}, inset 0 0 18px -6px ${theme.uiBorderGlow}`,
      }}
    >
      {/* 3D WebGL Canvas via React Three Fiber with Real-Time Bloom Post-Processing */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 4.4], fov: 45 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.25,
          }}
        >
          <TesseractScene />
        </Canvas>
      </div>
    </div>
  );
};
export default TesseractPanel;
