import { useEffect, useState } from "react";
import { listObjects, verifyObject } from "@/lib/frekApi";
import { FileCheck2, RefreshCw } from "lucide-react";

const VERDICT_STYLE = {
  AUTHENTIC: "text-[#00E676] border-[#00E676]/40 bg-[#00E676]/10",
  VALID: "text-[#00E5FF] border-[#00E5FF]/40 bg-[#00E5FF]/10",
  UNVERIFIABLE: "text-[#FF9100] border-[#FF9100]/40 bg-[#FF9100]/10",
  INVALID: "text-[#FF3D00] border-[#FF3D00]/40 bg-[#FF3D00]/10",
};

export default function FkExplorer({ selectedId, onSelect, refreshKey }) {
  const [objects, setObjects] = useState([]);
  const [verdicts, setVerdicts] = useState({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const objs = await listObjects();
      setObjects(objs);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [refreshKey]);

  const doVerify = async (id, e) => {
    e.stopPropagation();
    const res = await verifyObject(id);
    setVerdicts((v) => ({ ...v, [id]: res.result }));
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#141416]" data-testid="fk-explorer">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="flex items-center gap-2 label-tech text-gray-300"><FileCheck2 size={12} /> .FK EXPLORER</span>
        <button data-testid="explorer-refresh" onClick={load} className="text-gray-500 hover:text-[#00E5FF]">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="max-h-[240px] overflow-auto divide-y divide-white/5">
        {objects.length === 0 && (
          <div className="p-4 label-tech text-gray-600">No .FK objects yet — certify a session</div>
        )}
        {objects.map((o) => {
          const active = o.object_id === selectedId;
          const verdict = verdicts[o.object_id];
          return (
            <div key={o.object_id} data-testid={`explorer-item-${o.object_id}`}
              onClick={() => onSelect(o.object_id)}
              className={`px-4 py-3 cursor-pointer transition-colors ${active ? "bg-[#00E5FF]/5" : "hover:bg-white/5"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-head text-sm text-white truncate">{o.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-[#00E5FF]">{o.attestation_level}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono2 text-[10px] text-gray-600 truncate">{o.content_hash.slice(0, 22)}…</span>
                {verdict ? (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border uppercase ${VERDICT_STYLE[verdict]}`}>{verdict}</span>
                ) : (
                  <button data-testid={`verify-${o.object_id}`} onClick={(e) => doVerify(o.object_id, e)}
                    className="text-[9px] uppercase tracking-wide text-gray-500 hover:text-[#00E5FF]">verify</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
