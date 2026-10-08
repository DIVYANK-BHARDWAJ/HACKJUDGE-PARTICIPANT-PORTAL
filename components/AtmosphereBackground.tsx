/* eslint-disable */
'use client';
import React, { useEffect, useState } from 'react';

export default function AtmosphereBackground() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />
      <div className="light-beam" aria-hidden="true" style={{ animationPlayState: prefersReducedMotion ? 'paused' : 'running' }} />
      <div className="red-fog" aria-hidden="true" />
      <div className="planet-glow" aria-hidden="true" />
      
      {/* Giant X Watermark */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 mix-blend-screen opacity-10 animate-pulse-glow" style={{ animationPlayState: prefersReducedMotion ? 'paused' : 'running' }} aria-hidden="true">
        <svg width="800" height="800" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 20 L80 80 M80 20 L20 80" stroke="var(--red-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  );
}
