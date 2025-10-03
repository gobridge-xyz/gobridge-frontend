"use client";
import { useState } from "react";
import { ChevronDownIcon, FuelIcon } from "lucide-react";
import { useBridge } from "@/providers/BridgeProvider";
import { LoaderRing } from "./LoaderRing";

export default function GasInfo() {
  const [open, setOpen] = useState(false);
  const bridge = useBridge();
  const TEN18 = 10n ** 18n;

  function formatUsd18(
    v?: bigint | string | number,
    decimals: number = 2
  ): string {
    if (v === undefined || v === null) return "$—";
    let bi: bigint;
    try {
      if (typeof v === "bigint") bi = v;
      else if (typeof v === "number") bi = BigInt(Math.trunc(v));
      else bi = BigInt(v);
    } catch {
      return "$—";
    }

    const sign = bi < 0n ? "-" : "";
    const abs = bi < 0n ? -bi : bi;

    const intPart = abs / TEN18;
    const frac = abs % TEN18;
    const fracStrFull = frac.toString().padStart(18, "0");
    const fracStr = decimals > 0 ? "." + fracStrFull.slice(0, decimals) : "";

    return `$${sign}${intPart.toString()}${fracStr}`;
  }

  return (
    <div className="flex flex-col w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center bg-[#040d0c]/80 w-full h-[40px] rounded-md mt-2 px-4 cursor-pointer"
      >
        <p className="text-[#5c5e62] text-[14px] font-semibold font-inter">
          Gas info
        </p>
        <div className="flex items-center gap-1 ml-auto mr-0">
          {bridge.loadingQuote ? <LoaderRing color="#e7b65a" /> : (
            <>
              <FuelIcon className="size-4 text-[#e7b65a] ml-3 mr-1" />
              <p className="text-[#e2e2e2] text-[14px] font-semibold font-inter inline">
                {formatUsd18(bridge.totalFees, 4)}
              </p>
            </>
          )}
          <ChevronDownIcon
            className={`w-[18px] text-[#cccfd4] ml-1 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          open ? "max-h-60 mt-2" : "max-h-0"
        }`}
      >
        <div
          className="rounded-md px-4 py-3 flex flex-col gap-2 bg-[#040d0c]/80"
          style={{
            boxShadow:
              "inset 0 0 0 1px rgba(17,74,102,0.2), 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <Row label={`Source chain (${bridge.srcChain?.name})`} 
            value={formatUsd18(bridge.srcFee, 2)}
          />
          <Row
            label={`Destination chain (${bridge.dstChain?.name})`}
            value={formatUsd18(bridge.feeQuote?.destFee, 2)}
          />
          <Row
            label="Reactive Network cost"
            value={formatUsd18(bridge.feeQuote?.rnkFee, 4)}
          />
          <Row label="Protocol fee" value={formatUsd18(bridge.protocolFee, 4)} />
          <div className="h-px w-full bg-white/10 my-1" />
          <Row label="Total" value={formatUsd18(bridge.totalFees, 2)} highlight />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number | bigint;
  highlight?: boolean;
}) {
  const bridge = useBridge();
  return (
    <div className="flex justify-between text-sm">
      <span
        className={`${
          highlight ? "text-white font-semibold" : "text-[#a3a3a3]"
        }`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          highlight ? "text-[#0eebc6]" : "text-[#e2e2e2]"
        }`}
      >
        { bridge.loadingQuote ? <LoaderRing color="#a3a3a3" /> : (value) }
      </span>
    </div>
  );
}