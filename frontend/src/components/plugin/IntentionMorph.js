import { useCallback, useRef } from "react";
import { useFrek } from "@/store/FrekContext";

// Central interactive XY sphere -> spectral morphing (x=cutoff, y=resonance).
export default function IntentionMorph() {
  const { macros, setMacro } = useFrek();
  const areaRef = useRef(null);
  const dragging = useRef(false);

  const x = macros.intention_morph_x;
  const y = macros.intention_morph_y;

  const update = useCallback((clientX, clientY) => {
    const rect = areaRef.current.getBoundingClientRect();
    let nx = (clientX - rect.left) / rect.width;
    let ny = 1 - (clientY - rect.top) / rect.height;
    nx = Math.min(1, Math.max(0, nx));
    ny = Math.min(1, Math.max(0, ny));
    setMacro("intention_morph_x", nx);
    setMacro("intention_morph_y", ny);
  }, [setMacro]);

  const onDown = useCallback((e) => {
    dragging.current = true;
    update(e.clientX, e.clientY);
    const onMove = (ev) => dragging.current && update(ev.clientX, ev.clientY);
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [update]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={areaRef}
        data-testid="intention-morph"
        onPointerDown={onDown}
        className="relative rounded-full border border-white/10 bg-[radial-gradient(circle_at_center,#101014_0%,#050506_70%)] cursor-crosshair touch-none overflow-hidden"
        style={{ width: 200, height: 200 }}
      >
        {/* grid rings */}
        {[0.33, 0.66, 1].map((r) => (
          <div key={r} className="absolute rounded-full border border-white/5"
            style={{ inset: `${(1 - r) * 40}%` }} />
        ))}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5" />
        {/* glowing sphere */}
        <div
          data-testid="morph-sphere"
          className="absolute rounded-full"
          style={{
            width: 44,
            height: 44,
            left: `calc(${x * 100}% - 22px)`,
            top: `calc(${(1 - y) * 100}% - 22px)`,
            background: "radial-gradient(circle at 35% 30%, #FFF6C8, #FFD700 35%, #00E5FF 100%)",
            boxShadow: "0 0 24px 6px rgba(0,229,255,0.5), 0 0 40px 8px rgba(255,215,0,0.25)",
            transition: dragging.current ? "none" : "left 0.08s, top 0.08s",
          }}
        />
      </div>
      <div className="text-center">
        <div className="font-head text-[13px] tracking-[0.15em] text-white uppercase">Intention Morph</div>
        <div className="label-tech">Spectral · X {Math.round(x * 100)} / Y {Math.round(y * 100)}</div>
      </div>
    </div>
  );
}
