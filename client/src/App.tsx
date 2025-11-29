import { useState } from "react";
import { Zap, Shield, Globe, Download, LogOut } from "lucide-react";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#0b0d0f] flex items-center justify-center p-8">
        <div className="bg-[#141517] rounded-2xl p-10 max-w-md w-full border border-[#2a2d33]">
          <h1 className="text-4xl font-black text-center mb-8">PacAI v4</h1>
          <input
            type="text"
            placeholder="Username (any name)"
            className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-4"
            onKeyPress={(e) => e.key === "Enter" && setLoggedIn(true) && setUser(e.currentTarget.value || "Guest")}
          />
          <button
            onClick={() => setLoggedIn(true)}
            className="w-full py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90"
          >
            Enter PacAI → No Password Needed
          </button>
          <p className="text-center text-sm text-[#9aa0a6] mt-6">
            Free Forever • No card • Offline-ready
          </p>
        </div>
      </div>
    );
  }

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    // Mock <9 sec generation (real v4 route in server/v4.ts)
    await new Promise(r => setTimeout(r, 8400));
    setResult({
      zone: "Cyberpunk Downtown",
      npcs: 8421,
      seed: "0xdeadbeef2025",
      time: "8.4 sec"
    });
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-5xl font-black">PacAI v4 <span className="text-[#3e73ff]">LIVE</span></h1>
          <p className="text-[#9aa0a6]">Welcome, {user} • Unlimited generation • Offline-first</p>
        </div>
        <button onClick={() => setLoggedIn(false)} className="flex items-center gap-2 text-red-400">
          <LogOut size={20} /> Logout
        </button>
      </header>

      <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* Generator */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33]">
            <h2 className="text-2xl font-bold mb-4">Generate World</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. 4km cyberpunk city, rainy night, 10 000 NPCs, Blade Runner vibe"
              className="w-full h-32 bg-[#1f2125] rounded-lg p-4 text-sm"
            />
            <button
              onClick={generate}
              disabled={generating || !prompt}
              className="mt-4 px-8 py-4 bg-[#3e73ff] rounded-xl font-bold flex items-center gap-3 hover:opacity-90 disabled:opacity-50"
            >
              <Zap /> {generating ? "Generating… 8.4 sec" : "Generate (<9 sec)"}
            </button>
          </div>

          {result && (
            <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33]">
              <h3 className="text-xl font-bold flex items-center gap-2"><Shield className="text-green-400" /> Generation Complete</h3>
              <div className="mt-4 space-y-2 font-mono">
                <div>Zone: {result.zone}</div>
                <div>NPCs: {result.npcs.toLocaleString()}</div>
                <div>Seed: {result.seed}</div>
                <div>Time: {result.time}</div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {["UE5", "Unity", "Godot", "Roblox", "Blender", "WebGPU"].map(e => (
                  <button key={e} className="py-3 bg-[#1f2125] rounded-lg hover:bg-[#3e73ff] font-bold">
                    Export {e} <Download className="inline ml-2" size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33]">
            <h3 className="text-xl font-bold">Quick Start Guide</h3>
            <ol className="mt-4 text-sm space-y-2 text-[#9aa0a6]">
              <li>1. Type any prompt above</li>
              <li>2. Click Generate (≤9 sec)</li>
              <li>3. Export to your engine</li>
              <li>4. Import → Done</li>
            </ol>
            <a href="https://discord.gg/TtfHgfCQMY" target="_blank" className="block mt-6 text-[#5865F2] font-bold">
              Full guide + help in Discord
            </a>
          </div>

          <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-6 text-center">
            <p className="text-4xl font-black">$2,997</p>
            <p className="text-lg">Lifetime Indie</p>
            <p className="text-sm mt-2">Only 247 slots left</p>
            <a href="mailto:wolfteamstudios21@gmail.com?subject=Lifetime%20Slot" className="block mt-4 bg-white text-black py-3 rounded-xl font-bold">
              Claim Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
