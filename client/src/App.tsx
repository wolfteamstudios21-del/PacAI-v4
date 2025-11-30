import { useState, useEffect } from "react";
import { Zap, Shield, Download, LogOut, Menu, X, Crown, Search, UserCheck } from "lucide-react";

const DEV_USER = "WolfTeamstudio2";
const DEV_PASS = "AdminTeam15";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [verifyUser, setVerifyUser] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("pacai_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const login = async () => {
    if (!loginUser || !loginPass) return alert("Fill both fields");

    if (loginUser === DEV_USER && loginPass === DEV_PASS) {
      const dev = { name: loginUser, tier: "lifetime", isDev: true, verified: true };
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
      const u = { name: loginUser, tier: data.tier || "free", verified: data.verified || false };
      localStorage.setItem("pacai_user", JSON.stringify(u));
      setUser(u);
    } else {
      alert(data.error || "Login failed");
    }
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

  const upgradeUser = async (username: string, tier: string) => {
    const res = await fetch(`/api/upgrade?username=${username}&tier=${tier}`, {
      method: "POST"
    });
    const data = await res.json();
    if (data.success) {
      alert(`User upgraded to ${tier}`);
      verifyAccount();
    } else {
      alert(data.error || "Upgrade failed");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b0d0f] flex items-center justify-center p-8">
        <div className="bg-[#141517] rounded-2xl p-10 w-full max-w-md border border-[#2a2d33]">
          <h1 className="text-5xl font-black text-center mb-8 text-[#3e73ff]">PacAI v5</h1>
          <input placeholder="Username" className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-4 text-white placeholder-[#9aa0a6]" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-6 text-white placeholder-[#9aa0a6]" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
          <button onClick={login} className="w-full py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90">Login / Register</button>
          <p className="text-center text-xs text-[#9aa0a6] mt-6">New users start on Free tier • Contact wolfteamstudios21@gmail.com after payment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-64" : "w-20"} bg-[#141517] border-r border-[#2a2d33] transition-all`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className={`font-black text-2xl ${sidebarOpen ? "block" : "hidden"}`}>PacAI v5</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={24} /></button>
        </div>
        <nav className="mt-8">
          {[
            { id: "home", label: "Home", icon: Zap },
            { id: "generate", label: "Generate", icon: Zap },
            { id: "verify", label: "Verify Account", icon: UserCheck },
            { id: "export", label: "Export", icon: Download }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-[#1f2125] transition ${activeTab === tab.id ? "bg-[#3e73ff]" : ""}`}>
                <Icon size={24} />
                {sidebarOpen && <span>{tab.label}</span>}
              </button>
            );
          })}
          <button onClick={logout} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#1f2125] transition mt-8">
            <LogOut size={24} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 p-10 overflow-auto">
        {activeTab === "home" && (
          <div>
            <h2 className="text-4xl font-black mb-6">Welcome, {user.name}!</h2>
            <div className="bg-gradient-to-r from-purple-900 to-blue-900 p-8 rounded-2xl max-w-2xl">
              <h3 className="text-3xl font-bold flex items-center gap-3 mb-4">
                <Crown /> Your Tier: <span className="text-5xl ml-2">{user.tier.toUpperCase()}</span>
              </h3>
              {user.tier === "free" && <p className="mt-4 text-xl">2 demos per week • Upgrade for unlimited</p>}
              {user.tier === "creator" && <p className="mt-4 text-xl">100 generations per week</p>}
              {user.tier === "lifetime" && <p className="mt-4 text-xl">Unlimited everything forever</p>}
              {user.isDev && <p className="text-red-400 text-2xl mt-4 font-bold">DEV TEAM – FULL ACCESS</p>}
              {!user.verified && user.tier !== "lifetime" && !user.isDev && (
                <p className="text-yellow-400 mt-4">Account pending verification after payment</p>
              )}
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
                    <p>Tier: <span className="text-[#3e73ff] font-bold text-xl">{verifyResult.tier.toUpperCase()}</span></p>
                  </div>
                  <div className="bg-[#1f2125] p-4 rounded-lg">
                    <p className="text-[#9aa0a6]">Verification Status</p>
                    <p>{verifyResult.verified ? "✅ Verified" : "⏳ Pending (payment)"}</p>
                  </div>
                  {user.isDev && (
                    <div className="mt-6 bg-blue-900 p-4 rounded-lg">
                      <p className="text-yellow-400 font-bold mb-4">DEV TOOLS: Upgrade this user</p>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => upgradeUser(verifyResult.username, "creator")} className="px-6 py-3 bg-blue-600 rounded-lg hover:opacity-90">→ Creator</button>
                        <button onClick={() => upgradeUser(verifyResult.username, "lifetime")} className="px-6 py-3 bg-green-600 rounded-lg hover:opacity-90">→ Lifetime</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "generate" && (
          <div className="max-w-2xl">
            <h2 className="text-4xl font-black mb-8">Generation Lab</h2>
            <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33]">
              <div className="text-2xl mb-6">
                {user.tier === "free" ? "📊 2 generations per week" : user.tier === "creator" ? "📊 100 generations per week" : "🚀 Unlimited generations"}
              </div>
              <p className="text-[#9aa0a6]">Generation lab coming soon</p>
            </div>
          </div>
        )}

        {activeTab === "export" && (
          <div className="max-w-2xl">
            <h2 className="text-4xl font-black mb-8">Export Center</h2>
            <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33]">
              <p className="text-[#9aa0a6]">Export options coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
