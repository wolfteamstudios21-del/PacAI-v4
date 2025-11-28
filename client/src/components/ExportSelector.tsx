import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const engines = [
  { name: "UE5", desc: "Unreal Engine 5.5+" },
  { name: "Unity", desc: "Unity 2023 LTS+" },
  { name: "Godot", desc: "Godot 4.3+" },
  { name: "Roblox", desc: "Roblox Studio" },
  { name: "visionOS", desc: "Apple Vision Pro" },
  { name: "WebGPU", desc: "Browser (Web)" },
];

export default function ExportSelector() {
  return (
    <Card className="border-blue-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-500" />
          One-Click Export
        </CardTitle>
        <CardDescription>Choose your target engine – download ZIP in seconds</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {engines.map((engine) => (
            <button
              key={engine.name}
              className="p-4 bg-card border border-border rounded-lg hover:border-blue-500 hover:bg-blue-500/10 transition group cursor-pointer"
              data-testid={`button-export-${engine.name.toLowerCase()}`}
            >
              <div className="font-bold group-hover:text-blue-500 transition">{engine.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{engine.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          All formats include: fully rigged characters, dialogue system, behavior trees, lighting setup, sound design
        </p>
      </CardContent>
    </Card>
  );
}
