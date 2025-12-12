import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Terminal, Activity, Database, Cpu, Send, Trash2 } from "lucide-react";

interface CommandResult {
  success: boolean;
  output: string;
  data?: unknown;
  timestamp: number;
}

interface HealthData {
  status: string;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    warning: boolean;
  };
  cache: {
    size: number;
    maxSize: number;
  };
  uptime: number;
  nodeVersion: string;
  env: string;
}

interface HistoryEntry {
  command: string;
  result: CommandResult;
  timestamp: number;
}

function getSessionToken(): string | null {
  const sessionToken = localStorage.getItem("sessionToken");
  if (sessionToken) return sessionToken;
  const user = localStorage.getItem("pacai_user");
  if (user) {
    try {
      const parsed = JSON.parse(user);
      return parsed.sessionToken || null;
    } catch {
      return null;
    }
  }
  return null;
}

async function authFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(url, { ...options, headers, credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function DevConsole() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const token = getSessionToken();

  const { data: health, refetch: refetchHealth } = useQuery<HealthData>({
    queryKey: ["/api/dev/health"],
    queryFn: () => authFetch<HealthData>("/api/dev/health"),
    enabled: !!token,
    refetchInterval: 10000,
  });

  const executeMutation = useMutation({
    mutationFn: async (command: string) => {
      return authFetch<CommandResult>("/api/dev/commands/execute", {
        method: "POST",
        body: JSON.stringify({ command }),
      });
    },
    onSuccess: (result, command) => {
      if (result.output === "__CLEAR__") {
        setHistory([]);
        return;
      }
      setHistory((prev) => [...prev, { command, result, timestamp: Date.now() }]);
      setHistoryIndex(-1);
      refetchHealth();
    },
    onError: (error: Error, command) => {
      setHistory((prev) => [
        ...prev,
        {
          command,
          result: { success: false, output: `Error: ${error.message}`, timestamp: Date.now() },
          timestamp: Date.now(),
        },
      ]);
    },
  });

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    setInput("");
    executeMutation.mutate(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const commands = history.map((h) => h.command);
      if (commands.length === 0) return;
      const newIndex = historyIndex === -1 ? commands.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(commands[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const commands = history.map((h) => h.command);
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= commands.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(newIndex);
        setInput(commands[newIndex]);
      }
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0b0d0f] text-white flex items-center justify-center">
        <Card className="bg-[#141517] border-[#2a2d32]">
          <CardContent className="p-8 text-center">
            <Terminal className="w-12 h-12 mx-auto mb-4 text-[#3e73ff]" />
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="text-gray-400 mb-4">Please log in to access the Dev Console.</p>
            <Button
              onClick={() => (window.location.href = "/login")}
              className="bg-[#3e73ff] hover:bg-[#2d5cd6]"
              data-testid="button-login"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-8 h-8 text-[#3e73ff]" />
            <h1 className="text-2xl font-bold" data-testid="text-console-title">
              Dev Command Center
            </h1>
            <Badge
              variant="outline"
              className="border-[#3e73ff] text-[#3e73ff]"
              data-testid="badge-version"
            >
              v6.5
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {health && (
              <Badge
                variant={health.status === "healthy" ? "default" : "destructive"}
                data-testid="badge-status"
              >
                {health.status.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#141517] border-[#2a2d32]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-mono" data-testid="text-uptime">
                {health ? formatUptime(health.uptime) : "--"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#141517] border-[#2a2d32]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Memory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-mono" data-testid="text-memory">
                {health ? `${health.memory.heapUsed}/${health.memory.heapTotal}MB` : "--"}
              </p>
              {health?.memory.warning && (
                <p className="text-xs text-red-400">High usage</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#141517] border-[#2a2d32]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Cache
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-mono" data-testid="text-cache">
                {health ? `${health.cache.size}/${health.cache.maxSize}` : "--"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#141517] border-[#2a2d32]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Environment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-mono" data-testid="text-env">
                {health?.env || "--"}
              </p>
              <p className="text-xs text-gray-500">{health?.nodeVersion}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#141517] border-[#2a2d32]">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Terminal
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistory([])}
              data-testid="button-clear-history"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </CardHeader>
          <CardContent>
            <div
              ref={outputRef}
              className="bg-[#0b0d0f] rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm mb-4"
              data-testid="terminal-output"
            >
              <div className="text-[#3e73ff] mb-2">
                PacAI Dev Console v6.5 - Type 'help' for available commands
              </div>
              {history.map((entry, i) => (
                <div key={i} className="mb-3">
                  <div className="text-green-400">
                    <span className="text-gray-500">$</span> {entry.command}
                  </div>
                  <pre
                    className={`whitespace-pre-wrap mt-1 ${
                      entry.result.success ? "text-gray-300" : "text-red-400"
                    }`}
                  >
                    {entry.result.output}
                  </pre>
                </div>
              ))}
              {executeMutation.isPending && (
                <div className="text-gray-500 animate-pulse">Executing...</div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 font-mono">
                  $
                </span>
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter command..."
                  className="pl-8 bg-[#0b0d0f] border-[#2a2d32] font-mono"
                  disabled={executeMutation.isPending}
                  data-testid="input-command"
                />
              </div>
              <Button
                type="submit"
                disabled={executeMutation.isPending || !input.trim()}
                className="bg-[#3e73ff] hover:bg-[#2d5cd6]"
                data-testid="button-execute"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-gray-500 text-sm">
          <p>Commands: help, health, memory, cache, pipelines, uptime, version, env, clear</p>
        </div>
      </div>
    </div>
  );
}
