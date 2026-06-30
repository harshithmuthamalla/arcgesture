import type { Point } from '../hooks/useHandTracker';

export interface PuzzlePiece {
  row: number;
  col: number;
  canvas: HTMLCanvasElement;
  colorCanvas: HTMLCanvasElement;
  w: number;
  h: number;
  x: number;
  y: number;
  placed: boolean;
  dragging: boolean;
  displacing?: boolean;
}

export interface ShatterFragment {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  alpha: number;
  scale: number;
}

export interface ReactorGlitch {
  id: string;
  x: number; // normalized inside box
  y: number;
  size: number;
  clearedProgress: number;
  pulseTime: number;
}

export interface PongBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: Point[];
  speedMultiplier: number;
}

export interface PongPaddle {
  y: number;
  height: number;
  width: number;
  shieldActive: boolean;
  shieldTimer: number;
}

export interface RhythmNote {
  id: string;
  type: 'palm' | 'fist' | 'pinch' | 'clap' | 'swipe' | 'thumbs-up';
  y: number; // vertical position in pixels
  spawnedAt: number;
  hit: boolean;
  missed: boolean;
}

// ── PUZZLE CAM ENGINE ──────────────────────────────────────────────────────────

// Capture, mirror and crop from the video element
export const captureVideoFrame = (
  video: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number
): HTMLCanvasElement => {
  const mirroredFrame = document.createElement('canvas');
  mirroredFrame.width = canvasWidth;
  mirroredFrame.height = canvasHeight;
  const mirroredCtx = mirroredFrame.getContext('2d');
  if (mirroredCtx) {
    mirroredCtx.save();
    mirroredCtx.translate(mirroredFrame.width, 0);
    mirroredCtx.scale(-1, 1);
    mirroredCtx.drawImage(video, 0, 0, mirroredFrame.width, mirroredFrame.height);
    mirroredCtx.restore();
  }

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.max(1, Math.round(box.width));
  cropCanvas.height = Math.max(1, Math.round(box.height));
  const cropCtx = cropCanvas.getContext('2d');
  if (cropCtx) {
    cropCtx.drawImage(mirroredFrame, box.x, box.y, box.width, box.height, 0, 0, cropCanvas.width, cropCanvas.height);
  }
  return cropCanvas;
};

// Apply Polaroid photobooth contrasts and brightness, with noise
export const applyPhotoboothEffect = (
  canvas: HTMLCanvasElement,
  bw: boolean
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  
  // Contrast, brightness, and gaussian noise values
  const contrast = 1.35;
  const brightness = 8;
  const noiseStd = 12;

  for (let i = 0; i < d.length; i += 4) {
    // Basic noise generator
    const u1 = Math.random() || 1e-6;
    const u2 = Math.random();
    const noise = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * noiseStd;

    if (bw) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = Math.max(0, Math.min(255, gray * contrast + brightness + noise));
      d[i] = d[i + 1] = d[i + 2] = v;
    } else {
      d[i] = Math.max(0, Math.min(255, d[i] * contrast + brightness + noise));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * contrast + brightness + noise));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * contrast + brightness + noise));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Vignette effect
  const w = canvas.width;
  const h = canvas.height;
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.48)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
};

// Slice canvas into 3x3 grid of pieces
export const generatePuzzlePieces = (
  colorCanvas: HTMLCanvasElement,
  bwCanvas: HTMLCanvasElement,
  box: { x: number; y: number; width: number; height: number },
  gridSize: number
): PuzzlePiece[] => {
  const tileW = Math.floor(colorCanvas.width / gridSize);
  const tileH = Math.floor(colorCanvas.height / gridSize);
  const pieces: PuzzlePiece[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const sx = col * tileW;
      const sy = row * tileH;
      const w = col === gridSize - 1 ? colorCanvas.width - sx : tileW;
      const h = row === gridSize - 1 ? colorCanvas.height - sy : tileH;

      // Create B&W piece canvas (for solving phase)
      const pCanvas = document.createElement('canvas');
      pCanvas.width = w;
      pCanvas.height = h;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) pCtx.drawImage(bwCanvas, sx, sy, w, h, 0, 0, w, h);

      // Create Color piece canvas (revealed on placement)
      const pColorCanvas = document.createElement('canvas');
      pColorCanvas.width = w;
      pColorCanvas.height = h;
      const pColorCtx = pColorCanvas.getContext('2d');
      if (pColorCtx) pColorCtx.drawImage(colorCanvas, sx, sy, w, h, 0, 0, w, h);

      pieces.push({
        row,
        col,
        canvas: pCanvas,
        colorCanvas: pColorCanvas,
        w,
        h,
        x: 0,
        y: 0,
        placed: false,
        dragging: false
      });
    }
  }

  // Shuffle slot positions
  const slots: Point[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      slots.push({ x: box.x + col * tileW, y: box.y + row * tileH });
    }
  }

  // Fisher-Yates Shuffle
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  // Assign pieces to shuffled slots
  pieces.forEach((piece, i) => {
    piece.x = slots[i].x;
    piece.y = slots[i].y;
  });

  return pieces;
};

// Check if a piece is dropped near its correct target cell slot
export const isNearOwnCell = (
  piece: PuzzlePiece,
  box: { x: number; y: number },
  tileW: number,
  tileH: number,
  snapRatio: number
): boolean => {
  const correctX = box.x + piece.col * tileW;
  const correctY = box.y + piece.row * tileH;
  const dx = piece.x - correctX;
  const dy = piece.y - correctY;
  const tolerance = Math.min(tileW, tileH) * snapRatio;
  return Math.sqrt(dx * dx + dy * dy) < tolerance;
};

// Displace any piece currently occupying a target cell when another piece snaps to it
export const displaceCellOccupant = (
  pieces: PuzzlePiece[],
  piece: PuzzlePiece,
  targetRow: number,
  targetCol: number,
  box: { x: number; y: number; width: number; height: number },
  tileW: number,
  tileH: number,
  gridSize: number,
  displaceAnimMs: number
) => {
  const cellX = box.x + targetCol * tileW;
  const cellY = box.y + targetRow * tileH;

  const occupant = pieces.find((p) => {
    if (p === piece || p.displacing) return false;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    return cx >= cellX && cx < cellX + tileW && cy >= cellY && cy < cellY + tileH;
  });

  if (!occupant) return;
  if (occupant.row === targetRow && occupant.col === targetCol && occupant.placed) return;

  occupant.placed = false;
  const freeCells: { row: number; col: number }[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (row === targetRow && col === targetCol) continue;
      const cx0 = box.x + col * tileW;
      const cy0 = box.y + row * tileH;
      const taken = pieces.some((p) => {
        if (p === occupant || p === piece || p.displacing) return false;
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        return cx >= cx0 && cx < cx0 + tileW && cy >= cy0 && cy < cy0 + tileH;
      });
      if (!taken) freeCells.push({ row, col });
    }
  }

  const targetSlot = freeCells.length > 0
    ? freeCells[Math.floor(Math.random() * freeCells.length)]
    : { row: occupant.row, col: occupant.col };

  const jitterX = (Math.random() - 0.5) * tileW * 0.4;
  const jitterY = (Math.random() - 0.5) * tileH * 0.4;
  
  const destX = Math.min(Math.max(box.x + targetSlot.col * tileW + jitterX, box.x), box.x + box.width - occupant.w);
  const destY = Math.min(Math.max(box.y + targetSlot.row * tileH + jitterY, box.y), box.y + box.height - occupant.h);

  // Simple animation runner
  const startX = occupant.x;
  const startY = occupant.y;
  const startedAt = performance.now();
  occupant.displacing = true;

  const step = () => {
    const elapsed = performance.now() - startedAt;
    const t = Math.min(1, elapsed / displaceAnimMs);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    occupant.x = startX + (destX - startX) * eased;
    occupant.y = startY + (destY - startY) * eased;

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      occupant.x = destX;
      occupant.y = destY;
      occupant.displacing = false;
    }
  };
  requestAnimationFrame(step);
};

// Polaroid photo card generation
export const generatePolaroid = (
  snapshot: HTMLCanvasElement,
  index: number
): HTMLCanvasElement => {
  const BORDER = 12;
  const BOTTOM = 36;
  const TARGET_W = 220;
  const scale = TARGET_W / snapshot.width;
  const imgH = Math.round(snapshot.height * scale);

  const pc = document.createElement('canvas');
  pc.width = TARGET_W + BORDER * 2;
  pc.height = imgH + BORDER + BOTTOM;
  const pCtx = pc.getContext('2d');
  if (pCtx) {
    // Draw white polaroid frame
    pCtx.fillStyle = '#ffffff';
    pCtx.fillRect(0, 0, pc.width, pc.height);
    // Draw photo frame shadow outline
    pCtx.strokeStyle = '#efefef';
    pCtx.lineWidth = 1;
    pCtx.strokeRect(BORDER - 1, BORDER - 1, TARGET_W + 2, imgH + 2);
    // Draw captured snapshot image
    pCtx.drawImage(snapshot, BORDER, BORDER, TARGET_W, imgH);
    // Stamp Date & Polaroid Number
    pCtx.fillStyle = '#6b7280';
    pCtx.font = "bold 9px 'Courier New', monospace";
    pCtx.textAlign = 'center';
    const now = new Date();
    const ts = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} // #${String(index).padStart(2, '0')}`;
    pCtx.fillText(ts, pc.width / 2, imgH + BORDER + 22);
  }
  return pc;
};

// Generate vertical Polaroid Photobooth strip canvas
export const buildStripCanvas = (
  polaroids: HTMLCanvasElement[]
): HTMLCanvasElement | null => {
  if (polaroids.length === 0) return null;
  const BORDER = 24;
  const GAP = 16;
  
  const w = polaroids[0].width + BORDER * 2;
  const h = BORDER * 2 + polaroids.reduce((sum, p) => sum + p.height, 0) + GAP * (polaroids.length - 1);

  const sc = document.createElement('canvas');
  sc.width = w;
  sc.height = h;
  const sCtx = sc.getContext('2d');
  if (sCtx) {
    // Retro warm paper background
    sCtx.fillStyle = '#f3f1e9';
    sCtx.fillRect(0, 0, w, h);
    
    // Draw Polaroid cards vertically
    let currentY = BORDER;
    polaroids.forEach((p) => {
      sCtx.drawImage(p, BORDER, currentY);
      currentY += p.height + GAP;
    });
  }
  return sc;
};

// Initialize shatter particles physics explosion
export const startShatterPhysics = (
  sourceCanvas: HTMLCanvasElement,
  box: { x: number; y: number; width: number; height: number },
  cols: number,
  rows: number
): ShatterFragment[] => {
  const fragW = sourceCanvas.width / cols;
  const fragH = sourceCanvas.height / rows;
  const fragments: ShatterFragment[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = c * fragW;
      const sy = r * fragH;
      const fragCanvas = document.createElement('canvas');
      fragCanvas.width = Math.ceil(fragW);
      fragCanvas.height = Math.ceil(fragH);
      const fCtx = fragCanvas.getContext('2d');
      if (fCtx) {
        fCtx.drawImage(sourceCanvas, sx, sy, fragW, fragH, 0, 0, fragCanvas.width, fragCanvas.height);
      }

      const cx = box.x + sx + fragW / 2;
      const cy = box.y + sy + fragH / 2;
      const centerOffsetX = cx - (box.x + box.width / 2);
      const centerOffsetY = cy - (box.y + box.height / 2);
      const dirLen = Math.max(1, Math.hypot(centerOffsetX, centerOffsetY));
      
      const speed = 100 + Math.random() * 150;
      
      fragments.push({
        canvas: fragCanvas,
        x: cx,
        y: cy,
        w: fragW,
        h: fragH,
        vx: (centerOffsetX / dirLen) * speed + (Math.random() - 0.5) * 35,
        vy: (centerOffsetY / dirLen) * speed + (Math.random() - 0.5) * 35 - 50, // eject upwards slightly
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 5,
        gravity: 240 + Math.random() * 60,
        alpha: 1.0,
        scale: 1.0
      });
    }
  }
  return fragments;
};

// Update and render active puzzle shatter particles
export const updateShatterParticles = (
  fragments: ShatterFragment[],
  dt: number,
  durationMs: number,
  elapsedMs: number
): boolean => {
  const t = Math.min(1.0, elapsedMs / durationMs);
  if (t >= 1.0) return false; // Animation completed
  
  const fadeStart = 0.5;
  fragments.forEach((frag) => {
    // Euler integration
    frag.x += frag.vx * dt;
    frag.y += frag.vy * dt;
    frag.vy += frag.gravity * dt;
    frag.rotation += frag.rotationSpeed * dt;
    
    // Scale down and fade out
    frag.scale = 1.0 - t * 0.2;
    frag.alpha = t < fadeStart ? 1.0 : Math.max(0, 1.0 - (t - fadeStart) / (1.0 - fadeStart));
  });
  return true;
};


// ── GAME 1: REACTOR STABILIZER ENGINE ──────────────────────────────────────────

export const drawReactorCore = (
  ctx: CanvasRenderingContext2D,
  center: Point,
  baseRadius: number,
  stability: number,
  temp: number,
  time: number,
  lockActive: boolean
) => {
  ctx.save();
  ctx.translate(center.x, center.y);

  // 1. Draw glowing background outer shield rings
  const ringCount = 3;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < ringCount; i++) {
    const scale = 1.0 + i * 0.4 + Math.sin(time * 3 + i) * 0.05;
    ctx.strokeStyle = lockActive
      ? 'rgba(245, 158, 11, 0.25)'
      : stability < 30
      ? 'rgba(239, 68, 68, 0.3)'
      : 'rgba(34, 211, 238, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * scale, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Tech notches on containment rings
    ctx.save();
    ctx.rotate(time * 0.25 * (i % 2 === 0 ? 1 : -1));
    ctx.strokeStyle = lockActive ? '#f59e0b' : stability < 30 ? '#ef4444' : '#22d3ee';
    ctx.lineWidth = 3;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * scale, a, a + 0.15);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Core liquid energy sphere
  const glowRadius = baseRadius * (stability / 100 * 0.4 + 0.6);
  const grad = ctx.createRadialGradient(0, 0, glowRadius * 0.1, 0, 0, glowRadius);
  
  if (lockActive) {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#fbbf24');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
  } else if (stability < 30) {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, '#ef4444');
    grad.addColorStop(1, 'rgba(220, 38, 38, 0.0)');
  } else {
    // Color shifts from cyan to pink based on temperature/boost
    const colorHex = temp > 75 ? '#ec4899' : '#06b6d4';
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, colorHex);
    grad.addColorStop(0.85, 'rgba(6, 182, 212, 0.15)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius * 1.5, 0, 2 * Math.PI);
  ctx.fill();

  // Spiky magnetic field outlines
  ctx.strokeStyle = lockActive ? '#f59e0b' : stability < 30 ? '#ef4444' : '#22d3ee';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const spikyPoints = 48;
  for (let i = 0; i < spikyPoints; i++) {
    const angle = (i / spikyPoints) * Math.PI * 2;
    const noise = Math.sin(angle * 8 + time * 12) * (stability < 30 ? 16 : 8) * (1.0 + temp / 100 * 0.6);
    const r = glowRadius + noise;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
};

export const spawnReactorGlitch = (
  _box: { x: number; y: number; width: number; height: number }
): ReactorGlitch => {
  return {
    id: Math.random().toString(36).substring(2, 9),
    x: 0.18 + Math.random() * 0.64, // local coords
    y: 0.18 + Math.random() * 0.64,
    size: 16 + Math.random() * 14,
    clearedProgress: 0,
    pulseTime: Math.random() * 10
  };
};

export const drawReactorGlitches = (
  ctx: CanvasRenderingContext2D,
  glitches: ReactorGlitch[],
  box: { x: number; y: number; width: number; height: number },
  time: number
) => {
  glitches.forEach((g) => {
    const px = box.x + g.x * box.width;
    const py = box.y + g.y * box.height;
    const pulse = 1.0 + Math.sin(time * 8 + g.pulseTime) * 0.15;
    const size = g.size * pulse;

    ctx.save();
    ctx.translate(px, py);

    // Corrupted nodes are red triangles or spiky warnings
    ctx.strokeStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.0;

    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * size;
      const y = Math.sin(a) * size;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw inner locking nodes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    ctx.stroke();

    // Display progress circle
    if (g.clearedProgress > 0) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.65, -Math.PI / 2, -Math.PI / 2 + (g.clearedProgress / 100) * Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  });
};


// ── GAME 2: HOLOPONG ENGINE ────────────────────────────────────────────────────

export const initPongBall = (box: { x: number; y: number; width: number; height: number }): PongBall => {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    vx: Math.random() > 0.5 ? 200 : -200,
    vy: (Math.random() - 0.5) * 160,
    radius: 9,
    trail: [],
    speedMultiplier: 1.0
  };
};

export const updatePongBall = (
  ball: PongBall,
  paddleL: PongPaddle,
  paddleR: PongPaddle,
  box: { x: number; y: number; width: number; height: number },
  dt: number,
  onHit: () => void,
  onScore: (winner: 'player' | 'ai') => void
) => {
  // Update trail
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 8) ball.trail.shift();

  // Euler integrations
  const speed = 1.0 * ball.speedMultiplier;
  ball.x += ball.vx * speed * dt;
  ball.y += ball.vy * speed * dt;

  // Top and bottom boundaries collision
  if (ball.y - ball.radius <= box.y) {
    ball.y = box.y + ball.radius;
    ball.vy = -ball.vy;
    onHit();
  } else if (ball.y + ball.radius >= box.y + box.height) {
    ball.y = box.y + box.height - ball.radius;
    ball.vy = -ball.vy;
    onHit();
  }

  // Left paddle hit collision check
  const paddleLeftX = box.x + 20;
  if (ball.x - ball.radius <= paddleLeftX && ball.x + ball.radius >= paddleLeftX - 6) {
    // check Y range
    const padHeight = paddleL.shieldActive ? paddleL.height * 1.5 : paddleL.height;
    const topY = paddleL.y - padHeight / 2;
    const bottomY = paddleL.y + padHeight / 2;
    if (ball.y >= topY && ball.y <= bottomY) {
      ball.x = paddleLeftX + ball.radius;
      // deflect velocity based on collision point offset from center
      const hitRel = (ball.y - paddleL.y) / (padHeight / 2);
      const angle = hitRel * (Math.PI / 4); // Max 45 degrees
      const speedMagnitude = Math.hypot(ball.vx, ball.vy) * 1.08; // speed acceleration
      ball.vx = speedMagnitude * Math.cos(angle);
      ball.vy = speedMagnitude * Math.sin(angle);
      onHit();
    }
  }

  // Right paddle hit collision check
  const paddleRightX = box.x + box.width - 20;
  if (ball.x + ball.radius >= paddleRightX && ball.x - ball.radius <= paddleRightX + 6) {
    const padHeight = paddleR.shieldActive ? paddleR.height * 1.5 : paddleR.height;
    const topY = paddleR.y - padHeight / 2;
    const bottomY = paddleR.y + padHeight / 2;
    if (ball.y >= topY && ball.y <= bottomY) {
      ball.x = paddleRightX - ball.radius;
      const hitRel = (ball.y - paddleR.y) / (padHeight / 2);
      const angle = hitRel * (Math.PI / 4);
      const speedMagnitude = Math.hypot(ball.vx, ball.vy) * 1.08;
      ball.vx = -speedMagnitude * Math.cos(angle);
      ball.vy = speedMagnitude * Math.sin(angle);
      onHit();
    }
  }

  // Scoring triggers
  if (ball.x < box.x) {
    onScore('ai'); // AI scores
  } else if (ball.x > box.x + box.width) {
    onScore('player'); // Player scores
  }
};

export const drawPongArena = (
  ctx: CanvasRenderingContext2D,
  ball: PongBall,
  paddleL: PongPaddle,
  paddleR: PongPaddle,
  box: { x: number; y: number; width: number; height: number }
) => {
  ctx.save();

  // Arena outline
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
  ctx.lineWidth = 3.0;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  // Middle division net line
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
  ctx.lineWidth = 2.0;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.moveTo(box.x + box.width / 2, box.y);
  ctx.lineTo(box.x + box.width / 2, box.y + box.height);
  ctx.stroke();
  ctx.setLineDash([]); // reset

  // Ball Trail
  ball.trail.forEach((t, index) => {
    const alpha = (index + 1) / ball.trail.length * 0.22;
    ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, ball.radius * (0.4 + (index / ball.trail.length) * 0.6), 0, Math.PI * 2);
    ctx.fill();
  });

  // Glowing neon Ball
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  // Paddles drawing
  const drawPaddle = (p: PongPaddle, px: number) => {
    ctx.save();
    ctx.shadowBlur = p.shieldActive ? 14 : 8;
    ctx.shadowColor = p.shieldActive ? '#fbbf24' : '#10b981';
    ctx.fillStyle = p.shieldActive ? '#f59e0b' : '#10b981';
    
    const padHeight = p.shieldActive ? p.height * 1.5 : p.height;
    ctx.fillRect(px - p.width / 2, p.y - padHeight / 2, p.width, padHeight);

    // Bounding decorative lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(px - p.width / 2, p.y - padHeight / 2, p.width, padHeight);
    
    // Shield glow indicator
    if (p.shieldActive) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(px - p.width / 2 - 4, p.y - padHeight / 2 - 4, p.width + 8, padHeight + 8);
    }
    ctx.restore();
  };

  // Left paddle
  drawPaddle(paddleL, box.x + 20);
  // Right paddle
  drawPaddle(paddleR, box.x + box.width - 20);

  ctx.restore();
};


// ── GAME 3: RHYTHM HANDS ENGINE ────────────────────────────────────────────────

export const spawnRhythmNote = (
  type: RhythmNote['type']
): RhythmNote => {
  return {
    id: Math.random().toString(36).substring(2, 9),
    type,
    y: 0,
    spawnedAt: performance.now(),
    hit: false,
    missed: false
  };
};

export const updateRhythmNotes = (
  notes: RhythmNote[],
  speed: number,
  dt: number,
  hitLineY: number,
  onMiss: () => void
) => {
  notes.forEach((note) => {
    // Note falls downwards
    note.y += speed * dt;

    // Check miss condition (goes below hit line + buffer)
    if (note.y > hitLineY + 45 && !note.missed && !note.hit) {
      note.missed = true;
      onMiss();
    }
  });
};

export const drawRhythmGame = (
  ctx: CanvasRenderingContext2D,
  notes: RhythmNote[],
  hitLineY: number,
  box: { x: number; y: number; width: number; height: number },
  _time: number
) => {
  ctx.save();

  // Lane Background board
  const laneW = 120;
  const laneX = box.x + box.width / 2 - laneW / 2;

  ctx.fillStyle = 'rgba(10, 15, 30, 0.7)';
  ctx.fillRect(laneX, box.y, laneW, box.height);

  // Border bounds
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
  ctx.lineWidth = 2.0;
  ctx.strokeRect(laneX, box.y, laneW, box.height);

  // Hit target zone indicators
  ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
  ctx.fillRect(laneX, hitLineY - 20, laneW, 40);

  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 3.0;
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(laneX, hitLineY);
  ctx.lineTo(laneX + laneW, hitLineY);
  ctx.stroke();

  // Floating targets
  notes.forEach((note) => {
    if (note.hit) return; // skip hit targets

    const ny = box.y + note.y;
    // ensure note draws inside bounding box only
    if (ny < box.y || ny > box.y + box.height) return;

    ctx.save();
    ctx.translate(laneX + laneW / 2, ny);

    // Color code nodes based on gesture type
    let color = '#a78bfa'; // violet (swipe/default)
    if (note.type === 'clap') color = '#ec4899'; // pink
    else if (note.type === 'fist') color = '#ef4444'; // red
    else if (note.type === 'pinch') color = '#eab308'; // yellow
    else if (note.type === 'palm') color = '#10b981'; // green
    else if (note.type === 'thumbs-up') color = '#3b82f6'; // blue

    ctx.fillStyle = color;
    ctx.strokeStyle = note.missed ? '#4b5563' : '#ffffff';
    ctx.shadowBlur = note.missed ? 0 : 8;
    ctx.shadowColor = color;
    ctx.lineWidth = 1.5;

    // Draw glowing circles
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Drawing gesture text inside target
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(note.type.toUpperCase(), 0, 0);

    ctx.restore();
  });

  ctx.restore();
};
