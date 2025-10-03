"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import WalletButton from "./buttons/WalletButton";
import Image from "next/image";

export type TabKey = "bridge" | "gousd" | "docs";
type Tab = { label: string; key: TabKey };

const TABS: Tab[] = [
  { label: "Bridge", key: "bridge" },
  { label: "goUSD",  key: "gousd"  },
  { label: "Docs",   key: "docs"   },
];

export default function NavTabs({
  value,
  onChange,
  rightSlot,
}: {
  value: TabKey;
  onChange: (k: TabKey) => void;
  rightSlot?: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [glow, setGlow] = useState({ left: 0, width: 0 });
  const lastGlow = useRef({ left: 0, width: 0 });

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const el = itemRefs.current[value];
    if (!wrap || !el) return;

    const wRect = wrap.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const next = { left: r.left - wRect.left, width: r.width };

    if (next.left !== lastGlow.current.left || next.width !== lastGlow.current.width) {
      lastGlow.current = next;
      setGlow(next);
    }
  }, [value]);

  useLayoutEffect(() => {
    measure();
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [measure]);

  useEffect(() => {
    const on = () => measure();
    window.addEventListener("resize", on);

    const ro = new ResizeObserver(on);
    if (wrapRef.current) ro.observe(wrapRef.current);

    return () => {
      window.removeEventListener("resize", on);
      ro.disconnect();
    };
  }, [value, measure]);

  return (
    <nav className="fixed top-6 inset-x-0 z-40">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 h-16">
          {/* left: logo */}
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-3 -top-3 h-15 w-15 rounded-full blur-[14px]"
              style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(14,235,198,.35) 0%, rgba(12,181,154,.18) 55%, transparent 75%)" }}
            />
            <Image height={40} width={40} src="/gobridge.svg" alt="GoBridge" />
          </div>

          {/* center: tabs */}
          <div className="max-w-full ml-6">
            <div
              ref={wrapRef}
              className="relative inline-flex items-center gap-2 rounded-md py-1 overflow-x-auto no-scrollbar"
              style={{
                backgroundColor: "rgba(7,16,20,.36)",
                boxShadow: "inset 0 0 0 1px rgba(17,74,102,.22), 0 1px 0 rgba(255,255,255,.04)",
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute top-0 h-full rounded-sm transition-all duration-300 ease-out"
                style={{
                  left: glow.left,
                  width: glow.width,
                  background:
                    "radial-gradient(140% 220% at 50% 50%, rgba(14,235,198,.42) 0%, rgba(12,181,154,.22) 45%, rgba(12,181,154,.08) 65%, transparent 78%)",
                  boxShadow:
                    "inset 0 0 0 1px rgba(14,235,198,.22), 0 10px 28px rgba(14,235,198,.12)",
                }}
              />
              {TABS.map((t) => {
                const isActive = t.key === value;
                return (
                  <div
                    key={t.key}
                    ref={(el) => { itemRefs.current[t.key] = el } }
                    onClick={() => onChange(t.key)}
                    className={`relative z-10 inline-flex cursor-pointer select-none items-center rounded-md px-4 py-1 whitespace-nowrap transition-colors ${
                      isActive ? "text-white" : "text-[rgb(188,208,218)] hover:text-white"
                    }`}
                  >
                    <p className="font-semibold">{t.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* right: wallet */}
          <div className="justify-self-end">
            {rightSlot ?? <WalletButton />}
          </div>
        </div>
      </div>
    </nav>
  );
}