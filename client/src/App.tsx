import { useState, useEffect } from "react";
import {
  Zap, Shield, Download, LogOut, Menu, X, Crown, Search, UserCheck,
  Brain, Sparkles, Send, Package, Smartphone, Monitor, BookOpen, BarChart3
} from "lucide-react";

const DEV_USER = "WolfTeamstudio2";
const DEV_PASS = "AdminTeam15";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Project state
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generationStatus, setGenerationStatus] = useState("");
  const [overrideCmd, setOverrideCmd] = useState("");
  const [lastOverride, setLastOverride] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [verifyUser, setVerifyUser] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // Load user
  useEffect(() => {
    const saved = localStorage.getItem("pacai_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  // Load projects when user logs in
  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const login = async () => {
    if (!loginUser || !loginPass) return alert("Fill both fields");
    if (loginUser === DEV_USER && loginPass === DEV_PASS) {
      const dev = { name: loginUser, tier: "lifetime", isDev: true };
      localStorage.setItem("pacai_user", JSON.stringify(dev));
      setUser(dev);
      return;
    }
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: loginUser, password: loginPass })
    });
    const data = await res.json();
    if (data.success) {
      const u = { name: loginUser, tier: data.tier || "free" };
      localStorage.setItem("pacai_user", JSON.stringify(u));
      setUser(u);
    } else {
      alert(data.error || "Login failed");
    }
  };

  const loadProjects = async () => {
    const res = await fetch("/v5/projects");
    const data = await res.json();
    setProjects(data);
    if (data.length && !selectedProject) setSelectedProject(data[0]);
  };

  const createNewProject = async () => {
    const res = await fetch("/v5/projects", { method: "POST" });
    const p = await res.json();
    setProjects([p, ...projects]);
    setSelectedProject(p);
  };

  const generate = async () => {
    if (!selectedProject) return;
    setGenerating(true);
    setGenerationStatus("Starting generation...");
    
    const res = await fetch(`/v5/projects/${selectedProject.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const reader = res.body?.getReader();
    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = new TextDecoder().decode(value);
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              setSelectedProject(data.project);
              loadProjects();
              setGenerationStatus("Generation complete!");
            } else {
              setGenerationStatus(data.message);
            }
          } catch (e) {}
        }
      }
    }
    setGenerating(false);
  };

  const sendOverride = async () => {
    if (!selectedProject || !overrideCmd.trim()) return;
    try {
      const res = await fetch(`/v5/projects/${selectedProject.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: overrideCmd, user: user.name })
      });
      const updated = await res.json();
      setLastOverride({ cmd: overrideCmd, ts: Date.now() });
      setSelectedProject(updated);
      setOverrideCmd("");
      loadProjects();
    } catch (e) {
      alert("Override failed");
    }
  };

  const loadAudit = async () => {
    const res = await fetch("/v5/audit");
    const data = await res.json();
    setAuditLog(data);
  };

  const verifyAccount = async () => {
    const res = await fetch(`/api/verify?username=${verifyUser}`);
    const data = await res.json();
    setVerifyResult(data);
  };

  const logout = () => {
    localStorage.removeItem("pacai_user");
    setUser(null);
    setLoginUser("");
    setLoginPass("");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b0d0f] flex items-center justify-center p-8">
        <div className="bg-[#141517] rounded-2xl p-10 w-full max-w-md border border-[#2a2d33]">
          <h1 className="text-5xl font-black text-center mb-8 text-[#3e73ff]">PacAI v5 – Dev Companion</h1>
          <input placeholder="Username" className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-4 text-white placeholder-[#9aa0a6]" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-6 text-white placeholder-[#9aa0a6]" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
          <button onClick={login} className="w-full py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90">Login / Register</button>
          <p className="text-center text-xs text-[#9aa0a6] mt-6">New users start on Free tier</p>
        </div>
      </div>
    );
  }

  const menu = [
    { id: "home", icon: Brain, label: "Home" },
    { id: "generate", icon: Sparkles, label: "Generation Lab" },
    { id: "override", icon: Send, label: "Override" },
    { id: "export", icon: Package, label: "Export" },
    { id: "audit", icon: BarChart3, label: "Audit Log" },
    { id: "verify", icon: UserCheck, label: "Verify" },
  ];

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white flex">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? "w-64" : "w-20"} bg-[#141517] border-r border-[#2a2d33] transition-all`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className={`font-black text-2xl ${sidebarOpen ? "block" : "hidden"}`}>PacAI v5</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <X size={24} /> : <Menu size={24} />}</button>
        </div>
        <nav className="mt-8">
          {menu.map(i => (
            <button key={i.id} onClick={() => setActiveTab(i.id)} className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-[#1f2125] transition ${activeTab === i.id ? "bg-[#3e73ff]" : ""}`}>
              <i.icon size={24} />{sidebarOpen && <span>{i.label}</span>}
            </button>
          ))}
          <button onClick={logout} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#1f2125] transition mt-8">
            <LogOut size={24} />{sidebarOpen && <span>Logout</span>}
          </button>
        </nav>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-10 overflow-y-auto">
        {activeTab === "home" && (
          <div>
            <h2 className="text-5xl font-black mb-8">Welcome, {user.name}!</h2>
            <div className="grid md:grid-cols-3 gap-8 mb-10">
              <div className="bg-gradient-to-br from-purple-900 to-blue-900 p-8 rounded-2xl">
                <Crown className="w-16 h-16 mb-4" />
                <p className="text-5xl font-black">{user.tier.toUpperCase()}</p>
                {user.tier === "free" && <p className="mt-4">2 per week</p>}
                {user.tier === "creator" && <p className="mt-4">100 per week</p>}
                {user.tier === "lifetime" && <p className="mt-4">Unlimited</p>}
              </div>
              <div className="bg-[#141517] p-8 rounded-2xl border border-[#2a2d33]">
                <h3 className="text-2xl font-bold mb-4">Projects</h3>
                <p className="mb-4 text-[#9aa0a6]">{projects.length} projects</p>
                <button onClick={createNewProject} className="w-full py-3 bg-[#3e73ff] rounded-xl font-bold hover:opacity-90">New Project</button>
              </div>
              <div className="bg-[#141517] p-8 rounded-2xl border border-[#2a2d33]">
                <Shield className="w-12 h-12 mb-4" />
                <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
                <p className="text-[#9aa0a6]">HSM • Air-gapped • Audit logs</p>
              </div>
            </div>

            {selectedProject && (
              <div className="bg-[#141517] p-8 rounded-2xl border border-[#2a2d33]">
                <h3 className="text-2xl font-bold mb-4">Current Project: {selectedProject.id.slice(0, 8)}</h3>
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-[#9aa0a6]">NPCs</p>
                    <p className="text-3xl font-bold">{selectedProject.state.npcs}</p>
                  </div>
                  <div>
                    <p className="text-[#9aa0a6]">Biome</p>
                    <p className="text-2xl font-bold">{selectedProject.state.biome}</p>
                  </div>
                  <div>
                    <p className="text-[#9aa0a6]">Aggression</p>
                    <p className="text-2xl font-bold">{(selectedProject.state.aggression * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-[#9aa0a6]">Weather</p>
                    <p className="text-2xl font-bold">{selectedProject.state.weather}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "generate" && (
          <div className="max-w-4xl">
            <h2 className="text-4xl font-black mb-8">Generation Lab</h2>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your world..." className="w-full h-40 bg-[#1f2125] p-6 rounded-xl text-white placeholder-[#9aa0a6] mb-6" />
            <button onClick={generate} disabled={generating} className="px-12 py-5 bg-[#3e73ff] rounded-xl font-bold text-xl hover:opacity-90 disabled:opacity-50">{generating ? "Generating..." : "Generate"}</button>
            {generationStatus && <p className="mt-4 text-[#9aa0a6]">{generationStatus}</p>}
          </div>
        )}

        {activeTab === "override" && (
          <div className="max-w-5xl">
            <h2 className="text-4xl font-black mb-8">Live Server Override</h2>
            
            {/* Project Selector */}
            <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33] mb-8">
              <h3 className="text-xl font-bold mb-4">Select Target Project / Server</h3>
              <select 
                className="w-full px-6 py-4 bg-[#1f2125] rounded-xl text-lg text-white"
                value={selectedProject?.id || ""}
                onChange={(e) => setSelectedProject(projects.find(p => p.id === e.target.value))}
              >
                <option value="">– Choose Project –</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.id.slice(0,8)} – {new Date(p.created_at).toLocaleString()}
                  </option>
                ))}
              </select>
              {!selectedProject && <p className="text-yellow-400 mt-3">↑ Select a project to enable override</p>}
            </div>

            {/* Override Input */}
            {selectedProject && (
              <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33]">
                <h3 className="text-xl font-bold mb-4">
                  Injecting into: <span className="text-[#3e73ff]">{selectedProject.id.slice(0,8)}</span>
                </h3>
                <input
                  value={overrideCmd}
                  onChange={(e) => setOverrideCmd(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendOverride()}
                  placeholder="e.g. spawn 200 rioters, arctic biome, aggression +15, night cycle"
                  className="w-full px-6 py-5 bg-[#1f2125] rounded-xl text-lg mb-4 text-white placeholder-[#9aa0a6]"
                />
                <div className="flex gap-4 flex-wrap">
                  <button 
                    onClick={sendOverride}
                    disabled={!overrideCmd.trim()}
                    className="px-10 py-4 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-xl disabled:opacity-50 transition"
                  >
                    SEND LIVE OVERRIDE
                  </button>
                  <button 
                    onClick={() => setOverrideCmd("spawn 500 rioters at downtown")}
                    className="px-6 py-4 bg-[#1f2125] hover:bg-[#2a2d33] rounded-xl font-bold transition"
                  >
                    Quick Riot
                  </button>
                  <button 
                    onClick={() => setOverrideCmd("biome arctic, weather snowstorm")}
                    className="px-6 py-4 bg-[#1f2125] hover:bg-[#2a2d33] rounded-xl font-bold transition"
                  >
                    Arctic Shift
                  </button>
                </div>
                {lastOverride && (
                  <p className="mt-6 text-green-400 font-mono text-sm">
                    Last override sent {new Date(lastOverride.ts).toLocaleTimeString()}: "{lastOverride.cmd}"
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "export" && (
          <div>
            <h2 className="text-4xl font-black mb-10">Export Center</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {["Blender", "UE5", "Unity", "Godot", "Roblox", "visionOS", "WebGPU"].map(e => (
                <button key={e} onClick={() => alert(`${e} export started`)} className="py-12 bg-[#1f2125] hover:bg-[#3e73ff] transition rounded-2xl font-bold">
                  {e}<br /><span className="text-sm opacity-70">{["Roblox", "WebGPU"].includes(e) ? "4-8s" : "18-60s"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div>
            <h2 className="text-4xl font-black mb-8">Audit Log</h2>
            <button onClick={loadAudit} className="mb-6 px-6 py-3 bg-[#3e73ff] rounded-xl font-bold hover:opacity-90">Load Audit</button>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {auditLog.map((log, i) => (
                <div key={i} className="bg-[#1f2125] p-4 rounded-lg text-sm">
                  <p><strong>#{log.seq}</strong> - {log.type}</p>
                  <p className="text-[#9aa0a6]">{new Date(log.ts).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "verify" && (
          <div className="max-w-2xl">
            <h2 className="text-4xl font-black mb-8">Verify Account</h2>
            <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33]">
              <div className="flex gap-4 mb-6">
                <input placeholder="Username" className="flex-1 px-4 py-3 bg-[#1f2125] rounded-lg text-white placeholder-[#9aa0a6]" value={verifyUser} onChange={e => setVerifyUser(e.target.value)} />
                <button onClick={verifyAccount} className="px-8 py-3 bg-[#3e73ff] rounded-lg font-bold hover:opacity-90">Check</button>
              </div>
              {verifyResult && (
                <div className="space-y-4">
                  <p><strong>User:</strong> {verifyResult.username}</p>
                  <p><strong>Tier:</strong> <span className="text-[#3e73ff]">{verifyResult.tier.toUpperCase()}</span></p>
                  <p><strong>Status:</strong> {verifyResult.verified ? "✅ Verified" : "⏳ Pending"}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
