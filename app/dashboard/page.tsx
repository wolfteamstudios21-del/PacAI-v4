"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
}

interface HealthStatus {
  status: string;
  version: string;
  engines: string[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [healthRes, projectsRes] = await Promise.all([
        fetch("/v5/health"),
        fetch("/v5/projects"),
      ]);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl gradient-primary flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-gray-400">Loading PacAI v6.3...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <header className="border-b border-[#27272a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">PacAI v6.3</h1>
              <p className="text-xs text-gray-500">Enterprise Defense Simulation</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {health && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 text-sm font-medium" data-testid="text-status">
                  {health.status}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white" data-testid="text-username">
                  {session.user?.name}
                </p>
                <p className="text-xs text-gray-500">
                  Tier: <span className="text-[#3e73ff]" data-testid="text-tier">{session.user?.tier || "free"}</span>
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-[#27272a] hover:border-gray-500 rounded-lg transition-colors"
                data-testid="button-signout"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Welcome Banner */}
        <div className="glass-card p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {session.user?.name}!
          </h2>
          <p className="text-gray-400 text-lg">
            Your worlds are ready. Generate, override, and export to 9 engines.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-[#3e73ff] mb-1">{health?.engines?.length || 9}</div>
            <div className="text-gray-400 text-sm">Export Engines</div>
            <div className="text-xs text-gray-500 mt-2 mono">UE5, Unity, Godot, Roblox...</div>
          </div>

          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-green-400 mb-1">{projects.length}</div>
            <div className="text-gray-400 text-sm">Projects</div>
            <div className="text-xs text-gray-500 mt-2">Active worlds</div>
          </div>

          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-purple-400 mb-1">100%</div>
            <div className="text-gray-400 text-sm">Offline Ready</div>
            <div className="text-xs text-gray-500 mt-2">Air-gapped compatible</div>
          </div>

          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-yellow-400 mb-1">Ed25519</div>
            <div className="text-gray-400 text-sm">Signed Exports</div>
            <div className="text-xs text-gray-500 mt-2">Tamper-proof bundles</div>
          </div>
        </div>

        {/* Engines Grid */}
        <div className="glass-card p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Available Export Engines</h3>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
            {(health?.engines || ["UE5", "Unity", "Godot", "Roblox", "Blender", "CryEngine", "Source2", "WebGPU", "visionOS"]).map((engine) => (
              <div
                key={engine}
                className="p-3 bg-[#1a1d21] border border-[#27272a] rounded-lg text-center hover:border-[#3e73ff] transition-colors cursor-pointer"
                data-testid={`engine-${engine.toLowerCase()}`}
              >
                <span className="text-sm text-gray-300 mono">{engine}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            className="glass-card p-6 text-left hover:border-[#3e73ff] transition-colors group"
            data-testid="button-generate"
          >
            <div className="w-12 h-12 rounded-lg bg-[#3e73ff]/20 flex items-center justify-center mb-4 group-hover:bg-[#3e73ff]/30 transition-colors">
              <svg className="w-6 h-6 text-[#3e73ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Generate World</h3>
            <p className="text-gray-400 text-sm">Create a new procedural world with deterministic seeds</p>
          </button>

          <button
            className="glass-card p-6 text-left hover:border-[#3e73ff] transition-colors group"
            data-testid="button-override"
          >
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Live Override</h3>
            <p className="text-gray-400 text-sm">Adjust world parameters in real-time</p>
          </button>

          <button
            className="glass-card p-6 text-left hover:border-[#3e73ff] transition-colors group"
            data-testid="button-export"
          >
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4 group-hover:bg-green-500/30 transition-colors">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Export Bundle</h3>
            <p className="text-gray-400 text-sm">Export to any of the 9 supported engines</p>
          </button>
        </div>

        {/* API Endpoint */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">API Endpoints</h3>
          <div className="space-y-3">
            <a
              href="/v5/health"
              target="_blank"
              className="flex items-center justify-between p-4 bg-[#1a1d21] border border-[#27272a] rounded-lg hover:border-[#3e73ff] transition-colors group"
              data-testid="link-health"
            >
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">GET</span>
                <code className="text-gray-300 mono">/v5/health</code>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-[#3e73ff] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            <a
              href="/v5/projects"
              target="_blank"
              className="flex items-center justify-between p-4 bg-[#1a1d21] border border-[#27272a] rounded-lg hover:border-[#3e73ff] transition-colors group"
              data-testid="link-projects"
            >
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded">GET</span>
                <code className="text-gray-300 mono">/v5/projects</code>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-[#3e73ff] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
