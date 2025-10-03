"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";

type Props = {
  onClick?: () => void;
  loading?: boolean;
  approved?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
};

export default function ApproveButton({
  onClick,
  loading = false,
  approved = false,
  disabled = false,
  children,
}: Props) {
  const label = useMemo(() => {
    if (loading) return "Approving…";
    if (approved) return "Approved";
    return children ?? "Approve";
  }, [loading, approved, children]);

  const isDisabled = disabled || loading;
  
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative inline-flex w-full h-[50px] items-center justify-center rounded-lg mt-4
        px-3 py-2 text-[15px] font-semibold tracking-[-0.01em] cursor-pointer overflow-hidden select-none group
        focus:outline-none transition-[transform,box-shadow,opacity]
        ${isDisabled ? "opacity-80 cursor-not-allowed" : "active:scale-[0.995]"}
        text-[#031417]
      `}
      style={{
        background:
          "linear-gradient(135deg, rgba(14,235,198,0.95) 0%, rgba(12,161,154,0.82) 50%, rgba(14,235,198,0.95) 100%)",
        backgroundSize: "180% 180%",
        boxShadow:
          "0 12px 32px rgba(14,235,198,0.16), inset 0 0 0 1px rgba(14,235,198,0.28)",
        transform: "translateZ(0)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          animation: !isDisabled ? "bg-pan 6s ease-in-out infinite" : undefined,
        }}
      />

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg transition-[box-shadow] duration-300"
        style={{
          boxShadow: "0 0 0 0 rgba(14,235,198,0.20)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: "0 0 30px 6px rgba(14,235,198,0.18) inset",
        }}
      />

      {/* shimmer line */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.35) 12%, transparent 24%)",
          backgroundSize: "220% 100%",
          animation: !isDisabled ? "shine 1700ms ease-in-out forwards" : undefined,
          mixBlendMode: "soft-light",
        }}
      />

      <span className="relative z-10 inline-flex items-center gap-2">
        {approved ? (
          <span className="relative inline-flex items-center justify-center">
            <Check className="w-4 h-4" />
            {/* success pulsar */}
            <span
              aria-hidden
              className="absolute inset-[-8px] rounded-full"
              style={{ animation: "pulseRing 1100ms ease-out forwards" }}
            />
          </span>
        ) : loading ? (
          <Spinner />
        ) : null}
        {label}
      </span>

      {/* focus ring */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[10px] ring-0 group-focus-visible:ring-8 group-focus-visible:ring-[#0EEBC6]/80 transition"
      />

      {/* keyframes */}
      <style jsx>{`
        @keyframes bg-pan {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shine {
          0% { background-position: -150% 0%; opacity: 0; }
          25% { opacity: 1; }
          100% { background-position: 150% 0%; opacity: 0; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(14,235,198,0.35); opacity: 1; }
          70%  { box-shadow: 0 0 0 10px rgba(14,235,198,0.05); opacity: 0.6; }
          100% { box-shadow: 0 0 0 14px rgba(14,235,198,0.0); opacity: 0; }
        }
      `}</style>
    </button>
  );
}

function Spinner() {
  return (
    <span className="relative inline-flex items-center justify-center">
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        style={{ color: "#053b33", opacity: 0.9 }}
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.15"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          style={{ transformOrigin: "center", animation: "spin 1s cubic-bezier(0.4,0,0.2,1) infinite" }}
        />
      </svg>
    </span>
  );
}