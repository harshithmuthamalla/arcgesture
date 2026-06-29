import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectShader, BackgroundShader } from '../shaders/effectShader';
import type { Point } from '../hooks/useHandTracker';

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
  shockwaveCenter
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
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(256, 256, 140, 190, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw brain folds
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.0;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(256, 256, 35 + i * 20, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(256, 256, 35 + i * 20, Math.PI + 0.2, 2 * Math.PI - 0.2);
        ctx.stroke();
      }

      // Draw red tracking crosshairs
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(256, 0); ctx.lineTo(256, 512);
      ctx.moveTo(0, 256); ctx.lineTo(512, 256);
      ctx.stroke();

      // Tech details overlay text
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('MRI SECTION AX-109', 24, 45);
      ctx.fillText('PATIENT: OPERATOR_1', 24, 75);
      ctx.fillText('FREQ: 43.8MHz // GAIN: 12dB', 24, 105);
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

      // Drafting Gears, shafts, and guides
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.0;
      ctx.beginPath(); ctx.arc(256, 256, 110, 0, 2 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(256, 256, 40, 0, 2 * Math.PI); ctx.stroke();

      // Gear teeth lines
      for (let a = 0; a < 2 * Math.PI; a += 0.25) {
        ctx.beginPath();
        ctx.moveTo(256 + Math.cos(a) * 110, 256 + Math.sin(a) * 110);
        ctx.lineTo(256 + Math.cos(a) * 125, 256 + Math.sin(a) * 125);
        ctx.stroke();
      }

      // Compass circle arcs
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath(); ctx.arc(256, 256, 200, 0.2, 1.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(256, 256, 200, Math.PI, Math.PI + 1.0); ctx.stroke();

      // Tech details text
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('DWG: DRAFT_GEARBOX_A', 24, 45);
      ctx.fillText('SCALE: 1:1.0 // METRIC: mm', 24, 75);
      ctx.fillText('FIELD LOCKED SCHEMA', 24, 105);
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
    uShockwaveCenter: { value: new THREE.Vector2(0.5, 0.5) }
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
  shockwaveCenter
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
        />
      </Canvas>
    </div>
  );
};
