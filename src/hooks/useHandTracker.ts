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
  const lastTwoHandsTimeRef = useRef<number>(0); // Tracking loss grace period timer
  
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
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
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
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [0, 17] // Palm base
    ];

    // Neon Cyberpunk Cyan styling
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#22d3ee';
    ctx.strokeStyle = '#22d3ee';
    ctx.fillStyle = '#ffffff';

    landmarks.forEach((hand) => {
      connections.forEach(([i, j]) => {
        if (hand[i] && hand[j]) {
          ctx.beginPath();
          ctx.moveTo((1 - hand[i].x) * ctx.canvas.width, hand[i].y * ctx.canvas.height);
          ctx.lineTo((1 - hand[j].x) * ctx.canvas.width, hand[j].y * ctx.canvas.height);
          ctx.stroke();
        }
      });

      // Sharp white knuckle joint dots
      ctx.shadowBlur = 0;
      hand.forEach((lm: any) => {
        ctx.beginPath();
        ctx.arc((1 - lm.x) * ctx.canvas.width, lm.y * ctx.canvas.height, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  };

  const isPinching = (hand: any) => {
    const dx = hand[8].x - hand[4].x;
    const dy = hand[8].y - hand[4].y;
    return Math.sqrt(dx * dx + dy * dy) < 0.20;
  };

  const checkThumbsUp = (hand: any): boolean => {
    const wrist = hand[0];
    const thumbTip = hand[4];
    const thumbIP = hand[3];

    const thumbExtended = thumbTip.y < thumbIP.y - 0.02;

    const foldedCount = [8, 12, 16, 20].filter((tipIdx) => {
      const tip = hand[tipIdx];
      const mcp = hand[tipIdx - 3];
      
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

    // Fix Canvas resolution: match visible container client dimensions instead of hidden video
    const container = document.getElementById('layout-container');
    const width = container ? container.clientWidth : video.videoWidth || 1280;
    const height = container ? container.clientHeight : video.videoHeight || 720;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (video.readyState >= 2) {
      const results = landmarkerRef.current.detectForVideo(video, performance.now());
      
      if (results.landmarks && results.landmarks.length > 0) {
        drawSkeleton(ctx, results.landmarks);

        if (results.landmarks.length === 2) {
          lastTwoHandsTimeRef.current = performance.now(); // update grace period timer

          const sortedHands = [...results.landmarks].sort((a, b) => (1 - b[0].x) - (1 - a[0].x));
          const handL = sortedHands[0];
          const handR = sortedHands[1];

          const pinchL = isPinching(handL);
          const pinchR = isPinching(handR);

          setPinchLActive(pinchL);
          setPinchRActive(pinchR);

          setIsThumbsUpL(checkThumbsUp(handL));
          setIsThumbsUpR(checkThumbsUp(handR));

          const dL = Math.sqrt(Math.pow(handL[0].x - handL[9].x, 2) + Math.pow(handL[0].y - handL[9].y, 2));
          const dR = Math.sqrt(Math.pow(handR[0].x - handR[9].x, 2) + Math.pow(handR[0].y - handR[9].y, 2));
          setLeftDepth(Math.max(0.0, Math.min(1.0, (dL - 0.08) / 0.16)));
          setRightDepth(Math.max(0.0, Math.min(1.0, (dR - 0.08) / 0.16)));

          setLeftAttractor({ x: handL[8].x, y: handL[8].y });
          setRightAttractor({ x: handR[8].x, y: handR[8].y });

          const now = performance.now();
          const dT = Math.max(1.0, now - lastTimeRef.current) / 1000;
          lastTimeRef.current = now;

          const vxL = (handL[8].x - prevLeftRef.current.x) / dT;
          const vyL = (handL[8].y - prevLeftRef.current.y) / dT;
          const vxR = (handR[8].x - prevRightRef.current.x) / dT;
          const vyR = (handR[8].y - prevRightRef.current.y) / dT;

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

          // Clapping distance threshold increased to 0.18 to prevent model occlusion failure
          if (clapDist < 0.18 && activeMode !== 'xray') {
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
          // If we detect 1 hand, check grace period timer to prevent vanishing
          const timeSinceTwoHands = performance.now() - lastTwoHandsTimeRef.current;
          if (timeSinceTwoHands > 600) {
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
          } else {
            // Keep lens visible, decay velocities to zero, turn off active pinch states
            setPinchLActive(false);
            setPinchRActive(false);
            setIsThumbsUpL(false);
            setIsThumbsUpR(false);
            setLeftVelocity({ x: 0, y: 0 });
            setRightVelocity({ x: 0, y: 0 });
          }
        }
      } else {
        // No hands detected, check grace period
        const timeSinceTwoHands = performance.now() - lastTwoHandsTimeRef.current;
        if (timeSinceTwoHands > 600) {
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
        } else {
          setPinchLActive(false);
          setPinchRActive(false);
          setIsThumbsUpL(false);
          setIsThumbsUpR(false);
          setLeftVelocity({ x: 0, y: 0 });
          setRightVelocity({ x: 0, y: 0 });
        }
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
