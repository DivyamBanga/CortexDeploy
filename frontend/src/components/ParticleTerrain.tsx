"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";

const GRID_SIZE = 220;
const GRID_SPACING = 0.14;
const PARTICLE_COUNT = GRID_SIZE * GRID_SIZE;
const HALF_GRID = (GRID_SIZE * GRID_SPACING) / 2;

// Noise — gentle rolling hills with multiple octaves
const NOISE_SCALE_1 = 0.05;
const NOISE_SCALE_2 = 0.1;
const NOISE_SCALE_3 = 0.02;
const HEIGHT_1 = 1.8;
const HEIGHT_2 = 0.7;
const HEIGHT_3 = 3.2;
const TIME_SPEED = 0.06;

// Mouse interaction
const MOUSE_RADIUS = 5.0;
const MOUSE_STRENGTH = 1.8;

function Terrain() {
  const pointsRef = useRef<THREE.Points>(null);
  const noise3D = useMemo(() => createNoise3D(), []);
  const mousePos = useRef(new THREE.Vector2(9999, 9999));
  const mousePlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    []
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const intersectPoint = useMemo(() => new THREE.Vector3(), []);

  const { camera } = useThree();

  const { positions, basePositions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const base = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const sz = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const idx = (i * GRID_SIZE + j) * 3;
        const x = j * GRID_SPACING - HALF_GRID;
        const z = i * GRID_SPACING - HALF_GRID;

        pos[idx] = x;
        pos[idx + 1] = 0;
        pos[idx + 2] = z;

        base[idx] = x;
        base[idx + 1] = 0;
        base[idx + 2] = z;

        // Start dim — will be updated per-frame based on height + distance
        col[idx] = 0.4;
        col[idx + 1] = 0.4;
        col[idx + 2] = 0.45;

        sz[i * GRID_SIZE + j] = 1.4;
      }
    }

    return { positions: pos, basePositions: base, colors: col, sizes: sz };
  }, []);

  const handlePointerMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    mousePos.current.set(x, y);
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const geometry = pointsRef.current.geometry;
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute;
    const sizeAttr = geometry.getAttribute("size") as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const colorArray = colorAttr.array as Float32Array;
    const sizeArray = sizeAttr.array as Float32Array;

    const t = clock.getElapsedTime() * TIME_SPEED;

    // Raycast mouse onto the terrain plane
    raycaster.setFromCamera(mousePos.current, camera);
    raycaster.ray.intersectPlane(mousePlane, intersectPoint);
    const mx = intersectPoint.x;
    const mz = intersectPoint.z;

    const camZ = camera.position.z;

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const pIdx = i * GRID_SIZE + j;
        const idx = pIdx * 3;
        const x = basePositions[idx];
        const z = basePositions[idx + 2];

        // Layered simplex noise — organic rolling hills
        const n1 =
          noise3D(x * NOISE_SCALE_1, z * NOISE_SCALE_1, t) * HEIGHT_1;
        const n2 =
          noise3D(x * NOISE_SCALE_2 + 50, z * NOISE_SCALE_2 + 50, t * 1.2) *
          HEIGHT_2;
        const n3 =
          noise3D(
            x * NOISE_SCALE_3 + 100,
            z * NOISE_SCALE_3 + 100,
            t * 0.5
          ) * HEIGHT_3;

        let height = n1 + n2 + n3;

        // Cursor ripple
        const dx = x - mx;
        const dz = z - mz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < MOUSE_RADIUS) {
          const falloff = 1.0 - dist / MOUSE_RADIUS;
          const smooth = falloff * falloff * (3.0 - 2.0 * falloff);
          height += smooth * MOUSE_STRENGTH;
        }

        posArray[idx + 1] = height;

        // Distance from camera — closer particles brighter, far ones fade to black
        const distFromCam = Math.abs(z - camZ);
        const maxDist = HALF_GRID + camZ;
        const distFade = Math.max(
          0,
          Math.min(1, 1.0 - (distFromCam - 2) / maxDist)
        );

        // Height-based brightness
        const normalizedH = Math.max(0, Math.min(1, (height + 4) / 10));
        const heightBright = 0.25 + normalizedH * 0.55;

        // Combined brightness
        const brightness = heightBright * distFade;

        colorArray[idx] = brightness * 0.8;
        colorArray[idx + 1] = brightness * 0.8;
        colorArray[idx + 2] = brightness * 0.9;

        // Closer particles slightly larger
        sizeArray[pIdx] = 1.0 + distFade * 0.8;
      }
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={1.5}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
      />
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
          position: [0, 4, 14],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
        style={{ background: "#000" }}
        onCreated={({ camera }) => {
          // Low angle looking across the terrain — hills silhouette against black
          camera.lookAt(0, -1, -8);
        }}
      >
        <Terrain />
      </Canvas>
    </div>
  );
}
