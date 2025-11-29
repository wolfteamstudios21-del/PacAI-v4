import { useState, useEffect } from "react";
import { Zap, Shield, Download, LogOut, UserPlus } from "lucide-react";

const DEV_USER = "WolfTeamstudio2";
const DEV_PASS = "AdminTeam15";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [isDev, setIsDev] = useState(false);

  // Form states
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // Generation states
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Check if already logged in (localStorage persists)
  useEffect(() => {
    const saved = localStorage.getItem("pacai_user");
    if (saved) {
      const u = JSON.parse(saved);
      setUser(u.name);
      setIsDev(u.isDev);
      setLoggedIn(true);
    }
  }, []);

  const handleAuth = async () => {
    setMessage("");

    // === DEV BACKDOOR ===
    if (username === DEV_USER && password === DEV_PASS) {
      localStorage.setItem("pacai_user", JSON.stringify({ name: username, isDev: true }));
      setUser(username);
      setIsDev(true);
      setLoggedIn(true);
      return;
    }

    // === NORMAL USER FLOW ===
    const endpoint = mode === "register" ? "/api/register" : "/api/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("pacai_user", JSON.stringify({ name: username, isDev: false }));
        setUser(username);
        setLoggedIn(true);
      } else {
        setMessage(data.error || "Something went wrong");
      }
    } catch (err) {
      setMessage("Server offline – try again in a sec");
    }
  };

  const logout = () => {
    localStorage.removeItem("pacai_user");
    setLoggedIn(false);
    setUser("");
    setIsDev(false);
  };

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 8400)); // mock <9 sec
    setResult({
      zone: "Cyberpunk Downtown",
      npcs: 10428,
      seed: "0xdeadbeef2025",
      time: "8.4 sec"
    });
    setGenerating(false);
  };

  // ==================================================================
  // LOGIN / REGISTER SCREEN
  // ==================================================================
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#0b0d0f] flex items-center justify-center p-8">
        <div className="bg-[#141517] rounded-2xl p-10 max-w-md w-full border border-[#2a2d33]">
          <h1 className="text-5xl font-black text-center mb-8">PacAI v4</h1>

          <div className="flex justify-center gap-4 mb-8">
            <button onClick={() => setMode("login")} className={`px-6 py-2 rounded-lg font-bold ${mode === "login" ? "bg-[#3e73ff]" : "bg-[#1f2125]"}`}>Login</button>
            <button onClick={() => setMode("register")} className={`px-6 py-2 rounded-lg font-bold ${mode === "register" ? "bg-[#3e73ff]" : "bg-[#1f2125]"}`}>Register</button>
          </div>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-4"
            onKeyPress={(e) => e.key === "Enter" && handleAuth()}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-6"
            onKeyPress={(e) => e.key === "Enter" && handleAuth()}
          />

          <button
            onClick={handleAuth}
            className="w-full py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90 flex items-center justify-center gap-3"
          >
            {mode === "register" ? <UserPlus size={20} /> : null}
            {mode === "register" ? "Create Account" : "Login"}
          </button>

          {message && <p className="text-center mt-4 text-red-400">{message}</p>}

          <p className="text-center text-xs text-[#9aa0a6] mt-8">
            Dev team → use WolfTeamstudio2 / AdminTeam15
          </p>
        </div>
      </div>
    );
  }

  // ==================================================================
  // MAIN DASHBOARD
  // ==================================================================
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-5xl font-black">PacAI v4 <span className="text-[#3e73ff]">LIVE</span></h1>
          <p className="text-[#9aa0a6]">Welcome, {user} {isDev && "(DEV TEAM)"} • Unlimited generation • Offline-first</p>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-red-400">
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
                  <button key={e} className="py-3 bg-[#1f2125] rounded-lg hover:bg-[#3e73ff] font-bold text-sm">
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
            <a href="https://discord.gg/TtfHgfCQMY" target="_blank" rel="noopener noreferrer" className="block mt-6 text-[#5865F2] font-bold">
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
