'use client';

import { useEffect, useRef } from 'react';
import { HeatmapPoint } from '@/types';

interface HeatmapCanvasProps {
  points: HeatmapPoint[];
  width: number;
  height: number;
}

// Maps a 0–255 alpha value to an RGBA heat color
// blue → cyan → green → yellow → red
function alphaToColor(alpha: number): [number, number, number] {
  const t = alpha / 255;

  if (t < 0.25) {
    // blue → cyan
    const s = t / 0.25;
    return [0, Math.round(255 * s), 255];
  } else if (t < 0.5) {
    // cyan → green
    const s = (t - 0.25) / 0.25;
    return [0, 255, Math.round(255 * (1 - s))];
  } else if (t < 0.75) {
    // green → yellow
    const s = (t - 0.5) / 0.25;
    return [Math.round(255 * s), 255, 0];
  } else {
    // yellow → red
    const s = (t - 0.75) / 0.25;
    return [255, Math.round(255 * (1 - s)), 0];
  }
}

export default function HeatmapCanvas({ points, width, height }: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const maxCount = Math.max(...points.map((p) => p.count));
    const radius = Math.max(width, height) * 0.06; // ~6% of canvas size

    // Step 1: draw each point as a radial gradient on offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.globalCompositeOperation = 'screen';

    for (const point of points) {
      const px = point.x * width;
      const py = point.y * height;
      const intensity = point.count / maxCount;

      const gradient = offCtx.createRadialGradient(px, py, 0, px, py, radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      offCtx.fillStyle = gradient;
      offCtx.beginPath();
      offCtx.arc(px, py, radius, 0, Math.PI * 2);
      offCtx.fill();
    }

    // Step 2: read alpha channel and remap to heat colors
    const imageData = offCtx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i]; // red channel used as proxy (screen blend → all equal)
      if (alpha > 0) {
        const [r, g, b] = alphaToColor(Math.min(alpha * 2, 255));
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = Math.min(alpha * 2, 200); // cap opacity at ~80%
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [points, width, height]);

  if (points.length === 0) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-lg border border-slate-200"
      >
        No click data for this screen
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg"
      style={{ display: 'block' }}
    />
  );
}
