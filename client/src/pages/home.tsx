import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Network, Brain, Sparkles, Database, ArrowRight, CheckCircle, Settings, Lock, Download, BarChart3, Shield, Zap, Cpu } from "lucide-react";
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
        {/* v5 Modern Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-5xl font-black text-foreground" data-testid="text-page-title">
                  PacAI <span className="text-blue-500">v5</span>
                </h1>
                <Badge className="bg-blue-600 text-white flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  LIVE
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground font-medium">
                9-second worlds • 100% deterministic • Every engine • Forever offline
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate full games & cinematics in seconds. Air-gapped • HSM-licensed • Multi-engine export
              </p>
            </div>
            <div className="flex gap-3 flex-col sm:flex-row">
              <Link href="/v5">
                <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2" data-testid="button-view-v5">
                  <Cpu className="w-4 h-4" />
                  Try v5 Dashboard
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" data-testid="button-pricing-from-home">
                  Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Live Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold">Generation Speed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">8.4 sec</div>
              <p className="text-xs text-muted-foreground mt-1">Full world + assets</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold">Active Worlds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">7</div>
              <p className="text-xs text-muted-foreground mt-1">Concurrent simulations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold">Determinism</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-500">100%</div>
              <p className="text-xs text-muted-foreground mt-1">Same seed = identical output</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold">Engine Support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">6+</div>
              <p className="text-xs text-muted-foreground mt-1">UE5, Unity, Godot, Roblox+</p>
            </CardContent>
          </Card>
        </div>

        {/* Core v5 Features */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: v5 Capabilities */}
          <Card className="border-blue-500/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                v5 Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>9-second full world generation</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Deterministic procedural generation</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Multi-engine export (6+ formats)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>HSM-backed licensing</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Complete offline operation</span>
              </div>
            </CardContent>
          </Card>

          {/* Middle: Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs font-mono text-muted-foreground">
              <div>• 4 km² cyberpunk city generated (seed 0xdeadbeef)</div>
              <div>• Exported to Roblox – 11 sec</div>
              <div>• Voice clone deployed – "Drop your weapon!"</div>
              <div>• 500 rioters pathfinding active</div>
              <div>• HSM signature validated ✓</div>
            </CardContent>
          </Card>

          {/* Right: Quick Access */}
          <Card className="border-purple-500/50">
            <CardHeader>
              <CardTitle className="text-lg">Quick Start</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="space-y-2 text-muted-foreground">
                <li><strong>1.</strong> New Project</li>
                <li><strong>2.</strong> Paste prompt → Generate</li>
                <li><strong>3.</strong> Tweak settings</li>
                <li><strong>4.</strong> Export to your engine</li>
                <li><strong>5.</strong> Import & play</li>
              </ol>
              <a href="https://discord.gg/TtfHgfCQMY" target="_blank" rel="noopener noreferrer" className="block text-blue-500 font-medium hover:underline text-xs">
                → Full guide on Discord #how-to
              </a>
            </CardContent>
          </Card>
        </div>

        {/* v5 Demo + Testing Tools */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Try It Now</h2>
            <Link href="/v5">
              <Card className="hover-elevate cursor-pointer border-blue-500/30 bg-gradient-to-r from-blue-900/10 to-purple-900/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-500" />
                    Full v5 Dashboard
                  </CardTitle>
                  <CardDescription>
                    Live world visualizer, generation stats, quick export controls, and real-time audit logs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                    Open Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>

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
        </div>

        {/* v5 API Capabilities */}
        <Card className="border-blue-500/30 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              v5 API (13 Endpoints)
            </CardTitle>
            <CardDescription className="text-xs">
              Full REST API with deterministic generation, multi-engine export, HSM licensing, and real-time audit streams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-3 rounded-sm font-mono text-xs border border-border space-y-3">
              <div>
                <div className="text-blue-500 font-semibold">Core Endpoints</div>
                <div className="text-muted-foreground">GET /v4/status • GET /v4/license • GET /v4/webhooks</div>
              </div>
              <div>
                <div className="text-blue-500 font-semibold">Project Management</div>
                <div className="text-muted-foreground">POST /v4/projects • GET/PATCH/DELETE /v4/projects/:id</div>
              </div>
              <div>
                <div className="text-blue-500 font-semibold">Generation & Export</div>
                <div className="text-muted-foreground">POST /v4/projects/:id/generate • POST /v4/export • GET /v4/audit/tail</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              CORS enabled • HSM signature validation • Deterministic on seed • Offline-capable • Air-gapped ready
            </p>
          </CardContent>
        </Card>

        {/* Community & Pricing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-lg">Community & Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Join 300+ creators building with PacAI:</p>
                <a href="https://discord.gg/TtfHgfCQMY" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium flex items-center gap-2">
                  <span>Discord – Live support & tutorials</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
              <div>
                <a href="mailto:wolfteamstudios21@gmail.com" className="text-blue-500 hover:underline font-medium">
                  Email: wolfteamstudios21@gmail.com
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-900/10 to-blue-900/10">
            <CardHeader>
              <CardTitle className="text-lg">Limited Lifetime Offer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-black mb-2">$2,997</p>
              <p className="text-sm text-muted-foreground mb-4">Lifetime Indie (247 slots remaining)</p>
              <Link href="/pricing">
                <Button className="w-full bg-white text-black hover:bg-gray-100" data-testid="button-claim-lifetime">
                  Claim Slot Before Gone
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
