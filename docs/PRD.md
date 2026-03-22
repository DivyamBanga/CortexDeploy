# CortexDeploy Landing Page — Product Requirements Document

## Overview
A waitlist landing page for CortexDeploy — an AI conversation memory platform. The page features a 3D particle wave terrain background with interactive cursor effects, overlaid with hero text, email capture, and stats.

## Stack
- **Framework**: Next.js 14 (App Router), TypeScript
- **Styling**: Tailwind CSS
- **3D**: Three.js via `@react-three/fiber` + `@react-three/drei`
- **Animation**: Framer Motion
- **Fonts**: Playfair Display (serif, headline), Inter (sans-serif, body)

## 3D Particle Terrain Background

### Particle Grid
- ~200x200 grid of small white/light-gray dots on pure black `#000` background
- Dot size: 1-2px
- Even spacing across the grid
- Opacity varies by height to create depth effect

### Terrain Generation
- Layered simplex/perlin noise for organic rolling hills and valleys
- Gentle slopes, not spiky — multiple noise octaves for natural feel
- Terrain fills viewport and extends beyond edges

### Animation
- **Ambient motion**: Continuous slow undulation via time-based offset in noise function. Ocean-wave-like. Never stops.
- **Cursor reactivity**: Mouse position creates localized ripple/displacement. Radius ~15-20% of viewport. Smooth gaussian falloff. Uses raycasting or projected mouse coordinates mapped to particle plane.

### Camera
- Slightly elevated perspective: 15-25 degrees from horizontal
- Looking across the terrain so hills create visible silhouettes
- Terrain fills and extends beyond viewport edges

### Performance
- `THREE.Points` with `BufferGeometry` (NOT individual meshes)
- Position updates in `useFrame`
- Target: 60fps

## Layout & Typography

### Hero Section (full viewport height)

#### Headline (left side, ~40% from top)
- Text: "Your AI Conversations, Remembered."
- Font: Playfair Display (serif), ~80-96px desktop, responsive
- Color: white `#fff`
- Line height: ~1.05
- Natural line break after comma

#### Subheadline (below headline)
- Text: "Explore your AI chat history in 3D. Search across every conversation. Inject context into new sessions."
- Font: Inter (sans-serif), ~18px
- Color: white, ~70% opacity

#### Feature Bullets (right side, vertically centered)
- Right-aligned, sans-serif, ~16px, white ~60% opacity
- Lines:
  1. "3D semantic visualization of your AI chat history."
  2. "Hybrid search that finds conversations you forgot you had."
  3. "Context injection via MCP — your memory, your models."

### Email Capture (below subheadline)
- Input: dark semi-transparent background, white placeholder "Enter your email address", rounded corners
- Button: "Join Waitlist", white background, black text, rounded
- Both ~48px height, button sits right of input

### Stats Bar (bottom of viewport)
Three stats evenly spaced:

| Stat | Label |
|------|-------|
| 768D | EMBEDDING DIMENSIONS |
| < 1s | SEARCH LATENCY |
| 100% | LOCAL & PRIVATE |

- Numbers: large bold sans-serif ~72px, white
- Labels: uppercase, letter-spaced, ~12px, white ~50% opacity

## Animations (Framer Motion)
- Headline: fade up on entrance
- Feature bullets: staggered fade up
- Stats: fade up staggered

## Responsive Breakpoints
- Desktop: 1440px
- Tablet: 1024px
- Mobile: 375px

## Backend
- Existing Express server with SQLite for email collection (preserve)
