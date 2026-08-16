import { useEffect, useRef } from "react";
import { useFrek } from "@/store/FrekContext";

// SONIC FLOW — layered flowing ribbons, gold(left) -> white -> blue(right).
export default function SonicFlow() {
  const { engine, isPlaying } = useFrek();
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    let raf, phase = 0;

    const resize = () => { canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; };
    resize();
    window.addEventListener("resize", resize);

    const ribbons = [
      { amp: 0.30, freq: 2.1, speed: 1.0, w: 2.4 },
      { amp: 0.22, freq: 3.0, speed: 1.5, w: 1.6 },
      { amp: 0.16, freq: 1.4, speed: 0.7, w: 1.2 },
      { amp: 0.10, freq: 4.2, speed: 2.1, w: 1.0 },
    ];

    const draw = () => {
      const w = canvas.width, h = canvas.height, mid = h / 2;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      const wave = engine.getWaveform();
      let level = 0.4;
      if (wave && isPlaying) { level = 0; for (let i = 0; i < wave.length; i += 8) level += Math.abs((wave[i] - 128) / 128); level = Math.min(1, (level / (wave.length / 8)) * 3 + 0.2); }

      ribbons.forEach((rb, idx) => {
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "rgba(255,180,40,0.9)");
        grad.addColorStop(0.42, "rgba(255,240,220,0.95)");
        grad.addColorStop(0.6, "rgba(210,245,255,0.9)");
        grad.addColorStop(1, "rgba(0,180,255,0.9)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = rb.w * dpr;
        ctx.shadowBlur = 14 * dpr;
        ctx.shadowColor = idx < 2 ? "rgba(255,200,80,0.5)" : "rgba(0,200,255,0.5)";
        ctx.beginPath();
        const N = 160;
        for (let i = 0; i <= N; i++) {
          const x = (i / N) * w;
          const env = Math.sin((i / N) * Math.PI); // taper at edges
          const y = mid + Math.sin((i / N) * Math.PI * rb.freq + phase * rb.speed + idx) * rb.amp * mid * env * level * 2;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;
      phase += 0.03;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [engine, isPlaying]);

  return (
    <div className="relative inset-panel overflow-hidden" style={{ height: 128 }} data-testid="sonic-flow">
      <span className="absolute top-3 left-4 label-tech z-10 text-gray-300">SONIC FLOW</span>
      <canvas ref={ref} className="w-full h-full block" />
    </div>
  );
}
