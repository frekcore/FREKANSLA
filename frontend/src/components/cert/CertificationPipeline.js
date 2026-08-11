import { CheckCircle2, Loader2, Circle, Fingerprint, Package, Cpu, ShieldCheck } from "lucide-react";

const STEPS = [
  { key: "session", num: "01", title: "SESSION ANALYZER", desc: "Active session · L0/L1 proofs collected", icon: Cpu },
  { key: "assets", num: "02", title: "ASSET COMPILER", desc: "Stems detected · provenance verified 100%", icon: Package },
  { key: "object", num: "03", title: "FK OBJECT CREATOR (V3 HARDWARE)", desc: "L2 attestation confirmed · Secure Element", icon: Fingerprint },
  { key: "signature", num: "04", title: "SECURE SIGNATURE", desc: "Ed25519 signature by the FREK-ID", icon: ShieldCheck },
];

// status per step: idle | running | done
export default function CertificationPipeline({ statuses }) {
  return (
    <div className="space-y-3" data-testid="certification-pipeline">
      {STEPS.map((s, i) => {
        const st = statuses[s.key] || "idle";
        const Icon = s.icon;
        const color = st === "done" ? "#00E676" : st === "running" ? "#00E5FF" : "#3a3a40";
        return (
          <div key={s.key} className="relative" data-testid={`pipeline-step-${s.key}`}>
            {i < STEPS.length - 1 && (
              <div className="absolute left-[26px] top-[56px] w-px h-[calc(100%-24px)]"
                style={{ background: st === "done" ? "#00E676" : "#26262b" }} />
            )}
            <div className={`flex gap-4 p-4 rounded-xl border transition-colors duration-300 ${
              st === "running" ? "border-[#00E5FF]/50 bg-[#00E5FF]/5"
              : st === "done" ? "border-[#00E676]/30 bg-[#00E676]/5"
              : "border-white/10 bg-[#141416]"}`}>
              <div className="relative shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border"
                style={{ borderColor: color, color, boxShadow: st !== "idle" ? `0 0 14px ${color}55` : "none" }}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="label-tech" style={{ color }}>{s.num}</span>
                  <span className="font-head text-sm tracking-[0.12em] text-white truncate">{s.title}</span>
                </div>
                <div className="label-tech mt-1 normal-case tracking-normal text-gray-500">{s.desc}</div>
              </div>
              <div className="shrink-0 self-center">
                {st === "done" && <CheckCircle2 size={18} className="text-[#00E676]" />}
                {st === "running" && <Loader2 size={18} className="text-[#00E5FF] animate-spin" />}
                {st === "idle" && <Circle size={18} className="text-gray-700" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
