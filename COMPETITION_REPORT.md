# ArcGesture: Webcam-Only Spatial Computing & Interactive HUD Interface
### Competition Presentation, Pitch & Demo Spec

---

## 1. Executive Summary & Value Proposition

**ArcGesture** is a hardware-free spatial computing overlay that transforms any standard consumer webcam into a real-time, gesture-controlled interactive display. By combining light-weight deep learning (MediaPipe Hand landmark detection) with high-performance WebGL graphics (Three.js and custom GLSL fragment shaders), ArcGesture projects a dynamic, bilinearly-deformed visual canvas directly between the user's hands.

### The Core Innovation
Existing spatial computing interfaces (like Apple Vision Pro or Leap Motion) require expensive, specialized hardware (depth sensors, LiDAR, stereoscopic cameras). **ArcGesture achieves real-time 3D spatial mapping, interactive fluid physics, and depth-reactive audio-visual feedback using only a standard 2D RGB webcam.**

---

## 2. Core Technical Innovations (What to Tell Judges)

When presenting to judges, highlight these three engineering achievements:

### 1. Bilinear Quadrilateral Mesh Deformation
Normally, rendering visual filters on webcams applies to the entire screen. ArcGesture tracks 4 hand coordinates (Index tips and Thumbs) and deforms a 32x32 subdivided Three.js plane geometry in 3D using bilinear interpolation:
$$V(u, v) = (1 - u)(1 - v) P_{bl} + u (1 - v) P_{br} + (1 - u) v P_{tl} + u v P_{tr}$$
We then calculate screen-space UV projections:
$$u_{screen} = \frac{vx + 1.0}{2.0}, \quad v_{screen} = \frac{vy + 1.0}{2.0}$$
This maps the webcam feed onto the deformed quad, creating a "magnifying lens" effect that aligns with the video.

### 2. Interactive Curl Fluid Shader (GLSL)
Fingertip velocities are tracked and piped to the fragment shader. We compute a vector field combining hand directions with curl noise directly on the GPU, allowing the user's fingers to swirl the camera feed and particle grid lines like digital ink at 60 FPS.

### 3. Depth Estimation from 2D Feeds
By calculating the Euclidean distance between the wrist landmark (0) and middle knuckle (9) of both hands, we estimate hand depth (Z-distance). Pushing hands closer to the camera drops the synthesizer pitch to a deep bass hum and increases the WebGL bloom intensity.

---

## 3. Real-World Use Cases & Applications

| Domain / Industry | Use Case Description | Business & Operational Value |
| :--- | :--- | :--- |
| **Healthcare & Sterile Operating Rooms** | Surgeons can manipulate medical images, MRI scans, or patient records hands-free. | **Zero Contamination**: Prevents surgeons from touching screens or mice, preserving sterile environments and saving time. |
| **Industrial Design & Manufacturing** | Mechanical engineers can rotate blueprints or apply thermal stress-test filters on holographic displays while holding physical tools. | **Hands-Free Productivity**: Eliminates the need to put down tools to interact with documentation. |
| **Touchless Public Kiosks** | Interactive maps in airports, subway ticketing kiosks, or museum exhibits controlled entirely by gestures. | **Hygiene & Accessibility**: Stops the transmission of pathogens on public touchscreens; prevents wear and tear. |
| **Creative Performance & DJing** | Live audio-visual performances where hand distance adjusts synthesizer pitch and claps trigger audio-visual transitions. | **New Artistic Mediums**: Couples physical hand movement directly with music synthesis and WebGL graphics. |

---

## 4. Live Demo Presentation Script

Follow this script during your competition pitch to showcase the features:

| Time | Presenter Action | Visual HUD Response | What to Say to the Judges |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:10** | **Raise both hands.** | Silver skeletons trace your fingers; a cyan neon quad lens snaps between your index fingers and thumbs. | *"Welcome to ArcGesture. By raising my hands, a spatial display snaps into place. No headsets, no LiDAR—just a standard webcam."* |
| **0:10 - 0:25** | **Move index fingers inside the lens.** | Particles swirl and warp behind your fingertips. | *"As I hover my index fingers inside this window, a WebGL curl-fluid shader calculates the velocity of my fingers to warp the video feed in real-time."* |
| **0:25 - 0:40** | **Push hands close to the camera.** | The background synth pitch drops to a deep bass drone, and the neon borders flare with blinding bloom. | *"By moving my hands closer, the system estimates Z-depth, automatically shifting the sound frequency to a heavy rumble and flaring the visual neon bloom."* |
| **0:40 - 0:55** | **Bring hands close together (Clap).** | Swoop sound plays; lens filter cycles to Burning, Glitch, etc. | *"A knuckle clap gesture cycles through our real-time effects suite—including burning fire, thermal vision, pixel arrays, and neon edge filters."* |
| **0:55 - 1:10** | **Pinch both index fingers and thumbs.** | Quad collapses to a thin horizontal strip and turns into a cyan/blue X-Ray scanner. | *"When both hands pinch, the display instantly shifts to X-Ray scanner mode, compressing the window to isolate bone skeletons with cyan Sobel edge-detection."* |
| **1:10 - 1:25** | **Right Hand edge hover & slider adjustments.** | Menu slides open; hovering over sliders changes speed and grain. | *"Bringing my hand to the right edge opens our settings panel, where I can hover my fingers to adjust visual parameters like time speed and grain density."* |
| **1:25 - 1:40** | **Show Thumbs-Up gesture.** | Circular loading progress fills to 100%, red `REC` overlay blinks. | *"To export my work, I hold a thumbs-up. The HUD captures the Three.js canvas stream, records for 5 seconds, and automatically downloads a WebM file."* |
