"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.075,
      wheelMultiplier: 0.9,
      anchors: true,
    });
    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}
