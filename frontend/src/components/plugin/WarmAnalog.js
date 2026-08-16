import { useEffect, useRef } from "react";
import { useFrek } from "@/store/FrekContext";

// WARM ANALOG — organic orange flowing fluid ribbons (left zone).
export default function WarmAnalog() {
  const { engine, macros, isPlaying } = useFrek();
  const ref = useRef(null);
  const macroRef = useRef(macros);
  macroRef.current = macros;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    let raf, phase = 0;
    const resize = () => { canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; };
    resize(); window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const warmth = 0.3 + (macroRef.current.warm_analog / 100) * 0.8;
      const lvl = isPlaying ? 0.7 + engine.getLevel() * 2 : 0.7;
      for (let r = 0; r < 5; r++) {
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "rgba(120,50,0,0.0)");
        grad.addColorStop(0.4, `rgba(230,120,20,${0.5 * warmth})`);
        grad.addColorStop(0.7, `rgba(255,190,70,${0.8 * warmth})`);
        grad.addColorStop(1, "rgba(255,150,30,0.0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = (2.6 - r * 0.4) * dpr;
        ctx.shadowBlur = 16 * dpr; ctx.shadowColor = "rgba(255,150,40,0.5)";
        ctx.beginPath();
        const N = 120, baseY = h * (0.35 + r * 0.08);
        for (let i = 0; i <= N; i++) {
          const x = (i / N) * w;
          const env = Math.sin((i / N) * Math.PI);
          const y = baseY + Math.sin((i / N) * Math.PI * (1.6 + r * 0.3) + phase * (0.6 + r * 0.2)) * h * 0.16 * env * warmth * lvl;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0;
      phase += 0.02; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [engine, isPlaying]);

  return (
    <div className="relative h-full">
      <div className="absolute top-0 left-0 z-10">
        <div className="font-head text-[15px] tracking-[0.12em] text-[#FFB347] uppercase">Warm Analog</div>
        <div className="label-tech tracking-normal normal-case text-gray-500">Swipe outwards warmth</div>
      </div>
      <canvas ref={ref} className="w-full h-full block" />
    </div>
  );
}
