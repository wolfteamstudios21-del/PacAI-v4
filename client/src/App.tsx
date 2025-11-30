import { useState, useEffect } from "react";
import { 
  Zap, Download, Shield, Globe, LogOut, Menu, X, 
  Film, Gamepad2, Crown, Settings, Users, Home 
} from "lucide-react";

const DEV_USER = "WolfTeamstudio2";
const DEV_PASS = "AdminTeam15";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<any>({ name: "", tier: "free", isDev: false });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("home");

  // Load user from localStorage + Replit DB
  useEffect(() => {
    const saved = localStorage.getItem("pacai_user");
    if (saved) {
      const u = JSON.parse(saved);
      setUser(u);
      setLoggedIn(true);
    }
  }, []);

  // Mock auth (replace with real /api/login later)
  const handleLogin = (username: string, password: string) => {
    if (username === DEV_USER && password === DEV_PASS) {
      const dev = { name: username, tier: "lifetime", isDev: true };
      localStorage.setItem("pacai_user", JSON.stringify(dev));
      setUser(dev);
      setLoggedIn(true);
      return;
    }
    // Simulate paid user (after Stripe success)
    const tier = username.includes("lifetime") ? "lifetime" : "studio";
    const u = { name: username, tier, isDev: false };
    localStorage.setItem("pacai_user", JSON.stringify(u));
    setUser(u);
    setLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("pacai_user");
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#0b0d0f] flex items-center justify-center p-8">
        <div className="bg-[#141517] rounded-2xl p-10 max-w-md w-full border border-[#2a2d33]">
          <h1 className="text-5xl font-black text-center mb-8 text-[#3e73ff]">PacAI v5</h1>
          <input type="text" placeholder="Username" className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-4 text-white placeholder-[#9aa0a6]" id="user"/>
          <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-6 text-white placeholder-[#9aa0a6]" id="pass"/>
          <button onClick={() => handleLogin(
            (document.getElementById("user") as any).value,
            (document.getElementById("pass") as any).value
          )} className="w-full py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90">
            Login / Register
          </button>
          <p className="text-center text-xs text-[#9aa0a6] mt-6">
            Dev: WolfTeamstudio2 / AdminTeam15
          </p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "animation", label: "Animation Lab", icon: Film },
    { id: "game", label: "Game Lab", icon: Gamepad2 },
    { id: "export", label: "Export Center", icon: Download },
    { id: "tier", label: "Upgrade Tier", icon: Crown },
    user.isDev && { id: "dev", label: "Dev Tools", icon: Settings },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white flex">
      {/* SIDE MENU */}
      <div className={`${sidebarOpen ? "w-64" : "w-20"} bg-[#141517] border-r border-[#2a2d33] transition-all duration-300`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className={`font-black text-2xl ${sidebarOpen ? "block" : "hidden"}`}>PacAI v5</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#3e73ff]">
            {sidebarOpen ? <X /> : <Menu />}
          </button>
        </div>
        <nav className="mt-8">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-[#1f2125] transition ${activeTab === item.id ? "bg-[#3e73ff]" : ""}`}
            >
              <item.icon size={24} />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-6 border-t border-[#2a2d33]">
          <div className="flex items-center gap-3">
            <Users />
            {sidebarOpen && (
              <div>
                <p className="font-bold">{user.name}</p>
                <p className="text-xs text-[#3e73ff] uppercase">{user.tier} {user.isDev && "+ DEV"}</p>
              </div>
            )}
          </div>
          <button onClick={logout} className="w-full mt-4 py-3 bg-red-600 rounded-lg hover:bg-red-700 font-bold flex items-center justify-center gap-2">
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-10">
        {activeTab === "home" && (
          <div>
            <h2 className="text-4xl font-black mb-6">Welcome back, {user.name.split(" ")[0]}!</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33]">
                <h3 className="text-2xl font-bold mb-4">Download Desktop App</h3>
                <p className="text-[#9aa0a6] mb-6">Fully offline • HSM • Tauri</p>
                <div className="grid grid-cols-3 gap-3">
                  <a href="#" className="bg-[#3e73ff] py-3 rounded-lg text-center font-bold hover:opacity-90">Windows</a>
                  <a href="#" className="bg-[#3e73ff] py-3 rounded-lg text-center font-bold hover:opacity-90">macOS</a>
                  <a href="#" className="bg-[#3e73ff] py-3 rounded-lg text-center font-bold hover:opacity-90">Linux</a>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-8">
                <Crown className="w-16 h-16 mb-4" />
                <h3 className="text-3xl font-black">Your Tier</h3>
                <p className="text-5xl font-black my-4">
                  {user.tier === "lifetime" ? "LIFETIME" : user.tier.toUpperCase()}
                </p>
                {user.tier === "free" && <p className="text-sm">1 animation + 1 game demo per week</p>}
                {user.tier === "studio" && <p className="text-sm">Unlimited monthly</p>}
                {user.tier === "lifetime" && <p className="text-sm">Unlimited forever • 247 slots</p>}
              </div>

              <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33]">
                <h3 className="text-2xl font-bold mb-4">Quick Actions</h3>
                <button onClick={() => setActiveTab("animation")} className="w-full py-4 bg-[#1f2125] rounded-lg mb-3 hover:bg-[#3e73ff] transition">
                  Start New Animation
                </button>
                <button onClick={() => setActiveTab("game")} className="w-full py-4 bg-[#1f2125] rounded-lg hover:bg-[#3e73ff] transition">
                  Start New Game World
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "animation" && <div className="text-3xl font-bold">Animation Lab (Unlimited for {user.tier})</div>}
        {activeTab === "game" && <div className="text-3xl font-bold">Game Lab (Unlimited for {user.tier})</div>}
        {activeTab === "export" && <div className="text-3xl font-bold">Export Center – UE5, Blender, Godot, Roblox, etc.</div>}
        {activeTab === "tier" && <div className="text-3xl font-bold">Upgrade to Studio or Lifetime → wolfteamstudios21@gmail.com</div>}
        {activeTab === "dev" && user.isDev && <div className="text-3xl font-bold text-red-400">DEV TOOLS – Full HSM + Audit Access</div>}
      </div>
    </div>
  );
}
