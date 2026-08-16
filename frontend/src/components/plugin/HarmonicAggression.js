import { useEffect, useRef } from "react";
import { useFrek } from "@/store/FrekContext";

// HARMONIC AGGRESSION — sharp blue spectral spikes (right zone), reacts to spectrum.
export default function HarmonicAggression() {
  const { engine, macros, isPlaying } = useFrek();
  const ref = useRef(null);
  const macroRef = useRef(macros);
  macroRef.current = macros;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    let raf, t = 0;
    const resize = () => { canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; };
    resize(); window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const grit = 0.3 + (macroRef.current.harmonic_aggression / 100) * 1.4;
      const spec = engine.getSpectrum();
      const bars = 46;
      const bw = w / bars;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < bars; i++) {
        let amp;
        if (spec && isPlaying) amp = (spec[Math.floor((i / bars) * spec.length)] / 255) * grit;
        else amp = (0.2 + Math.abs(Math.sin(i * 1.3 + t) * Math.cos(i * 0.7))) * 0.4 * grit;
        const bh = Math.min(1, amp) * h * 0.9;
        const x = i * bw;
        const grad = ctx.createLinearGradient(0, h, 0, h - bh);
        grad.addColorStop(0, "rgba(0,120,200,0.7)");
        grad.addColorStop(0.7, "rgba(0,210,255,0.95)");
        grad.addColorStop(1, "rgba(220,250,255,1)");
        ctx.fillStyle = grad;
        ctx.shadowBlur = 8 * dpr; ctx.shadowColor = "rgba(0,210,255,0.6)";
        ctx.fillRect(x + bw * 0.15, h - bh, bw * 0.6, bh);
      }
      ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0;
      t += 0.08; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [engine, isPlaying]);

  return (
    <div className="relative h-full">
      <div className="absolute top-0 right-0 text-right z-10">
        <div className="font-head text-[15px] tracking-[0.12em] text-[#00D2FF] uppercase">Harmonic Aggression</div>
        <div className="label-tech tracking-normal normal-case text-gray-500">Pinching adds grit</div>
      </div>
      <canvas ref={ref} className="w-full h-full block" />
    </div>
  );
}
