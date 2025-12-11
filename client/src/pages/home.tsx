import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white flex flex-col items-center justify-center p-8 space-y-8">
      <h1 
        className="text-6xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600"
        data-testid="text-hero-title"
      >
        PacAI v6.2 – The Asset Engine
      </h1>
      <p className="text-xl text-center opacity-90 max-w-2xl" data-testid="text-hero-description">
        Generate worlds, NPCs, vehicles, weapons, and creatures. Offline-first, multi-engine exports, and an artist marketplace that pays creators.
      </p>
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl w-full">
        <div className="bg-white/10 p-6 rounded-xl" data-testid="card-feature-assets">
          <h2 className="text-2xl font-bold mb-2">Infinite Assets</h2>
          <p>Procedural vehicles, weapons, creatures — fork for $0.50 (Wolf Team free).</p>
        </div>
        <div className="bg-white/10 p-6 rounded-xl" data-testid="card-feature-export">
          <h2 className="text-2xl font-bold mb-2">9-Engine Export</h2>
          <p>Unity, Godot, UE5, Blender — signed ZIPs ready in seconds.</p>
        </div>
        <div className="bg-white/10 p-6 rounded-xl" data-testid="card-feature-overrides">
          <h2 className="text-2xl font-bold mb-2">Live Overrides</h2>
          <p>Push events/NPCs without updates — WebSocket magic.</p>
        </div>
      </div>
      <Link href="/pricing">
        <Button 
          className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 rounded-full text-lg font-bold hover:from-purple-700 hover:to-indigo-700 transition h-auto"
          data-testid="button-join-beta"
        >
          Join Beta — Free Tier Now
        </Button>
      </Link>
      <p className="text-sm opacity-70" data-testid="text-footer">Powered by Wolf Team Studios | Artist Showcase Coming Soon</p>
    </div>
  );
}
