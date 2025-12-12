import { getMemoryStats } from "./circuit-breaker";
import { getCacheStats, invalidateCache } from "./prompt-cache";
import { listPipelines, getRecentRuns, getPipelineRun } from "./pipeline-engine";

export interface CommandResult {
  success: boolean;
  output: string;
  data?: unknown;
  timestamp: number;
}

export interface CommandHandler {
  name: string;
  description: string;
  usage: string;
  execute: (args: string[]) => Promise<CommandResult>;
}

const commandRegistry: Map<string, CommandHandler> = new Map();

function formatBytes(mb: number): string {
  return `${mb}MB`;
}

function registerCommand(handler: CommandHandler): void {
  commandRegistry.set(handler.name, handler);
}

registerCommand({
  name: "help",
  description: "Show available commands",
  usage: "help [command]",
  execute: async (args) => {
    if (args[0]) {
      const cmd = commandRegistry.get(args[0]);
      if (!cmd) {
        return {
          success: false,
          output: `Unknown command: ${args[0]}`,
          timestamp: Date.now(),
        };
      }
      return {
        success: true,
        output: `${cmd.name} - ${cmd.description}\nUsage: ${cmd.usage}`,
        timestamp: Date.now(),
      };
    }

    const commands = Array.from(commandRegistry.values())
      .map((c) => `  ${c.name.padEnd(20)} ${c.description}`)
      .join("\n");

    return {
      success: true,
      output: `Available commands:\n${commands}\n\nType 'help <command>' for details.`,
      timestamp: Date.now(),
    };
  },
});

registerCommand({
  name: "health",
  description: "Show system health status",
  usage: "health",
  execute: async () => {
    const memory = getMemoryStats();
    const cache = getCacheStats();
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const status = memory.warning ? "WARNING" : "HEALTHY";
    const output = [
      `System Status: ${status}`,
      `Uptime: ${hours}h ${minutes}m ${seconds}s`,
      `Memory: ${formatBytes(memory.heapUsed)}/${formatBytes(memory.heapTotal)} heap, ${formatBytes(memory.rss)} RSS`,
      `Cache: ${cache.size}/${cache.maxSize} entries`,
      `Node Version: ${process.version}`,
    ].join("\n");

    return {
      success: true,
      output,
      data: { memory, cache, uptime, status },
      timestamp: Date.now(),
    };
  },
});

registerCommand({
  name: "memory",
  description: "Show detailed memory statistics",
  usage: "memory",
  execute: async () => {
    const stats = getMemoryStats();
    const output = [
      "Memory Usage:",
      `  RSS:      ${formatBytes(stats.rss)}`,
      `  Heap Used: ${formatBytes(stats.heapUsed)}`,
      `  Heap Total: ${formatBytes(stats.heapTotal)}`,
      `  External:  ${formatBytes(stats.external)}`,
      stats.warning ? "\n⚠ WARNING: Memory usage exceeds threshold" : "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      success: true,
      output,
      data: stats,
      timestamp: Date.now(),
    };
  },
});

registerCommand({
  name: "cache",
  description: "Cache management commands",
  usage: "cache stats | cache clear [pattern]",
  execute: async (args) => {
    const subcommand = args[0];

    if (!subcommand || subcommand === "stats") {
      const stats = getCacheStats();
      const output = [
        "Cache Statistics:",
        `  Entries: ${stats.size}/${stats.maxSize}`,
        `  Hit Rate: ${stats.hitRate}`,
      ].join("\n");

      return {
        success: true,
        output,
        data: stats,
        timestamp: Date.now(),
      };
    }

    if (subcommand === "clear") {
      const pattern = args[1];
      const cleared = invalidateCache(pattern);
      const output = pattern
        ? `Cleared ${cleared} cache entries matching '${pattern}'`
        : `Cleared all ${cleared} cache entries`;

      return {
        success: true,
        output,
        data: { cleared, pattern },
        timestamp: Date.now(),
      };
    }

    return {
      success: false,
      output: `Unknown cache subcommand: ${subcommand}. Use 'cache stats' or 'cache clear [pattern]'`,
      timestamp: Date.now(),
    };
  },
});

registerCommand({
  name: "pipelines",
  description: "Pipeline management commands",
  usage: "pipelines list | pipelines recent [limit] | pipelines status <runId>",
  execute: async (args) => {
    const subcommand = args[0] || "list";

    if (subcommand === "list") {
      const pipelines = listPipelines();
      if (pipelines.length === 0) {
        return {
          success: true,
          output: "No pipelines registered.",
          timestamp: Date.now(),
        };
      }

      const output = ["Registered Pipelines:", ...pipelines.map((p) => `  - ${p}`)].join("\n");

      return {
        success: true,
        output,
        data: pipelines,
        timestamp: Date.now(),
      };
    }

    if (subcommand === "recent") {
      const limit = parseInt(args[1]) || 10;
      const runs = getRecentRuns(limit);

      if (runs.length === 0) {
        return {
          success: true,
          output: "No recent pipeline runs.",
          timestamp: Date.now(),
        };
      }

      const lines = runs.map((r) => {
        const duration = r.completedAt ? `${r.completedAt - r.startedAt}ms` : "running";
        const status = r.status.toUpperCase().padEnd(10);
        return `  ${r.id.substring(0, 20).padEnd(22)} ${status} ${r.pipelineName.padEnd(20)} ${duration}`;
      });

      const output = [`Recent Pipeline Runs (${runs.length}):`, ...lines].join("\n");

      return {
        success: true,
        output,
        data: runs,
        timestamp: Date.now(),
      };
    }

    if (subcommand === "status") {
      const runId = args[1];
      if (!runId) {
        return {
          success: false,
          output: "Usage: pipelines status <runId>",
          timestamp: Date.now(),
        };
      }

      const run = getPipelineRun(runId);
      if (!run) {
        return {
          success: false,
          output: `Pipeline run not found: ${runId}`,
          timestamp: Date.now(),
        };
      }

      const duration = run.completedAt
        ? `${run.completedAt - run.startedAt}ms`
        : `${Date.now() - run.startedAt}ms (running)`;

      const output = [
        `Pipeline Run: ${run.id}`,
        `  Pipeline: ${run.pipelineName}`,
        `  Status: ${run.status.toUpperCase()}`,
        `  Duration: ${duration}`,
        run.error ? `  Error: ${run.error}` : "",
        run.logs.length > 0 ? `\nLogs:\n${run.logs.slice(-5).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        success: true,
        output,
        data: run,
        timestamp: Date.now(),
      };
    }

    return {
      success: false,
      output: `Unknown pipelines subcommand: ${subcommand}`,
      timestamp: Date.now(),
    };
  },
});

registerCommand({
  name: "uptime",
  description: "Show server uptime",
  usage: "uptime",
  execute: async () => {
    const uptime = Math.floor(process.uptime());
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return {
      success: true,
      output: `Uptime: ${parts.join(" ")}`,
      data: { uptime, days, hours, minutes, seconds },
      timestamp: Date.now(),
    };
  },
});

registerCommand({
  name: "version",
  description: "Show PacAI version info",
  usage: "version",
  execute: async () => {
    const output = [
      "PacAI v6.4",
      `Node: ${process.version}`,
      `Platform: ${process.platform}`,
      `Architecture: ${process.arch}`,
    ].join("\n");

    return {
      success: true,
      output,
      timestamp: Date.now(),
    };
  },
});

registerCommand({
  name: "clear",
  description: "Clear terminal output",
  usage: "clear",
  execute: async () => {
    return {
      success: true,
      output: "__CLEAR__",
      timestamp: Date.now(),
    };
  },
});

registerCommand({
  name: "env",
  description: "Show environment info (safe)",
  usage: "env",
  execute: async () => {
    const output = [
      `NODE_ENV: ${process.env.NODE_ENV || "development"}`,
      `PORT: ${process.env.PORT || "5000"}`,
      `DATABASE: ${process.env.DATABASE_URL ? "configured" : "not configured"}`,
      `OPENAI: ${process.env.OPENAI_API_KEY ? "configured" : "not configured"}`,
    ].join("\n");

    return {
      success: true,
      output,
      timestamp: Date.now(),
    };
  },
});

export function getCommand(name: string): CommandHandler | undefined {
  return commandRegistry.get(name);
}

export function getAllCommands(): CommandHandler[] {
  return Array.from(commandRegistry.values());
}

export async function executeCommand(input: string): Promise<CommandResult> {
  const parts = input.trim().split(/\s+/);
  const commandName = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  if (!commandName) {
    return {
      success: false,
      output: "No command provided. Type 'help' for available commands.",
      timestamp: Date.now(),
    };
  }

  const handler = commandRegistry.get(commandName);
  if (!handler) {
    return {
      success: false,
      output: `Unknown command: ${commandName}. Type 'help' for available commands.`,
      timestamp: Date.now(),
    };
  }

  try {
    return await handler.execute(args);
  } catch (error) {
    return {
      success: false,
      output: `Error executing ${commandName}: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: Date.now(),
    };
  }
}
