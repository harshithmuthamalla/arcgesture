import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectShader } from '../shaders/effectShader';

interface ShaderPlaneProps {
  video: HTMLVideoElement;
  boxRef: React.MutableRefObject<[number, number, number, number]>;
  effectIndex: number;
}

const ShaderPlane: React.FC<ShaderPlaneProps> = ({ video, boxRef, effectIndex }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const { size } = useThree();

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
    if (materialRef.current && videoTextureRef.current) {
      const mat = materialRef.current;
      mat.uniforms.uTexture.value = videoTextureRef.current;
      mat.uniforms.uTime.value = state.clock.getElapsedTime();
      
      const [xMin, yMin, xMax, yMax] = boxRef.current;
      mat.uniforms.uBox.value.set(xMin, yMin, xMax, yMax);
      mat.uniforms.uEffect.value = effectIndex;
      mat.uniforms.uResolution.value.set(size.width, size.height);
    }
  });

  const uniforms = useRef({
    uTexture: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uBox: { value: new THREE.Vector4(0, 0, 0, 0) },
    uEffect: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={EffectShader.vertexShader}
        fragmentShader={EffectShader.fragmentShader}
        uniforms={uniforms.current}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
};

interface EffectsCanvasProps {
  videoElement: HTMLVideoElement | null;
  boxRef: React.MutableRefObject<[number, number, number, number]>;
  effectIndex: number;
}

export const EffectsCanvas: React.FC<EffectsCanvasProps> = ({ videoElement, boxRef, effectIndex }) => {
  if (!videoElement) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 1] }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <ShaderPlane video={videoElement} boxRef={boxRef} effectIndex={effectIndex} />
      </Canvas>
    </div>
  );
};
