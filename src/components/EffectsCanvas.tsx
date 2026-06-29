import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectShader } from '../shaders/effectShader';
import { Point } from '../hooks/useHandTracker';

interface XRayWindowProps {
  video: HTMLVideoElement;
  pointsRef: React.MutableRefObject<Point[]>;
  effectMode: 'particle' | 'xray';
  effectIndex: number;
}

const XRayWindow: React.FC<XRayWindowProps> = ({ video, pointsRef, effectMode, effectIndex }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  
  const { size } = useThree();
  const currentModeRef = useRef<number>(0.0); // Smooth uMode transition

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

    // Update uMode transition
    const targetMode = effectMode === 'xray' ? 1.0 : 0.0;
    currentModeRef.current += (targetMode - currentModeRef.current) * 0.15;

    // Set uniforms
    mat.uniforms.uTexture.value = videoTextureRef.current;
    mat.uniforms.uTime.value = state.clock.getElapsedTime();
    mat.uniforms.uMode.value = currentModeRef.current;
    mat.uniforms.uEffectIndex.value = effectIndex;
    mat.uniforms.uResolution.value.set(size.width, size.height);

    const corners = pointsRef.current;
    if (corners.length === 4) {
      mesh.visible = true;

      // Map corner points to Three.js coordinates
      const mappedCorners = corners.map((p) => {
        // Mirrored camera horizontal coordinate
        const mx = 1.0 - p.x;
        return {
          x: mx * 2.0 - 1.0,
          y: (1.0 - p.y) * 2.0 - 1.0
        };
      });

      // bilinear points
      const bl = mappedCorners[2]; // Bottom-Left
      const br = mappedCorners[3]; // Bottom-Right
      const tl = mappedCorners[0]; // Top-Left
      const tr = mappedCorners[1]; // Top-Right

      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const uvAttr = geometry.getAttribute('uv') as THREE.BufferAttribute;
      const originalUvAttr = geometry.getAttribute('originalUv') as THREE.BufferAttribute;

      if (posAttr && uvAttr && originalUvAttr) {
        for (let i = 0; i < posAttr.count; i++) {
          // Read original grid uv coordinates
          const u = originalUvAttr.getX(i);
          const v = originalUvAttr.getY(i);

          // Bilinear interpolation
          const vx = (1 - u) * (1 - v) * bl.x + u * (1 - v) * br.x + (1 - u) * v * tl.x + u * v * tr.x;
          const vy = (1 - u) * (1 - v) * bl.y + u * (1 - v) * br.y + (1 - u) * v * tl.y + u * v * tr.y;

          posAttr.setXYZ(i, vx, vy, 0.0);

          // Screen space UV coordinates matching vertex position on screen
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
    uResolution: { value: new THREE.Vector2(size.width, size.height) }
  });

  // Setup subdivided geometry
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);
  useEffect(() => {
    const geo = new THREE.PlaneGeometry(2, 2, 32, 32);
    // Duplicate initial uv to 'originalUv' so we always have a reference of grid coordinate
    const uvs = geo.getAttribute('uv').clone();
    geo.setAttribute('originalUv', uvs);
    geometryRef.current = geo;

    return () => {
      geo.dispose();
    };
  }, []);

  if (!geometryRef.current) return null;

  return (
    <mesh ref={meshRef} geometry={geometryRef.current}>
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

interface EffectsCanvasProps {
  videoElement: HTMLVideoElement | null;
  pointsRef: React.MutableRefObject<Point[]>;
  effectMode: 'particle' | 'xray';
  effectIndex: number;
}

export const EffectsCanvas: React.FC<EffectsCanvasProps> = ({
  videoElement,
  pointsRef,
  effectMode,
  effectIndex
}) => {
  if (!videoElement) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
      <Canvas
        camera={{ position: [0, 0, 1] }}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <XRayWindow
          video={videoElement}
          pointsRef={pointsRef}
          effectMode={effectMode}
          effectIndex={effectIndex}
        />
      </Canvas>
    </div>
  );
};
