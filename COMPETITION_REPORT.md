# ArcGesture: Webcam-Only Spatial Computing Interface
### Competition Pitch & Live Demo Spec

---

## 1. Executive Summary & Pitch Hook

**ArcGesture** is a hardware-free spatial computing HUD overlay that transforms any standard consumer RGB webcam into a real-time, gesture-controlled interactive display. By coupling light-weight deep learning (MediaPipe Hand landmarks) with high-performance WebGL graphics (Three.js and custom GLSL fragment shaders), ArcGesture projects a dynamic, hand-anchored visual lens directly between the user's hands.

### The Pitch
> *"Traditional spatial computing interfaces require expensive headsets, LiDAR, or depth cameras. ArcGesture achieves real-time 3D spatial anchoring, interactive fluid physics, depth-reactive audio-visual feedback, and gestural recording export using only a standard, low-cost RGB webcam. It democratizes spatial interfaces for everyday laptops."*

---

## 2. Live Demo Presentation Script (2-Minute Walkthrough)

Follow this script during your competition pitch to showcase the features:

| Time | Presenter Action | Visual HUD Response | What to Say to the Judges |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:15** | **Raise both hands and move them apart.** | Boots past the **Calibration Screen** as you spread your hands, revealing the Play screen. | *"Welcome to ArcGesture. As I raise my hands and spread them apart, the spatial harness calibrates itself to my hands in real-time. No headsets, no LiDAR—just a standard webcam."* |
| **0:15 - 0:30** | **Point to bottom-left corner.** | The **Proof Panel** lists active sensors: standard RGB camera, relative pseudo-depth, WebGL, Web Audio. | *"Note our Proof Panel in the corner. This HUD is run entirely by computer vision on a 2D video feed, simulating 3D depth mapping mathematically."* |
| **0:30 - 0:45** | **Move index fingers inside the lens.** | Particles swirl and warp behind your fingertips. | *"As I hover my index fingers inside this window, a WebGL curl-fluid shader calculates the velocity of my fingers to warp the video feed and twinkling particles in real-time."* |
| **0:45 - 1:00** | **Push hands close to the camera.** | The background synth pitch drops to a deep bass drone, and the neon borders flare with blinding bloom. | *"By moving my hands closer, the system estimates Z-depth, automatically shifting the sound frequency to a heavy rumble and flaring the visual neon bloom."* |
| **1:00 - 1:15** | **Hover hand in the right margin, select Use Case.** | The **Settings Menu** slides open. Choose **Medical** or **Draft** mode. | *"Hovering in the right margin opens our settings. I can switch our HUD to a practical medical MRI scanner or blueprint inspector, zooming in by spreading my hands and panning by moving them."* |
| **1:15 - 1:30** | **Fold both hands into a tight fist.** | The bounding corners turn amber, displaying a glowing **FIELD LOCK ACTIVE** alert. | *"By folding both hands into a fist, I trigger a Fist-Lock gesture. This freezes the document coordinates in 3D, allowing me to drop my hands or point out details inside the brain scan while the lens stays locked."* |
| **1:30 - 1:45** | **Clap hands and pull them apart very fast.** | Swoop sound plays; lens filter cycles, and a global **refractive shockwave ring** ripples outward. | *"A knuckle clap gesture cycles through our real-time effects suite. By clapping and spreading my hands quickly, I trigger a portal shockwave ripple across the screen."* |
| **1:45 - 2:00** | **Show Thumbs-Up gesture.** | Circular loading progress fills to 100%, red `REC` overlay blinks. | *"To export my work, I hold a thumbs-up. The HUD captures the Three.js canvas stream, records for 5 seconds, and automatically downloads a WebM video of my session."* |

---

## 3. Real-World Use Cases (Target Markets)

1. **Healthcare & Sterile Operating Rooms**: Surgeons can pan and zoom MRI/X-ray brain scans hands-free. Eliminates touching keyboards/screens, preserving sterile fields.
2. **Industrial Maintenance & AR**: Maintenance engineers can hover over engine blueprints, reveal internal schematics with X-Ray scans, and lock the field in place hands-free while holding physical tools.
3. **Public Kiosks**: Hygienic, touchless interaction for ticketing and airport maps, reducing pathogen transmission.
4. **Interactive Media & Performance**: Live DJing and VJing mapping hand position, depth, and speed directly to audio synthesizer pitch, volume, and WebGL fluid graphics.
