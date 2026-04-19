/**
 * NightVisionOverlay
 * Aplica filtro de visão noturna (verde intensificado) sobre o feed de vídeo
 * via CSS filter + canvas processing quando ativo.
 */
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

export interface UseNightVisionOptions {
  enabled: boolean;
  videoElement?: HTMLVideoElement | null;
  intensity?: number; // 0–100
}

export function useNightVision({ enabled, videoElement, intensity = 80 }: UseNightVisionOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const applyNightVisionFilter = useCallback(() => {
    if (!videoElement || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;

    const tick = () => {
      if (!enabled) return;
      rafRef.current = requestAnimationFrame(tick);
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const factor = intensity / 100;

      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale, amplify green channel
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const amplified = Math.min(255, gray * (1 + factor * 1.5));
        data[i] = Math.round(amplified * 0.1);      // R: very low
        data[i + 1] = Math.round(amplified);         // G: full
        data[i + 2] = Math.round(amplified * 0.15);  // B: very low
      }
      ctx.putImageData(imageData, 0, 0);
    };
    tick();
  }, [enabled, videoElement, intensity]);

  // Inject CSS filter on the video element directly (lighter approach)
  const applyCSSFilter = useCallback((video: HTMLVideoElement, active: boolean) => {
    if (!video) return;
    if (active) {
      const amt = intensity / 100;
      video.style.filter = [
        `brightness(${0.3 + amt * 0.4})`,
        `contrast(${1.2 + amt * 0.8})`,
        `saturate(0)`,
        `sepia(1)`,
        `hue-rotate(90deg)`,
        `saturate(${2 + amt * 3})`,
      ].join(' ');
      video.style.opacity = '1';
    } else {
      video.style.filter = '';
    }
  }, [intensity]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!videoElement) return;
    applyCSSFilter(videoElement, enabled);
    return () => {
      if (videoElement) applyCSSFilter(videoElement, false);
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, videoElement, applyCSSFilter]);

  return { canvasRef };
}

// ── Inject night vision CSS into a video element by querying the DOM ──────────
export function applyNightVisionToVideoEl(enabled: boolean, intensity = 80) {
  if (Platform.OS !== 'web') return;
  // Find the video element rendered by WebCameraView
  const video = document.querySelector('video') as HTMLVideoElement | null;
  if (!video) return;
  if (enabled) {
    const amt = intensity / 100;
    video.style.filter = [
      `brightness(${0.3 + amt * 0.35})`,
      `contrast(${1.2 + amt * 0.9})`,
      `saturate(0)`,
      `sepia(1)`,
      `hue-rotate(90deg)`,
      `saturate(${2 + amt * 3})`,
    ].join(' ');
    // Add scanline overlay via a pseudo-style injection
    injectScanlines(enabled);
  } else {
    video.style.filter = '';
    injectScanlines(false);
  }
}

let scanlinesStyleEl: HTMLStyleElement | null = null;
function injectScanlines(enabled: boolean) {
  if (!enabled) {
    scanlinesStyleEl?.remove();
    scanlinesStyleEl = null;
    return;
  }
  if (scanlinesStyleEl) return;
  scanlinesStyleEl = document.createElement('style');
  scanlinesStyleEl.id = 'guardai-night-vision';
  scanlinesStyleEl.textContent = `
    video::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0,255,0,0.03) 2px,
        rgba(0,255,0,0.03) 4px
      );
      pointer-events: none;
    }
    video {
      mix-blend-mode: normal;
    }
  `;
  document.head.appendChild(scanlinesStyleEl);
}
