# Unified Hand Frame, X-Ray & Interactive Enhancements Implementation Plan

This plan merges all visual effects, bilateral plane deformations, and the **4 new interactive features**:
1. **Interactive Fluid Flow Field (Curl Noise)**: Finger velocity swirls the particles and texture coordinates.
2. **Depth-Reactive Audio-Visual Bloom**: Moving hands closer to the camera drops oscillator pitch and boosts shader glow.
3. **Sliding Holographic Settings HUD**: Hovering index finger in the left/right margins opens a sliders panel.
4. **Thumbs-up Gestural Recording**: Holding thumbs-up for 2 seconds records a 5-second WebM composite clip.

---

## Technical Specifications & Code Models

### 1. Composite Canvas Architecture
To record the complete output (background camera + deformed quad lens + shaders), we render the background video directly inside Three.js on a full-screen background quad, and overlay the deformed mesh on top. This eliminates the transparent canvas overlay and makes the Three.js `<canvas>` element the single source of truth for recording.

```mermaid
graph TD
    ThreeJS[Three.js Master Canvas]
    BgPlane[BackgroundPlane: Full-screen video texture]
    DeformedPlane[XRayWindow: Subdivided deformed plane]
    MediaRecorder[MediaRecorder API: Captures canvas stream]

    ThreeJS --> BgPlane
    ThreeJS --> DeformedPlane
    ThreeJS -->|domElement.captureStream| MediaRecorder
```

### 2. Holographic Settings Menu Collision Detection
The settings panel is rendered as a glassmorphic DOM container on the right side of the screen.
- Slider bounding boxes (normalized 0 to 1) are defined.
- If the index finger tip is inside the slider bounding box:
  $$\text{Value} = \text{clamp}\left(\frac{\text{FingerX} - \text{SliderMinX}}{\text{SliderWidth}}, 0.0, 1.0\right)$$
- Hovering a finger in the margin ($x < 0.1$ or $x > 0.9$) slides the panel in/out.

### 3. Thumbs-up Gesture Detection
A thumbs-up is active if:
1. Thumb tip (4) is above the thumb IP joint (3).
2. The other four fingertips (8, 12, 16, 20) are folded (their distance to the wrist is less than 1.3 times the distance of their MCP joints to the wrist).
3. The hand is oriented vertically.

---

## Proposed Changes

### [MODIFY] [useHandTracker.ts](file:///d:/my--projects/deskops/src/hooks/useHandTracker.ts)
- Add thumbs-up gesture classifier logic (`isThumbsUp`).
- Track hand depth scores: `depthL = length(handL[0] - handL[9])` and `depthR = length(handR[0] - handR[9])`.
- Calculate hand velocities: `vel = (pos - prevPos) / dT`.
- Track recording states: `isRecording` (boolean), `recordProgress` (number, 0 to 1).
- Expose all interactive values (`leftAttractor`, `rightAttractor`, `pinchLActive`, `pinchRActive`, `leftVelocity`, `rightVelocity`, `leftDepth`, `rightDepth`, `isThumbsUpL`, `isThumbsUpR`).

### [MODIFY] [effectShader.ts](file:///d:/my--projects/deskops/src/shaders/effectShader.ts)
- Add background vertex/fragment shader.
- Add uniforms: `uLeftVelocity` (vec2), `uRightVelocity` (vec2), `uLeftDepth` (float), `uRightDepth` (float), `uBloomStrength` (float).
- Implement interactive Curl Fluid Flow Field displacement on texture coordinates.
- Multiply edge strengths and glowing halos by the dynamic `uBloomStrength` uniform.

### [MODIFY] [EffectsCanvas.tsx](file:///d:/my--projects/deskops/src/components/EffectsCanvas.tsx)
- Render the full-screen background video plane behind the deformed `XRayWindow` plane.
- Pass velocity, depth, and bloom uniforms inside the `useFrame` loop.

### [MODIFY] [App.tsx](file:///d:/my--projects/deskops/src/App.tsx)
- Build the sliding settings HUD using Tailwind CSS.
- Map fingertip coordinate collisions to slider value adjustments.
- Implement the MediaRecorder WebM recording capture pipeline.
- Render visual indicators for recording (blinking REC icon and progress circle).

---

## Detailed Tasks

### Task 1: Update useHandTracker for Gesture Velocities and Depth

**Files:**
- Modify: `src/hooks/useHandTracker.ts`

- [ ] **Step 1: Write thumbs-up, depth, and velocity calculations**

Overwrite [src/hooks/useHandTracker.ts](file:///d:/my--projects/deskops/src/hooks/useHandTracker.ts):
```typescript
import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { playSwitchSound } from '../utils/audio';

export interface Point {
  x: number;
  y: number;
}

export const useHandTracker = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onEffectSwitch: () => void
) => {
  const [modelsReady, setModelsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [effectMode, setEffectMode] = useState<'particle' | 'xray'>('particle');
  const [pointsState, setPointsState] = useState<Point[]>([]);
  
  // Interactive coordinates and gestures states
  const [leftAttractor, setLeftAttractor] = useState<Point>({ x: 0.5, y: 0.5 });
  const [rightAttractor, setRightAttractor] = useState<Point>({ x: 0.5, y: 0.5 });
  const [leftVelocity, setLeftVelocity] = useState<Point>({ x: 0, y: 0 });
  const [rightVelocity, setRightVelocity] = useState<Point>({ x: 0, y: 0 });
  const [leftDepth, setLeftDepth] = useState(0.0);
  const [rightDepth, setRightDepth] = useState(0.0);
  const [pinchLActive, setPinchLActive] = useState(false);
  const [pinchRActive, setPinchRActive] = useState(false);
  const [isThumbsUpL, setIsThumbsUpL] = useState(false);
  const [isThumbsUpR, setIsThumbsUpR] = useState(false);

  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const lastClapTimeRef = useRef<number>(0);
  
  const prevLeftRef = useRef<Point>({ x: 0.5, y: 0.5 });
  const prevRightRef = useRef<Point>({ x: 0.5, y: 0.5 });
  const lastTimeRef = useRef<number>(0);

  const alpha = 0.25;

  useEffect(() => {
    let active = true;

    const initTracker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });

        if (active) {
          landmarkerRef.current = landmarker;
          setModelsReady(true);
        }
      } catch (err: any) {
        console.error(err);
        if (active) {
          setErrorMsg('Failed to initialize MediaPipe models. Check connection.');
        }
      }
    };

    initTracker();
    return () => {
      active = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [9, 10], [10, 11], [11, 12],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17], [0, 13],
      [13, 14], [14, 15], [15, 16],
    ];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

    landmarks.forEach((hand) => {
      connections.forEach(([i, j]) => {
        if (hand[i] && hand[j]) {
          ctx.beginPath();
          ctx.moveTo((1 - hand[i].x) * ctx.canvas.width, hand[i].y * ctx.canvas.height);
          ctx.lineTo((1 - hand[j].x) * ctx.canvas.width, hand[j].y * ctx.canvas.height);
          ctx.stroke();
        }
      });

      hand.forEach((lm: any) => {
        ctx.beginPath();
        ctx.arc((1 - lm.x) * ctx.canvas.width, lm.y * ctx.canvas.height, 1.5, 0, 2 * Math.PI);
        ctx.fill();
      });
    });

    ctx.shadowBlur = 0;
  };

  const isPinching = (hand: any) => {
    const dx = hand[8].x - hand[4].x;
    const dy = hand[8].y - hand[4].y;
    return Math.sqrt(dx * dx + dy * dy) < 0.20;
  };

  // Thumbs up classifier
  const checkThumbsUp = (hand: any): boolean => {
    const wrist = hand[0];
    const thumbTip = hand[4];
    const thumbIP = hand[3];

    // 1. Thumb tip is higher than knuckle IP joint
    const thumbExtended = thumbTip.y < thumbIP.y - 0.02;

    // 2. Index, middle, ring, pinky are folded
    const foldedCount = [8, 12, 16, 20].filter((tipIdx) => {
      const tip = hand[tipIdx];
      const mcp = hand[tipIdx - 3]; // Knuckle base joint
      
      const distTipWrist = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
      const distMcpWrist = Math.sqrt(Math.pow(mcp.x - wrist.x, 2) + Math.pow(mcp.y - wrist.y, 2));
      
      return distTipWrist < distMcpWrist * 1.3;
    }).length;

    return thumbExtended && foldedCount >= 3;
  };

  const processFrame = () => {
    if (!landmarkerRef.current || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (video.readyState >= 2) {
      const results = landmarkerRef.current.detectForVideo(video, performance.now());
      
      if (results.landmarks && results.landmarks.length > 0) {
        drawSkeleton(ctx, results.landmarks);

        if (results.landmarks.length === 2) {
          const sortedHands = [...results.landmarks].sort((a, b) => (1 - b[0].x) - (1 - a[0].x));
          const handL = sortedHands[0];
          const handR = sortedHands[1];

          const pinchL = isPinching(handL);
          const pinchR = isPinching(handR);

          setPinchLActive(pinchL);
          setPinchRActive(pinchR);

          setIsThumbsUpL(checkThumbsUp(handL));
          setIsThumbsUpR(checkThumbsUp(handR));

          // Calculate Depth (distance between wrist (0) and middle knuckle (9))
          const dL = Math.sqrt(Math.pow(handL[0].x - handL[9].x, 2) + Math.pow(handL[0].y - handL[9].y, 2));
          const dR = Math.sqrt(Math.pow(handR[0].x - handR[9].x, 2) + Math.pow(handR[0].y - handR[9].y, 2));
          // Normalize from ~0.08 (far) -> ~0.24 (close)
          setLeftDepth(Math.max(0.0, Math.min(1.0, (dL - 0.08) / 0.16)));
          setRightDepth(Math.max(0.0, Math.min(1.0, (dR - 0.08) / 0.16)));

          // Set Attractor Positions
          setLeftAttractor({ x: handL[8].x, y: handL[8].y });
          setRightAttractor({ x: handR[8].x, y: handR[8].y });

          // Calculate hand velocities
          const now = performance.now();
          const dT = Math.max(1.0, now - lastTimeRef.current) / 1000;
          lastTimeRef.current = now;

          const vxL = (handL[8].x - prevLeftRef.current.x) / dT;
          const vyL = (handL[8].y - prevLeftRef.current.y) / dT;
          const vxR = (handR[8].x - prevRightRef.current.x) / dT;
          const vyR = (handR[8].y - prevRightRef.current.y) / dT;

          // Apply EMA smoothing to velocities
          setLeftVelocity((prev) => ({
            x: prev.x + 0.3 * (vxL - prev.x),
            y: prev.y + 0.3 * (vyL - prev.y)
          }));
          setRightVelocity((prev) => ({
            x: prev.x + 0.3 * (vxR - prev.x),
            y: prev.y + 0.3 * (vyR - prev.y)
          }));

          prevLeftRef.current = { x: handL[8].x, y: handL[8].y };
          prevRightRef.current = { x: handR[8].x, y: handR[8].y };

          const activeMode = (pinchL && pinchR) ? 'xray' : 'particle';
          setEffectMode(activeMode);

          const pL_mcp = handL[9];
          const pR_mcp = handR[9];
          const dx_mcp = pR_mcp.x - pL_mcp.x;
          const dy_mcp = pR_mcp.y - pL_mcp.y;
          const clapDist = Math.sqrt(dx_mcp * dx_mcp + dy_mcp * dy_mcp);

          if (clapDist < 0.1 && activeMode !== 'xray') {
            const nowClap = performance.now();
            if (nowClap - lastClapTimeRef.current > 1000) {
              lastClapTimeRef.current = nowClap;
              playSwitchSound();
              onEffectSwitch();
            }
            pointsRef.current = [];
            setPointsState([]);
          } else {
            let targetPoints: Point[] = [];

            if (activeMode === 'xray') {
              const pL_idx = handL[8];
              const pL_thb = handL[4];
              const cL = { x: (pL_idx.x + pL_thb.x) / 2, y: (pL_idx.y + pL_thb.y) / 2 };

              const pR_idx = handR[8];
              const pR_thb = handR[4];
              const cR = { x: (pR_idx.x + pR_thb.x) / 2, y: (pR_idx.y + pR_thb.y) / 2 };

              targetPoints = [
                { x: cL.x, y: cL.y - 0.075 },
                { x: cR.x, y: cR.y - 0.075 },
                { x: cL.x, y: cL.y + 0.075 },
                { x: cR.x, y: cR.y + 0.075 }
              ];
            } else {
              targetPoints = [
                handL[8],
                handR[8],
                handL[4],
                handR[4]
              ];
            }

            if (pointsRef.current.length !== 4) {
              pointsRef.current = targetPoints;
            } else {
              pointsRef.current = pointsRef.current.map((prev, idx) => ({
                x: prev.x + alpha * (targetPoints[idx].x - prev.x),
                y: prev.y + alpha * (targetPoints[idx].y - prev.y)
              }));
            }
            setPointsState([...pointsRef.current]);
          }
        } else {
          pointsRef.current = [];
          setPointsState([]);
          setPinchLActive(false);
          setPinchRActive(false);
          setIsThumbsUpL(false);
          setIsThumbsUpR(false);
          setLeftVelocity({ x: 0, y: 0 });
          setRightVelocity({ x: 0, y: 0 });
          setLeftDepth(0);
          setRightDepth(0);
        }
      } else {
        pointsRef.current = [];
        setPointsState([]);
        setPinchLActive(false);
        setPinchRActive(false);
        setIsThumbsUpL(false);
        setIsThumbsUpR(false);
        setLeftVelocity({ x: 0, y: 0 });
        setRightVelocity({ x: 0, y: 0 });
        setLeftDepth(0);
        setRightDepth(0);
      }
    }
  };

  return {
    modelsReady,
    errorMsg,
    effectMode,
    pointsState,
    pointsRef,
    leftAttractor,
    rightAttractor,
    leftVelocity,
    rightVelocity,
    leftDepth,
    rightDepth,
    pinchLActive,
    pinchRActive,
    isThumbsUpL,
    isThumbsUpR,
    processFrame,
    setErrorMsg
  };
};
```

---

### Task 2: Implement GLSL Shader for Magnetic Warp, Curl Fluid, and Bloom

**Files:**
- Modify: `src/shaders/effectShader.ts`

- [ ] **Step 1: Write updated shader definitions**

Overwrite [src/shaders/effectShader.ts](file:///d:/my--projects/deskops/src/shaders/effectShader.ts) to implement background stream and fluid-warp calculations:
```typescript
export const EffectShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uMode; // Blends Particle (0.0) -> X-Ray (1.0)
    uniform float uEffectIndex; // Cycle index for particle mode
    uniform vec2 uResolution;
    
    // Attractor & Fluid uniforms
    uniform vec2 uLeftAttractor;
    uniform vec2 uRightAttractor;
    uniform vec2 uLeftVelocity;
    uniform vec2 uRightVelocity;
    uniform float uLeftPinch;
    uniform float uRightPinch;
    uniform float uBloomStrength; // Dynamic bloom scaling based on Z-depth

    varying vec2 vUv;

    // 2D Simplex Noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0) )
        + i.x + vec3(0.0, i1.x, 1.0) );
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 a0 = x - floor(x + 0.5);
      vec3 g = a0.xyx * h.xzz + a0.yzy * h.yyz;
      vec3 norm = 1.79284291400159 - 0.85373472095314 *
        ( g*g + h*h );
      vec3 vecValues;
      vecValues.x = g.x * x0.x + h.x * x0.y;
      vecValues.y = g.y * x12.x + h.y * x12.y;
      vecValues.z = g.z * x12.z + h.z * x12.w;
      return 130.0 * dot(m, vecValues * norm);
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      // Mirrored coordinates matching attractors
      vec2 mirroredUv = vec2(1.0 - vUv.x, vUv.y);

      // ----------------------------------------------------
      // Pinch Shockwave / Ripples (refracts UV coordinates)
      // ----------------------------------------------------
      vec2 warpedUv = mirroredUv;

      // Left Pinch Shockwave
      if (uLeftPinch > 0.5) {
        vec2 dirL = mirroredUv - vec2(1.0 - uLeftAttractor.x, uLeftAttractor.y);
        float distL = length(dirL);
        if (distL < 0.3) {
          float wave = sin(distL * 60.0 - uTime * 18.0) * 0.008 * (1.0 - distL / 0.3);
          warpedUv += normalize(dirL) * wave;
        }
      }

      // Right Pinch Shockwave
      if (uRightPinch > 0.5) {
        vec2 dirR = mirroredUv - vec2(1.0 - uRightAttractor.x, uRightAttractor.y);
        float distR = length(dirR);
        if (distR < 0.3) {
          float wave = sin(distR * 60.0 - uTime * 18.0) * 0.008 * (1.0 - distR / 0.3);
          warpedUv += normalize(dirR) * wave;
        }
      }

      // ----------------------------------------------------
      // Option A: Curl Fluid Flow Field displacement
      // ----------------------------------------------------
      // Subtract left attractor velocity
      vec2 attL = vec2(1.0 - uLeftAttractor.x, uLeftAttractor.y);
      vec2 toAttL = warpedUv - attL;
      float distToL = length(toAttL);
      if (distToL < 0.28) {
        // Rotational force
        vec2 swirl = vec2(-toAttL.y, toAttL.x) * 1.5;
        // Linear velocity force
        vec2 linear = vec2(-uLeftVelocity.x, uLeftVelocity.y) * 0.12;
        float strength = (1.0 - distToL / 0.28) * 0.045;
        warpedUv += (swirl + linear) * strength;
      }

      // Subtract right attractor velocity
      vec2 attR = vec2(1.0 - uRightAttractor.x, uRightAttractor.y);
      vec2 toAttR = warpedUv - attR;
      float distToR = length(toAttR);
      if (distToR < 0.28) {
        vec2 swirl = vec2(-toAttR.y, toAttR.x) * 1.5;
        vec2 linear = vec2(-uRightVelocity.x, uRightVelocity.y) * 0.12;
        float strength = (1.0 - distToR / 0.28) * 0.045;
        warpedUv += (swirl + linear) * strength;
      }

      // Clamp UV bounds to prevent texture wrapping errors
      warpedUv = clamp(warpedUv, 0.001, 0.999);

      // Base sample
      vec3 originalColor = texture2D(uTexture, warpedUv).rgb;
      float baseLum = dot(originalColor, vec3(0.299, 0.587, 0.114));

      // ----------------------------------------------------
      // MODE 0: Cycle effects (inside quadrilateral)
      // ----------------------------------------------------
      vec3 quadColor = originalColor;

      // Effect 0: Standard Particle Mode
      // 1. Contour Lines (Blue glow bands)
      float bands = fract(baseLum * 10.0 - uTime * 0.5);
      float contours = smoothstep(0.4, 0.5, bands) - smoothstep(0.5, 0.6, bands);
      // Boost contour lines based on dynamic uBloomStrength
      vec3 contourColor = vec3(0.05, 0.3, 0.9) * contours * 1.5 * (1.0 + uBloomStrength * 1.8);

      // 2. Interactive Magnetic Grid Warp
      vec2 gridUv = warpedUv;
      
      vec2 dirAttL = gridUv - attL;
      float distAttL = length(dirAttL);
      if (distAttL < 0.25) {
        gridUv += normalize(dirAttL) * (1.0 - distAttL / 0.25) * 0.035;
      }

      vec2 dirAttR = gridUv - attR;
      float distAttR = length(dirAttR);
      if (distAttR < 0.25) {
        gridUv += normalize(dirAttR) * (1.0 - distAttR / 0.25) * 0.035;
      }

      // 3. Twinkling grid of squares (90x90 grid) using warped gridUv
      vec2 gridRes = vec2(90.0, 90.0 * (uResolution.y / uResolution.x));
      vec2 cellPos = fract(gridUv * gridRes);
      vec2 cellIndex = floor(gridUv * gridRes);
      
      float gridVal = 0.0;
      if (cellPos.x > 0.35 && cellPos.x < 0.65 && cellPos.y > 0.35 && cellPos.y < 0.65) {
        float strobe = sin(uTime * 15.0 + cellIndex.x * 0.5 + cellIndex.y * 0.3) * 0.5 + 0.5;
        gridVal = strobe;
      }
      
      // 4. Color Cycling
      float phase = cellIndex.x * 0.1 + cellIndex.y * 0.05;
      float cycle = fract(uTime * 15.0 / 3.0 + phase) * 3.0;
      vec3 particleColor;
      if (cycle < 1.0) {
        particleColor = mix(vec3(1.0, 0.2, 0.6), vec3(1.0, 0.9, 0.2), cycle);
      } else if (cycle < 2.0) {
        particleColor = mix(vec3(1.0, 0.9, 0.2), vec3(1.0, 1.0, 1.0), cycle - 1.0);
      } else {
        particleColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.2, 0.6), cycle - 2.0);
      }
      vec3 gridOutput = particleColor * gridVal;

      // 5. Subject Glow
      vec3 subjectGlow = vec3(0.1, 0.3, 0.9) * smoothstep(0.2, 0.8, baseLum) * 0.6;

      vec3 particleFinalColor = originalColor * 0.3 + contourColor + gridOutput + subjectGlow;

      // Glitch helpers
      float offsetR = snoise(vec2(uTime * 15.0, warpedUv.y * 30.0)) * 0.012;
      float offsetB = -snoise(vec2(uTime * 10.0, warpedUv.y * 20.0)) * 0.012;

      if (uEffectIndex < 0.5) {
        quadColor = particleFinalColor;
      } else if (uEffectIndex < 1.5) {
        // Burning
        vec2 burnUv = warpedUv + snoise(warpedUv * 10.0 + uTime * 2.0) * 0.05;
        float burnLum = dot(texture2D(uTexture, burnUv).rgb, vec3(0.299, 0.587, 0.114));
        vec3 col0 = vec3(0.1, 0.0, 0.0);
        vec3 col1 = vec3(1.0, 0.0, 0.0);
        vec3 col2 = vec3(1.0, 0.5, 0.0);
        vec3 col3 = vec3(1.0, 1.0, 0.0);
        if (burnLum < 0.33) {
          quadColor = mix(col0, col1, burnLum / 0.33);
        } else if (burnLum < 0.66) {
          quadColor = mix(col1, col2, (burnLum - 0.33) / 0.33);
        } else {
          quadColor = mix(col2, col3, (burnLum - 0.66) / 0.34);
        }
      } else if (uEffectIndex < 2.5) {
        // Glow Silhouette (Depth-reactive Bloom applied to halo)
        float contrastLum = pow(baseLum, 1.2) * 1.5;
        float edgeNoise = snoise(warpedUv * 200.0 + uTime * 0.5) * 0.15;
        float core = smoothstep(0.5 + edgeNoise, 0.7 + edgeNoise, contrastLum);
        float halo = smoothstep(0.2 + edgeNoise, 0.6 + edgeNoise, contrastLum);
        vec3 haloColor = vec3(0.4, 0.9, 1.0) * (1.0 + uBloomStrength * 1.5);
        quadColor = mix(mix(vec3(0.0), haloColor, halo), vec3(1.0), core);
      } else if (uEffectIndex < 3.5) {
        // Thermal
        float t = clamp((baseLum - 0.1) * 1.2, 0.0, 1.0);
        if (t < 0.25) {
          quadColor = mix(vec3(0.0, 0.0, 0.2), vec3(0.1, 0.0, 1.0), t / 0.25);
        } else if (t < 0.5) {
          quadColor = mix(vec3(0.1, 0.0, 1.0), vec3(0.0, 1.0, 0.0), (t - 0.25) / 0.25);
        } else if (t < 0.75) {
          quadColor = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.9, 0.0), (t - 0.5) / 0.25);
        } else {
          quadColor = mix(vec3(1.0, 0.9, 0.0), vec3(1.0, 0.0, 0.0), (t - 0.75) / 0.25);
        }
      } else if (uEffectIndex < 4.5) {
        // Pixelated
        vec2 dGrid = vec2(80.0, 80.0 * (uResolution.y / uResolution.x));
        vec2 blockUv = floor(warpedUv * dGrid) / dGrid;
        float dPixelLum = dot(texture2D(uTexture, blockUv).rgb, vec3(0.299, 0.587, 0.114));
        float cellDist = distance(fract(warpedUv * dGrid), vec2(0.5));
        quadColor = (cellDist < 0.35) ? (dPixelLum > 0.25 ? vec3(0.0, 1.0, 0.0) : vec3(0.0)) : vec3(0.0, 0.1, 0.0);
      } else if (uEffectIndex < 5.5) {
        // Glitch
        quadColor = vec3(
          texture2D(uTexture, clamp(warpedUv + vec2(offsetR, 0.0), 0.0, 1.0)).r,
          texture2D(uTexture, warpedUv).g,
          texture2D(uTexture, clamp(warpedUv + vec2(offsetB, 0.0), 0.0, 1.0)).b
        );
        quadColor -= sin(warpedUv.y * 800.0 + uTime * 10.0) * 0.05;
      } else {
        // Neon Edges (Depth-reactive Bloom applied to Neon outlines)
        float dx = 1.0 / uResolution.x;
        float dy = 1.0 / uResolution.y;
        float s00 = dot(texture2D(uTexture, warpedUv + vec2(-dx, -dy)).rgb, vec3(0.299, 0.587, 0.114));
        float s02 = dot(texture2D(uTexture, warpedUv + vec2(dx, -dy)).rgb, vec3(0.299, 0.587, 0.114));
        float s20 = dot(texture2D(uTexture, warpedUv + vec2(-dx, dy)).rgb, vec3(0.299, 0.587, 0.114));
        float s22 = dot(texture2D(uTexture, warpedUv + vec2(dx, dy)).rgb, vec3(0.299, 0.587, 0.114));
        float s10 = dot(texture2D(uTexture, warpedUv + vec2(-dx, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
        float s12 = dot(texture2D(uTexture, warpedUv + vec2(dx, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
        float s01 = dot(texture2D(uTexture, warpedUv + vec2(0.0, -dy)).rgb, vec3(0.299, 0.587, 0.114));
        float s21 = dot(texture2D(uTexture, warpedUv + vec2(0.0, dy)).rgb, vec3(0.299, 0.587, 0.114));
        float sx = (s02 + 2.0 * s12 + s22) - (s00 + 2.0 * s10 + s20);
        float sy = (s20 + 2.0 * s21 + s22) - (s00 + 2.0 * s01 + s02);
        float edgeVal = sqrt(sx * sx + sy * sy);
        
        vec3 neonColor = vec3(0.1, 1.0, 0.8) * edgeVal * 2.5 * (1.0 + uBloomStrength * 1.6);
        quadColor = mix(originalColor * 0.3, neonColor, 0.7);
      }

      // ----------------------------------------------------
      // MODE 1: X-Ray Mode (from PDF)
      // ----------------------------------------------------
      // 1. Base Volume Blue space
      vec3 baseBlue = vec3(0.1, 0.4, 0.85);
      vec3 darkBlue = vec3(0.02, 0.05, 0.2);
      vec3 xrayVolume = mix(baseBlue, darkBlue, baseLum);

      // 2. Cyan Edges
      float dx = 1.0 / uResolution.x;
      float dy = 1.0 / uResolution.y;
      float s00 = dot(texture2D(uTexture, warpedUv + vec2(-dx, -dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s02 = dot(texture2D(uTexture, warpedUv + vec2(dx, -dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s20 = dot(texture2D(uTexture, warpedUv + vec2(-dx, dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s22 = dot(texture2D(uTexture, warpedUv + vec2(dx, dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s10 = dot(texture2D(uTexture, warpedUv + vec2(-dx, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
      float s12 = dot(texture2D(uTexture, warpedUv + vec2(dx, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
      float s01 = dot(texture2D(uTexture, warpedUv + vec2(0.0, -dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s21 = dot(texture2D(uTexture, warpedUv + vec2(0.0, dy)).rgb, vec3(0.299, 0.587, 0.114));
      float sx = (s02 + 2.0 * s12 + s22) - (s00 + 2.0 * s10 + s20);
      float sy = (s20 + 2.0 * s21 + s22) - (s00 + 2.0 * s01 + s02);
      float edgeXray = sqrt(sx * sx + sy * sy);
      vec3 cyanEdges = vec3(0.0, 0.9, 1.0) * edgeXray * 2.0 * (1.0 + uBloomStrength * 1.5);

      // 3. Film Grain
      float grainNoise = hash(warpedUv + uTime * 100.0) * 0.1 - 0.05;

      // 4. Scanlines
      float scanline = sin(warpedUv.y * uResolution.y * 2.0) * 0.05;

      vec3 xrayFinalColor = clamp(xrayVolume + cyanEdges + grainNoise - scanline, 0.0, 1.0);

      // ----------------------------------------------------
      // Blending
      // ----------------------------------------------------
      vec3 blendedColor = mix(quadColor, xrayFinalColor, uMode);

      gl_FragColor = vec4(blendedColor, 0.95);
    }
  `
};
export const BackgroundShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    varying vec2 vUv;
    void main() {
      // Mirrored background camera stream
      vec2 mirroredUv = vec2(1.0 - vUv.x, vUv.y);
      gl_FragColor = texture2D(uTexture, mirroredUv);
    }
  `
};
