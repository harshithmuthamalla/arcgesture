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
  
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const lastClapTimeRef = useRef<number>(0);
  const alpha = 0.25; // EMA smoothing factor

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

    // Reset shadow
    ctx.shadowBlur = 0;
  };

  const isPinching = (hand: any) => {
    // Landmark 8: Index Tip, Landmark 4: Thumb Tip
    const dx = hand[8].x - hand[4].x;
    const dy = hand[8].y - hand[4].y;
    return Math.sqrt(dx * dx + dy * dy) < 0.20;
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
          // Sort hands left-to-right based on x coordinates (which are mirrored, so 1 - x is actual screen position)
          const sortedHands = [...results.landmarks].sort((a, b) => (1 - b[0].x) - (1 - a[0].x));
          const handL = sortedHands[0];
          const handR = sortedHands[1];

          const pinchL = isPinching(handL);
          const pinchR = isPinching(handR);

          // Update active Mode
          const activeMode = (pinchL && pinchR) ? 'xray' : 'particle';
          setEffectMode(activeMode);

          // Find clap distance using Middle Finger MCP (9)
          const pL_mcp = handL[9];
          const pR_mcp = handR[9];
          const dx_mcp = pR_mcp.x - pL_mcp.x;
          const dy_mcp = pR_mcp.y - pL_mcp.y;
          const clapDist = Math.sqrt(dx_mcp * dx_mcp + dy_mcp * dy_mcp);

          if (clapDist < 0.1 && activeMode !== 'xray') {
            const now = performance.now();
            if (now - lastClapTimeRef.current > 1000) {
              lastClapTimeRef.current = now;
              playSwitchSound();
              onEffectSwitch();
            }
            pointsRef.current = [];
            setPointsState([]);
          } else {
            // Target corners depending on active mode
            let targetPoints: Point[] = [];

            if (activeMode === 'xray') {
              // X-Ray Mode: horizontal strip centered on pinch midpoints
              // Pinch L center
              const pL_idx = handL[8];
              const pL_thb = handL[4];
              const cL = { x: (pL_idx.x + pL_thb.x) / 2, y: (pL_idx.y + pL_thb.y) / 2 };

              // Pinch R center
              const pR_idx = handR[8];
              const pR_thb = handR[4];
              const cR = { x: (pR_idx.x + pR_thb.x) / 2, y: (pR_idx.y + pR_thb.y) / 2 };

              // Offset by 7.5% screen height
              targetPoints = [
                { x: cL.x, y: cL.y - 0.075 }, // Top-Left
                { x: cR.x, y: cR.y - 0.075 }, // Top-Right
                { x: cL.x, y: cL.y + 0.075 }, // Bottom-Left
                { x: cR.x, y: cR.y + 0.075 }  // Bottom-Right
              ];
            } else {
              // Particle Mode: deformed quadrilateral based on index tips and thumbs
              targetPoints = [
                handL[8], // Top-Left: Left Index tip
                handR[8], // Top-Right: Right Index tip
                handL[4], // Bottom-Left: Left Thumb tip
                handR[4]  // Bottom-Right: Right Thumb tip
              ];
            }

            // Apply EMA Smoothing
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
        }
      } else {
        pointsRef.current = [];
        setPointsState([]);
      }
    }
  };

  return { modelsReady, errorMsg, effectMode, pointsState, pointsRef, processFrame, setErrorMsg };
};
