import { useEffect, useRef, useCallback } from "react";
import { useFrek } from "@/store/FrekContext";

// INTENTION MORPH — interactive glowing wireframe sphere (focal point).
// Drag = spatial control: X -> spectral cutoff, Y -> resonance.
export default function IntentionMorphSphere() {
  const { engine, macros, setMacro, isPlaying } = useFrek();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dragging = useRef(false);
  const stateRef = useRef({ x: macros.intention_morph_x, y: macros.intention_morph_y });
  stateRef.current = { x: macros.intention_morph_x, y: macros.intention_morph_y };

  const update = useCallback((cx, cy) => {
    const rect = wrapRef.current.getBoundingClientRect();
    let nx = (cx - rect.left) / rect.width;
    let ny = 1 - (cy - rect.top) / rect.height;
    nx = Math.min(1, Math.max(0, nx)); ny = Math.min(1, Math.max(0, ny));
    setMacro("intention_morph_x", nx); setMacro("intention_morph_y", ny);
  }, [setMacro]);

  const onDown = useCallback((e) => {
    dragging.current = true; update(e.clientX, e.clientY);
    const mv = (ev) => dragging.current && update(ev.clientX, ev.clientY);
    const up = () => { dragging.current = false; window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  }, [update]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    let raf, ay = 0, ax = 0.35;
    const resize = () => { canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; };
    resize(); window.addEventListener("resize", resize);

    const project = (lat, lon, R, cx, cy, ra, rb) => {
      const x = R * Math.cos(lat) * Math.cos(lon);
      const y = R * Math.sin(lat);
      const z = R * Math.cos(lat) * Math.sin(lon);
      // rotate around Y then X
      let x1 = x * Math.cos(ra) - z * Math.sin(ra);
      let z1 = x * Math.sin(ra) + z * Math.cos(ra);
      let y1 = y * Math.cos(rb) - z1 * Math.sin(rb);
      let z2 = y * Math.sin(rb) + z1 * Math.cos(rb);
      return { sx: cx + x1, sy: cy + y1, z: z2 };
    };

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * 0.34;
      ctx.clearRect(0, 0, w, h);

      const lvl = isPlaying ? engine.getLevel() : 0.12;
      const pulse = 1 + lvl * 0.25;
      const st = stateRef.current;

      // outer glow core
      const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3);
      coreG.addColorStop(0, `rgba(255,255,255,${0.5 + lvl})`);
      coreG.addColorStop(0.25, "rgba(120,200,255,0.5)");
      coreG.addColorStop(0.55, "rgba(255,170,40,0.22)");
      coreG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = coreG;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1.1 * dpr;
      const RR = R * pulse;

      const drawLine = (pts) => {
        ctx.beginPath();
        pts.forEach((p, i) => {
          const shade = (p.z + RR) / (2 * RR); // 0..1 depth
          const gold = st.x < 0.5 ? 1 - st.x : 0.4;
          const alpha = 0.15 + shade * 0.85;
          const rC = Math.round(90 + gold * 165 + shade * 0);
          const gC = Math.round(150 + shade * 60);
          const bC = Math.round(120 + (1 - gold) * 135 + shade * 0);
          ctx.strokeStyle = `rgba(${rC},${gC},${255 - Math.round(gold * 80)},${alpha})`;
          if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy);
        });
        ctx.stroke();
      };

      const meridians = 16, parallels = 10, seg = 60;
      for (let m = 0; m < meridians; m++) {
        const lon = (m / meridians) * Math.PI * 2;
        const pts = [];
        for (let s = 0; s <= seg; s++) { const lat = -Math.PI / 2 + (s / seg) * Math.PI; pts.push(project(lat, lon, RR, cx, cy, ay, ax)); }
        drawLine(pts);
      }
      for (let p = 1; p < parallels; p++) {
        const lat = -Math.PI / 2 + (p / parallels) * Math.PI;
        const pts = [];
        for (let s = 0; s <= seg; s++) { const lon = (s / seg) * Math.PI * 2; pts.push(project(lat, lon, RR, cx, cy, ay, ax)); }
        drawLine(pts);
      }

      // bright center node
      ctx.fillStyle = `rgba(255,255,255,${0.7 + lvl})`;
      ctx.shadowBlur = 26 * dpr; ctx.shadowColor = "rgba(150,215,255,0.9)";
      ctx.beginPath(); ctx.arc(cx, cy, 6 * dpr * pulse, 0, Math.PI * 2); ctx.fill();

      ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0;
      ay += 0.006 + (st.x - 0.5) * 0.01;
      ax = 0.25 + st.y * 0.7;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [engine, isPlaying]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="font-head text-[15px] tracking-[0.18em] text-white uppercase mb-1">Intention Morph</div>
      <div
        ref={wrapRef}
        data-testid="intention-morph"
        onPointerDown={onDown}
        className="relative rounded-full cursor-crosshair touch-none"
        style={{ width: 260, height: 260, background: "radial-gradient(circle at 50% 55%, rgba(20,26,40,0.7) 0%, rgba(4,6,10,0.9) 70%)", boxShadow: "inset 0 0 60px rgba(0,0,0,0.8)" }}
      >
        <canvas ref={canvasRef} data-testid="morph-sphere" className="w-full h-full block" />
      </div>
      <div className="text-center mt-1">
        <div className="font-head text-[13px] tracking-[0.15em] text-gray-300 uppercase">Spatial Depth</div>
        <div className="label-tech tracking-normal normal-case text-gray-600">Gestures control width · X {Math.round(macros.intention_morph_x * 100)} / Y {Math.round(macros.intention_morph_y * 100)}</div>
      </div>
    </div>
  );
}
