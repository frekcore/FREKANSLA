import { useCallback, useRef } from "react";

// Rotary knob controlled by vertical drag. value 0..100.
export default function MacroKnob({ label, sublabel, value, onChange, color = "#00E5FF", testId }) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const angle = -135 + (value / 100) * 270;

  const onDown = useCallback((e) => {
    dragging.current = true;
    startY.current = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    startVal.current = value;
    const onMove = (ev) => {
      if (!dragging.current) return;
      const y = ev.clientY ?? ev.touches?.[0]?.clientY ?? 0;
      const delta = (startY.current - y) * 0.6;
      let next = Math.min(100, Math.max(0, startVal.current + delta));
      onChange(Math.round(next));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [value, onChange]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? -2 : 2;
    onChange(Math.min(100, Math.max(0, Math.round(value + dir))));
  }, [value, onChange]);

  const R = 34;
  const circ = 2 * Math.PI * R;
  const arc = (270 / 360) * circ;
  const filled = (value / 100) * arc;

  return (
    <div className="flex flex-col items-center gap-2 select-none" data-testid={testId}>
      <div
        ref={ref}
        onPointerDown={onDown}
        onWheel={onWheel}
        className="relative cursor-ns-resize touch-none"
        style={{ width: 84, height: 84 }}
      >
        <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-[135deg]">
          <circle cx="42" cy="42" r={R} fill="none" stroke="#1e1e22" strokeWidth="6"
            strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" />
          <circle cx="42" cy="42" r={R} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 0.05s linear" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-[#0c0c0e] border border-white/10 flex items-center justify-center relative"
            style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8)" }}>
            <div className="absolute w-[2px] h-3 top-1 rounded-full"
              style={{ background: color, transform: `rotate(${angle}deg)`, transformOrigin: "center 20px" }} />
            <span className="font-mono2 text-[11px] text-white">{Math.round(value)}</span>
          </div>
        </div>
      </div>
      <div className="text-center">
        <div className="font-head text-[13px] tracking-[0.15em] text-white uppercase">{label}</div>
        <div className="label-tech">{sublabel}</div>
      </div>
    </div>
  );
}
