import { useEffect, useRef } from "react";
import { useFrek } from "@/store/FrekContext";

// Real-time signal visualization (gold/blue) driven by the Web Audio analyser.
export default function SonicFlow() {
  const { engine, isPlaying } = useFrek();
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    let phase = 0;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const data = engine.getWaveform();
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#FFD700");
      grad.addColorStop(0.5, "#00E5FF");
      grad.addColorStop(1, "#FFD700");

      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = grad;
      ctx.shadowColor = "rgba(0,229,255,0.6)";
      ctx.shadowBlur = 12 * dpr;
      ctx.beginPath();

      const N = data ? data.length : 256;
      for (let i = 0; i < N; i++) {
        const x = (i / N) * w;
        let v;
        if (data && isPlaying) {
          v = (data[i] - 128) / 128;
        } else {
          // idle ambient wave
          v = Math.sin((i / N) * Math.PI * 6 + phase) * 0.12 *
              Math.sin((i / N) * Math.PI);
        }
        const y = h / 2 + v * (h / 2) * 0.9;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // mirror faint fill
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.08;
      ctx.lineTo(w, h / 2);
      ctx.lineTo(0, h / 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.globalAlpha = 1;

      phase += 0.04;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [engine, isPlaying]);

  return (
    <div
      data-testid="sonic-flow"
      className="relative rounded-lg bg-black/60 border border-white/10 overflow-hidden"
      style={{ height: 150 }}
    >
      <span className="absolute top-2 left-3 label-tech z-10">SONIC FLOW</span>
      <span className="absolute top-2 right-3 label-tech z-10 text-[#00E5FF]">
        {isPlaying ? "● LIVE" : "○ IDLE"}
      </span>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
