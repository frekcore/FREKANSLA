import { Circle, Play, Volume2, Music2 } from "lucide-react";

const tracks = [
  { name: "Synth 1", color: "#00E5FF", active: true },
  { name: "Synth 2", color: "#FFD700", active: true },
  { name: "Drums", color: "#00E676", active: false },
  { name: "Bass", color: "#FF9100", active: false },
];

// Simulated Logic Pro X decor behind the plugin window.
export default function DawShell({ children }) {
  return (
    <div className="relative min-h-[calc(100vh-56px)] w-full overflow-hidden">
      {/* transport bar */}
      <div className="flex items-center justify-between px-5 h-11 bg-[#0d0d0f] border-b border-white/10">
        <div className="flex items-center gap-4 label-tech">
          <span className="text-gray-300">LOGIC · SESSION</span>
          <span className="flex items-center gap-1 text-[#00E5FF]"><Play size={11} /> PLAY</span>
          <span className="text-gray-500">01 . 03 . 02</span>
        </div>
        <div className="flex items-center gap-4 label-tech">
          <span className="font-mono2 text-[#FFD700]">124 BPM</span>
          <span className="text-gray-500">4/4</span>
          <span className="text-gray-500">−6.2 dB</span>
        </div>
      </div>

      <div className="flex">
        {/* left track sidebar */}
        <div className="hidden lg:block w-56 shrink-0 bg-[#0b0b0d] border-r border-white/10 min-h-[calc(100vh-100px)]">
          {tracks.map((t, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <Circle size={10} style={{ color: t.color, fill: t.active ? t.color : "transparent" }} />
              <Music2 size={13} className="text-gray-500" />
              <span className="text-xs text-gray-300 tracking-wide">{t.name}</span>
              <div className="ml-auto flex gap-1">
                <span className={`text-[9px] px-1 rounded ${t.active ? "text-[#00E676]" : "text-gray-600"}`}>ON</span>
              </div>
            </div>
          ))}
          {/* faux clips */}
          <div className="p-3 space-y-2">
            {tracks.map((t, i) => (
              <div key={i} className="h-6 rounded" style={{
                background: `linear-gradient(90deg, ${t.color}22, ${t.color}44)`,
                border: `1px solid ${t.color}44`,
                width: `${60 + (i * 12) % 40}%`,
              }} />
            ))}
          </div>
        </div>

        {/* center stage with plugin */}
        <div className="flex-1 flex items-center justify-center px-4 py-10 min-h-[calc(100vh-100px)]"
          style={{ background: "radial-gradient(circle at 50% 30%, #141418 0%, #0A0A0A 60%)" }}>
          {children}
        </div>

        {/* right mixer */}
        <div className="hidden xl:flex flex-col w-48 shrink-0 bg-[#0b0b0d] border-l border-white/10 p-4 gap-4">
          <span className="label-tech">MIXER</span>
          <div className="flex gap-4 flex-1">
            {tracks.slice(0, 3).map((t, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div className="relative w-2 flex-1 bg-[#151517] rounded-full overflow-hidden">
                  <div className="absolute bottom-0 w-full rounded-full"
                    style={{ height: `${40 + i * 18}%`, background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                </div>
                <Volume2 size={11} className="text-gray-500" />
                <span className="text-[9px] text-gray-500">{t.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
