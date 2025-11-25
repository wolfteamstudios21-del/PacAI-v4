import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Network, Brain, Sparkles, Database, ArrowRight, CheckCircle, Settings, Lock, Download, BarChart3, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    title: "Behavior Tree Tester",
    description: "Run and inspect AI behavior logic used in training simulations.",
    icon: Network,
    href: "/bt-tester",
  },
  {
    title: "ONNX Model Tester",
    description: "Test machine-learning models powering adaptive decision behavior.",
    icon: Brain,
    href: "/onnx-tester",
  },
  {
    title: "Narrative Scenario Lab",
    description: "Generate dynamic scenario dialogue and branching outcomes.",
    icon: Sparkles,
    href: "/narrative-lab",
  },
  {
    title: "World State Editor",
    description: "Edit and track persistent NPC and environment memory.",
    icon: Database,
    href: "/world-state",
  },
  {
    title: "Godot Integration APIs",
    description: "REST API endpoints for seamless mobile game integration.",
    icon: Network,
    href: "/",
  },
  {
    title: "System Settings",
    description: "Configure integrations and validate AI Brain connectivity.",
    icon: Settings,
    href: "/settings",
  },
];

export default function Home() {
  return (
    <div className="w-full h-full overflow-auto bg-gradient-to-br from-background to-muted/50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* v4 Enterprise Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground" data-testid="text-page-title">
                PacAI v4 — Master Dashboard
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                Air-gapped Defense Simulation Platform • HSM-backed Licensing • Enterprise SCIF Ready
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className="px-4 py-2 bg-green-900 text-green-100 flex items-center gap-2" data-testid="badge-status">
                <Shield className="w-3 h-3" />
                v4.0.0
              </Badge>
              <Badge variant="outline" className="px-4 py-2 flex items-center gap-2" data-testid="badge-hsm">
                <Lock className="w-3 h-3" />
                HSM Active
              </Badge>
            </div>
          </div>
        </div>

        {/* System Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Active Shards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Queued Jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">12</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Avg Tick</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">120 ms</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Worlds Online</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">7</div>
            </CardContent>
          </Card>
        </div>

        {/* Live Controls & Feature Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Live Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Project</label>
                <select className="w-full p-2 mt-1 bg-muted rounded text-sm border border-border">
                  <option>Riftwars Master Map</option>
                  <option>Realm Unbound Metro</option>
                  <option>Vanguard Echoes</option>
                </select>
              </div>
              <Button className="w-full" size="sm" data-testid="button-inject-override">Inject Override</Button>
              <Button variant="outline" className="w-full" size="sm" data-testid="button-snapshot-save">Snapshot Save</Button>
            </CardContent>
          </Card>

          {/* Middle: Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="text-muted-foreground">[00:04] Riftborn invasion spawned 50 @ C3 — override applied</div>
              <div className="text-muted-foreground">[00:12] Export bundle demo_proj ready</div>
              <div className="text-muted-foreground">[00:38] Snapshot saved: master_20251125</div>
            </CardContent>
          </Card>

          {/* Right: v4 Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">v4 Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="text-muted-foreground">✓ Persistent World Memory</div>
              <div className="text-muted-foreground">✓ HSM-backed Licensing</div>
              <div className="text-muted-foreground">✓ Export Packager (UE5/Unity/Godot)</div>
              <div className="text-muted-foreground">✓ Audit Replay + Tamper Detection</div>
              <div className="text-muted-foreground">✓ Air-gapped Offline Mode</div>
            </CardContent>
          </Card>
        </div>

        {/* v3 Features (Backward Compat) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Testing Tools (v3 Compat)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.slice(0, 6).map((feature) => (
              <Link key={feature.title} href={feature.href}>
                <Card className="hover-elevate cursor-pointer h-full transition-all" data-testid={`card-feature-${feature.title.toLowerCase().replace(/ /g, '-')}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <feature.icon className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    </div>
                    <CardTitle className="text-lg mt-3">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* API Blueprint */}
        <Card className="border-primary/30 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              API Blueprint (v3 + v4)
            </CardTitle>
            <CardDescription className="text-xs">
              Backward-compatible endpoints + new v4 export/audit streams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-3 rounded-sm font-mono text-xs border border-border space-y-2">
              <div className="text-primary">v3 Endpoints (unchanged)</div>
              <div className="text-muted-foreground">POST /api/bt/run • POST /api/onnx/predict • POST /api/narrative/generate</div>
              <div className="text-primary mt-3">v4 New Endpoints</div>
              <div className="text-muted-foreground">POST /api/v4/export/build • GET /api/v4/audit/stream • POST /api/v4/override/apply</div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              CORS enabled. HSM license validation required. Offline mode supported (no internet calls).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
