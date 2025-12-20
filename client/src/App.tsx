import { useState, useEffect } from "react";
import {
  Zap, Shield, Download, LogOut, Menu, X, Crown, Search, UserCheck,
  Brain, Sparkles, Send, Package, Smartphone, Monitor, BookOpen, BarChart3, Image, Radio, Palette, CreditCard, Terminal,
  Globe, Users, Truck, FileText, Settings
} from "lucide-react";
import RefUploader from "./components/RefUploader";
import { SessionManager } from "./components/LiveOverrides";
import GalleryPage from "./pages/gallery";
import AssetGalleryPage from "./pages/asset-gallery";
import ArtistPortal from "./pages/artist-portal";
import Pricing from "./pages/pricing";
import DevConsole from "./pages/dev-console";
import ArtistShowcase from "./components/ArtistShowcase";
import heroImage from "@assets/generated_images/defense_command_center_tactical_display.png";

// API base URL configuration - use relative URLs in production (Vercel rewrites handle proxy)
// Use VITE_API_URL only for development pointing to external backends
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export default function App() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log("PacAI v6.3 - Development mode");
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
  
  // Project Editor State
  const [projectConfig, setProjectConfig] = useState({
    biome: "urban",
    weather: "clear",
    timeOfDay: "day",
    npcCount: 50,
    aggression: 50,
    factionBalance: "balanced",
    vehicleDensity: "moderate",
    weaponTier: "military",
    includeMechs: false,
    missionCount: 5,
    tension: "medium",
    includeStory: true,
    includeWildlife: false,
    includeHostileCreatures: false,
    creatureTier: "mundane",
    aiDirector: true,
    dynamicEvents: true,
    permadeath: false,
    tickRate: "realtime"
  });
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
        // Store session token for authenticated API requests
        const u = { 
          name: loginUser, 
          tier: data.tier || "free", 
          sessionToken: data.sessionToken || "" 
        };
        localStorage.setItem("pacai_user", JSON.stringify(u));
        // Also store individual keys for billing pages
        localStorage.setItem("sessionToken", data.sessionToken || "");
        localStorage.setItem("userTier", data.tier || "free");
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
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("userTier");
    setUser(null);
    setLoginUser("");
    setLoginPass("");
  };

  // Scroll to section helper
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b0d0f] text-white">
        {/* Sticky Navigation Bar */}
        <nav className="sticky top-0 z-50 bg-[#0b0d0f]/95 backdrop-blur-md border-b border-[#2a2d33]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3e73ff] rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">PacAI</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-[#9aa0a6] hover:text-white transition" data-testid="nav-features">Features</button>
              <button onClick={() => scrollToSection('gallery-preview')} className="text-[#9aa0a6] hover:text-white transition" data-testid="nav-gallery">Gallery</button>
              <button onClick={() => scrollToSection('pricing-section')} className="text-[#9aa0a6] hover:text-white transition" data-testid="nav-pricing">Pricing</button>
              <button onClick={() => scrollToSection('login-section')} className="px-5 py-2 bg-[#3e73ff] rounded-lg font-semibold hover:opacity-90 transition" data-testid="nav-login">Login</button>
            </div>
            {/* Mobile Navigation Dropdown */}
            <div className="md:hidden relative">
              <button 
                onClick={() => {
                  const mobileNav = document.getElementById('mobile-nav');
                  if (mobileNav) mobileNav.classList.toggle('hidden');
                }} 
                data-testid="button-mobile-menu"
                className="p-2"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div id="mobile-nav" className="hidden absolute right-0 top-12 bg-[#141517] border border-[#2a2d33] rounded-xl p-4 min-w-48 shadow-xl">
                <button onClick={() => { scrollToSection('features'); document.getElementById('mobile-nav')?.classList.add('hidden'); }} className="block w-full text-left py-2 px-3 hover:bg-[#1f2125] rounded-lg" data-testid="nav-features-mobile">Features</button>
                <button onClick={() => { scrollToSection('gallery-preview'); document.getElementById('mobile-nav')?.classList.add('hidden'); }} className="block w-full text-left py-2 px-3 hover:bg-[#1f2125] rounded-lg" data-testid="nav-gallery-mobile">Gallery</button>
                <button onClick={() => { scrollToSection('pricing-section'); document.getElementById('mobile-nav')?.classList.add('hidden'); }} className="block w-full text-left py-2 px-3 hover:bg-[#1f2125] rounded-lg" data-testid="nav-pricing-mobile">Pricing</button>
                <button onClick={() => { scrollToSection('login-section'); document.getElementById('mobile-nav')?.classList.add('hidden'); }} className="block w-full text-left py-2 px-3 mt-2 bg-[#3e73ff] rounded-lg font-semibold" data-testid="nav-login-mobile">Login</button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section with Background Image */}
        <div className="relative min-h-[80vh] flex flex-col items-center justify-center p-8" id="login-section">
          {/* Background Image with Dark Gradient Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b0d0f]/80 via-[#0b0d0f]/70 to-[#0b0d0f]" />
          
          {/* Header with Logo - increased icon size by 15% */}
          <div className="relative z-10 flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-[#3e73ff] rounded-2xl flex items-center justify-center">
              <Brain className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-6xl font-black text-white drop-shadow-lg">
              PacAI <span className="text-[#3e73ff]">v6.3</span>
            </h1>
          </div>
          
          {/* Tagline with enhanced readability */}
          <p className="relative z-10 text-xl text-center text-white/90 mb-12 max-w-2xl drop-shadow-md">
            Enterprise Offline-First Dev Companion for Air-Gapped Environments
          </p>
          
          {/* Login Form */}
          <div className="relative z-10 bg-[#141517]/95 backdrop-blur-sm rounded-2xl p-10 w-full max-w-md border border-[#2a2d33]">
            <input placeholder="Username" className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-4 text-white placeholder-[#9aa0a6]" value={loginUser} onChange={e => setLoginUser(e.target.value)} data-testid="input-login-username" />
            <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-[#1f2125] rounded-lg mb-6 text-white placeholder-[#9aa0a6]" value={loginPass} onChange={e => setLoginPass(e.target.value)} data-testid="input-login-password" />
            <button onClick={login} className="w-full py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90" data-testid="button-login">Login / Register</button>
            <p className="text-center text-xs text-[#9aa0a6] mt-6">New users start on Free tier</p>
          </div>
        </div>
        
        {/* Use Case Vignette */}
        <div className="bg-gradient-to-r from-[#3e73ff]/10 to-purple-900/10 py-12 px-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-white/90 italic">
              "PacAI was used to prototype a multiplayer invasion scenario in under an hour — terrain, 200+ NPCs, faction AI, mission logic, and exports for Unity and Unreal included. What used to take a team 3 weeks now takes one person one afternoon."
            </p>
            <p className="mt-4 text-[#3e73ff] font-semibold">— Wolf Team Studios, Internal Testing</p>
          </div>
        </div>

        {/* What PacAI Does Section */}
        <div className="bg-[#0b0d0f] py-20 px-8" id="features">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-black text-center mb-4">What PacAI Does</h2>
            <p className="text-center text-[#9aa0a6] mb-12 max-w-3xl mx-auto">
              Build worlds, generate AI systems, create story logic, design missions, simulate NPCs, test environments — all in one platform.
            </p>
            
            {/* Feature Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                <div className="w-12 h-12 bg-[#3e73ff]/20 rounded-xl flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-[#3e73ff]" />
                </div>
                <h3 className="text-xl font-bold mb-2">9-Second World Generation</h3>
                <p className="text-[#9aa0a6] text-sm">Generate complete worlds with terrain, NPCs, missions, and narrative in under 10 seconds. 100% deterministic — same seed, same world, every time.</p>
              </div>
              
              <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Package className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Multi-Engine Export</h3>
                <p className="text-[#9aa0a6] text-sm">Export to 9+ engines: Unreal Engine 5, Unity, Godot, Roblox, visionOS, Blender, WebGPU, CryEngine, and Source2. One click, ready to import.</p>
              </div>
              
              <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Air-Gapped Security</h3>
                <p className="text-[#9aa0a6] text-sm">Hardware-root licensing with YubiHSM2, zero outbound calls, local LLM support via Ollama. Built for defense and enterprise environments.</p>
              </div>
              
              <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Radio className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Live Override System</h3>
                <p className="text-[#9aa0a6] text-sm">Real-time WebSocket bridge syncs overrides between dashboard and game servers. Change weather, spawn NPCs, trigger events — instantly.</p>
              </div>
              
              <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Tamper-Proof Audit</h3>
                <p className="text-[#9aa0a6] text-sm">Hash-chained SHA256 audit logs with Ed25519 signatures. Every generation, override, and export is cryptographically verified.</p>
              </div>
              
              <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Palette className="w-6 h-6 text-pink-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Artist Marketplace</h3>
                <p className="text-[#9aa0a6] text-sm">Upload concept art, earn 10-30% royalties when developers use your style. Stripe Connect payments with transparent earnings tracking.</p>
              </div>
            </div>
            
            {/* Use Cases */}
            <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33] mb-16">
              <h3 className="text-2xl font-bold mb-6 text-center">Built For</h3>
              <div className="grid md:grid-cols-4 gap-4 text-center">
                <div className="p-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="font-semibold">Game Studios</p>
                  <p className="text-xs text-[#9aa0a6]">Rapid prototyping & procedural content</p>
                </div>
                <div className="p-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="font-semibold">Defense & Simulation</p>
                  <p className="text-xs text-[#9aa0a6]">Offline training environments</p>
                </div>
                <div className="p-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Monitor className="w-6 h-6 text-yellow-400" />
                  </div>
                  <p className="font-semibold">Film & Animation</p>
                  <p className="text-xs text-[#9aa0a6]">Virtual production worlds</p>
                </div>
                <div className="p-4">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6 text-cyan-400" />
                  </div>
                  <p className="font-semibold">Architecture & VR</p>
                  <p className="text-xs text-[#9aa0a6]">Immersive environment design</p>
                </div>
              </div>
            </div>
            
            {/* Workflow Preview */}
            <div className="text-center mb-16">
              <h3 className="text-2xl font-bold mb-6">Simple 5-Step Workflow</h3>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="bg-[#1f2125] px-6 py-3 rounded-full flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#3e73ff] rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Create Project</span>
                </div>
                <div className="text-[#9aa0a6] flex items-center">→</div>
                <div className="bg-[#1f2125] px-6 py-3 rounded-full flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#3e73ff] rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Write Prompt</span>
                </div>
                <div className="text-[#9aa0a6] flex items-center">→</div>
                <div className="bg-[#1f2125] px-6 py-3 rounded-full flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#3e73ff] rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Generate</span>
                </div>
                <div className="text-[#9aa0a6] flex items-center">→</div>
                <div className="bg-[#1f2125] px-6 py-3 rounded-full flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#3e73ff] rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>Export</span>
                </div>
                <div className="text-[#9aa0a6] flex items-center">→</div>
                <div className="bg-[#1f2125] px-6 py-3 rounded-full flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#3e73ff] rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  <span>Play</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Gallery Preview Section */}
        <div className="bg-[#141517] py-20 px-8" id="gallery-preview">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-black text-center mb-4">Asset Gallery Preview</h2>
            <p className="text-center text-[#9aa0a6] mb-12 max-w-3xl mx-auto">
              Explore procedurally generated vehicles, weapons, creatures, and environments. Fork any asset for $0.50 or free with Creator tier.
            </p>
            
            {/* Sample Asset Grid */}
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              <div className="bg-[#1f2125] rounded-xl overflow-hidden border border-[#2a2d33] group hover:border-[#3e73ff] transition">
                <div className="aspect-square bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center">
                  <Package className="w-16 h-16 text-[#3e73ff]/50 group-hover:text-[#3e73ff] transition" />
                </div>
                <div className="p-4">
                  <p className="font-bold">Combat Mech v3</p>
                  <p className="text-xs text-[#9aa0a6]">Vehicle • Sci-Fi</p>
                </div>
              </div>
              <div className="bg-[#1f2125] rounded-xl overflow-hidden border border-[#2a2d33] group hover:border-[#3e73ff] transition">
                <div className="aspect-square bg-gradient-to-br from-red-900/50 to-orange-900/50 flex items-center justify-center">
                  <Zap className="w-16 h-16 text-orange-500/50 group-hover:text-orange-400 transition" />
                </div>
                <div className="p-4">
                  <p className="font-bold">Plasma Rifle XR</p>
                  <p className="text-xs text-[#9aa0a6]">Weapon • Tactical</p>
                </div>
              </div>
              <div className="bg-[#1f2125] rounded-xl overflow-hidden border border-[#2a2d33] group hover:border-[#3e73ff] transition">
                <div className="aspect-square bg-gradient-to-br from-green-900/50 to-teal-900/50 flex items-center justify-center">
                  <Sparkles className="w-16 h-16 text-green-500/50 group-hover:text-green-400 transition" />
                </div>
                <div className="p-4">
                  <p className="font-bold">Forest Wyrm</p>
                  <p className="text-xs text-[#9aa0a6]">Creature • Fantasy</p>
                </div>
              </div>
              <div className="bg-[#1f2125] rounded-xl overflow-hidden border border-[#2a2d33] group hover:border-[#3e73ff] transition">
                <div className="aspect-square bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                  <Shield className="w-16 h-16 text-purple-500/50 group-hover:text-purple-400 transition" />
                </div>
                <div className="p-4">
                  <p className="font-bold">Titan Armor Set</p>
                  <p className="text-xs text-[#9aa0a6]">Equipment • Medieval</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <button onClick={() => scrollToSection('login-section')} className="px-8 py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90 mr-4" data-testid="button-explore-gallery">
                Explore Full Gallery
              </button>
              <button onClick={() => scrollToSection('login-section')} className="px-8 py-4 bg-transparent border border-[#3e73ff] rounded-xl font-bold text-lg hover:bg-[#3e73ff]/10 transition" data-testid="button-try-demo">
                Try Demo
              </button>
            </div>
          </div>
        </div>
        
        {/* Artist Showcase */}
        <div className="bg-[#0b0d0f] py-12 px-8">
          <div className="max-w-4xl mx-auto">
            <ArtistShowcase 
              maxItems={3} 
              title="Featured Community Artists" 
              showContactInfo={true}
            />
          </div>
        </div>
        
        {/* Pricing Section */}
        <div className="bg-[#141517] py-20 px-8" id="pricing-section">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-black text-center mb-4">Simple Pricing</h2>
            <p className="text-center text-[#9aa0a6] mb-12">Start free. Upgrade when you need more power.</p>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[#1f2125] p-8 rounded-2xl border border-[#2a2d33]">
                <h3 className="text-xl font-bold mb-2">Free</h3>
                <p className="text-4xl font-black mb-4">$0<span className="text-sm font-normal text-[#9aa0a6]">/mo</span></p>
                <ul className="space-y-2 text-sm text-[#9aa0a6] mb-6">
                  <li>2 generations per week</li>
                  <li>Basic export formats</li>
                  <li>Community support</li>
                </ul>
                <button onClick={() => scrollToSection('login-section')} className="w-full py-3 bg-[#2a2d33] rounded-xl font-semibold hover:bg-[#3a3d43] transition" data-testid="button-pricing-free">
                  Get Started
                </button>
              </div>
              <div className="bg-gradient-to-br from-[#3e73ff]/20 to-purple-900/20 p-8 rounded-2xl border border-[#3e73ff]">
                <h3 className="text-xl font-bold mb-2">Creator</h3>
                <p className="text-4xl font-black mb-4">$29<span className="text-sm font-normal text-[#9aa0a6]">/mo</span></p>
                <ul className="space-y-2 text-sm text-[#9aa0a6] mb-6">
                  <li>100 generations per week</li>
                  <li>All 9 export engines</li>
                  <li>Priority support</li>
                  <li>Free asset forks</li>
                </ul>
                <button onClick={() => scrollToSection('login-section')} className="w-full py-3 bg-[#3e73ff] rounded-xl font-semibold hover:opacity-90 transition" data-testid="button-pricing-creator">
                  Upgrade
                </button>
              </div>
              <div className="bg-[#1f2125] p-8 rounded-2xl border border-[#2a2d33]">
                <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                <p className="text-4xl font-black mb-4">Custom</p>
                <ul className="space-y-2 text-sm text-[#9aa0a6] mb-6">
                  <li>Unlimited generations</li>
                  <li>Air-gapped deployment</li>
                  <li>Hardware licensing</li>
                  <li>Dedicated support</li>
                </ul>
                <button onClick={() => window.open('https://discord.gg/TtfHgfCQMY', '_blank')} className="w-full py-3 bg-[#2a2d33] rounded-xl font-semibold hover:bg-[#3a3d43] transition" data-testid="button-pricing-enterprise">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer CTA */}
        <div className="bg-gradient-to-r from-[#3e73ff]/20 to-purple-900/20 py-16 px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Worlds?</h2>
          <p className="text-[#9aa0a6] mb-8">Join 300+ creators using PacAI to generate game-ready content.</p>
          <button onClick={() => scrollToSection('login-section')} className="px-8 py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90" data-testid="button-get-started">
            Get Started Free
          </button>
        </div>
      </div>
    );
  }

  const menu = [
    { id: "home", icon: Brain, label: "Home" },
    { id: "generate", icon: Sparkles, label: "Generation Lab" },
    { id: "assets", icon: Package, label: "Asset Gallery" },
    { id: "gallery", icon: Image, label: "3dRender Gallery" },
    { id: "artist", icon: Palette, label: "Artist Portal" },
    { id: "pricing", icon: CreditCard, label: "Upgrade Plan" },
    { id: "override", icon: Send, label: "Override" },
    { id: "live", icon: Radio, label: "Live Overrides" },
    { id: "export", icon: Download, label: "Export" },
    { id: "download", icon: Smartphone, label: "Download App" },
    { id: "audit", icon: BarChart3, label: "Audit Log" },
    { id: "verify", icon: UserCheck, label: "Verify" },
    { id: "devconsole", icon: Terminal, label: "Dev Console" },
  ];

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white flex">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? "w-64" : "w-20"} bg-[#141517] border-r border-[#2a2d33] transition-all`}>
        <div className="p-6 flex justify-between items-center">
          <div className={`flex items-center gap-3 ${sidebarOpen ? "flex" : "hidden"}`}>
            <div className="w-10 h-10 bg-[#3e73ff] rounded-xl flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-black text-xl">PacAI v6.3</h1>
          </div>
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 bg-[#3e73ff] rounded-xl flex items-center justify-center mx-auto hover:opacity-90">
              <Brain className="w-6 h-6 text-white" />
            </button>
          )}
          {sidebarOpen && <button onClick={() => setSidebarOpen(false)}><X size={24} /></button>}
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

            <div className="mt-10">
              <ArtistShowcase 
                maxItems={6} 
                title="Community Artist Showcase" 
                showContactInfo={true}
              />
            </div>
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
            
            {/* Project Editor - All Features Before Export */}
            {generationResult && (
              <div className="mt-8">
                <h3 className="text-2xl font-bold mb-6">Edit Project Before Export</h3>
                <p className="text-[#9aa0a6] mb-6">Customize all aspects of your generated world before exporting to game engines.</p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* World Settings */}
                  <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-green-400" />
                      World Settings
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">Biome</label>
                        <select 
                          className="w-full px-4 py-2 bg-[#1f2125] rounded-lg text-white" 
                          data-testid="select-biome"
                          value={projectConfig.biome}
                          onChange={e => setProjectConfig(c => ({...c, biome: e.target.value}))}
                        >
                          <option value="urban">Urban</option>
                          <option value="arctic">Arctic</option>
                          <option value="desert">Desert</option>
                          <option value="jungle">Jungle</option>
                          <option value="forest">Forest</option>
                          <option value="coastal">Coastal</option>
                          <option value="volcanic">Volcanic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">Weather</label>
                        <select 
                          className="w-full px-4 py-2 bg-[#1f2125] rounded-lg text-white" 
                          data-testid="select-weather"
                          value={projectConfig.weather}
                          onChange={e => setProjectConfig(c => ({...c, weather: e.target.value}))}
                        >
                          <option value="clear">Clear</option>
                          <option value="rain">Rain</option>
                          <option value="storm">Storm</option>
                          <option value="fog">Fog</option>
                          <option value="snow">Snow</option>
                          <option value="sandstorm">Sandstorm</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">Time of Day</label>
                        <select 
                          className="w-full px-4 py-2 bg-[#1f2125] rounded-lg text-white" 
                          data-testid="select-time"
                          value={projectConfig.timeOfDay}
                          onChange={e => setProjectConfig(c => ({...c, timeOfDay: e.target.value}))}
                        >
                          <option value="dawn">Dawn</option>
                          <option value="day">Day</option>
                          <option value="dusk">Dusk</option>
                          <option value="night">Night</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* NPC Configuration */}
                  <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      NPC Configuration
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">NPC Count: <span className="text-white">{projectConfig.npcCount}</span></label>
                        <input 
                          type="range" min="10" max="500" 
                          value={projectConfig.npcCount}
                          onChange={e => setProjectConfig(c => ({...c, npcCount: parseInt(e.target.value)}))}
                          className="w-full" data-testid="slider-npc-count" 
                        />
                      </div>
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">Aggression Level: <span className="text-white">{projectConfig.aggression}%</span></label>
                        <input 
                          type="range" min="0" max="100" 
                          value={projectConfig.aggression}
                          onChange={e => setProjectConfig(c => ({...c, aggression: parseInt(e.target.value)}))}
                          className="w-full" data-testid="slider-aggression" 
                        />
                      </div>
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">Faction Balance</label>
                        <select 
                          className="w-full px-4 py-2 bg-[#1f2125] rounded-lg text-white" 
                          data-testid="select-factions"
                          value={projectConfig.factionBalance}
                          onChange={e => setProjectConfig(c => ({...c, factionBalance: e.target.value}))}
                        >
                          <option value="balanced">Balanced</option>
                          <option value="hostile-majority">Hostile Majority</option>
                          <option value="friendly-majority">Friendly Majority</option>
                          <option value="neutral">Neutral</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Vehicles & Equipment */}
                  <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-orange-400" />
                      Vehicles & Equipment
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">Vehicle Density</label>
                        <select 
                          className="w-full px-4 py-2 bg-[#1f2125] rounded-lg text-white" 
                          data-testid="select-vehicles"
                          value={projectConfig.vehicleDensity}
                          onChange={e => setProjectConfig(c => ({...c, vehicleDensity: e.target.value}))}
                        >
                          <option value="none">None</option>
                          <option value="sparse">Sparse</option>
                          <option value="moderate">Moderate</option>
                          <option value="dense">Dense</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">Weapon Tier</label>
                        <select 
                          className="w-full px-4 py-2 bg-[#1f2125] rounded-lg text-white" 
                          data-testid="select-weapons"
                          value={projectConfig.weaponTier}
                          onChange={e => setProjectConfig(c => ({...c, weaponTier: e.target.value}))}
                        >
                          <option value="basic">Basic (Pistols, SMGs)</option>
                          <option value="military">Military (Rifles, LMGs)</option>
                          <option value="advanced">Advanced (Sniper, Heavy)</option>
                          <option value="experimental">Experimental (Plasma, Rail)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" id="include-mechs" className="rounded" 
                          data-testid="checkbox-mechs"
                          checked={projectConfig.includeMechs}
                          onChange={e => setProjectConfig(c => ({...c, includeMechs: e.target.checked}))}
                        />
                        <label htmlFor="include-mechs" className="text-sm">Include Combat Mechs</label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Narrative & Missions */}
                  <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-400" />
                      Narrative & Missions
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">Mission Count: <span className="text-white">{projectConfig.missionCount}</span></label>
                        <input 
                          type="range" min="1" max="20" 
                          value={projectConfig.missionCount}
                          onChange={e => setProjectConfig(c => ({...c, missionCount: parseInt(e.target.value)}))}
                          className="w-full" data-testid="slider-missions" 
                        />
                      </div>
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">Global Tension</label>
                        <select 
                          className="w-full px-4 py-2 bg-[#1f2125] rounded-lg text-white" 
                          data-testid="select-tension"
                          value={projectConfig.tension}
                          onChange={e => setProjectConfig(c => ({...c, tension: e.target.value}))}
                        >
                          <option value="low">Low (Peaceful)</option>
                          <option value="medium">Medium (Alert)</option>
                          <option value="high">High (Hostile)</option>
                          <option value="critical">Critical (War)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" id="include-story" className="rounded" 
                          data-testid="checkbox-story"
                          checked={projectConfig.includeStory}
                          onChange={e => setProjectConfig(c => ({...c, includeStory: e.target.checked}))}
                        />
                        <label htmlFor="include-story" className="text-sm">Generate Story Arcs</label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Creatures & Fauna */}
                  <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-green-400" />
                      Creatures & Fauna
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" id="include-wildlife" className="rounded" 
                          data-testid="checkbox-wildlife"
                          checked={projectConfig.includeWildlife}
                          onChange={e => setProjectConfig(c => ({...c, includeWildlife: e.target.checked}))}
                        />
                        <label htmlFor="include-wildlife" className="text-sm">Include Wildlife</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" id="include-hostile-creatures" className="rounded" 
                          data-testid="checkbox-hostile-creatures"
                          checked={projectConfig.includeHostileCreatures}
                          onChange={e => setProjectConfig(c => ({...c, includeHostileCreatures: e.target.checked}))}
                        />
                        <label htmlFor="include-hostile-creatures" className="text-sm">Hostile Creatures</label>
                      </div>
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">Creature Tier</label>
                        <select 
                          className="w-full px-4 py-2 bg-[#1f2125] rounded-lg text-white" 
                          data-testid="select-creatures"
                          value={projectConfig.creatureTier}
                          onChange={e => setProjectConfig(c => ({...c, creatureTier: e.target.value}))}
                        >
                          <option value="mundane">Mundane (Dogs, Birds)</option>
                          <option value="exotic">Exotic (Wolves, Bears)</option>
                          <option value="fantasy">Fantasy (Dragons, Wyrms)</option>
                          <option value="scifi">Sci-Fi (Aliens, Mutants)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Simulation Settings */}
                  <div className="bg-[#141517] p-6 rounded-2xl border border-[#2a2d33]">
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-cyan-400" />
                      Simulation Settings
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" id="enable-ai-director" className="rounded" 
                          data-testid="checkbox-ai-director"
                          checked={projectConfig.aiDirector}
                          onChange={e => setProjectConfig(c => ({...c, aiDirector: e.target.checked}))}
                        />
                        <label htmlFor="enable-ai-director" className="text-sm">AI Director</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" id="enable-dynamic-events" className="rounded" 
                          data-testid="checkbox-dynamic-events"
                          checked={projectConfig.dynamicEvents}
                          onChange={e => setProjectConfig(c => ({...c, dynamicEvents: e.target.checked}))}
                        />
                        <label htmlFor="enable-dynamic-events" className="text-sm">Dynamic Events</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" id="enable-permadeath" className="rounded" 
                          data-testid="checkbox-permadeath"
                          checked={projectConfig.permadeath}
                          onChange={e => setProjectConfig(c => ({...c, permadeath: e.target.checked}))}
                        />
                        <label htmlFor="enable-permadeath" className="text-sm">Permadeath Mode</label>
                      </div>
                      <div>
                        <label className="block text-[#9aa0a6] text-sm mb-1">Tick Rate</label>
                        <select 
                          className="w-full px-4 py-2 bg-[#1f2125] rounded-lg text-white" 
                          data-testid="select-tickrate"
                          value={projectConfig.tickRate}
                          onChange={e => setProjectConfig(c => ({...c, tickRate: e.target.value}))}
                        >
                          <option value="realtime">Real-time</option>
                          <option value="accelerated">Accelerated (2x)</option>
                          <option value="fast">Fast (4x)</option>
                          <option value="turbo">Turbo (10x)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Apply Changes Button */}
                <div className="mt-8 flex flex-wrap gap-4">
                  <button 
                    onClick={async () => {
                      if (!selectedProject) return;
                      try {
                        // Send all configuration to the override endpoint
                        const commands = [
                          `biome ${projectConfig.biome}`,
                          `weather ${projectConfig.weather}`,
                          `time ${projectConfig.timeOfDay}`,
                          `spawn ${projectConfig.npcCount} npcs`,
                          `aggression ${projectConfig.aggression / 100}`,
                          `tension ${projectConfig.tension}`
                        ];
                        
                        for (const cmd of commands) {
                          await fetch(`/v5/projects/${selectedProject.id}/override`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ command: cmd, username: user?.name })
                          });
                        }
                        
                        alert("Configuration applied successfully! Project updated with new settings.");
                      } catch (e) {
                        alert("Failed to apply some changes. Please try again.");
                      }
                    }}
                    className="px-8 py-4 bg-green-600 rounded-xl font-bold text-lg hover:bg-green-700 transition"
                    data-testid="button-apply-project-changes"
                  >
                    Apply Changes
                  </button>
                  <button 
                    onClick={() => setActiveTab("export")}
                    className="px-8 py-4 bg-[#3e73ff] rounded-xl font-bold text-lg hover:opacity-90"
                    data-testid="button-proceed-to-export"
                  >
                    Proceed to Export
                  </button>
                  <button 
                    onClick={generate}
                    className="px-8 py-4 bg-[#1f2125] rounded-xl font-bold text-lg hover:bg-[#2a2d33] transition"
                    data-testid="button-regenerate"
                  >
                    Regenerate World
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "assets" && (
          <AssetGalleryPage />
        )}

        {activeTab === "gallery" && (
          <GalleryPage />
        )}

        {activeTab === "artist" && (
          <ArtistPortal 
            username={user?.name || "anonymous"} 
            sessionToken={user?.sessionToken}
          />
        )}

        {activeTab === "pricing" && (
          <Pricing />
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
            <div className="relative mb-10 rounded-2xl overflow-hidden">
              <img 
                src={heroImage} 
                alt="PacAI Command Center" 
                className="w-full h-64 object-cover"
                data-testid="img-download-hero"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d0f] via-[#0b0d0f]/50 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h2 className="text-4xl font-black mb-2">Download PacAI App</h2>
                <p className="text-[#9aa0a6] text-lg">Install on your device for offline access and native performance.</p>
              </div>
            </div>
            
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
          <div className="max-w-4xl">
            <h2 className="text-4xl font-black mb-8">User Management</h2>
            
            {/* User Lookup Section */}
            <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33] mb-8">
              <h3 className="text-xl font-bold mb-4">Check User Account</h3>
              <div className="flex gap-4 mb-6">
                <input 
                  placeholder="Enter username to check" 
                  className="flex-1 px-4 py-3 bg-[#1f2125] rounded-lg text-white placeholder-[#9aa0a6]" 
                  value={verifyUser} 
                  onChange={e => setVerifyUser(e.target.value)} 
                  data-testid="input-verify-username"
                />
                <button onClick={verifyAccount} className="px-8 py-3 bg-[#3e73ff] rounded-lg font-bold hover:opacity-90" data-testid="button-verify-check">
                  Check
                </button>
              </div>
              
              {verifyResult && (
                <div className="bg-[#1f2125] rounded-xl p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[#9aa0a6] text-sm">Username</p>
                      <p className="text-xl font-bold" data-testid="text-verify-username">{verifyResult.username}</p>
                    </div>
                    <div>
                      <p className="text-[#9aa0a6] text-sm">Current Tier</p>
                      <p className="text-xl font-bold text-[#3e73ff]" data-testid="text-verify-tier">{String(verifyResult?.tier || "free").toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-[#9aa0a6] text-sm">Status</p>
                      <p className={`text-xl font-bold ${verifyResult.verified ? "text-green-400" : "text-yellow-400"}`} data-testid="text-verify-status">
                        {verifyResult.verified ? "Verified" : "Pending Verification"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#9aa0a6] text-sm">Generations This Week</p>
                      <p className="text-xl font-bold">{verifyResult.generationsThisWeek || 0}</p>
                    </div>
                  </div>
                  
                  {/* Admin Controls - Only show for lifetime tier admins */}
                  {user.tier === "lifetime" && (
                    <div className="mt-8 pt-6 border-t border-[#2a2d33]">
                      <h4 className="font-bold mb-4 text-lg">Admin Actions</h4>
                      
                      {/* Tier Management */}
                      <div className="mb-6">
                        <label className="block text-[#9aa0a6] text-sm mb-2">Change User Tier</label>
                        <div className="flex flex-wrap gap-2">
                          {["free", "creator", "pro", "lifetime", "enterprise"].map(tier => (
                            <button
                              key={tier}
                              onClick={async () => {
                                if (confirm(`Are you sure you want to change ${verifyResult.username}'s tier to ${tier.toUpperCase()}?`)) {
                                  try {
                                    const res = await fetch("/api/admin/user/tier", {
                                      method: "POST",
                                      headers: { 
                                        "Content-Type": "application/json",
                                        "x-session-token": user?.sessionToken || ""
                                      },
                                      body: JSON.stringify({ username: verifyResult.username, newTier: tier })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      alert(data.message);
                                      verifyAccount(); // Refresh the user data
                                    } else {
                                      alert("Error: " + data.error);
                                    }
                                  } catch (e) {
                                    alert("Failed to update tier");
                                  }
                                }
                              }}
                              className={`px-4 py-2 rounded-lg font-semibold transition ${
                                verifyResult.tier === tier 
                                  ? "bg-[#3e73ff] text-white" 
                                  : "bg-[#2a2d33] hover:bg-[#3a3d43]"
                              }`}
                              data-testid={`button-tier-${tier}`}
                            >
                              {tier.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Delete User */}
                      <div className="pt-4 border-t border-[#2a2d33]">
                        <button
                          onClick={async () => {
                            if (verifyResult.username === user.name) {
                              alert("You cannot delete your own account!");
                              return;
                            }
                            if (confirm(`⚠️ WARNING: This will permanently delete ${verifyResult.username}'s account. This action cannot be undone. Are you sure?`)) {
                              try {
                                const res = await fetch("/api/admin/user", {
                                  method: "DELETE",
                                  headers: { 
                                    "Content-Type": "application/json",
                                    "x-session-token": user?.sessionToken || ""
                                  },
                                  body: JSON.stringify({ username: verifyResult.username })
                                });
                                const data = await res.json();
                                if (data.success) {
                                  alert(data.message);
                                  setVerifyResult(null);
                                  setVerifyUser("");
                                } else {
                                  alert("Error: " + data.error);
                                }
                              } catch (e) {
                                alert("Failed to delete user");
                              }
                            }
                          }}
                          className="px-6 py-3 bg-red-600 rounded-lg font-bold hover:bg-red-700 transition"
                          data-testid="button-delete-user"
                        >
                          Delete User Account
                        </button>
                        <p className="text-xs text-[#9aa0a6] mt-2">This action is permanent and cannot be undone.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Admin Use Cases Guide */}
            {user.tier === "lifetime" && (
              <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33]">
                <h3 className="text-xl font-bold mb-4">Admin Guide</h3>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                  <div className="bg-[#1f2125] p-4 rounded-xl">
                    <p className="font-bold text-green-400 mb-2">Contest Winners</p>
                    <p className="text-[#9aa0a6]">Upgrade winners to Creator or Pro tier for their prize duration. Track via audit log.</p>
                  </div>
                  <div className="bg-[#1f2125] p-4 rounded-xl">
                    <p className="font-bold text-yellow-400 mb-2">Fraud Detection</p>
                    <p className="text-[#9aa0a6]">Downgrade or delete accounts attempting to abuse the system or create multiple free accounts.</p>
                  </div>
                  <div className="bg-[#1f2125] p-4 rounded-xl">
                    <p className="font-bold text-blue-400 mb-2">Customer Support</p>
                    <p className="text-[#9aa0a6]">Verify user status, manually adjust tiers for support issues, or reset problematic accounts.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "devconsole" && <DevConsole />}
      </div>
    </div>
  );
}
