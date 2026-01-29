import { Search, Layers, MapPin, ChevronRight, Ruler, PenTool } from "lucide-react";

interface StaticAppPreviewProps {
  className?: string;
}

export function StaticAppPreview({ className }: StaticAppPreviewProps) {
  return (
    <div className={`relative max-w-6xl mx-auto ${className || ''}`}>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-10 pointer-events-none" />

      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-orange-500/10">
        {/* Browser chrome */}
        <div className="bg-zinc-900 px-4 py-3 flex items-center gap-2 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-zinc-800 rounded-lg px-4 py-1.5 text-xs text-zinc-500">
              app.siteora.com
            </div>
          </div>
        </div>

        {/* App content with map background */}
        <div className="relative aspect-[16/10] bg-zinc-900">
          {/* Static satellite map background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/landing-map-hero.jpg')",
            }}
          />

          {/* Simulated UI overlay */}
          {/* Top search bar */}
          <div className="absolute top-4 left-4 right-80 flex items-center gap-3">
            <div className="flex-1 max-w-md flex items-center gap-2 bg-zinc-900/90 backdrop-blur border border-white/10 rounded-lg px-3 py-2.5">
              <Search className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">42 Smith Street, Brisbane QLD</span>
            </div>
          </div>

          {/* Right sidebar - Property panel */}
          <div className="absolute top-4 right-4 bottom-16 w-72 bg-zinc-900/95 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
            {/* Panel header */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium text-white">42 Smith Street</span>
              </div>
              <p className="text-xs text-zinc-500">Brisbane City, QLD 4000</p>
            </div>

            {/* Property info */}
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Lot/Plan</span>
                <span className="text-zinc-300 font-mono">1/SP123456</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Area</span>
                <span className="text-zinc-300">607 m²</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Zoning</span>
                <span className="text-orange-400 font-medium">Mixed Use</span>
              </div>
            </div>

            {/* Constraints section */}
            <div className="p-4 border-t border-white/5">
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Constraints</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-500/10 rounded text-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-blue-300">Flood Overlay - Medium</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-500/10 rounded text-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-amber-300">Heritage Nearby</span>
                </div>
              </div>
            </div>

            {/* AI Analysis button */}
            <div className="absolute bottom-4 left-4 right-4">
              <button className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-lg">
                <span>AI Analysis</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bottom toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-zinc-900/90 backdrop-blur border border-white/10 rounded-lg p-1.5">
            <button className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400">
              <Layers className="h-4 w-4" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400">
              <Ruler className="h-4 w-4" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10 text-zinc-400">
              <PenTool className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-white/10" />
            <button className="w-9 h-9 flex items-center justify-center rounded-md bg-white/10 text-orange-400">
              <MapPin className="h-4 w-4" />
            </button>
          </div>

          {/* Selected property highlight */}
          <div className="absolute top-1/3 left-1/4 w-24 h-16 border-2 border-orange-500 bg-orange-500/20 rounded pointer-events-none" />

          {/* Property marker */}
          <div className="absolute top-1/3 left-1/4 translate-x-8 -translate-y-2">
            <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-white shadow-lg flex items-center justify-center">
              <MapPin className="h-3 w-3 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
