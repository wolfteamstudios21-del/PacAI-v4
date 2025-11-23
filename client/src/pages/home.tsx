import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Network, Brain, Sparkles, Database, ArrowRight, CheckCircle, Settings } from "lucide-react";
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
    <div className="w-full h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enterprise Header */}
        <div className="mb-8 pb-6 border-b border-border">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground" data-testid="text-page-title">
                AI Brain Training Suite — Demo v1
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Status: <span className="text-primary font-semibold">Connected</span> • Engine: <span className="font-semibold">AI Brain Core v1</span>
              </p>
            </div>
            <Badge variant="outline" className="px-4 py-2 text-base" data-testid="badge-version">
              v1.0.0-alpha
            </Badge>
          </div>
        </div>

        {/* 2x3 Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {features.map((feature) => (
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

        {/* API Reference Card */}
        <Card className="border-primary/30 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Quick Start: Godot Integration</CardTitle>
            <CardDescription className="text-xs">
              POST /api/onnx/predict • POST /api/bt/run • POST /api/narrative/generate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-3 rounded-sm font-mono text-xs border border-border">
              <div className="text-muted-foreground mb-2">var http = HTTPRequest.new()</div>
              <pre className="text-foreground whitespace-pre-wrap leading-relaxed">
{`http.request("http://localhost:5000/api/onnx/predict",
  ["Content-Type: application/json"],
  HTTPClient.METHOD_POST,
  JSON.stringify({"inputs":[0.1,0.5,0.2]}))`}
              </pre>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              All endpoints enabled for CORS. See Settings for API configuration and connection validation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
