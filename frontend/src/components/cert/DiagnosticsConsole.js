import { useEffect, useRef, useState } from "react";
import { runDiagnostics } from "@/lib/frekApi";
import { Terminal } from "lucide-react";

const CMDS = ["inspect", "check", "verify", "doctor"];

export default function DiagnosticsConsole({ objectId }) {
  const [lines, setLines] = useState([
    "FREK diagnostics console v0.1",
    "Select a .FK object, then run inspect / check / verify / doctor",
  ]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const run = async (cmd) => {
    if (!objectId) {
      setLines((l) => [...l, `$ frek ${cmd}`, "! no object selected"]);
      return;
    }
    setBusy(true);
    try {
      const res = await runDiagnostics({ command: cmd, object_id: objectId });
      // reveal lines sequentially
      for (const ln of res.lines) {
        await new Promise((r) => setTimeout(r, 60));
        setLines((prev) => [...prev, ln]);
      }
    } catch {
      setLines((l) => [...l, `! ${cmd} failed`]);
    }
    setBusy(false);
  };

  const colorFor = (ln) => {
    if (ln.includes("[OK]") || ln.includes("AUTHENTIC") || ln.includes("VALID")) return "text-[#00E676]";
    if (ln.includes("[FAIL]") || ln.includes("INVALID") || ln.startsWith("!")) return "text-[#FF3D00]";
    if (ln.startsWith("$") || ln.startsWith("==")) return "text-[#00E5FF]";
    if (ln.includes("UNVERIFIABLE")) return "text-[#FF9100]";
    return "text-gray-400";
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#050505] overflow-hidden flex flex-col" data-testid="diagnostics-console">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0b0b0d]">
        <span className="flex items-center gap-2 label-tech text-gray-300"><Terminal size={12} /> DIAGNOSTICS</span>
        <div className="flex gap-1">
          {CMDS.map((c) => (
            <button key={c} data-testid={`diag-${c}`} disabled={busy} onClick={() => run(c)}
              className="text-[10px] tracking-[0.1em] uppercase px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-colors disabled:opacity-40">
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 font-mono2 text-[11px] leading-relaxed h-[240px] overflow-auto">
        {lines.map((ln, i) => (
          <div key={i} className={colorFor(ln)}>{ln}</div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
