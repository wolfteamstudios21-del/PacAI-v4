import { ExternalLink, Zap, Shield, Globe, Timer, Cpu } from 'lucide-react';

export default function PacAIV5Dashboard() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-[#e0e0e0] p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-black flex items-center gap-4">
            PacAI <span className="text-[#3e73ff]">v5</span>
            <span className="text-xs bg-[#3e73ff] px-3 py-1 rounded-full">LIVE</span>
          </h1>
          <p className="text-[#9aa0a6] mt-2">9-second worlds • 100% deterministic • Every engine • Forever offline</p>
        </div>
        <div className="flex gap-4 mt-6 md:mt-0">
          <a href="https://discord.gg/TtfHgfCQMY" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-[#5865F2] rounded-xl font-bold hover:opacity-90 flex items-center gap-2">
            <Globe size={20} /> Discord (300+)
          </a>
          <a href="mailto:wolfteamstudios21@gmail.com" className="px-6 py-3 bg-[#3e73ff] rounded-xl font-bold hover:opacity-90">
            Claim Lifetime
          </a>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
        {/* Left: Live Stats */}
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33]">
            <h3 className="text-xl font-bold flex items-center gap-2"><Zap className="text-yellow-400" /> Live System</h3>
            <div className="mt-4 space-y-3 text-2xl font-mono">
              <div>Generation: <span className="text-[#3e73ff]">8.4 sec</span></div>
              <div>Active Worlds: <span className="text-green-400">7</span></div>
              <div>NPCs Online: <span className="text-orange-400">41,282</span></div>
              <div className="flex items-center gap-2"><Shield className="text-green-400" /> HSM: <span className="text-green-400">ACTIVE</span></div>
            </div>
          </div>

          <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33]">
            <h3 className="text-xl font-bold">Quick Export</h3>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {['UE5', 'Unity', 'Godot', 'Roblox', 'visionOS', 'WebGPU'].map(engine => (
                <button key={engine} className="py-3 bg-[#1f2125] rounded-lg hover:bg-[#3e73ff] transition text-sm font-bold">
                  {engine}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Center: Visualizer + Recent */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#141517] rounded-2xl p-6 h-96 flex items-center justify-center border border-[#2a2d33]">
            <div className="text-center">
              <Cpu size={64} className="mx-auto text-[#3e73ff] mb-4" />
              <p className="text-2xl font-bold">Live World Visualizer</p>
              <p className="text-[#9aa0a6]">Coming to Tauri desktop client – Week 2</p>
            </div>
          </div>

          <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33]">
            <h3 className="text-xl font-bold">Recent Activity</h3>
            <div className="mt-4 space-y-3 text-sm font-mono">
              <div>• [00:02] 4 km² cyberpunk city generated (seed 0xdeadbeef)</div>
              <div>• [00:07] Exported to Roblox – 11 sec</div>
              <div>• [00:09] Voice clone → "Drop your weapon!" (police template)</div>
              <div>• [00:11] 500 rioters spawned – pathfinding active</div>
            </div>
          </div>
        </section>

        {/* Right: How-To + Community */}
        <section className="lg:col-span-3 space-y-6">
          <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33]">
            <h3 className="text-xl font-bold mb-4">5-Second Start</h3>
            <ol className="text-sm space-y-2 text-[#9aa0a6]">
              <li>1. New Project</li>
              <li>2. Paste prompt → Generate</li>
              <li>3. Tweak → Inject Override</li>
              <li>4. Click engine → Download</li>
              <li>5. Import – done</li>
            </ol>
            <a href="https://discord.gg/TtfHgfCQMY" target="_blank" rel="noopener noreferrer" className="block mt-6 text-[#5865F2] font-bold hover:underline">
              → Full guide in Discord #how-to
            </a>
          </div>

          <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-6 text-center">
            <p className="text-3xl font-black">$2,997</p>
            <p className="text-sm opacity-90">Lifetime Indie</p>
            <p className="text-xs mt-2">Only 247 slots left</p>
            <a href="mailto:wolfteamstudios21@gmail.com?subject=v5%20Lifetime" className="block mt-4 bg-white text-black py-3 rounded-xl font-bold">
              Claim Before Gone
            </a>
          </div>
        </section>
      </div>

      <footer className="text-center mt-16 text-sm opacity-70">
        Wolf Team Studios • <a href="https://discord.gg/TtfHgfCQMY" target="_blank" rel="noopener noreferrer" className="text-[#5865F2] underline">Discord</a> •{' '}
        <a href="mailto:wolfteamstudios21@gmail.com" className="text-[#3e73ff] underline">wolfteamstudios21@gmail.com</a>
      </footer>
    </div>
  );
}
