interface CoverageMapProps {
  className?: string;
}

export function CoverageMap({ className }: CoverageMapProps) {
  return (
    <div className={`aspect-square rounded-3xl bg-zinc-900 border border-white/10 overflow-hidden relative ${className || ''}`}>
      {/* Static dark map background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{
          backgroundImage: "url('/landing-map-coverage.jpg')",
        }}
      />

      {/* QLD highlight - active */}
      <div className="absolute top-[22%] right-[28%] w-24 h-36 bg-orange-500/30 rounded-lg border-2 border-orange-500/60 shadow-lg shadow-orange-500/20" />

      {/* NSW highlight - coming soon */}
      <div className="absolute top-[48%] right-[32%] w-20 h-24 bg-zinc-500/20 rounded-lg border-2 border-zinc-500/40 border-dashed" />

      {/* QLD Label */}
      <div className="absolute top-[30%] right-[28%] translate-x-1/2">
        <div className="bg-orange-500 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-lg">
          QLD
          <span className="ml-1 text-[10px] opacity-80">LIVE</span>
        </div>
      </div>

      {/* NSW Label */}
      <div className="absolute top-[56%] right-[32%] translate-x-1/2">
        <div className="bg-zinc-700 text-zinc-400 text-xs px-3 py-1.5 rounded-full font-medium">
          NSW
          <span className="ml-1 text-[10px] opacity-80">SOON</span>
        </div>
      </div>

      {/* Brisbane marker */}
      <div className="absolute top-[32%] right-[24%]">
        <div className="relative">
          <div className="absolute -inset-2 bg-orange-500/30 rounded-full animate-ping" />
          <div className="relative w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-lg" />
        </div>
      </div>

      {/* Sydney marker (coming soon) */}
      <div className="absolute top-[58%] right-[28%]">
        <div className="w-2.5 h-2.5 bg-zinc-500 rounded-full border border-zinc-400" />
      </div>
    </div>
  );
}
