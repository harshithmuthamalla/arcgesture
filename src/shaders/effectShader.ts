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
    uniform sampler2D uDocTexture; // MRI or Blueprint document texture
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
    uniform float uLeftDepth;
    uniform float uRightDepth;
    uniform float uBloomStrength;

    // Document settings uniforms
    uniform float uUseDoc; // 1.0 if medical/blueprint image is active
    uniform float uDocZoom;
    uniform vec2 uDocPan;

    // Shockwave gesture uniforms
    uniform float uShockwaveTime; // Timer since shockwave trigger (default -1.0)
    uniform vec2 uShockwaveCenter; // Normalized coordinates of clap center

    // Settings uniforms
    uniform float uSpeedMultiplier;
    uniform float uGrainMultiplier;
    uniform float uNeonMultiplier;

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
      // Speed multiplier applied to time
      float speedTime = uTime * uSpeedMultiplier;

      // Mirrored coordinates matching attractors
      vec2 mirroredUv = vec2(1.0 - vUv.x, vUv.y);

      vec2 warpedUv = mirroredUv;

      // ----------------------------------------------------
      // Combo Gesture: Fast-Spread Shockwave Ripple
      // ----------------------------------------------------
      if (uShockwaveTime >= 0.0 && uShockwaveTime < 0.8) {
        vec2 diff = vUv - uShockwaveCenter;
        float dist = length(diff);
        float waveSpeed = 1.2;
        float radius = uShockwaveTime * waveSpeed;
        if (dist > radius - 0.08 && dist < radius + 0.08) {
          float wave = sin((dist - radius) * 45.0) * 0.016 * (1.0 - uShockwaveTime / 0.8);
          warpedUv += normalize(diff) * wave;
        }
      }

      // ----------------------------------------------------
      // Pinch Shockwave / Ripples (refracts UV coordinates)
      // ----------------------------------------------------
      // Left Hand Pinch Ripple
      if (uLeftPinch > 0.5) {
        vec2 dirL = mirroredUv - vec2(1.0 - uLeftAttractor.x, uLeftAttractor.y);
        float distL = length(dirL);
        if (distL < 0.3) {
          float wave = sin(distL * 60.0 - speedTime * 18.0) * 0.008 * (1.0 - distL / 0.3);
          warpedUv += normalize(dirL) * wave;
        }
      }

      // Right Hand Pinch Ripple
      if (uRightPinch > 0.5) {
        vec2 dirR = mirroredUv - vec2(1.0 - uRightAttractor.x, uRightAttractor.y);
        float distR = length(dirR);
        if (distR < 0.3) {
          float wave = sin(distR * 60.0 - speedTime * 18.0) * 0.008 * (1.0 - distR / 0.3);
          warpedUv += normalize(dirR) * wave;
        }
      }

      // ----------------------------------------------------
      // Option A: Curl Fluid Flow Field displacement
      // ----------------------------------------------------
      vec2 attL = vec2(1.0 - uLeftAttractor.x, uLeftAttractor.y);
      vec2 toAttL = warpedUv - attL;
      float distToL = length(toAttL);
      if (distToL < 0.28) {
        vec2 swirl = vec2(-toAttL.y, toAttL.x) * 1.5;
        vec2 linear = vec2(-uLeftVelocity.x, uLeftVelocity.y) * 0.12;
        float strength = (1.0 - distToL / 0.28) * 0.045;
        warpedUv += (swirl + linear) * strength;
      }

      vec2 attR = vec2(1.0 - uRightAttractor.x, uRightAttractor.y);
      vec2 toAttR = warpedUv - attR;
      float distToR = length(toAttR);
      if (distToR < 0.28) {
        vec2 swirl = vec2(-toAttR.y, toAttR.x) * 1.5;
        vec2 linear = vec2(-uRightVelocity.x, uRightVelocity.y) * 0.12;
        float strength = (1.0 - distToR / 0.28) * 0.045;
        warpedUv += (swirl + linear) * strength;
      }

      warpedUv = clamp(warpedUv, 0.001, 0.999);

      // Base Sobel edge outlines (used by X-Ray and Blueprint modes)
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

      // Base sample
      vec3 originalColor = texture2D(uTexture, warpedUv).rgb;
      float baseLum = dot(originalColor, vec3(0.299, 0.587, 0.114));

      // ----------------------------------------------------
      // MODE 0: Cycle effects (inside quadrilateral)
      // ----------------------------------------------------
      vec3 quadColor = originalColor;

      // Effect 0: Standard Particle Mode
      float bands = fract(baseLum * 10.0 - speedTime * 0.5);
      float contours = smoothstep(0.4, 0.5, bands) - smoothstep(0.5, 0.6, bands);
      vec3 contourColor = vec3(0.05, 0.3, 0.9) * contours * 1.5 * (1.0 + uBloomStrength * 1.8);

      // Interactive Magnetic Grid Warp
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

      // Twinkling grid of squares (90x90 grid) using warped gridUv
      vec2 gridRes = vec2(90.0, 90.0 * (uResolution.y / uResolution.x));
      vec2 cellPos = fract(gridUv * gridRes);
      vec2 cellIndex = floor(gridUv * gridRes);
      
      float gridVal = 0.0;
      if (cellPos.x > 0.35 && cellPos.x < 0.65 && cellPos.y > 0.35 && cellPos.y < 0.65) {
        // Adjust particle size dynamically based on Z-depth (uBloomStrength)
        float pBoundMin = 0.35 - uBloomStrength * 0.15;
        float pBoundMax = 0.65 + uBloomStrength * 0.15;
        if (cellPos.x > pBoundMin && cellPos.x < pBoundMax && cellPos.y > pBoundMin && cellPos.y < pBoundMax) {
          float strobe = sin(speedTime * 15.0 + cellIndex.x * 0.5 + cellIndex.y * 0.3) * 0.5 + 0.5;
          gridVal = strobe;
        }
      }
      
      float phase = cellIndex.x * 0.1 + cellIndex.y * 0.05;
      float cycle = fract(speedTime * 15.0 / 3.0 + phase) * 3.0;
      vec3 particleColor;
      if (cycle < 1.0) {
        particleColor = mix(vec3(1.0, 0.2, 0.6), vec3(1.0, 0.9, 0.2), cycle);
      } else if (cycle < 2.0) {
        particleColor = mix(vec3(1.0, 0.9, 0.2), vec3(1.0, 1.0, 1.0), cycle - 1.0);
      } else {
        particleColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.2, 0.6), cycle - 2.0);
      }
      vec3 gridOutput = particleColor * gridVal;

      vec3 subjectGlow = vec3(0.1, 0.3, 0.9) * smoothstep(0.2, 0.8, baseLum) * 0.6;
      vec3 particleFinalColor = originalColor * 0.3 + contourColor + gridOutput + subjectGlow;

      // Glitch helpers
      float offsetR = snoise(vec2(speedTime * 15.0, warpedUv.y * 30.0)) * 0.012;
      float offsetB = -snoise(vec2(speedTime * 10.0, warpedUv.y * 20.0)) * 0.012;

      if (uEffectIndex < 0.5) {
        quadColor = particleFinalColor;
      } else if (uEffectIndex < 1.5) {
        // Blueprint Mode (Blueprint drafting lines & technical grid - replaces Burning)
        // 1. Cyan base grid
        vec3 blueprintBg = vec3(0.01, 0.12, 0.35);
        vec2 bRes = vec2(30.0, 30.0 * (uResolution.y / uResolution.x));
        vec2 bGridPos = step(vec2(0.96), fract(warpedUv * bRes));
        float blueGridVal = max(bGridPos.x, bGridPos.y);
        
        // 2. Concentric circular schematics drawing
        float distToCenter = distance(warpedUv, vec2(0.5));
        float bRings = step(0.97, sin(distToCenter * 48.0)) * 0.2;
        
        // 3. Technical white outline drawing from Sobel edges
        vec3 blueprintGridLines = mix(vec3(0.1, 0.35, 0.7) * blueGridVal, vec3(0.12, 0.45, 0.8) * (blueGridVal + bRings), 0.6);
        vec3 blueprintSkeletonLines = vec3(0.3, 0.85, 1.0) * edgeVal * 2.2 * uNeonMultiplier;
        
        quadColor = blueprintBg + blueprintGridLines + blueprintSkeletonLines;
      } else if (uEffectIndex < 2.5) {
        // Glow Silhouette
        float contrastLum = pow(baseLum, 1.2) * 1.5;
        float edgeNoise = snoise(warpedUv * 200.0 + speedTime * 0.5) * 0.15;
        float core = smoothstep(0.5 + edgeNoise, 0.7 + edgeNoise, contrastLum);
        float halo = smoothstep(0.2 + edgeNoise, 0.6 + edgeNoise, contrastLum);
        vec3 haloColor = vec3(0.4, 0.9, 1.0) * (1.0 + uBloomStrength * 1.5) * uNeonMultiplier;
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
          texture2D(uTexture, vUv).g,
          texture2D(uTexture, clamp(warpedUv + vec2(offsetB, 0.0), 0.0, 1.0)).b
        );
        quadColor -= sin(warpedUv.y * 800.0 + speedTime * 10.0) * 0.05;
      } else {
        // Neon Edges
        vec3 neonColor = vec3(0.1, 1.0, 0.8) * edgeVal * 2.5 * (1.0 + uBloomStrength * 1.6) * uNeonMultiplier;
        quadColor = mix(originalColor * 0.3, neonColor, 0.7);
      }

      // ----------------------------------------------------
      // Option E: Practical Document Viewer (MRI / Blueprint overlay)
      // ----------------------------------------------------
      if (uUseDoc > 0.5) {
        // Zoom and Pan document mapping coordinates
        vec2 docUv = (warpedUv - 0.5) * uDocZoom + 0.5 + uDocPan;
        docUv = clamp(docUv, 0.001, 0.999);
        
        vec3 docColor = texture2D(uDocTexture, docUv).rgb;
        
        // Overlay cyan outlines of operator's hands over the medical document
        vec3 docOutlines = vec3(0.1, 0.9, 1.0) * edgeVal * 1.5;
        quadColor = docColor + docOutlines;
      }

      // ----------------------------------------------------
      // MODE 1: X-Ray Mode (from PDF)
      // ----------------------------------------------------
      // 1. Base Volume Blue space
      vec3 baseBlue = vec3(0.1, 0.4, 0.85);
      vec3 darkBlue = vec3(0.02, 0.05, 0.2);
      vec3 xrayVolume = mix(baseBlue, darkBlue, baseLum);

      // 2. Cyan Edges
      vec3 cyanEdges = vec3(0.0, 0.9, 1.0) * edgeVal * 2.0 * (1.0 + uBloomStrength * 1.5) * uNeonMultiplier;

      // 3. Film Grain
      float grainNoise = hash(warpedUv + speedTime * 100.0) * 0.1 * uGrainMultiplier - 0.05 * uGrainMultiplier;

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
      vec2 mirroredUv = vec2(1.0 - vUv.x, vUv.y);
      gl_FragColor = texture2D(uTexture, mirroredUv);
    }
  `
};
