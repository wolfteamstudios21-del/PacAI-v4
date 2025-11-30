import { useState, useEffect } from "react";
import { 
  Zap, Shield, Download, LogOut, Menu, X, Crown, Search, UserCheck,
  Brain, Gamepad2, Package, Smartphone, Monitor, Sparkles, Send, BookOpen
} from "lucide-react";

const DEV_USER = "WolfTeamstudio2";
const DEV_PASS = "AdminTeam15";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [overrideCmd, setOverrideCmd] = useState("");
  const [verifyUser, setVerifyUser] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("pacai_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const login = async () => {
    if (!loginUser || !loginPass) return alert("Fill both fields");
    if (loginUser === DEV_USER && loginPass === DEV_PASS) {
      const dev = { name: loginUser, tier: "lifetime", isDev: true };
      localStorage.setItem("pacai_user", JSON.stringify(dev));
      setUser(dev);
      return;
    }
    const res = await fetch("/api/login", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({username: loginUser, password: loginPass}) });
    const data = await res.json();
    if (data.success) {
      const u = { name: loginUser, tier: data.tier || 'free' };
      localStorage.setItem("pacai_user", JSON.stringify(u));
      setUser(u);
    } else {
      alert(data.error || "Login failed");
    }
  };

  const generate = async () => {
    setGenerating(true);
    const res = await fetch("/v4/generate", { method: "POST", body: JSON.stringify({prompt}), headers: {"Content-Type":"application/json"} });
    const data = await res.json();
    setResult(data);
    setGenerating(false);
  };

  const sendOverride = async () => {
    await fetch("/v4/override", { method: "POST", body: JSON.stringify({cmd: overrideCmd}), headers: {"Content-Type":"application/json"} });
    alert("Override sent to server!");
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
          <h1 className="text-5xl font-black text-center mb-8 text-[#3e73ff]">PacAI v5</h1>
          <input placeholder="Username" className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-4 text-white placeholder-[#9aa0a6]" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-6 text-white placeholder-[#9aa0a6]" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
          <button onClick={login} className="w-full py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90">Login / Register</button>
          <p className="text-center text-xs text-[#9aa0a6] mt-6">Dev: WolfTeamstudio2 / AdminTeam15 • New users = Free tier</p>
        </div>
      </div>
    );
  }

  const menu = [
    {id:"home",icon:Brain,label:"Home"},
    {id:"generate",icon:Sparkles,label:"Generation Lab"},
    {id:"story",icon:BookOpen,label:"Story Lab"},
    {id:"override",icon:Send,label:"Server Override"},
    {id:"export",icon:Package,label:"Export Center"},
    {id:"downloads",icon:Download,label:"Download App"},
    {id:"verify",icon:UserCheck,label:"Verify Account"},
  ];

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white flex">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen?"w-64":"w-20"} bg-[#141517] border-r border-[#2a2d33] transition-all`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className={`font-black text-2xl ${sidebarOpen?"block":"hidden"}`}>PacAI v5</h1>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)}>{sidebarOpen?<X size={24}/>:<Menu size={24}/>}</button>
        </div>
        <nav className="mt-8">
          {menu.map(i=>(
            <button key={i.id} onClick={()=>setActiveTab(i.id)} className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-[#1f2125] transition ${activeTab===i.id?"bg-[#3e73ff]":""}`}>
              <i.icon size={24}/>{sidebarOpen && <span>{i.label}</span>}
            </button>
          ))}
          <button onClick={logout} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#1f2125] transition mt-8">
            <LogOut size={24}/>{sidebarOpen && <span>Logout</span>}
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-10 overflow-y-auto">
        {activeTab === "home" && (
          <div>
            <h2 className="text-5xl font-black mb-8">Welcome, {user.name}!</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-purple-900 to-blue-900 p-8 rounded-2xl">
                <Crown className="w-16 h-16 mb-4"/>
                <p className="text-5xl font-black">{user.tier.toUpperCase()}</p>
                {user.tier==="free" && <p className="mt-4 text-xl">2 demos per week</p>}
                {user.tier==="creator" && <p className="mt-4 text-xl">100 per week</p>}
                {user.tier==="lifetime" && <p className="mt-4 text-xl">Unlimited forever</p>}
                {user.isDev && <p className="text-red-400 mt-4 font-bold">DEV TEAM – FULL ACCESS</p>}
              </div>
              <div className="bg-[#141517] p-8 rounded-2xl border border-[#2a2d33]">
                <h3 className="text-2xl font-bold mb-4">Quick Start</h3>
                <button onClick={()=>setActiveTab("generate")} className="w-full py-4 bg-[#3e73ff] rounded-xl font-bold mb-3 hover:opacity-90">Open Generation Lab</button>
                <button onClick={()=>setActiveTab("export")} className="w-full py-4 bg-[#1f2125] rounded-xl font-bold hover:bg-[#2a2d33]">Export Center</button>
              </div>
              <div className="bg-[#141517] p-8 rounded-2xl border border-[#2a2d33]">
                <Shield className="w-12 h-12 mb-4"/>
                <h3 className="text-2xl font-bold mb-2">Enterprise Ready</h3>
                <p className="text-[#9aa0a6]">HSM licensing • Air-gapped • Audit logs</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "generate" && (
          <div className="max-w-4xl">
            <h2 className="text-4xl font-black mb-8">Generation Lab</h2>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="e.g. 8km cyberpunk city, rainy night, 20,000 NPCs, Blade Runner vibe" className="w-full h-40 bg-[#1f2125] p-6 rounded-xl text-lg text-white placeholder-[#9aa0a6]"/>
            <button onClick={generate} disabled={generating} className="mt-6 px-12 py-5 bg-[#3e73ff] rounded-xl font-bold text-xl flex items-center gap-3 hover:opacity-90 disabled:opacity-50">
              <Zap/> {generating ? "Generating… (8.4 sec)":"Generate World (<9 sec)"}
            </button>
            {result && <pre className="mt-8 bg-[#0b0d0f] p-6 rounded-xl border border-[#3e73ff] overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>}
          </div>
        )}

        {activeTab === "story" && (
          <div className="max-w-4xl">
            <h2 className="text-4xl font-black mb-8">Story Lab</h2>
            <div className="bg-[#141517] p-8 rounded-2xl border border-[#2a2d33]">
              <p className="text-xl text-[#9aa0a6]">Persistent memory, radiant quests, faction logs – v5 live</p>
            </div>
          </div>
        )}

        {activeTab === "override" && (
          <div className="max-w-4xl">
            <h2 className="text-4xl font-black mb-8">Server NPC & Environment Override</h2>
            <input value={overrideCmd} onChange={e=>setOverrideCmd(e.target.value)} placeholder="e.g. spawn 500 rioters at coords 120,45" className="w-full px-6 py-4 bg-[#1f2125] rounded-xl text-white placeholder-[#9aa0a6]"/>
            <button onClick={sendOverride} className="mt-4 px-10 py-4 bg-red-600 rounded-xl font-bold hover:opacity-90">SEND TO SERVER</button>
          </div>
        )}

        {activeTab === "export" && (
          <div>
            <h2 className="text-4xl font-black mb-10">Export Center – One Click</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {["Blender","UE5","Unity","Godot","Roblox","visionOS","WebGPU"].map(e=>(
                <button key={e} onClick={()=>alert(`${e} export started – check Downloads`)} className="py-12 bg-[#1f2125] hover:bg-[#3e73ff] transition rounded-2xl font-bold text-xl shadow-xl">
                  {e}<br/><span className="text-sm opacity-70">{e==="Roblox"?"8 sec":e==="WebGPU"?"4 sec":"18–60 sec"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "downloads" && (
          <div className="max-w-4xl">
            <h2 className="text-4xl font-black mb-10">Download PacAI App</h2>
            <div className="grid md:grid-cols-2 gap-10">
              <div className="bg-[#141517] p-10 rounded-2xl border border-[#2a2d33] text-center">
                <Monitor className="w-20 h-20 mx-auto mb-6"/>
                <h3 className="text-3xl font-bold mb-4">Desktop (Windows / macOS / Linux)</h3>
                <p className="mb-6 text-[#9aa0a6]">Full offline • HSM • Tauri build</p>
                <a href="#" className="block py-4 bg-[#3e73ff] rounded-xl font-bold hover:opacity-90">Download Desktop App</a>
              </div>
              <div className="bg-[#141517] p-10 rounded-2xl border border-[#2a2d33] text-center">
                <Smartphone className="w-20 h-20 mx-auto mb-6"/>
                <h3 className="text-3xl font-bold mb-4">Mobile (iOS & Android)</h3>
                <p className="mb-6 text-[#9aa0a6]">Capacitor build • Touch controls</p>
                <a href="#" className="block py-4 bg-[#3e73ff] rounded-xl font-bold hover:opacity-90">Download Mobile App</a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "verify" && (
          <div className="max-w-2xl">
            <h2 className="text-4xl font-black mb-8">Account Verification</h2>
            <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33]">
              <div className="flex gap-4 mb-6">
                <input placeholder="Enter username to verify" className="flex-1 px-4 py-3 bg-[#1f2125] rounded-lg text-white placeholder-[#9aa0a6]" value={verifyUser} onChange={e => setVerifyUser(e.target.value)} />
                <button onClick={verifyAccount} className="px-8 py-3 bg-[#3e73ff] rounded-lg font-bold flex items-center gap-2 hover:opacity-90"><Search size={20} /> Check</button>
              </div>
              {verifyResult && (
                <div className="text-lg space-y-4">
                  <div className="bg-[#1f2125] p-4 rounded-lg">
                    <p className="text-[#9aa0a6]">Username</p>
                    <p><strong>{verifyResult.username}</strong></p>
                  </div>
                  <div className="bg-[#1f2125] p-4 rounded-lg">
                    <p className="text-[#9aa0a6]">Tier</p>
                    <p><span className="text-[#3e73ff] font-bold text-xl">{verifyResult.tier.toUpperCase()}</span></p>
                  </div>
                  <div className="bg-[#1f2125] p-4 rounded-lg">
                    <p className="text-[#9aa0a6]">Status</p>
                    <p>{verifyResult.verified ? "✅ Verified" : "⏳ Pending"}</p>
                  </div>
                  {user.isDev && (
                    <div className="mt-6 bg-blue-900 p-4 rounded-lg">
                      <p className="text-yellow-400 font-bold mb-4">DEV TOOLS: Upgrade user</p>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => { fetch(`/api/upgrade?username=${verifyResult.username}&tier=creator`, {method:"POST"}); alert("Upgraded to Creator"); }} className="px-6 py-3 bg-blue-600 rounded-lg hover:opacity-90">→ Creator</button>
                        <button onClick={() => { fetch(`/api/upgrade?username=${verifyResult.username}&tier=lifetime`, {method:"POST"}); alert("Upgraded to Lifetime"); }} className="px-6 py-3 bg-green-600 rounded-lg hover:opacity-90">→ Lifetime</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
