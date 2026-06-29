import { useEffect, useRef, useState } from 'react';
import { useHandTracker } from './hooks/useHandTracker';
import { EffectsCanvas } from './components/EffectsCanvas';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [effectIndex, setEffectIndex] = useState(0);

  // Aspect ratio state styling
  const [containerStyle, setContainerStyle] = useState<React.CSSProperties>({
    width: '100%',
    height: '100%'
  });
  const videoAspect = 16 / 9;

  useEffect(() => {
    const handleResize = () => {
      const windowAspect = window.innerWidth / window.innerHeight;
      if (windowAspect > videoAspect) {
        setContainerStyle({
          width: `${window.innerHeight * videoAspect}px`,
          height: '100%'
        });
      } else {
        setContainerStyle({
          width: '100%',
          height: `${window.innerWidth / videoAspect}px`
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [videoAspect]);

  const triggerEffectSwitch = () => {
    setEffectIndex((prev) => (prev + 1) % 7);
  };

  const {
    modelsReady,
    errorMsg,
    effectMode,
    pointsState,
    pointsRef,
    leftAttractor,
    rightAttractor,
    pinchLActive,
    pinchRActive,
    processFrame,
    setErrorMsg
  } = useHandTracker(videoRef, canvasRef, triggerEffectSwitch);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const setupCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Webcam media access API is not available.');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              setVideoReady(true);
            });
          };
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Webcam access denied.');
      }
    };

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [setErrorMsg]);

  useEffect(() => {
    let animationId: number;

    const loop = () => {
      processFrame();
      animationId = requestAnimationFrame(loop);
    };

    if (modelsReady && videoReady) {
      animationId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [modelsReady, videoReady, processFrame]);

  // Animated wave offset calculation for the SVG Laser path
  const [laserPath, setLaserPath] = useState('');
  useEffect(() => {
    let animFrame: number;
    
    const updateLaser = () => {
      if (pointsState.length === 4) {
        // Container-relative coords
        const container = document.getElementById('layout-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          const cxL = (1.0 - leftAttractor.x) * rect.width;
          const cyL = leftAttractor.y * rect.height;
          const cxR = (1.0 - rightAttractor.x) * rect.width;
          const cyR = rightAttractor.y * rect.height;

          // Midpoint
          const midX = (cxL + cxR) / 2;
          const midY = (cyL + cyR) / 2;

          // Add animated high-voltage electrical jitter
          const time = performance.now() * 0.05;
          const offset = Math.sin(time) * 15 + Math.cos(time * 2.3) * 5;

          // Quadratic Bezier curve
          setLaserPath(`M ${cxL},${cyL} Q ${midX},${midY - 40 + offset} ${cxR},${cyR}`);
        }
      }
      animFrame = requestAnimationFrame(updateLaser);
    };

    if (modelsReady && videoReady) {
      animFrame = requestAnimationFrame(updateLaser);
    }

    return () => cancelAnimationFrame(animFrame);
  }, [modelsReady, videoReady, pointsState, leftAttractor, rightAttractor]);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-950 text-white font-sans p-6 z-30">
        <div className="w-16 h-16 border-4 border-red-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <span className="text-2xl font-bold text-red-500">!</span>
        </div>
        <h1 className="text-xl font-semibold tracking-wider text-red-400 mb-2">INTERFACE ERROR</h1>
        <p className="text-zinc-400 text-center max-w-md mb-8">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-red-950 border border-red-500 text-red-200 text-sm font-semibold rounded hover:bg-red-900 transition-all duration-300"
        >
          RELOAD INTERFACE
        </button>
      </div>
    );
  }

  const showLoading = !modelsReady || !videoReady;
  const showHUD = pointsState.length === 4;

  const svgPoints = showHUD
    ? `${(1.0 - pointsState[0].x) * 100},${pointsState[0].y * 100} ` +
      `${(1.0 - pointsState[1].x) * 100},${pointsState[1].y * 100} ` +
      `${(1.0 - pointsState[3].x) * 100},${pointsState[3].y * 100} ` +
      `${(1.0 - pointsState[2].x) * 100},${pointsState[2].y * 100}`
    : '';

  return (
    <div className="flex items-center justify-center w-full h-full bg-zinc-950 overflow-hidden select-none">
      <div id="layout-container" style={containerStyle} className="relative overflow-hidden bg-black z-0">
        
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-100 pointer-events-none z-0"
        />

        {videoReady && videoRef.current && (
          <EffectsCanvas
            videoElement={videoRef.current}
            pointsRef={pointsRef}
            effectMode={effectMode}
            effectIndex={effectIndex}
            leftAttractor={leftAttractor}
            rightAttractor={rightAttractor}
            pinchLActive={pinchLActive}
            pinchRActive={pinchRActive}
          />
        )}

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        />

        {/* HUD Elements: SVG quadrilateral border & energy beam */}
        {showHUD && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="laser-glow">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <polygon
              points={svgPoints}
              fill="none"
              stroke={effectMode === 'xray' ? 'cyan' : 'white'}
              strokeWidth="2"
              filter="url(#glow)"
              className="transition-all duration-75"
            />

            <path
              d={laserPath}
              fill="none"
              stroke={effectMode === 'xray' ? '#22d3ee' : '#34d399'}
              strokeWidth="3.5"
              strokeDasharray="6, 4"
              filter="url(#laser-glow)"
              className="opacity-90"
            />
            
            <path
              d={laserPath}
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              className="opacity-100"
            />
          </svg>
        )}

        {/* HUD Elements: glowing marker corner squares */}
        {showHUD && pointsState.map((pt, idx) => (
          <div
            key={idx}
            style={{
              left: `${(1.0 - pt.x) * 100}%`,
              top: `${pt.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
            className={`absolute w-3 h-3 border-2 ${
              effectMode === 'xray'
                ? 'border-cyan-400 shadow-[0_0_10px_cyan]'
                : 'border-emerald-400 shadow-[0_0_10px_#34d399]'
            } bg-black pointer-events-none z-20 transition-all duration-75`}
          />
        ))}

        {showLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-30 text-white font-sans">
            <div className="w-12 h-12 border-2 border-t-cyan-500 border-r-cyan-500 border-zinc-800 rounded-full animate-spin mb-6" />
            <h2 className="text-sm font-semibold tracking-[0.2em] text-cyan-400 animate-pulse">
              {!videoReady ? 'LOADING AI MODELS & CAMERA...' : 'INITIALIZING TRACKER...'}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}
