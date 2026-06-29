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
    uniform vec4 uBox; // [xMin, yMin, xMax, yMax]
    uniform float uEffect;
    uniform vec2 uResolution;
    varying vec2 vUv;

    // 2D Simplex Noise generator (required by Simplex effects)
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

    void main() {
      // Horizontally mirror UV coordinates
      vec2 mirroredUv = vec2(1.0 - vUv.x, vUv.y);

      // Pre-calculate all texture samples at the top (Critical WebGL Performance Rule)
      vec3 baseColor = texture2D(uTexture, mirroredUv).rgb;
      float baseLum = dot(baseColor, vec3(0.299, 0.587, 0.114));

      // Effect 1: Burning texture coordinates
      vec2 burnUv = mirroredUv + snoise(mirroredUv * 10.0 + uTime * 2.0) * 0.05;
      vec3 burnColor = texture2D(uTexture, burnUv).rgb;
      float burnLum = dot(burnColor, vec3(0.299, 0.587, 0.114));

      // Effect 4: Pixelated
      vec2 grid = vec2(80.0, 80.0 * (uResolution.y / uResolution.x));
      vec2 blockUv = floor(mirroredUv * grid) / grid;
      vec3 pixelColor = texture2D(uTexture, blockUv).rgb;
      float pixelLum = dot(pixelColor, vec3(0.299, 0.587, 0.114));

      // Effect 5: Glitch Chromatic Aberration
      float offsetR = snoise(vec2(uTime * 15.0, mirroredUv.y * 30.0)) * 0.012;
      float offsetB = -snoise(vec2(uTime * 10.0, mirroredUv.y * 20.0)) * 0.012;
      vec3 glitchColor = vec3(
        texture2D(uTexture, clamp(mirroredUv + vec2(offsetR, 0.0), 0.0, 1.0)).r,
        texture2D(uTexture, mirroredUv).g,
        texture2D(uTexture, clamp(mirroredUv + vec2(offsetB, 0.0), 0.0, 1.0)).b
      );

      // Effect 6: Sobel Edges neighbor pre-sampling
      float dx = 1.0 / uResolution.x;
      float dy = 1.0 / uResolution.y;
      float s00 = dot(texture2D(uTexture, mirroredUv + vec2(-dx, -dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s01 = dot(texture2D(uTexture, mirroredUv + vec2(0.0, -dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s02 = dot(texture2D(uTexture, mirroredUv + vec2(dx, -dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s10 = dot(texture2D(uTexture, mirroredUv + vec2(-dx, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
      float s12 = dot(texture2D(uTexture, mirroredUv + vec2(dx, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
      float s20 = dot(texture2D(uTexture, mirroredUv + vec2(-dx, dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s21 = dot(texture2D(uTexture, mirroredUv + vec2(0.0, dy)).rgb, vec3(0.299, 0.587, 0.114));
      float s22 = dot(texture2D(uTexture, mirroredUv + vec2(dx, dy)).rgb, vec3(0.299, 0.587, 0.114));

      // ----------------------------------------------------
      // Bounding Box check (using un-mirrored UV to align with skeleton tracking)
      // ----------------------------------------------------
      if (uBox.z <= 0.0 || 
          vUv.x < uBox.x || vUv.x > uBox.z || 
          vUv.y < uBox.y || vUv.y > uBox.w) {
        gl_FragColor = vec4(baseColor, 1.0);
        return;
      }

      // Draw active effect
      vec3 finalColor = baseColor;

      if (uEffect < 0.5) {
        // Burning gradient
        vec3 col0 = vec3(0.1, 0.0, 0.0);
        vec3 col1 = vec3(1.0, 0.0, 0.0);
        vec3 col2 = vec3(1.0, 0.5, 0.0);
        vec3 col3 = vec3(1.0, 1.0, 0.0);
        
        vec3 burnGrad;
        if (burnLum < 0.33) {
          burnGrad = mix(col0, col1, burnLum / 0.33);
        } else if (burnLum < 0.66) {
          burnGrad = mix(col1, col2, (burnLum - 0.33) / 0.33);
        } else {
          burnGrad = mix(col2, col3, (burnLum - 0.66) / 0.34);
        }
        finalColor = burnGrad;

      } else if (uEffect < 1.5) {
        // Stark Glow Silhouette
        float contrastLum = pow(baseLum, 1.2) * 1.5;
        float edgeNoise = snoise(mirroredUv * 200.0 + uTime * 0.5) * 0.15;
        float core = smoothstep(0.5 + edgeNoise, 0.7 + edgeNoise, contrastLum);
        float halo = smoothstep(0.2 + edgeNoise, 0.6 + edgeNoise, contrastLum);
        
        vec3 haloColor = vec3(0.4, 0.9, 1.0); // Bright Cyan
        vec3 haloMix = mix(vec3(0.0), haloColor, halo);
        finalColor = mix(haloMix, vec3(1.0), core);

      } else if (uEffect < 2.5) {
        // Thermal Ramp
        float t = clamp((baseLum - 0.1) * 1.2, 0.0, 1.0);
        vec3 thermalColor;
        if (t < 0.25) {
          thermalColor = mix(vec3(0.0, 0.0, 0.2), vec3(0.1, 0.0, 1.0), t / 0.25);
        } else if (t < 0.5) {
          thermalColor = mix(vec3(0.1, 0.0, 1.0), vec3(0.0, 1.0, 0.0), (t - 0.25) / 0.25);
        } else if (t < 0.75) {
          thermalColor = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.9, 0.0), (t - 0.5) / 0.25);
        } else {
          thermalColor = mix(vec3(1.0, 0.9, 0.0), vec3(1.0, 0.0, 0.0), (t - 0.75) / 0.25);
        }
        finalColor = thermalColor;

      } else if (uEffect < 3.5) {
        // Pixelated Grid Circle Dot-matrix
        float cellDist = distance(fract(mirroredUv * grid), vec2(0.5));
        if (cellDist < 0.35) {
          finalColor = pixelLum > 0.25 ? vec3(0.0, 1.0, 0.0) : vec3(0.0);
        } else {
          finalColor = vec3(0.0, 0.1, 0.0);
        }

      } else if (uEffect < 4.5) {
        // Glitch
        glitchColor -= sin(mirroredUv.y * 800.0 + uTime * 10.0) * 0.05;
        finalColor = glitchColor;

      } else {
        // Neon Edges (Sobel edge filter calculation)
        float sx = (s02 + 2.0 * s12 + s22) - (s00 + 2.0 * s10 + s20);
        float sy = (s20 + 2.0 * s21 + s22) - (s00 + 2.0 * s01 + s02);
        float edgeVal = sqrt(sx * sx + sy * sy);
        
        vec3 neonColor = vec3(0.1, 1.0, 0.8) * edgeVal * 2.5;
        finalColor = mix(baseColor * 0.3, neonColor, 0.7);
      }

      // Draw Border Overlay (thickness 0.005)
      float borderThickness = 0.005;
      if (vUv.x < uBox.x + borderThickness || vUv.x > uBox.z - borderThickness || 
          vUv.y < uBox.y + borderThickness || vUv.y > uBox.w - borderThickness) {
        finalColor = mix(finalColor, vec3(1.0), 0.95);
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};
