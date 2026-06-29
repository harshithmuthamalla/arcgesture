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
    varying vec2 vUv;

    // 2D Simplex Noise generator
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

    // Hash function for grain noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      // Input texture UV coordinates (already screen-mapped in EffectsCanvas)
      vec3 originalColor = texture2D(uTexture, vUv).rgb;
      float baseLum = dot(originalColor, vec3(0.299, 0.587, 0.114));

      // ----------------------------------------------------
      // MODE 0: Cycle effects (inside quadrilateral)
      // ----------------------------------------------------
      vec3 quadColor = originalColor;

      // Effect 0: Standard Particle Mode (from PDF)
      // 1. Contour Lines (Blue glow bands)
      float bands = fract(baseLum * 10.0 - uTime * 0.5);
      float contours = smoothstep(0.4, 0.5, bands) - smoothstep(0.5, 0.6, bands);
      vec3 contourColor = vec3(0.05, 0.3, 0.9) * contours * 1.5;

      // 2. Twinkling grid of squares (90x90 grid)
      vec2 gridRes = vec2(90.0, 90.0 * (uResolution.y / uResolution.x));
      vec2 cellPos = fract(vUv * gridRes);
      vec2 cellIndex = floor(vUv * gridRes);
      
      float gridVal = 0.0;
      if (cellPos.x > 0.35 && cellPos.x < 0.65 && cellPos.y > 0.35 && cellPos.y < 0.65) {
        float strobe = sin(uTime * 15.0 + cellIndex.x * 0.5 + cellIndex.y * 0.3) * 0.5 + 0.5;
        gridVal = strobe;
      }
      
      // 3. Color Cycling (Magenta -> Yellow -> White at 15Hz)
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

      // 4. Subject Glow
      vec3 subjectGlow = vec3(0.1, 0.3, 0.9) * smoothstep(0.2, 0.8, baseLum) * 0.6;

      vec3 particleFinalColor = originalColor * 0.3 + contourColor + gridOutput + subjectGlow;

      // Glitch helpers (Pre-calculated for use across modes)
      float offsetR = snoise(vec2(uTime * 15.0, vUv.y * 30.0)) * 0.012;
      float offsetB = -snoise(vec2(uTime * 10.0, vUv.y * 20.0)) * 0.012;

      if (uEffectIndex < 0.5) {
        quadColor = particleFinalColor;
      } else if (uEffectIndex < 1.5) {
        // Burning Effect
        vec2 burnUv = vUv + snoise(vUv * 10.0 + uTime * 2.0) * 0.05;
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
        // Glow Silhouette
        float contrastLum = pow(baseLum, 1.2) * 1.5;
        float edgeNoise = snoise(vUv * 200.0 + uTime * 0.5) * 0.15;
        float core = smoothstep(0.5 + edgeNoise, 0.7 + edgeNoise, contrastLum);
        float halo = smoothstep(0.2 + edgeNoise, 0.6 + edgeNoise, contrastLum);
        quadColor = mix(mix(vec3(0.0), vec3(0.4, 0.9, 1.0), halo), vec3(1.0), core);
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
        vec2 blockUv = floor(vUv * dGrid) / dGrid;
        float dPixelLum = dot(texture2D(uTexture, blockUv).rgb, vec3(0.299, 0.587, 0.114));
        float cellDist = distance(fract(vUv * dGrid), vec2(0.5));
        quadColor = (cellDist < 0.35) ? (dPixelLum > 0.25 ? vec3(0.0, 1.0, 0.0) : vec3(0.0)) : vec3(0.0, 0.1, 0.0);
      } else if (uEffectIndex < 5.5) {
        // Glitch
        quadColor = vec3(
          texture2D(uTexture, clamp(vUv + vec2(offsetR, 0.0), 0.0, 1.0)).r,
          texture2D(uTexture, vUv).g,
          texture2D(uTexture, clamp(vUv + vec2(offsetB, 0.0), 0.0, 1.0)).b
        );
        quadColor -= sin(vUv.y * 800.0 + uTime * 10.0) * 0.05;
      } else {
        // Neon Edges
        float dx = 1.0 / uResolution.x;
        float dy = 1.0 / uResolution.y;
        float s00 = dot(texture2D(uTexture, vUv + vec2(-dx, -dy)).rgb, vec3(0.299, 0.587, 0.114));
        float s02 = dot(texture2D(uTexture, vUv + vec2(dx, -dy)).rgb, vec3(0.299, 0.587, 0.114));
        float s20 = dot(texture2D(uTexture, vUv + vec2(-dx, dy)).rgb, vec3(0.299, 0.587, 0.114));
        float s22 = dot(texture2D(uTexture, vUv + vec2(dx, dy)).rgb, vec3(0.299, 0.587, 0.114));
        float s10 = dot(texture2D(uTexture, vUv + vec2(-dx, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
        float s12 = dot(texture2D(uTexture, vUv + vec2(dx, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
        float s01 = dot(texture2D(uTexture, vUv + vec2(0.0, -dy)).rgb, vec3(0.299, 0.587, 0.114));
        float s21 = dot(texture2D(uTexture, vUv + vec2(0.0, dy)).rgb, vec3(0.299, 0.587, 0.114));
        float sx = (s02 + 2.0 * s12 + s22) - (s00 + 2.0 * s10 + s20);
        float sy = (s20 + 2.0 * s21 + s22) - (s00 + 2.0 * s01 + s02);
        float edgeVal = sqrt(sx * sx + sy * sy);
        quadColor = mix(originalColor * 0.3, vec3(0.1, 1.0, 0.8) * edgeVal * 2.5, 0.7);
      }

      // ----------------------------------------------------
      // MODE 1: X-Ray Mode (from PDF)
      // ----------------------------------------------------
      // 1. Base Volume Blue space
      vec3 baseBlue = vec3(0.1, 0.4, 0.85);
      vec3 darkBlue = vec3(0.02, 0.05, 0.2);
      vec3 xrayVolume = mix(baseBlue, darkBlue, baseLum);

      // 2. Cyan Edges (Sobel edge detection)
      float dx = 1.0 / uResolution.x;
      float dy = 1.0 / uResolution.y;
      float s00 = dot(texture2D(uTexture, vUv + vec2(-dx, -dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s02 = dot(texture2D(uTexture, vUv + vec2(dx, -dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s20 = dot(texture2D(uTexture, vUv + vec2(-dx, dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s22 = dot(texture2D(uTexture, vUv + vec2(dx, dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s10 = dot(texture2D(uTexture, vUv + vec2(-dx, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
      float s12 = dot(texture2D(uTexture, vUv + vec2(dx, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
      float s01 = dot(texture2D(uTexture, vUv + vec2(0.0, -dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s21 = dot(texture2D(uTexture, vUv + vec2(0.0, dy)).rgb, vec3(0.299, 0.587, 0.114));
      float sx = (s02 + 2.0 * s12 + s22) - (s00 + 2.0 * s10 + s20);
      float sy = (s20 + 2.0 * s21 + s22) - (s00 + 2.0 * s01 + s02);
      float edgeXray = sqrt(sx * sx + sy * sy);
      vec3 cyanEdges = vec3(0.0, 0.9, 1.0) * edgeXray * 2.0;

      // 3. Film Grain
      float grainNoise = hash(vUv + uTime * 100.0) * 0.1 - 0.05;

      // 4. Scanlines
      float scanline = sin(vUv.y * uResolution.y * 2.0) * 0.05;

      vec3 xrayFinalColor = clamp(xrayVolume + cyanEdges + grainNoise - scanline, 0.0, 1.0);

      // ----------------------------------------------------
      // Blending
      // ----------------------------------------------------
      vec3 blendedColor = mix(quadColor, xrayFinalColor, uMode);

      gl_FragColor = vec4(blendedColor, 0.95);
    }
  `
};
