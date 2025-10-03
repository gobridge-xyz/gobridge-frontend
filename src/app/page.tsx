"use client";
import { useMemo, useState } from "react";
import NavTabs, { TabKey } from "@/components/NavTabs";
import BridgeView from "@/components/views/BridgeView";
import GoUSDView from "@/components/views/GoUSDView";
import DocsView from "@/components/views/DocsView";

declare global {
  interface Number {
    toFixedTruncate(decimals: number): number;
  }
}

Number.prototype.toFixedTruncate = function (decimals: number): number {
  const factor = 10 ** decimals;
  return Math.trunc(Number(this) * factor) / factor;
};

export default function Page() {
  const [tab, setTab] = useState<TabKey>("bridge");
  
  const Content = useMemo(() => {
    switch (tab) {
      case "bridge": return <BridgeView />;
      case "gousd":  return <GoUSDView />;
      case "docs":   return <DocsView />;
    }
  }, [tab]);

  return (
    <main className="relative min-h-dvh">
      {/* BG */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(1200px 800px at 50% -20%, rgba(0,255,200,.12) 0%, rgba(0,255,200,.06) 40%, rgba(0,0,0,0) 70%),
            linear-gradient(180deg, hsl(var(--bg-2)) 0%, hsl(var(--bg-1)) 70%)
          `,
        }}
      />

      {/* NAV */}
      <NavTabs value={tab} onChange={setTab} />
      
      <div
        className="
          fixed
          left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+10px)]
          md:translate-x-0 md:left-6 md:bottom-6
          z-40
        "
      >
        <div
          className="
            group
            rounded-full md:rounded-xl
            px-3.5 py-2 md:px-4 md:py-2.5
            text-[13px] md:text-sm
            text-[rgb(188,208,218)] hover:text-white
            backdrop-blur
            transition-all
            shadow-[0_18px_48px_rgba(0,0,0,0.45)]
          "
          style={{
            background: "rgba(7,16,20,0.55)",
            boxShadow: "inset 0 0 0 1px rgba(17,74,102,0.22), 0 1px 0 rgba(255,255,255,0.04)",
            border: "1px solid rgba(17,74,102,0.28)",
          }}
        >
          <div className="flex items-center gap-2 md:gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[rgba(14,235,198,0.9)] shadow-[0_0_12px_rgba(14,235,198,0.45)]" />
            <span className="font-medium whitespace-nowrap">Support &amp; Investment</span>
            <a
              href="mailto:team@gobridge.xyz"
              className="underline decoration-transparent group-hover:decoration-[rgba(14,235,198,0.6)] underline-offset-4"
              title="Send email"
            >
              team@gobridge.xyz
            </a>
          </div>
        </div>
      </div>

      {/* CONTENT — nav yüksekliği 64px: tam merkez */}
      <div className="pt-16"> {/* nav offset */}
        <div className="min-h-[calc(100dvh-64px)] grid place-items-center px-4 pb-10">
          {Content}
        </div>
      </div>
    </main>
  );
}