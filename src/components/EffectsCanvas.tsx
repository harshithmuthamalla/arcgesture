import { useRef, useEffect } from 'react';
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
  bloomStrength
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  
  const { size } = useThree();
  const currentModeRef = useRef<number>(0.0);

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
        for (let i = 0; i < posAttr.count; i++) {
          const u = originalUvAttr.getX(i);
          const v = originalUvAttr.getY(i);

          const vx = (1 - u) * (1 - v) * bl.x + u * (1 - v) * br.x + (1 - u) * v * tl.x + u * v * tr.x;
          const vy = (1 - u) * (1 - v) * bl.y + u * (1 - v) * br.y + (1 - u) * v * tl.y + u * v * tr.y;

          posAttr.setXYZ(i, vx, vy, 0.0);

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
    uBloomStrength: { value: 0.0 }
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

// Full-Screen Background Video Plane Component
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
  bloomStrength
}) => {
  if (!videoElement) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
      <Canvas
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
        />
      </Canvas>
    </div>
  );
};
