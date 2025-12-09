import { useState, useEffect } from "react";
import {
  Zap, Shield, Download, LogOut, Menu, X, Crown, Search, UserCheck,
  Brain, Sparkles, Send, Package, Smartphone, Monitor, BookOpen, BarChart3, Image, Radio
} from "lucide-react";
import RefUploader from "./components/RefUploader";
import { SessionManager } from "./components/LiveOverrides";
import GalleryPage from "./pages/gallery";

// API base URL configuration - use relative URLs in production (Vercel rewrites handle proxy)
// Use VITE_API_URL only for development pointing to external backends
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export default function App() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log("PacAI v5 - Development mode");
    console.log("API URL:", API_BASE_URL);
  }
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
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [selectedEngines, setSelectedEngines] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  
  // PWA install prompt state
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Load user
  useEffect(() => {
    const saved = localStorage.getItem("pacai_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);
  
  // PWA install prompt handler
  useEffect(() => {
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          ('standalone' in window.navigator && (window.navigator as any).standalone)) {
        setIsInstalled(true);
      }
    };
    checkInstalled();
    
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Load projects when user logs in
  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const login = async () => {
    if (!loginUser || !loginPass) return alert("Username and password required");
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
        credentials: "include"
      });
      if (!res.ok) throw new Error(`Login failed: HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        // Store auth token for subsequent requests
        const u = { name: loginUser, tier: data.tier || "free", token: data.token || "" };
        localStorage.setItem("pacai_user", JSON.stringify(u));
        setUser(u);
      } else {
        alert(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error", error);
      alert(`Login failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/v5/projects`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const projectsList = data.projects || [];
      setProjects(projectsList);
      if (projectsList.length && !selectedProject) setSelectedProject(projectsList[0]);
    } catch (error) {
      console.error("Failed to load projects", error);
    }
  };

  const createNewProject = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/v5/projects`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Add authorization if user has auth token
          ...(user?.token && { "Authorization": `Bearer ${user.token}` })
        },
        body: JSON.stringify({ name: "New Project", seed: Date.now() }),
        credentials: "include" // Send cookies with request
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const p = await res.json();
      if (p.id) {
        setProjects(prev => [p, ...(prev || [])]);
        setSelectedProject(p);
      } else {
        throw new Error("Invalid project response: missing ID");
      }
    } catch (error) {
      console.error("Failed to create project", error);
      alert(`Failed to create project: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const generate = async () => {
    if (!selectedProject) return;
    setGenerating(true);
    setGenerationStatus("Starting generation...");
    
    const res = await fetch(`${API_BASE_URL}/v5/projects/${selectedProject.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt, 
        username: user?.name,
        refIds: selectedRefs 
      })
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
              setGenerationResult(data.generation);
              loadProjects();
              setGenerationStatus("Generation complete!");
            } else if (data.error) {
              setGenerationStatus(`Error: ${data.message}`);
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
    if (!selectedProject?.id || !overrideCmd.trim()) return;
    try {
      const res = await fetch(`/v5/projects/${selectedProject.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: overrideCmd, user: user?.name || 'anonymous' })
      });
      const updated = await res.json();
      setLastOverride({ cmd: overrideCmd, ts: Date.now() });
      // Update selectedProject - response may be { project: {...} } or direct project object
      const projectData = updated.project || updated;
      if (projectData && projectData.id) {
        setSelectedProject(projectData);
      }
      setOverrideCmd("");
      loadProjects();
    } catch (e) {
      console.error("Override error:", e);
      alert("Override failed - check console for details");
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
    { id: "gallery", icon: Image, label: "3dRender Gallery" },
    { id: "override", icon: Send, label: "Override" },
    { id: "live", icon: Radio, label: "Live Overrides" },
    { id: "export", icon: Package, label: "Export" },
    { id: "download", icon: Download, label: "Download App" },
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
                <p className="text-5xl font-black">{String(user?.tier || "free").toUpperCase()}</p>
                {(user.tier === "free" || !user.tier) && <p className="mt-4">2 per week</p>}
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
          <div className="max-w-6xl">
            <h2 className="text-4xl font-black mb-8">Generation Lab</h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)} 
                  placeholder="Describe your world... e.g. 'arctic research base under siege' or 'urban patrol mission in hostile territory'" 
                  className="w-full h-40 bg-[#1f2125] p-6 rounded-xl text-white placeholder-[#9aa0a6] mb-4"
                  data-testid="input-generation-prompt"
                />
                <div className="flex gap-4 flex-wrap mb-4">
                  <button onClick={() => setPrompt("Arctic research facility during a blizzard")} className="px-4 py-2 bg-[#1f2125] hover:bg-[#2a2d33] rounded-lg text-sm">Arctic Base</button>
                  <button onClick={() => setPrompt("Urban patrol in downtown metropolitan area")} className="px-4 py-2 bg-[#1f2125] hover:bg-[#2a2d33] rounded-lg text-sm">Urban Patrol</button>
                  <button onClick={() => setPrompt("Desert extraction operation at night")} className="px-4 py-2 bg-[#1f2125] hover:bg-[#2a2d33] rounded-lg text-sm">Desert Ops</button>
                  <button onClick={() => setPrompt("Jungle recon mission with hostile presence")} className="px-4 py-2 bg-[#1f2125] hover:bg-[#2a2d33] rounded-lg text-sm">Jungle Recon</button>
                </div>
                <button 
                  onClick={generate} 
                  disabled={generating || !selectedProject} 
                  className="px-12 py-5 bg-[#3e73ff] rounded-xl font-bold text-xl hover:opacity-90 disabled:opacity-50"
                  data-testid="button-generate"
                >
                  {generating ? "Generating..." : "Generate World"}
                </button>
                {!selectedProject && <p className="mt-2 text-yellow-400 text-sm">Create a project first</p>}
                {generationStatus && <p className="mt-4 text-[#9aa0a6]">{generationStatus}</p>}
              </div>
              
              <div className="space-y-6">
                <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                  <h3 className="text-xl font-bold mb-4">Generation Options</h3>
                  <div className="space-y-4 text-sm">
                    <p className="text-[#9aa0a6]">Seed: <span className="text-white font-mono">{generationResult?.seed || "Auto-generated"}</span></p>
                    <p className="text-[#9aa0a6]">Deterministic: <span className="text-green-400">Yes</span></p>
                    <p className="text-[#9aa0a6]">AI Enhanced: <span className="text-green-400">OpenAI</span></p>
                    {generationResult?.refs_used > 0 && (
                      <p className="text-[#9aa0a6]">Style Refs: <span className="text-blue-400">{generationResult.refs_used} applied</span></p>
                    )}
                  </div>
                </div>
                
                {user?.name && (
                  <RefUploader
                    username={user.name}
                    selectedRefs={selectedRefs}
                    onRefsChange={setSelectedRefs}
                    maxRefs={
                      user.tier === "lifetime" ? 10 : 
                      (user.tier === "creator" || user.tier === "pro") ? 5 : 1
                    }
                  />
                )}
              </div>
            </div>

            {generationResult && (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    World
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-[#9aa0a6]">Dimensions:</span> {generationResult.world?.dimensions}</p>
                    <p><span className="text-[#9aa0a6]">Tiles:</span> {generationResult.world?.tile_count?.toLocaleString()}</p>
                    <p><span className="text-[#9aa0a6]">POIs:</span> {generationResult.world?.poi_count}</p>
                    <p><span className="text-[#9aa0a6]">Roads:</span> {generationResult.world?.road_count}</p>
                    <p><span className="text-[#9aa0a6]">Spawns:</span> {generationResult.world?.spawn_count}</p>
                    <p><span className="text-[#9aa0a6]">Weather:</span> {generationResult.world?.weather}</p>
                    <p><span className="text-[#9aa0a6]">Biomes:</span> {generationResult.world?.biomes?.join(", ")}</p>
                  </div>
                </div>

                <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    Entities
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-[#9aa0a6]">Total:</span> {generationResult.entities?.total}</p>
                    <p><span className="text-[#9aa0a6]">Alive:</span> {generationResult.entities?.alive}</p>
                    <p><span className="text-[#9aa0a6]">Combat Ready:</span> {generationResult.entities?.combat_ready}</p>
                    {generationResult.entities?.by_faction && (
                      <div className="mt-2">
                        <p className="text-[#9aa0a6] mb-1">By Faction:</p>
                        {Object.entries(generationResult.entities.by_faction).map(([k, v]) => (
                          <p key={k} className="pl-2">{k}: {String(v)}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                    Narrative
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-[#9aa0a6]">Factions:</span> {generationResult.narrative?.faction_count}</p>
                    <p><span className="text-[#9aa0a6]">Missions:</span> {generationResult.narrative?.mission_count}</p>
                    <p><span className="text-[#9aa0a6]">Active:</span> {generationResult.narrative?.active_missions}</p>
                    <p><span className="text-[#9aa0a6]">Timeline Events:</span> {generationResult.narrative?.timeline_events}</p>
                    <p><span className="text-[#9aa0a6]">Global Tension:</span> <span className="text-red-400">{generationResult.narrative?.global_tension}</span></p>
                    {generationResult.narrative?.conflicts?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[#9aa0a6] mb-1">Active Conflicts:</p>
                        {generationResult.narrative.conflicts.map((c: string, i: number) => (
                          <p key={i} className="pl-2 text-orange-400">{c}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {generationResult && (
              <div className="mt-6 bg-[#141517] p-4 rounded-xl border border-[#2a2d33]">
                <p className="text-sm text-[#9aa0a6]">
                  <span className="text-white">Checksum:</span> {generationResult.checksum?.slice(0, 32)}...
                  <span className="ml-4 text-white">Generated in:</span> {generationResult.generation_time_ms}ms
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "gallery" && (
          <GalleryPage />
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
            {selectedProject?.id && (
              <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33] mb-6">
                <h3 className="text-xl font-bold mb-4">
                  Injecting into: <span className="text-[#3e73ff]">{String(selectedProject.id).slice(0,8)}</span>
                </h3>
                <input
                  value={overrideCmd}
                  onChange={(e) => setOverrideCmd(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendOverride()}
                  placeholder="e.g. spawn 20 hostile, weather storm, aggression +0.3"
                  className="w-full px-6 py-5 bg-[#1f2125] rounded-xl text-lg mb-4 text-white placeholder-[#9aa0a6]"
                  data-testid="input-override-command"
                />
                <div className="flex gap-3 flex-wrap mb-4">
                  <button 
                    onClick={sendOverride}
                    disabled={!overrideCmd.trim()}
                    className="px-10 py-4 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-xl disabled:opacity-50 transition"
                    data-testid="button-send-override"
                  >
                    SEND OVERRIDE
                  </button>
                  <button 
                    onClick={() => setOverrideCmd("riot")}
                    className="px-5 py-3 bg-orange-600 hover:bg-orange-700 rounded-xl font-bold transition"
                  >
                    Riot
                  </button>
                  <button 
                    onClick={() => setOverrideCmd("arctic")}
                    className="px-5 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-xl font-bold transition"
                  >
                    Arctic
                  </button>
                  <button 
                    onClick={() => setOverrideCmd("desert")}
                    className="px-5 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-xl font-bold transition"
                  >
                    Desert
                  </button>
                  <button 
                    onClick={() => setOverrideCmd("spawn 10 infantry at 32,32 faction alpha")}
                    className="px-5 py-3 bg-[#1f2125] hover:bg-[#2a2d33] rounded-xl font-bold transition"
                  >
                    Spawn Alpha
                  </button>
                  <button 
                    onClick={() => setOverrideCmd("weather storm intensity 80")}
                    className="px-5 py-3 bg-[#1f2125] hover:bg-[#2a2d33] rounded-xl font-bold transition"
                  >
                    Storm
                  </button>
                  <button 
                    onClick={() => setOverrideCmd("aggression +0.5")}
                    className="px-5 py-3 bg-[#1f2125] hover:bg-[#2a2d33] rounded-xl font-bold transition"
                  >
                    +Aggression
                  </button>
                </div>
                {lastOverride && (
                  <p className="mt-4 text-green-400 font-mono text-sm">
                    Override sent {new Date(lastOverride.ts).toLocaleTimeString()}: "{lastOverride.cmd}"
                  </p>
                )}
              </div>
            )}

            {/* Override Help */}
            {selectedProject?.id && (
              <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33]">
                <h4 className="text-lg font-bold mb-4 text-[#9aa0a6]">Available Commands</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm font-mono">
                  <div>
                    <p className="text-[#9aa0a6] mb-1">Entity:</p>
                    <p>spawn [n] infantry/scout/heavy/hostile</p>
                    <p>spawn 20 hostile at 10,20 faction bravo</p>
                    <p>remove entity_xxx</p>
                    <p>damage entity_xxx 50</p>
                    <p>heal entity_xxx 25</p>
                  </div>
                  <div>
                    <p className="text-[#9aa0a6] mb-1">World:</p>
                    <p>weather clear/rain/storm/snow/fog</p>
                    <p>set time 14.5</p>
                    <p>aggression +0.3</p>
                    <p>arctic / desert / riot</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "live" && (
          <div className="max-w-6xl">
            <h2 className="text-4xl font-black mb-8 text-purple-400">Live Override Sessions</h2>
            <p className="text-[#9aa0a6] mb-8">
              Connect exported game servers to PacAI in real-time. Push overrides from this dashboard
              and they'll sync instantly to all connected game instances without requiring a restart.
            </p>
            {user?.name && (
              <SessionManager username={user.name} />
            )}
          </div>
        )}

        {activeTab === "export" && (
          <div className="max-w-6xl">
            <h2 className="text-4xl font-black mb-8 text-green-500">Export Center v2.0 - 9 ENGINES</h2>
            
            {!selectedProject ? (
              <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33] text-center">
                <p className="text-xl text-[#9aa0a6] mb-4">No project selected</p>
                <p className="text-sm text-[#9aa0a6]">Create and generate a project first to enable exports</p>
              </div>
            ) : !generationResult ? (
              <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33] text-center">
                <p className="text-xl text-[#9aa0a6] mb-4">World not generated yet</p>
                <p className="text-sm text-[#9aa0a6]">Go to Generation Lab and generate a world first</p>
              </div>
            ) : (
              <>
                <div className="bg-[#141517] rounded-2xl p-6 border border-[#2a2d33] mb-8">
                  <h3 className="text-xl font-bold mb-4">Select Target Engines</h3>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                    {[
                      { id: 'ue5', name: 'Unreal Engine 5', time: '45s', size: '50MB' },
                      { id: 'unity', name: 'Unity 2023.2', time: '35s', size: '40MB' },
                      { id: 'godot', name: 'Godot 4.2', time: '12s', size: '15MB' },
                      { id: 'roblox', name: 'Roblox Studio', time: '6s', size: '8MB' },
                      { id: 'blender', name: 'Blender 4.0', time: '60s', size: '100MB' },
                      { id: 'cryengine', name: 'CryEngine 5.7', time: '50s', size: '75MB' },
                      { id: 'source2', name: 'Source 2', time: '40s', size: '60MB' },
                      { id: 'webgpu', name: 'WebGPU', time: '4s', size: '5MB' },
                      { id: 'visionos', name: 'visionOS', time: '25s', size: '30MB' },
                    ].map(engine => (
                      <button
                        key={engine.id}
                        onClick={() => {
                          if (selectedEngines.includes(engine.id)) {
                            setSelectedEngines(selectedEngines.filter(e => e !== engine.id));
                          } else {
                            setSelectedEngines([...selectedEngines, engine.id]);
                          }
                        }}
                        className={`p-4 rounded-xl border-2 transition text-left ${
                          selectedEngines.includes(engine.id)
                            ? 'border-[#3e73ff] bg-[#3e73ff]/20'
                            : 'border-[#2a2d33] bg-[#1f2125] hover:border-[#3e73ff]/50'
                        }`}
                        data-testid={`button-engine-${engine.id}`}
                      >
                        <p className="font-bold text-sm">{engine.name}</p>
                        <p className="text-xs text-[#9aa0a6] mt-1">{engine.time} / {engine.size}</p>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex gap-4 items-center">
                    <button
                      onClick={async () => {
                        if (selectedEngines.length === 0) return;
                        setExporting(true);
                        setExportResult(null);
                        try {
                          const res = await fetch('/v5/export', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              project_id: selectedProject.id,
                              engines: selectedEngines
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setExportResult(data);
                          } else {
                            alert(data.error || 'Export failed');
                          }
                        } catch (e) {
                          alert('Export failed');
                        }
                        setExporting(false);
                      }}
                      disabled={selectedEngines.length === 0 || exporting}
                      className="px-8 py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-50"
                      data-testid="button-start-export"
                    >
                      {exporting ? 'Exporting...' : `Export ${selectedEngines.length} Engine${selectedEngines.length !== 1 ? 's' : ''}`}
                    </button>
                    <button
                      onClick={() => setSelectedEngines(['ue5', 'unity', 'godot', 'roblox', 'blender', 'cryengine', 'source2', 'webgpu', 'visionos'])}
                      className="px-6 py-4 bg-[#1f2125] hover:bg-[#2a2d33] rounded-xl font-bold transition"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedEngines([])}
                      className="px-6 py-4 bg-[#1f2125] hover:bg-[#2a2d33] rounded-xl font-bold transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {exportResult && (
                  <div className="bg-[#141517] rounded-2xl p-6 border border-green-500/50">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      Export Complete
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <p className="text-[#9aa0a6] text-sm mb-1">Export ID</p>
                        <p className="font-mono text-sm">{exportResult.id}</p>
                      </div>
                      <div>
                        <p className="text-[#9aa0a6] text-sm mb-1">Total Size</p>
                        <p className="font-bold">{(exportResult.total_size_bytes / 1048576).toFixed(1)} MB</p>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <p className="text-[#9aa0a6] text-sm mb-2">Exported Engines</p>
                      <div className="flex gap-2 flex-wrap">
                        {exportResult.engines?.map((eng: any) => (
                          <span key={eng.engine} className="px-3 py-1 bg-[#3e73ff]/20 text-[#3e73ff] rounded-lg text-sm font-bold">
                            {eng.display_name} ({eng.files?.length} files)
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-[#9aa0a6] text-sm mb-2">Manifest</p>
                      <div className="bg-[#1f2125] p-4 rounded-lg text-xs font-mono overflow-x-auto">
                        <p>PacAI: {exportResult.manifest?.pacai}</p>
                        <p>Seed: {exportResult.manifest?.seed}</p>
                        <p>Generated: {exportResult.manifest?.generated}</p>
                        <p>Signature: {exportResult.manifest?.signature_algorithm}</p>
                      </div>
                    </div>
                    
                    <p className="text-[#9aa0a6] text-xs">
                      Expires: {new Date(exportResult.expires_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "download" && (
          <div className="max-w-4xl">
            <h2 className="text-4xl font-black mb-8">Download PacAI App</h2>
            <p className="text-[#9aa0a6] mb-8 text-lg">Install PacAI on your device for offline access and native performance.</p>
            
            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <div className="bg-[#141517] p-8 rounded-2xl border border-[#2a2d33]">
                <div className="flex items-center gap-4 mb-6">
                  <Smartphone className="w-12 h-12 text-[#3e73ff]" />
                  <div>
                    <h3 className="text-2xl font-bold">Mobile / Web App</h3>
                    <p className="text-[#9aa0a6]">iOS, Android, Browser</p>
                  </div>
                </div>
                <p className="text-[#9aa0a6] mb-6">
                  Install as a Progressive Web App (PWA) for offline access. Works on any device with a modern browser.
                </p>
                <div className="space-y-4">
                  {isInstalled ? (
                    <div className="w-full py-4 bg-green-600 rounded-xl font-bold text-lg text-center">
                      Installed
                    </div>
                  ) : (
                    <button 
                      onClick={async () => {
                        if (installPrompt) {
                          installPrompt.prompt();
                          const result = await installPrompt.userChoice;
                          if (result.outcome === 'accepted') {
                            setIsInstalled(true);
                          }
                          setInstallPrompt(null);
                        } else {
                          alert('To install: Use your browser menu (⋮ or Share) and select "Add to Home Screen" or "Install App"');
                        }
                      }}
                      className="w-full py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90"
                      data-testid="button-install-pwa"
                    >
                      {installPrompt ? 'Install Now' : 'Install Web App'}
                    </button>
                  )}
                  <p className="text-xs text-[#9aa0a6] text-center">
                    {isInstalled ? 'PacAI is installed on this device' : (installPrompt ? 'Click to install PacAI' : 'Use browser menu to "Add to Home Screen"')}
                  </p>
                </div>
                <div className="mt-6 p-4 bg-[#1f2125] rounded-lg">
                  <p className="text-sm font-bold mb-2">Features:</p>
                  <ul className="text-sm text-[#9aa0a6] space-y-1">
                    <li>Offline generation cache</li>
                    <li>Push notifications</li>
                    <li>Native app feel</li>
                    <li>Works on all platforms</li>
                  </ul>
                </div>
              </div>

              <div className="bg-[#141517] p-8 rounded-2xl border border-[#2a2d33]">
                <div className="flex items-center gap-4 mb-6">
                  <Monitor className="w-12 h-12 text-green-500" />
                  <div>
                    <h3 className="text-2xl font-bold">Desktop App</h3>
                    <p className="text-[#9aa0a6]">Windows, macOS, Linux</p>
                  </div>
                </div>
                <p className="text-[#9aa0a6] mb-6">
                  Native desktop application for air-gapped environments with hardware security module support.
                </p>
                <div className="space-y-3">
                  <a 
                    href="/downloads/PacAI-v5-Admin-5.0.0-x86_64.AppImage"
                    className="block w-full py-4 bg-green-600 hover:bg-green-700 rounded-xl font-bold text-lg text-center transition"
                    data-testid="link-download-linux"
                  >
                    Download for Linux (AppImage)
                  </a>
                  <button 
                    disabled
                    className="w-full py-4 bg-[#2a2d33] rounded-xl font-bold text-lg text-[#9aa0a6] cursor-not-allowed"
                    data-testid="button-download-windows"
                  >
                    Windows (Coming Soon)
                  </button>
                  <button 
                    disabled
                    className="w-full py-4 bg-[#2a2d33] rounded-xl font-bold text-lg text-[#9aa0a6] cursor-not-allowed"
                    data-testid="button-download-macos"
                  >
                    macOS (Coming Soon)
                  </button>
                </div>
                <div className="mt-6 p-4 bg-[#1f2125] rounded-lg">
                  <p className="text-sm font-bold mb-2">Enterprise Features:</p>
                  <ul className="text-sm text-[#9aa0a6] space-y-1">
                    <li>YubiHSM2 / Nitrokey3 support</li>
                    <li>USB license renewal</li>
                    <li>Full offline operation</li>
                    <li>SCIF/air-gap compatible</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 p-8 rounded-2xl border border-[#3e73ff]/30">
              <div className="flex items-start gap-6">
                <Shield className="w-16 h-16 text-[#3e73ff] flex-shrink-0" />
                <div>
                  <h3 className="text-2xl font-bold mb-2">Enterprise Deployment</h3>
                  <p className="text-[#9aa0a6] mb-4">
                    Need custom deployment for your organization? We offer on-premise installations, 
                    custom HSM configurations, and air-gapped network deployments.
                  </p>
                  <div className="flex gap-4 flex-wrap">
                    <a href="mailto:enterprise@pacai.dev" className="px-6 py-3 bg-[#3e73ff] rounded-lg font-bold hover:opacity-90">
                      Contact Sales
                    </a>
                    <a href="/docs/deployment" className="px-6 py-3 bg-[#1f2125] rounded-lg font-bold hover:bg-[#2a2d33]">
                      Deployment Guide
                    </a>
                  </div>
                </div>
              </div>
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
                  <p><strong>Tier:</strong> <span className="text-[#3e73ff]">{String(verifyResult?.tier || "free").toUpperCase()}</span></p>
                  <p><strong>Status:</strong> {verifyResult.verified ? "Verified" : "Pending"}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
