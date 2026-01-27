import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DemoVideo } from "@/components/landing/DemoVideo";
import {
  ArrowRight,
  MapPin,
  Layers,
  Shield,
  Building2,
  Check,
  Search,
  Ruler,
  Map,
  Database,
  FileUp,
  ChevronRight,
  Play,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Users,
  MessageSquare,
  Brain,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Siteora</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">
              How it works
            </Link>
            <Link href="#coverage" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Coverage
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-white/5">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-medium">
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />

          <div className="relative max-w-7xl mx-auto px-6">
            <div className="text-center max-w-4xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                Now live in Queensland
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6">
                Property intelligence
                <br />
                <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                  in seconds
                </span>
              </h1>

              <p className="text-xl text-zinc-400 leading-relaxed mb-10 max-w-2xl mx-auto">
                Skip the council portal maze. Get answers in seconds.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white h-14 px-8 text-base font-medium rounded-xl">
                    Get Started Free
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Product Screenshot with Video */}
            <DemoVideo videoSrc="/demo.mp4" />
          </div>
        </section>

        {/* Trusted by */}
        <section className="py-16 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-sm text-zinc-500 mb-8">Powered by official government data from</p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {[
                "QLD Spatial Services",
                "Brisbane City Council",
                "NSW Planning Portal",
                "Geoscience Australia",
              ].map((name) => (
                <div key={name} className="flex items-center gap-2 text-zinc-600">
                  <Database className="h-5 w-5" />
                  <span className="text-sm font-medium">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features - Visual cards */}
        <section id="features" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                Everything in one place
              </h2>
              <p className="text-lg text-zinc-400 max-w-xl mx-auto">
                Stop switching between government portals. Get all the data you need instantly.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Feature 1 - Large */}
              <div className="lg:col-span-2 group relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 p-8">
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-6">
                    <Layers className="h-6 w-6 text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3">40+ Data Layers</h3>
                  <p className="text-zinc-400 max-w-md mb-6">
                    Flood, bushfire, heritage, zoning, environmental overlays - all from authoritative government sources.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Flood Zones", "Bushfire", "Heritage", "Zoning", "Koala Habitat", "Acid Sulfate"].map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-white/5 text-xs text-zinc-400 border border-white/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-20 bg-gradient-to-tl from-orange-500/40 to-transparent" />
              </div>

              {/* Feature 2 */}
              <div className="group relative overflow-hidden rounded-3xl bg-zinc-900 border border-white/10 p-8 hover:border-white/20 transition-colors">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                  <Search className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Instant Search</h3>
                <p className="text-zinc-400 text-sm">
                  Search any address or Lot/Plan number. Get results in milliseconds.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group relative overflow-hidden rounded-3xl bg-zinc-900 border border-white/10 p-8 hover:border-white/20 transition-colors">
                <div className="h-12 w-12 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Constraint Analysis</h3>
                <p className="text-zinc-400 text-sm">
                  See all planning constraints affecting development potential in one view.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group relative overflow-hidden rounded-3xl bg-zinc-900 border border-white/10 p-8 hover:border-white/20 transition-colors">
                <div className="h-12 w-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6">
                  <FileUp className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Import Your Data</h3>
                <p className="text-zinc-400 text-sm">
                  Upload GeoJSON, KML, or Shapefiles. Overlay with government layers.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="group relative overflow-hidden rounded-3xl bg-zinc-900 border border-white/10 p-8 hover:border-white/20 transition-colors">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6">
                  <Ruler className="h-6 w-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Measure & Draw</h3>
                <p className="text-zinc-400 text-sm">
                  Distance, area, and annotation tools. Export as GeoJSON.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Section */}
        <section className="py-24 bg-zinc-900/50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left - Content */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-Powered Analysis
                </div>

                <h2 className="text-4xl font-bold text-white mb-6">
                  Instant property insights,
                  <br />
                  <span className="text-purple-400">powered by AI</span>
                </h2>

                <p className="text-lg text-zinc-400 mb-8">
                  Go beyond raw data. Get intelligent analysis of constraints, development potential,
                  and actionable next steps — all aligned with current planning schemes.
                </p>

                <div className="space-y-4">
                  <div className="flex gap-4 p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                    <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white mb-1">Hazard Assessment</h4>
                      <p className="text-sm text-zinc-400">
                        Understand flood, bushfire, and environmental risks with plain-English explanations of what they mean for your site.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white mb-1">Development Potential</h4>
                      <p className="text-sm text-zinc-400">
                        AI analysis of height limits, setbacks, and site coverage based on the applicable planning scheme.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                    <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white mb-1">Recommended Contacts</h4>
                      <p className="text-sm text-zinc-400">
                        Get suggestions for relevant council departments, consultants, and specialists based on your site&apos;s constraints.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - AI Chat mockup */}
              <div className="relative">
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]" />
                <div className="relative rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden shadow-2xl">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Property Analysis</div>
                      <div className="text-xs text-zinc-500">42 Smith Street, Brisbane</div>
                    </div>
                  </div>

                  {/* Chat content */}
                  <div className="p-4 space-y-4 bg-zinc-950/50">
                    {/* AI Message */}
                    <div className="flex gap-3">
                      <div className="h-6 w-6 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="h-3 w-3 text-purple-400" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-300">
                          <p className="font-medium text-white mb-2">Site Assessment Summary</p>
                          <p>This property is affected by <span className="text-red-400 font-medium">medium flood hazard</span> and falls within a <span className="text-orange-400 font-medium">bushfire prone area (BAL-29)</span>.</p>
                        </div>

                        <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-300">
                          <p className="font-medium text-white mb-2">Development Potential</p>
                          <p>Under the Brisbane City Plan 2014, this Low-Medium Residential zone allows:</p>
                          <ul className="mt-2 space-y-1 text-zinc-400">
                            <li className="flex items-center gap-2">
                              <Check className="h-3 w-3 text-green-500" />
                              Max height: 9.5m (3 storeys)
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-3 w-3 text-green-500" />
                              Site cover: 50%
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-3 w-3 text-green-500" />
                              Multiple dwelling: Code assessable
                            </li>
                          </ul>
                        </div>

                        <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-300">
                          <p className="font-medium text-white mb-2">Recommended Next Steps</p>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="h-5 w-5 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[10px] text-blue-400 font-medium">1</span>
                              </div>
                              <span className="text-zinc-400">Obtain flood search certificate from Brisbane City Council</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="h-5 w-5 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[10px] text-blue-400 font-medium">2</span>
                              </div>
                              <span className="text-zinc-400">Engage BAL assessor for bushfire attack level report</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="h-5 w-5 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[10px] text-blue-400 font-medium">3</span>
                              </div>
                              <span className="text-zinc-400">Pre-lodgement meeting with Council planning team</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-white/5">
                    <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                      <MessageSquare className="h-4 w-4 text-zinc-500" />
                      <span className="text-sm text-zinc-500">Ask about this property...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                Site due diligence in 3 steps
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Search property",
                  description: "Enter an address or Lot/Plan number to locate any property in Queensland or NSW.",
                },
                {
                  step: "02",
                  title: "View constraints",
                  description: "Instantly see all planning overlays, hazards, and environmental constraints.",
                },
                {
                  step: "03",
                  title: "Analyse & export",
                  description: "Measure areas, add annotations, and export your findings.",
                },
              ].map((item) => (
                <div key={item.step} className="relative">
                  <div className="text-7xl font-bold text-zinc-800 mb-4">{item.step}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-zinc-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Coverage */}
        <section id="coverage" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-white mb-6">
                  Coverage
                </h2>
                <p className="text-lg text-zinc-400 mb-8">
                  State-wide hazard and planning data, with detailed council-level information for select areas.
                </p>

                {/* Queensland */}
                <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Map className="h-5 w-5 text-orange-400" />
                    <span className="font-semibold text-white text-lg">Queensland</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-sm text-zinc-400 mb-4">
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-green-500" />
                        State planning overlays
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-green-500" />
                        Flood & bushfire hazards
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-green-500" />
                        Environmental constraints
                      </span>
                    </div>
                    <div className="pt-3 border-t border-white/5">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Council Data</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-sm text-orange-400">
                          Brisbane
                          <span className="text-[10px] bg-orange-500/20 px-1.5 py-0.5 rounded">BETA</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-sm text-orange-400">
                          Logan
                          <span className="text-[10px] bg-orange-500/20 px-1.5 py-0.5 rounded">BETA</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-sm text-zinc-500">
                          Ipswich
                          <span className="text-[10px] bg-zinc-700 px-1.5 py-0.5 rounded">SOON</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NSW */}
                <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Map className="h-5 w-5 text-zinc-600" />
                      <span className="font-semibold text-zinc-400 text-lg">New South Wales</span>
                    </div>
                    <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-1 rounded">COMING SOON</span>
                  </div>
                  <p className="text-sm text-zinc-500">
                    LEP zoning, heritage listings, flood planning, and more.
                  </p>
                </div>
              </div>

              {/* Map visual */}
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-zinc-900 border border-white/10 overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/145,-28,4,0/600x600?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw')] bg-cover bg-center opacity-40" />
                  {/* QLD highlight - active */}
                  <div className="absolute top-1/4 right-1/4 w-20 h-32 bg-orange-500/30 rounded-lg border-2 border-orange-500/60" />
                  {/* NSW highlight - coming soon */}
                  <div className="absolute top-1/2 right-1/3 w-16 h-20 bg-zinc-500/20 rounded-lg border-2 border-zinc-500/40 border-dashed" />
                  {/* Labels */}
                  <div className="absolute top-1/3 right-1/4 bg-orange-500 text-white text-xs px-2 py-1 rounded font-medium">QLD</div>
                  <div className="absolute top-1/2 right-1/3 bg-zinc-700 text-zinc-400 text-xs px-2 py-1 rounded font-medium">NSW</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-12 text-center">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0tNCA0aC0ydi0yaDJ2MnptMC00aC0ydi0yaDJ2MnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to start?
                </h2>
                <p className="text-lg text-orange-100 mb-8 max-w-xl mx-auto">
                  Create a free account and access all features immediately.
                </p>
                <Link href="/register">
                  <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 h-14 px-10 text-base font-semibold rounded-xl">
                    Create Free Account
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          {/* Footer grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-white">Siteora</span>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Property intelligence powered by official government spatial data.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/app" className="text-sm text-zinc-500 hover:text-white transition-colors">Launch App</Link></li>
                <li><Link href="#features" className="text-sm text-zinc-500 hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#coverage" className="text-sm text-zinc-500 hover:text-white transition-colors">Coverage</Link></li>
                <li><Link href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">Changelog</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">Data Sources</Link></li>
                <li><Link href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">API</Link></li>
                <li><Link href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">About</Link></li>
                <li><Link href="/request-demo" className="text-sm text-zinc-500 hover:text-white transition-colors">Request Demo</Link></li>
                <li><Link href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-600">
              &copy; {new Date().getFullYear()} Siteora. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="text-xs text-zinc-600">
                Data sourced from Australian government spatial services
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
