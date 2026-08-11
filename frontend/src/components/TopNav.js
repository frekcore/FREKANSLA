import { Link, useLocation } from "react-router-dom";
import { useFrek } from "@/store/FrekContext";
import { Activity, ShieldCheck, Cpu } from "lucide-react";

export default function TopNav() {
  const loc = useLocation();
  const { identity } = useFrek();
  const tabs = [
    { to: "/", label: "V026 CREATIVE ENGINE", icon: Activity },
    { to: "/certify", label: "MASTER CERTIFIER", icon: ShieldCheck },
  ];
  return (
    <div
      data-testid="top-nav"
      className="sticky top-0 z-30 flex items-center justify-between px-5 h-14 bg-[#050505]/90 backdrop-blur-xl border-b border-white/10"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#FFD700] to-[#00E5FF] flex items-center justify-center">
            <Cpu size={14} className="text-black" />
          </div>
          <span className="font-head text-lg tracking-[0.25em] font-semibold text-white">
            FREKANSLA
          </span>
          <span className="label-tech mt-1">v0.1</span>
        </div>
        <nav className="flex items-center gap-1 ml-4">
          {tabs.map((t) => {
            const active = loc.pathname === t.to;
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                data-testid={`nav-${t.to === "/" ? "creative" : "certify"}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] tracking-[0.18em] uppercase transition-colors duration-300 ${
                  active
                    ? "text-[#00E5FF] bg-[#00E5FF]/10"
                    : "text-gray-500 hover:text-gray-200"
                }`}
              >
                <Icon size={13} />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden md:flex items-center gap-2 label-tech">
          <span className="w-2 h-2 rounded-full bg-[#00E676] pulse-dot text-[#00E676]" />
          FREK CORE CONNECTED
        </span>
        <div
          data-testid="frek-id-badge"
          className="font-mono2 text-[10px] px-2 py-1 rounded border border-white/10 text-gray-400 max-w-[220px] truncate"
          title={identity?.did}
        >
          {identity ? identity.did : "generating FREK-ID…"}
        </div>
      </div>
    </div>
  );
}
