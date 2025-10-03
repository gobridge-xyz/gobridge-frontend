export function LoaderRing({
  size = 22,
  stroke = 3,
  color = "#0EEBC6",
}: { size?: number; stroke?: number; color?: string }) {
  return (
    <span className="gobridge-loader" style={{ color, width: size, height: size, display: "inline-block" }}>
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" aria-label="loading">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={stroke} opacity="0.12"/>
        <g className="spin">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={stroke}
                  strokeLinecap="round" fill="none" pathLength={100}
                  strokeDasharray="28 72" strokeDashoffset={0} className="sweep" />
        </g>
      </svg>
      <style jsx>{`
        .spin { transform-origin: 12px 12px; animation: gl-spin 1.2s linear infinite; }
        .sweep { animation: gl-sweep 1.2s ease-in-out infinite; }
        @keyframes gl-spin { to { transform: rotate(360deg); } }
        @keyframes gl-sweep {
          0%   { stroke-dasharray: 20 80; stroke-dashoffset: 0; }
          50%  { stroke-dasharray: 32 68; stroke-dashoffset: -20; }
          100% { stroke-dasharray: 20 80; stroke-dashoffset: -100; }
        }
      `}</style>
    </span>
  );
}