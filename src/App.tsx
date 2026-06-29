import { useEffect, useRef, useState } from 'react';
import { useHandTracker } from './hooks/useHandTracker';
import { EffectsCanvas } from './components/EffectsCanvas';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [effectIndex, setEffectIndex] = useState(0);

  const triggerEffectSwitch = () => {
    setEffectIndex((prev) => (prev + 1) % 6);
  };

  const { modelsReady, errorMsg, boxRef, processFrame, setErrorMsg } = useHandTracker(
    videoRef,
    canvasRef,
    triggerEffectSwitch
  );

  useEffect(() => {
    let stream: MediaStream | null = null;

    const setupCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Webcam media access API is not available on this browser.');
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
        setErrorMsg(err.message || 'Webcam access denied or unavailable.');
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

  // Loading state overlay
  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-950 text-white font-sans p-6">
        <div className="w-16 h-16 border-4 border-red-500 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
          <span className="text-2xl font-bold text-red-500">!</span>
        </div>
        <h1 className="text-xl font-semibold tracking-wider text-red-400 mb-2">INTERFACE ERROR</h1>
        <p className="text-zinc-400 text-center max-w-md mb-8 leading-relaxed">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-red-950 border border-red-500 text-red-200 text-sm font-semibold tracking-widest rounded hover:bg-red-900 transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
        >
          RELOAD INTERFACE
        </button>
      </div>
    );
  }

  const showLoading = !modelsReady || !videoReady;

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden select-none">
      {/* Hidden Video Source */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="hidden"
      />

      {/* R3F WebGL Shader Plane */}
      {videoReady && videoRef.current && (
        <EffectsCanvas
          videoElement={videoRef.current}
          boxRef={boxRef}
          effectIndex={effectIndex}
        />
      )}

      {/* 2D Skeleton Drawing Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Loading Overlay */}
      {showLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 z-50 text-white font-sans">
          <div className="w-12 h-12 border-2 border-t-cyan-500 border-r-cyan-500 border-zinc-800 rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
          <h2 className="text-sm font-semibold tracking-[0.2em] text-cyan-400 animate-pulse">
            {!videoReady ? 'WAITING FOR CAMERA...' : 'LOADING AI MODELS...'}
          </h2>
        </div>
      )}
    </div>
  );
}
