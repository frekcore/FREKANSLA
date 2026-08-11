import { useRef } from "react";
import { useFrek } from "@/store/FrekContext";
import SonicFlow from "@/components/plugin/SonicFlow";
import MacroKnob from "@/components/plugin/MacroKnob";
import IntentionMorph from "@/components/plugin/IntentionMorph";
import { Play, Square, Upload, Waves, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function PluginWindow() {
  const {
    macros, setMacro, isPlaying, play, stop, sourceType,
    fileName, loadFile, useSynth, identity,
  } = useFrek();
  const fileInput = useRef(null);
  const navigate = useNavigate();

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await loadFile(f);
      toast.success(`Loaded ${f.name}`);
    } catch {
      toast.error("Could not decode audio file");
    }
  };

  return (
    <div data-testid="plugin-window" className="luminous-edge rounded-2xl bg-[#141416] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] w-full max-w-[860px]">
      <div className="rounded-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#0e0e10] border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#FFD700] to-[#00E5FF] flex items-center justify-center">
              <Waves size={15} className="text-black" />
            </div>
            <div>
              <div className="font-head text-base tracking-[0.25em] text-white">FREKANSLA</div>
              <div className="label-tech">V026 CREATIVE ENGINE</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-2 py-1 rounded-full border border-[#00E676]/40 bg-[#00E676]/10 text-[#00E676]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] pulse-dot text-[#00E676]" />
              FREK CORE
            </span>
            <span className="text-[10px] tracking-[0.15em] uppercase px-2 py-1 rounded-full border border-[#00E5FF]/40 bg-[#00E5FF]/10 text-[#00E5FF]">
              L2 SECURED
            </span>
          </div>
        </div>

        {/* body */}
        <div className="p-5 space-y-5">
          <SonicFlow />

          {/* controls grid: left knob, center morph, right knob */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center py-2">
            <div className="flex justify-around">
              <MacroKnob
                testId="knob-warm-analog"
                label="Warm Analog"
                sublabel="Saturation"
                value={macros.warm_analog}
                color="#FFD700"
                onChange={(v) => setMacro("warm_analog", v)}
              />
              <MacroKnob
                testId="knob-harmonic"
                label="Harmonic"
                sublabel="Aggression"
                value={macros.harmonic_aggression}
                color="#FF9100"
                onChange={(v) => setMacro("harmonic_aggression", v)}
              />
            </div>

            <IntentionMorph />

            <div className="flex justify-around">
              <MacroKnob
                testId="knob-spatial"
                label="Spatial"
                sublabel="Depth / Width"
                value={macros.spatial_depth}
                color="#00E5FF"
                onChange={(v) => setMacro("spatial_depth", v)}
              />
              <MacroKnob
                testId="knob-input"
                label="Drive"
                sublabel="Input Trim"
                value={macros.warm_analog}
                color="#00E5FF"
                onChange={(v) => setMacro("warm_analog", v)}
              />
            </div>
          </div>

          {/* transport + source */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                data-testid="transport-play"
                onClick={isPlaying ? stop : play}
                className="btn-glow flex items-center gap-2 px-4 py-2 rounded-lg border border-[#00E5FF] text-[#00E5FF] text-xs tracking-[0.15em] uppercase hover:bg-[#00E5FF]/10"
              >
                {isPlaying ? <Square size={14} /> : <Play size={14} />}
                {isPlaying ? "Stop" : "Play"}
              </button>

              <button
                data-testid="source-synth"
                onClick={useSynth}
                className={`px-3 py-2 rounded-lg text-xs tracking-[0.15em] uppercase border transition-colors ${
                  sourceType === "synth"
                    ? "border-[#FFD700] text-[#FFD700] bg-[#FFD700]/10"
                    : "border-white/10 text-gray-400"
                }`}
              >
                Synth
              </button>

              <button
                data-testid="source-file"
                onClick={() => fileInput.current?.click()}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs tracking-[0.15em] uppercase border transition-colors ${
                  sourceType === "file"
                    ? "border-[#FFD700] text-[#FFD700] bg-[#FFD700]/10"
                    : "border-white/10 text-gray-400"
                }`}
              >
                <Upload size={13} />
                {fileName ? fileName.slice(0, 14) : "Import WAV/MP3"}
              </button>
              <input ref={fileInput} type="file" accept="audio/*" hidden onChange={onFile} />
            </div>

            <button
              data-testid="goto-certify"
              onClick={() => navigate("/certify")}
              className="btn-glow flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00E5FF] text-black font-semibold text-xs tracking-[0.15em] uppercase hover:shadow-[0_0_20px_rgba(0,229,255,0.6)]"
            >
              <ShieldCheck size={14} />
              Certify Session
            </button>
          </div>

          <div className="label-tech text-center pt-1">
            SIGNING IDENTITY · {identity?.did || "…"}
          </div>
        </div>
      </div>
    </div>
  );
}
