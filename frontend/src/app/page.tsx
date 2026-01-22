import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Layers, Brain, Database, Globe, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SiteLens</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            AI-Powered
            <span className="text-primary"> GIS Platform</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Analyze properties, visualize spatial data, and unlock insights with
            AI. The complete platform for site assessment and property analysis.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Everything you need for spatial analysis
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background rounded-lg p-6 shadow-sm">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Interactive Maps
                </h3>
                <p className="text-muted-foreground">
                  Powerful Mapbox GL JS visualization with multiple basemaps,
                  drawing tools, and layer management.
                </p>
              </div>
              <div className="bg-background rounded-lg p-6 shadow-sm">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  AI-Powered Insights
                </h3>
                <p className="text-muted-foreground">
                  Natural language queries, automated analysis, and AI-generated
                  insights for your spatial data.
                </p>
              </div>
              <div className="bg-background rounded-lg p-6 shadow-sm">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Property Data
                </h3>
                <p className="text-muted-foreground">
                  Connect to Australian open data sources including cadastral
                  boundaries, zoning, and environmental layers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* More Features */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Layer Management
                </h3>
                <p className="text-muted-foreground">
                  Organize your data with powerful layer controls. Toggle visibility,
                  adjust styles, and filter features.
                </p>
              </div>
              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Code Sandbox
                </h3>
                <p className="text-muted-foreground">
                  Write custom analysis scripts with our sandboxed code editor.
                  Execute safely in WebWorkers.
                </p>
              </div>
              <div className="bg-background rounded-lg p-6 shadow-sm border">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Site Assessment
                </h3>
                <p className="text-muted-foreground">
                  Comprehensive property analysis with flood, bushfire, heritage,
                  and planning overlays.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-muted/50 py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to unlock spatial insights?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join forward-thinking teams using SiteLens for property analysis.
            </p>
            <Link href="/register">
              <Button size="lg">Get Started Free</Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 SiteLens. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
