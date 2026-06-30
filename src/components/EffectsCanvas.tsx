import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectShader, BackgroundShader } from '../shaders/effectShader';
import type { Point } from '../hooks/useHandTracker';
import { getAudioPulse } from '../utils/audio';

interface XRayWindowProps {
  video: HTMLVideoElement;
  pointsRef: React.MutableRefObject<Point[]>;
  effectMode: 'particle' | 'xray';
  effectIndex: number;
  leftAttractor: Point;
  rightAttractor: Point;
  leftVelocity: Point;
  rightVelocity: Point;
  leftDepth: number;
  rightDepth: number;
  pinchLActive: boolean;
  pinchRActive: boolean;
  bloomStrength: number;
  
  // Settings values from App HUD
  speedMultiplier: number;
  grainMultiplier: number;
  neonMultiplier: number;

  // Standout visual features
  useCase: 'standard' | 'medical' | 'blueprint';
  docZoom: number;
  docPan: { x: number; y: number };
  shockwaveTime: number;
  shockwaveCenter: { x: number; y: number };
  audioReactive: boolean;
}

const XRayWindow: React.FC<XRayWindowProps> = ({
  video,
  pointsRef,
  effectMode,
  effectIndex,
  leftAttractor,
  rightAttractor,
  leftVelocity,
  rightVelocity,
  leftDepth,
  rightDepth,
  pinchLActive,
  pinchRActive,
  bloomStrength,
  speedMultiplier,
  grainMultiplier,
  neonMultiplier,
  useCase,
  docZoom,
  docPan,
  shockwaveTime,
  shockwaveCenter,
  audioReactive
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  
  const { size } = useThree();
  const currentModeRef = useRef<number>(0.0);

  // Generate dynamic Document Texture in memory (avoiding external assets)
  const docTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // 1. Draw MRI Brain Scan Slice
    if (useCase === 'medical') {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 512, 512);

      // Draw cerebrum contour (outer border)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(256, 256, 140, 190, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Tech details overlay text
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('MRI SECTION AX-109', 24, 45);
      ctx.fillText('PATIENT: OPERATOR_1', 24, 75);
      ctx.fillText('3D SCANNER ACTIVE', 24, 105);
    } 
    // 2. Draw mechanical machine blueprint
    else if (useCase === 'blueprint') {
      ctx.fillStyle = '#021544';
      ctx.fillRect(0, 0, 512, 512);

      // Blueprint drafting grid
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.lineWidth = 1.0;
      for (let i = 0; i < 512; i += 32) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
      }

      // Tech details text
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('DWG: DRAFT_GEARBOX_A', 24, 45);
      ctx.fillText('SCALE: 1:1.0 // METRIC: mm', 24, 75);
      ctx.fillText('3D SCHEMA VIEW ACTIVE', 24, 105);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [useCase]);

  useEffect(() => {
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    videoTextureRef.current = texture;

    return () => {
      texture.dispose();
    };
  }, [video]);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current || !videoTextureRef.current) return;

    const mesh = meshRef.current;
    const mat = materialRef.current;
    const geometry = mesh.geometry as THREE.BufferGeometry;

    const targetMode = effectMode === 'xray' ? 1.0 : 0.0;
    currentModeRef.current += (targetMode - currentModeRef.current) * 0.15;

    // Set uniforms
    mat.uniforms.uTexture.value = videoTextureRef.current;
    mat.uniforms.uDocTexture.value = docTexture;
    mat.uniforms.uTime.value = state.clock.getElapsedTime();
    mat.uniforms.uMode.value = currentModeRef.current;
    mat.uniforms.uEffectIndex.value = effectIndex;
    mat.uniforms.uResolution.value.set(size.width, size.height);

    // Pass interactive attractor positions & pinch strengths
    mat.uniforms.uLeftAttractor.value.set(leftAttractor.x, leftAttractor.y);
    mat.uniforms.uRightAttractor.value.set(rightAttractor.x, rightAttractor.y);
    mat.uniforms.uLeftVelocity.value.set(leftVelocity.x, leftVelocity.y);
    mat.uniforms.uRightVelocity.value.set(rightVelocity.x, rightVelocity.y);
    mat.uniforms.uLeftPinch.value = pinchLActive ? 1.0 : 0.0;
    mat.uniforms.uRightPinch.value = pinchRActive ? 1.0 : 0.0;
    mat.uniforms.uLeftDepth.value = leftDepth;
    mat.uniforms.uRightDepth.value = rightDepth;
    mat.uniforms.uBloomStrength.value = bloomStrength;

    // Pass settings multipliers
    mat.uniforms.uSpeedMultiplier.value = speedMultiplier;
    mat.uniforms.uGrainMultiplier.value = grainMultiplier;
    mat.uniforms.uNeonMultiplier.value = neonMultiplier;

    // Audio reactive uniform
    mat.uniforms.uAudioPulse.value = audioReactive ? getAudioPulse() : 0.0;

    // Document zoom & pan config
    mat.uniforms.uUseDoc.value = useCase !== 'standard' ? 1.0 : 0.0;
    mat.uniforms.uDocZoom.value = docZoom;
    mat.uniforms.uDocPan.value.set(docPan.x, docPan.y);

    // Global Shockwave trigger uniforms
    mat.uniforms.uShockwaveTime.value = shockwaveTime;
    mat.uniforms.uShockwaveCenter.value.set(shockwaveCenter.x, shockwaveCenter.y);

    const corners = pointsRef.current;
    if (corners.length === 4) {
      mesh.visible = true;

      const mappedCorners = corners.map((p) => {
        const mx = 1.0 - p.x;
        return {
          x: mx * 2.0 - 1.0,
          y: (1.0 - p.y) * 2.0 - 1.0
        };
      });

      const bl = mappedCorners[2];
      const br = mappedCorners[3];
      const tl = mappedCorners[0];
      const tr = mappedCorners[1];

      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const uvAttr = geometry.getAttribute('uv') as THREE.BufferAttribute;
      const originalUvAttr = geometry.getAttribute('originalUv') as THREE.BufferAttribute;

      if (posAttr && uvAttr && originalUvAttr) {
        // Compute average Z depth based on hand depth estimate to translate board coordinates
        const avgDepthVal = (leftDepth + rightDepth) / 2;
        // Pushing hands closer (avgDepthVal goes to 1.0) brings lens closer physically
        const vz = -0.15 + avgDepthVal * 0.3;

        for (let i = 0; i < posAttr.count; i++) {
          const u = originalUvAttr.getX(i);
          const v = originalUvAttr.getY(i);

          const vx = (1 - u) * (1 - v) * bl.x + u * (1 - v) * br.x + (1 - u) * v * tl.x + u * v * tr.x;
          const vy = (1 - u) * (1 - v) * bl.y + u * (1 - v) * br.y + (1 - u) * v * tl.y + u * v * tr.y;

          posAttr.setXYZ(i, vx, vy, vz);

          const screenU = (vx + 1.0) / 2.0;
          const screenV = (vy + 1.0) / 2.0;
          uvAttr.setXY(i, screenU, screenV);
        }
        posAttr.needsUpdate = true;
        uvAttr.needsUpdate = true;
      }
    } else {
      mesh.visible = false;
    }
  });

  const uniforms = useRef({
    uTexture: { value: null as THREE.Texture | null },
    uDocTexture: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uMode: { value: 0.0 },
    uEffectIndex: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uLeftAttractor: { value: new THREE.Vector2() },
    uRightAttractor: { value: new THREE.Vector2() },
    uLeftVelocity: { value: new THREE.Vector2() },
    uRightVelocity: { value: new THREE.Vector2() },
    uLeftPinch: { value: 0.0 },
    uRightPinch: { value: 0.0 },
    uLeftDepth: { value: 0.0 },
    uRightDepth: { value: 0.0 },
    uBloomStrength: { value: 0.0 },
    uSpeedMultiplier: { value: 1.0 },
    uGrainMultiplier: { value: 1.0 },
    uNeonMultiplier: { value: 1.0 },
    uUseDoc: { value: 0.0 },
    uDocZoom: { value: 1.0 },
    uDocPan: { value: new THREE.Vector2(0, 0) },
    uShockwaveTime: { value: -1.0 },
    uShockwaveCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uAudioPulse: { value: 0.0 }
  });

  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);
  useEffect(() => {
    const geo = new THREE.PlaneGeometry(2, 2, 32, 32);
    const uvs = geo.getAttribute('uv').clone();
    geo.setAttribute('originalUv', uvs);
    geometryRef.current = geo;

    return () => {
      geo.dispose();
    };
  }, []);

  if (!geometryRef.current) return null;

  return (
    <mesh ref={meshRef} geometry={geometryRef.current} position={[0, 0, 0.01]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={EffectShader.vertexShader}
        fragmentShader={EffectShader.fragmentShader}
        uniforms={uniforms.current}
        depthWrite={false}
        depthTest={false}
        transparent={true}
      />
    </mesh>
  );
};

interface BackgroundPlaneProps {
  video: HTMLVideoElement;
}

const BackgroundPlane: React.FC<BackgroundPlaneProps> = ({ video }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);

  useEffect(() => {
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    videoTextureRef.current = texture;

    return () => {
      texture.dispose();
    };
  }, [video]);

  useFrame(() => {
    if (materialRef.current && videoTextureRef.current) {
      materialRef.current.uniforms.uTexture.value = videoTextureRef.current;
    }
  });

  const uniforms = useRef({
    uTexture: { value: null as THREE.Texture | null }
  });

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={BackgroundShader.vertexShader}
        fragmentShader={BackgroundShader.fragmentShader}
        uniforms={uniforms.current}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
};

interface Hologram3DModelProps {
  useCase: 'standard' | 'medical' | 'blueprint';
  effectMode: 'particle' | 'xray';
  pointsRef: React.MutableRefObject<Point[]>;
  leftDepth: number;
  rightDepth: number;
  leftAttractor: Point;
  rightAttractor: Point;
  audioReactive: boolean;
  docZoom: number;
  docPan: { x: number; y: number };
  isFieldLocked: boolean;
  medicalDiagramIndex: number;
}

const Hologram3DModel: React.FC<Hologram3DModelProps> = ({
  useCase,
  effectMode,
  pointsRef,
  leftDepth,
  rightDepth,
  leftAttractor,
  rightAttractor,
  audioReactive,
  docZoom,
  docPan,
  isFieldLocked,
  medicalDiagramIndex
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const gear1Ref = useRef<THREE.Group>(null);
  const gear2Ref = useRef<THREE.Group>(null);
  const brainRingRef = useRef<THREE.Mesh>(null);
  const dnaRef = useRef<THREE.Group>(null);
  const heartRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const corners = pointsRef.current;
    if (corners.length === 4 && useCase !== 'standard') {
      groupRef.current.visible = true;

      const mappedCorners = corners.map((p) => {
        const mx = 1.0 - p.x;
        return {
          x: mx * 2.0 - 1.0,
          y: (1.0 - p.y) * 2.0 - 1.0
        };
      });

      const bl = mappedCorners[2];
      const br = mappedCorners[3];
      const tl = mappedCorners[0];
      const tr = mappedCorners[1];

      const centerX = (bl.x + br.x + tl.x + tr.x) / 4;
      const centerY = (bl.y + br.y + tl.y + tr.y) / 4;
      
      const width = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2));
      const height = Math.sqrt(Math.pow(tl.x - bl.x, 2) + Math.pow(tl.y - bl.y, 2));
      const avgDepthVal = (leftDepth + rightDepth) / 2;
      const centerZ = -0.15 + avgDepthVal * 0.3;

      // Center the 3D model slightly in front of the lens plane coordinates
      groupRef.current.position.set(centerX + docPan.x * 0.18, centerY + docPan.y * 0.18, centerZ + 0.05);

      // Adjust model sizing based on boundary width, camera depth zoom, and microphone audio reactivity
      const baseScale = Math.min(width, height) * 0.42;
      let pulse = 0.0;
      if (audioReactive) {
        pulse = getAudioPulse();
      }
      groupRef.current.scale.setScalar(baseScale * docZoom * (1.0 + pulse * 0.4));

      // Rotate based on index finger line angle + auto rotation
      const dx = (1.0 - rightAttractor.x) - (1.0 - leftAttractor.x);
      const dy = rightAttractor.y - leftAttractor.y;
      const angle = Math.atan2(dy, dx);

      groupRef.current.rotation.z = angle;
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.65;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.18) * 0.25;

      // Gears animation
      if (useCase === 'blueprint') {
        if (gear1Ref.current) {
          gear1Ref.current.rotation.y = state.clock.getElapsedTime() * 1.6;
        }
        if (gear2Ref.current) {
          gear2Ref.current.rotation.y = -state.clock.getElapsedTime() * 1.6;
        }
      }

      // Brain scan ring animation
      if (useCase === 'medical' && brainRingRef.current) {
        brainRingRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 2.8) * 0.28;
      }

      // DNA spin animation
      if (useCase === 'medical' && medicalDiagramIndex === 1 && dnaRef.current) {
        dnaRef.current.rotation.y = state.clock.getElapsedTime() * 1.8;
      }

      // Heartbeat animation
      if (useCase === 'medical' && medicalDiagramIndex === 2 && heartRef.current) {
        const beat = 1.0 + Math.max(0, Math.sin(state.clock.getElapsedTime() * 5.8)) * 0.14;
        heartRef.current.scale.set(beat, beat, beat);
      }
    } else {
      groupRef.current.visible = false;
    }
  });

  const mainColor = isFieldLocked
    ? '#f59e0b'
    : effectMode === 'xray'
      ? '#22d3ee'
      : '#10b981';

  const innerColor = effectMode === 'xray' ? '#ec4899' : '#06b6d4';

  const teethElements = useMemo(() => {
    const elements = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      elements.push(
        <mesh key={i} position={[Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22]} rotation={[0, -a, 0]}>
          <boxGeometry args={[0.07, 0.05, 0.05]} />
          <meshBasicMaterial wireframe color={mainColor} />
        </mesh>
      );
    }
    return elements;
  }, [mainColor]);

  const teeth2Elements = useMemo(() => {
    const elements = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      elements.push(
        <mesh key={i} position={[Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12]} rotation={[0, -a, 0]}>
          <boxGeometry args={[0.05, 0.05, 0.04]} />
          <meshBasicMaterial wireframe color={mainColor} />
        </mesh>
      );
    }
    return elements;
  }, [mainColor]);

  const dnaRungs = useMemo(() => {
    const rungs = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const y = (i - (count - 1) / 2) * 0.05;
      const angle = i * 0.42;
      rungs.push(
        <group key={i} position={[0, y, 0]} rotation={[0, -angle, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.005, 0.005, 0.32]} />
            <meshBasicMaterial color={mainColor} transparent opacity={0.6} />
          </mesh>
          <mesh position={[0.16, 0, 0]}>
            <sphereGeometry args={[0.024, 8, 8]} />
            <meshBasicMaterial color={mainColor} />
          </mesh>
          <mesh position={[-0.16, 0, 0]}>
            <sphereGeometry args={[0.024, 8, 8]} />
            <meshBasicMaterial color={innerColor} />
          </mesh>
        </group>
      );
    }
    return rungs;
  }, [mainColor, innerColor]);

  return (
    <group ref={groupRef}>
      {/* 3D Medical Mode models */}
      {useCase === 'medical' && (
        <group>
          {/* Index 0: 3D Spatial Brain Scan */}
          {medicalDiagramIndex === 0 && (
            <group>
              {/* Lobe Left */}
              <mesh position={[-0.11, 0.03, 0]} scale={[1.3, 0.95, 0.9]}>
                <sphereGeometry args={[0.2, 12, 12]} />
                <meshBasicMaterial wireframe color={mainColor} transparent opacity={0.8} />
              </mesh>
              {/* Lobe Right */}
              <mesh position={[0.11, 0.03, 0]} scale={[1.3, 0.95, 0.9]}>
                <sphereGeometry args={[0.2, 12, 12]} />
                <meshBasicMaterial wireframe color={mainColor} transparent opacity={0.8} />
              </mesh>
              {/* Stem */}
              <mesh position={[0, -0.2, -0.04]} rotation={[0.15, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.035, 0.2, 8]} />
                <meshBasicMaterial wireframe color={mainColor} />
              </mesh>
              {/* Inner core */}
              <mesh>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshBasicMaterial color={innerColor} transparent opacity={effectMode === 'xray' ? 0.8 : 0.3} />
              </mesh>
              {/* Scan ring */}
              <mesh ref={brainRingRef} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.34, 0.012, 6, 24]} />
                <meshBasicMaterial color={mainColor} />
              </mesh>
            </group>
          )}

          {/* Index 1: Holographic DNA Double Helix */}
          {medicalDiagramIndex === 1 && (
            <group ref={dnaRef}>
              {dnaRungs}
            </group>
          )}

          {/* Index 2: Cardiological Heart Ventricle Model */}
          {medicalDiagramIndex === 2 && (
            <group ref={heartRef}>
              {/* Ventricle main body */}
              <mesh>
                <sphereGeometry args={[0.15, 12, 12]} />
                <meshBasicMaterial wireframe color={mainColor} />
              </mesh>
              {/* Aorta arch */}
              <mesh position={[0.05, 0.14, 0]} rotation={[0, 0, -0.25]}>
                <cylinderGeometry args={[0.024, 0.024, 0.18, 8]} />
                <meshBasicMaterial wireframe color={mainColor} />
              </mesh>
              {/* Pulmonary Artery */}
              <mesh position={[-0.06, 0.1, 0]} rotation={[0, 0, 0.3]}>
                <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
                <meshBasicMaterial wireframe color={mainColor} />
              </mesh>
              {/* Internal beating core */}
              <mesh>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial color={innerColor} transparent opacity={effectMode === 'xray' ? 0.85 : 0.4} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* 3D CAD Gear model */}
      {useCase === 'blueprint' && (
        <group>
          {/* Gear 1 */}
          <group ref={gear1Ref} position={[-0.18, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.2, 0.2, 0.04, 16]} />
              <meshBasicMaterial wireframe color={mainColor} />
            </mesh>
            {teethElements}
            <mesh>
              <cylinderGeometry args={[0.04, 0.04, 0.08, 8]} />
              <meshBasicMaterial color={innerColor} />
            </mesh>
          </group>

          {/* Gear 2 */}
          <group ref={gear2Ref} position={[0.16, 0, 0]} rotation={[0, Math.PI / 6, 0]}>
            <mesh>
              <cylinderGeometry args={[0.1, 0.1, 0.04, 12]} />
              <meshBasicMaterial wireframe color={mainColor} />
            </mesh>
            {teeth2Elements}
            <mesh>
              <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
              <meshBasicMaterial color={innerColor} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

interface EffectsCanvasProps {
  videoElement: HTMLVideoElement | null;
  pointsRef: React.MutableRefObject<Point[]>;
  effectMode: 'particle' | 'xray';
  effectIndex: number;
  leftAttractor: Point;
  rightAttractor: Point;
  leftVelocity: Point;
  rightVelocity: Point;
  leftDepth: number;
  rightDepth: number;
  pinchLActive: boolean;
  pinchRActive: boolean;
  bloomStrength: number;
  speedMultiplier: number;
  grainMultiplier: number;
  neonMultiplier: number;

  // Standout features props
  useCase: 'standard' | 'medical' | 'blueprint';
  docZoom: number;
  docPan: { x: number; y: number };
  shockwaveTime: number;
  shockwaveCenter: { x: number; y: number };
  audioReactive: boolean;
  isFieldLocked: boolean;
  medicalDiagramIndex: number;
}

export const EffectsCanvas: React.FC<EffectsCanvasProps> = ({
  videoElement,
  pointsRef,
  effectMode,
  effectIndex,
  leftAttractor,
  rightAttractor,
  leftVelocity,
  rightVelocity,
  leftDepth,
  rightDepth,
  pinchLActive,
  pinchRActive,
  bloomStrength,
  speedMultiplier,
  grainMultiplier,
  neonMultiplier,
  useCase,
  docZoom,
  docPan,
  shockwaveTime,
  shockwaveCenter,
  audioReactive,
  isFieldLocked,
  medicalDiagramIndex
}) => {
  if (!videoElement) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
      <Canvas
        id="three-canvas"
        camera={{ position: [0, 0, 1] }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: false }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <BackgroundPlane video={videoElement} />
        <XRayWindow
          video={videoElement}
          pointsRef={pointsRef}
          effectMode={effectMode}
          effectIndex={effectIndex}
          leftAttractor={leftAttractor}
          rightAttractor={rightAttractor}
          leftVelocity={leftVelocity}
          rightVelocity={rightVelocity}
          leftDepth={leftDepth}
          rightDepth={rightDepth}
          pinchLActive={pinchLActive}
          pinchRActive={pinchRActive}
          bloomStrength={bloomStrength}
          speedMultiplier={speedMultiplier}
          grainMultiplier={grainMultiplier}
          neonMultiplier={neonMultiplier}
          useCase={useCase}
          docZoom={docZoom}
          docPan={docPan}
          shockwaveTime={shockwaveTime}
          shockwaveCenter={shockwaveCenter}
          audioReactive={audioReactive}
        />
        <Hologram3DModel
          useCase={useCase}
          effectMode={effectMode}
          pointsRef={pointsRef}
          leftDepth={leftDepth}
          rightDepth={rightDepth}
          leftAttractor={leftAttractor}
          rightAttractor={rightAttractor}
          audioReactive={audioReactive}
          docZoom={docZoom}
          docPan={docPan}
          isFieldLocked={isFieldLocked}
          medicalDiagramIndex={medicalDiagramIndex}
        />
      </Canvas>
    </div>
  );
};
