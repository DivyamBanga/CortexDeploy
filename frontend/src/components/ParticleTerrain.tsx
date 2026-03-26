"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";

// ─── Grid Config ───
// Dense grid for that fabric/mesh look. Extends well beyond viewport.
const COLS = 250;
const ROWS = 250;
const SPACING = 0.12;
const PARTICLE_COUNT = COLS * ROWS;
const HALF_W = (COLS * SPACING) / 2;
const HALF_D = (ROWS * SPACING) / 2;

// ─── Noise Config ───
// 3 octaves: large rolling hills + medium ridges + fine detail
const N1_FREQ = 0.045; // large-scale terrain
const N1_AMP = 2.5;
const N2_FREQ = 0.09; // medium ridges
const N2_AMP = 1.0;
const N3_FREQ = 0.018; // very large gentle undulation
const N3_AMP = 4.0;
const TIME_SPEED = 0.055; // slow ocean-wave drift

// ─── Mouse Config ───
const MOUSE_RADIUS = 5.5;
const MOUSE_STRENGTH = 2.2;

// ─── Custom Shader Material for round dots with per-particle brightness ───
class TerrainPointsMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uPixelRatio: { value: 1.0 },
      },
      vertexShader: /* glsl */ `
        attribute float aBrightness;
        attribute float aSize;
        varying float vBrightness;

        void main() {
          vBrightness = aBrightness;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // Size attenuation — closer particles larger
          gl_PointSize = aSize * (280.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 0.5);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vBrightness;

        void main() {
          // Draw a circle — discard outside radius
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;

          // Soft edge for anti-aliased look
          float alpha = smoothstep(0.5, 0.25, d);

          // Muted gray-white color (slightly cool tone like reference)
          vec3 color = vec3(0.78, 0.78, 0.84) * vBrightness;

          gl_FragColor = vec4(color, alpha * vBrightness);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }
}

extend({ TerrainPointsMaterial });

// Declare JSX intrinsic for R3F
declare module "@react-three/fiber" {
  interface ThreeElements {
    terrainPointsMaterial: object;
  }
}

function Terrain() {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<TerrainPointsMaterial>(null);
  const noise3D = useMemo(() => createNoise3D(), []);

  // Mouse tracking
  const mouseNDC = useRef(new THREE.Vector2(9999, 9999));
  const mousePlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    []
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();

  // ─── Build geometry buffers ───
  const { positions, baseX, baseZ, brightness, sizes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const bx = new Float32Array(PARTICLE_COUNT);
    const bz = new Float32Array(PARTICLE_COUNT);
    const br = new Float32Array(PARTICLE_COUNT);
    const sz = new Float32Array(PARTICLE_COUNT);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col;
        const i3 = i * 3;

        const x = col * SPACING - HALF_W;
        const z = row * SPACING - HALF_D;

        pos[i3] = x;
        pos[i3 + 1] = 0;
        pos[i3 + 2] = z;

        bx[i] = x;
        bz[i] = z;
        br[i] = 0.3; // initial brightness
        sz[i] = 1.0; // initial size
      }
    }

    return { positions: pos, baseX: bx, baseZ: bz, brightness: br, sizes: sz };
  }, []);

  // ─── Mouse listener ───
  const onPointerMove = useCallback((e: MouseEvent) => {
    mouseNDC.current.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [onPointerMove]);

  // ─── Per-frame update ───
  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const brAttr = geo.getAttribute("aBrightness") as THREE.BufferAttribute;
    const szAttr = geo.getAttribute("aSize") as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const brArr = brAttr.array as Float32Array;
    const szArr = szAttr.array as Float32Array;

    const t = clock.getElapsedTime() * TIME_SPEED;

    // Project mouse onto y=0 plane
    raycaster.setFromCamera(mouseNDC.current, camera);
    raycaster.ray.intersectPlane(mousePlane, hitPoint);
    const mx = hitPoint.x;
    const mz = hitPoint.z;

    const camPos = camera.position;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const x = baseX[i];
      const z = baseZ[i];

      // ── 3-octave simplex noise terrain ──
      // Octave 1: large gentle hills
      const h1 = noise3D(x * N1_FREQ, z * N1_FREQ, t) * N1_AMP;
      // Octave 2: medium ridges
      const h2 =
        noise3D(x * N2_FREQ + 43.7, z * N2_FREQ + 43.7, t * 1.15) * N2_AMP;
      // Octave 3: very large slow undulation
      const h3 =
        noise3D(x * N3_FREQ + 97.1, z * N3_FREQ + 97.1, t * 0.5) * N3_AMP;

      let height = h1 + h2 + h3;

      // ── Cursor displacement ──
      const dx = x - mx;
      const dz = z - mz;
      const mouseDist = Math.sqrt(dx * dx + dz * dz);
      if (mouseDist < MOUSE_RADIUS) {
        const f = 1.0 - mouseDist / MOUSE_RADIUS;
        const smooth = f * f * (3.0 - 2.0 * f); // smoothstep
        height += smooth * MOUSE_STRENGTH;
      }

      posArr[i3 + 1] = height;

      // ── Distance from camera (3D euclidean) ──
      const dcx = x - camPos.x;
      const dcy = height - camPos.y;
      const dcz = z - camPos.z;
      const camDist = Math.sqrt(dcx * dcx + dcy * dcy + dcz * dcz);

      // Fade: particles beyond ~25 units fade to nothing
      // Close particles (< 5 units) at full brightness
      const distFade = Math.max(0, Math.min(1, 1.0 - (camDist - 4) / 28));
      // Apply a power curve for more aggressive distant fade (like reference)
      const fadeCurve = distFade * distFade;

      // ── Height-based brightness ──
      // Ridge tops brighter, valleys dimmer
      const hNorm = Math.max(0, Math.min(1, (height + 5) / 13));
      const heightBright = 0.15 + hNorm * 0.45; // range: 0.15 – 0.60

      // ── Combined: dim overall, matching reference's muted gray look ──
      const finalBright = heightBright * fadeCurve;

      brArr[i] = finalBright;
      szArr[i] = 0.6 + fadeCurve * 0.7; // 0.6 – 1.3 range
    }

    posAttr.needsUpdate = true;
    brAttr.needsUpdate = true;
    szAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute
          attach="attributes-aBrightness"
          args={[brightness, 1]}
        />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <terrainPointsMaterial ref={matRef} />
    </points>
  );
}

export default function ParticleTerrain() {
  return (
    <div
      className="fixed inset-0 w-full h-full"
      style={{ background: "#000" }}
    >
      <Canvas
        camera={{
          position: [0, 3, 13],
          fov: 55,
          near: 0.1,
          far: 60,
        }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
        style={{ background: "#000" }}
        onCreated={({ camera }) => {
          // Low angle: look across the terrain surface
          // Camera at y=3, looking at a point on the ground ~18 units ahead
          // This gives ~10-15 degree elevation — matching the reference
          camera.lookAt(0, -0.5, -8);
        }}
      >
        <Terrain />
      </Canvas>
    </div>
  );
}
