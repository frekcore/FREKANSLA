import { useState } from "react";
import { useFrek } from "@/store/FrekContext";
import { createSession, certify, publishObject, downloadUrl, getObject } from "@/lib/frekApi";
import CertificationPipeline from "@/components/cert/CertificationPipeline";
import DiagnosticsConsole from "@/components/cert/DiagnosticsConsole";
import FkExplorer from "@/components/cert/FkExplorer";
import { Package, AudioLines, Rocket, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function CertificationPortal() {
  const { engine, macros, sessionTitle, sourceType, duration, identity } = useFrek();
  const [statuses, setStatuses] = useState({});
  const [running, setRunning] = useState(false);
  const [currentObject, setCurrentObject] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [publishStatus, setPublishStatus] = useState(null);
  const [exporting, setExporting] = useState(false);

  const runCertification = async () => {
    setRunning(true);
    setPublishStatus(null);
    try {
      setStatuses({ session: "running" });
      await wait(500);
      const session = await createSession({
        title: sessionTitle,
        bpm: 124,
        source_type: sourceType,
        duration,
        macros: {
          warm_analog: macros.warm_analog,
          intention_morph_x: macros.intention_morph_x,
          intention_morph_y: macros.intention_morph_y,
          harmonic_aggression: macros.harmonic_aggression,
          spatial_depth: macros.spatial_depth,
        },
      });
      setStatuses({ session: "done", assets: "running" });
      await wait(600);
      setStatuses({ session: "done", assets: "done", object: "running" });
      await wait(600);
      const obj = await certify({ session_id: session.id });
      setStatuses({ session: "done", assets: "done", object: "done", signature: "running" });
      await wait(700);
      setStatuses({ session: "done", assets: "done", object: "done", signature: "done" });
      setCurrentObject(obj);
      setSelectedId(obj.object_id);
      setRefreshKey((k) => k + 1);
      toast.success("Session certified — .FK object signed (Ed25519)");
    } catch (e) {
      toast.error("Certification failed");
      setStatuses({});
    } finally {
      setRunning(false);
    }
  };

  const onSelect = async (id) => {
    setSelectedId(id);
    const obj = await getObject(id);
    setCurrentObject(obj);
  };

  const exportAudio = async () => {
    setExporting(true);
    try {
      const blob = await engine.renderWav(4);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sessionTitle.replace(/\s+/g, "_")}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Audio exported (WAV)");
    } catch {
      toast.error("Audio export failed");
    }
    setExporting(false);
  };

  const publish = async () => {
    if (!selectedId) return toast.error("Certify or select a .FK object first");
    const res = await publishObject(selectedId);
    setPublishStatus(res.status);
    setRefreshKey((k) => k + 1);
    toast.success("Published to KORA");
  };

  const hasObject = !!currentObject;

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 pb-28">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-head text-4xl tracking-tighter uppercase font-light text-white">
            Master Certifier
          </h1>
          <p className="label-tech mt-2">Certification Portal · FREK Object → .FK → Ed25519 → Provenance</p>
        </div>
        <button
          data-testid="run-certification"
          onClick={runCertification}
          disabled={running}
          className="btn-glow flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00E5FF] text-black font-semibold text-xs tracking-[0.18em] uppercase disabled:opacity-60"
        >
          {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {running ? "Certifying…" : "Run Certification"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* left: pipeline */}
        <div className="space-y-6">
          <CertificationPipeline statuses={statuses} />

          {/* status chips */}
          <div className="flex flex-wrap gap-2">
            {[
              ["FREKCORE", publishStatus?.FREKCORE || (hasObject ? "ready" : "idle")],
              ["DAW SYNC", publishStatus?.DAW_SYNC || (hasObject ? "active" : "idle")],
              ["HARDWARE", publishStatus?.HARDWARE || (hasObject ? "attested" : "idle")],
            ].map(([k, v]) => (
              <span key={k} data-testid={`status-${k.replace(" ", "-").toLowerCase()}`}
                className={`text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full border ${
                  v === "idle" ? "border-white/10 text-gray-600"
                  : "border-[#00E676]/40 bg-[#00E676]/10 text-[#00E676]"}`}>
                {k} · {v}
              </span>
            ))}
          </div>

          {/* object summary */}
          {currentObject && (
            <div className="rounded-xl border border-white/10 bg-[#141416] p-4 space-y-2" data-testid="object-summary">
              <div className="label-tech text-gray-400">SIGNED .FK OBJECT</div>
              <Row k="object_id" v={currentObject.object_id} />
              <Row k="title" v={currentObject.manifest.title} />
              <Row k="issuer did" v={currentObject.identity.did} />
              <Row k="signature (Ed25519)" v={currentObject.proofs.signature.value.slice(0, 40) + "…"} accent />
              <Row k="content_hash" v={currentObject.manifest.content_hash.slice(0, 40) + "…"} />
              <Row k="secure element" v={currentObject.proofs.secure_element.model + " (simulated)"} />
              <Row k="anchor" v={currentObject.proofs.anchor.type + " (simulated)"} />
            </div>
          )}
        </div>

        {/* right: explorer + console */}
        <div className="space-y-6">
          <FkExplorer selectedId={selectedId} onSelect={onSelect} refreshKey={refreshKey} />
          <DiagnosticsConsole objectId={selectedId} />
        </div>
      </div>

      {/* sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#050505]/95 backdrop-blur-xl border-t border-white/10 px-4 lg:px-8 py-3">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <span className="label-tech hidden md:block">{identity?.did || "…"}</span>
          <div className="flex flex-wrap gap-2 ml-auto">
            <a
              data-testid="package-fk"
              href={selectedId ? downloadUrl(selectedId) : undefined}
              onClick={(e) => { if (!selectedId) { e.preventDefault(); toast.error("Certify a session first"); } }}
              className="btn-glow flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#00E5FF] text-[#00E5FF] text-xs tracking-[0.15em] uppercase hover:bg-[#00E5FF]/10"
            >
              <Package size={14} /> Package as .FK Object
            </a>
            <button
              data-testid="export-audio"
              onClick={exportAudio}
              disabled={exporting}
              className="btn-glow flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#FFD700] text-[#FFD700] text-xs tracking-[0.15em] uppercase hover:bg-[#FFD700]/10 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <AudioLines size={14} />} Export Audio (WAV)
            </button>
            <button
              data-testid="publish-kora"
              onClick={publish}
              className="btn-glow flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00E676] text-black font-semibold text-xs tracking-[0.15em] uppercase hover:shadow-[0_0_20px_rgba(0,230,118,0.5)]"
            >
              <Rocket size={14} /> Secure &amp; Publish to KORA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, accent }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="label-tech text-gray-500 shrink-0">{k}</span>
      <span className={`font-mono2 text-right break-all ${accent ? "text-[#00E5FF]" : "text-gray-300"}`}>{v}</span>
    </div>
  );
}
