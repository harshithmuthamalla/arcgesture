import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { playSwitchSound } from '../utils/audio';

export interface BoxCoords {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export const useHandTracker = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onEffectSwitch: () => void
) => {
  const [modelsReady, setModelsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const boxRef = useRef<[number, number, number, number]>([0, 0, 0, 0]); // xMin, yMin, xMax, yMax
  const lastClapTimeRef = useRef<number>(0);

  // EMA smoothing parameter (alpha)
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
          setErrorMsg('Failed to initialize MediaPipe models. Check internet connection or CORS.');
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
    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // index
      [9, 10], [10, 11], [11, 12],     // middle finger joints
      [0, 17], [17, 18], [18, 19], [19, 20], // pinky
      [5, 9], [9, 13], [13, 17], // palm base
      [0, 13], // wrist to ring base
      [13, 14], [14, 15], [15, 16], // ring finger
    ];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#ffffff';

    landmarks.forEach((hand) => {
      // Connections
      connections.forEach(([i, j]) => {
        if (hand[i] && hand[j]) {
          ctx.beginPath();
          ctx.moveTo((1 - hand[i].x) * ctx.canvas.width, hand[i].y * ctx.canvas.height);
          ctx.lineTo((1 - hand[j].x) * ctx.canvas.width, hand[j].y * ctx.canvas.height);
          ctx.stroke();
        }
      });

      // Nodes
      hand.forEach((lm: any) => {
        ctx.beginPath();
        ctx.arc((1 - lm.x) * ctx.canvas.width, lm.y * ctx.canvas.height, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  };

  const processFrame = () => {
    if (!landmarkerRef.current || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas width/height to rendering container
    if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (video.readyState >= HTMLVideoElement.HAVE_CURRENT_DATA) {
      const results = landmarkerRef.current.detectForVideo(video, performance.now());
      
      if (results.landmarks && results.landmarks.length > 0) {
        drawSkeleton(ctx, results.landmarks);

        if (results.landmarks.length === 2) {
          const hand0 = results.landmarks[0];
          const hand1 = results.landmarks[1];

          // Landmark 9: Middle finger MCP
          const p0 = hand0[9];
          const p1 = hand1[9];

          if (p0 && p1) {
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Clap Switch detection
            if (dist < 0.1) {
              const now = performance.now();
              if (now - lastClapTimeRef.current > 1000) {
                lastClapTimeRef.current = now;
                playSwitchSound();
                onEffectSwitch();
              }
              // Hide box during clap
              boxRef.current = [0, 0, 0, 0];
            } else {
              // Bounding box dimensions
              const cx = (p0.x + p1.x) / 2;
              const cy = (p0.y + p1.y) / 2;
              const w = dist * 1.2;
              const h = w * 0.8;

              // Normalized bounds
              const targetXMin = cx - w / 2;
              const targetYMin = cy - h / 2;
              const targetXMax = cx + w / 2;
              const targetYMax = cy + h / 2;

              // Apply EMA smoothing
              const [prevXMin, prevYMin, prevXMax, prevYMax] = boxRef.current;
              boxRef.current = [
                prevXMin + alpha * (targetXMin - prevXMin),
                prevYMin + alpha * (targetYMin - prevYMin),
                prevXMax + alpha * (targetXMax - prevXMax),
                prevYMax + alpha * (targetYMax - prevYMax),
              ];
            }
          }
        } else {
          // If not exactly 2 hands, clear the box
          boxRef.current = [0, 0, 0, 0];
        }
      } else {
        boxRef.current = [0, 0, 0, 0];
      }
    }
  };

  return { modelsReady, errorMsg, boxRef, processFrame, setErrorMsg };
};
