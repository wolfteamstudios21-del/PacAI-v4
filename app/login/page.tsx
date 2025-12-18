"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("wolf@pacaiwolfstudio.com");
  const [password, setPassword] = useState("wolf123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid credentials. Try wolf@pacaiwolfstudio.com / wolf123");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-dark p-6">
      <div className="glass-card p-10 w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl gradient-primary flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PacAI v6.3</h1>
          <p className="text-gray-400">Enterprise Defense Simulation Platform</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="wolf@pacaiwolfstudio.com"
              className="w-full px-4 py-3 bg-[#1a1d21] border border-[#27272a] rounded-lg text-white placeholder-gray-500 focus:border-[#3e73ff] focus:ring-1 focus:ring-[#3e73ff] transition-colors"
              required
              data-testid="input-email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#1a1d21] border border-[#27272a] rounded-lg text-white placeholder-gray-500 focus:border-[#3e73ff] focus:ring-1 focus:ring-[#3e73ff] transition-colors"
              required
              data-testid="input-password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm" data-testid="text-error">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 gradient-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-submit"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In → Generate Worlds"
            )}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 pt-6 border-t border-[#27272a]">
          <p className="text-gray-500 text-sm text-center mb-3">Demo Credentials</p>
          <div className="bg-[#1a1d21] p-3 rounded-lg text-center">
            <code className="text-sm text-gray-300 mono">
              wolf@pacaiwolfstudio.com / wolf123
            </code>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="p-2">
            <div className="text-[#3e73ff] text-lg font-bold">9</div>
            <div className="text-gray-500 text-xs">Engines</div>
          </div>
          <div className="p-2">
            <div className="text-[#3e73ff] text-lg font-bold">100%</div>
            <div className="text-gray-500 text-xs">Offline</div>
          </div>
          <div className="p-2">
            <div className="text-[#3e73ff] text-lg font-bold">Ed25519</div>
            <div className="text-gray-500 text-xs">Signed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
