import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Upload, Wifi, WifiOff, Send, Trash2, Users, Clock, AlertCircle } from "lucide-react";

interface OverridePayload {
  entityId?: string;
  key: string;
  value: any;
}

interface OverrideEvent {
  sessionId: string;
  payload: OverridePayload;
  timestamp: number;
  userId?: string;
}

interface LiveOverridesProps {
  sessionId: string;
  token: string;
  username: string;
  onClose?: () => void;
}

export function LiveOverrides({ sessionId, token, username, onClose }: LiveOverridesProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [clientCount, setClientCount] = useState(0);
  const [overrideHistory, setOverrideHistory] = useState<OverrideEvent[]>([]);
  const [entityId, setEntityId] = useState("");
  const [overrideKey, setOverrideKey] = useState("");
  const [overrideValue, setOverrideValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const wsUrl = window.location.origin;
    const newSocket = io(wsUrl, {
      path: "/ws",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      setConnected(true);
      setError(null);
      newSocket.emit("join-session", sessionId);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      setError(`Connection error: ${err.message}`);
      setConnected(false);
    });

    newSocket.on("client-count", ({ count }: { count: number }) => {
      setClientCount(count);
    });

    newSocket.on("apply-override", (event: OverrideEvent) => {
      setOverrideHistory((prev) => [event, ...prev].slice(0, 50));
    });

    newSocket.on("override-ack", ({ success, clientsReached }: { success: boolean; clientsReached: number }) => {
      setIsPending(false);
      if (success) {
        setOverrideKey("");
        setOverrideValue("");
        setEntityId("");
      }
    });

    newSocket.on("error", ({ message }: { message: string }) => {
      setError(message);
      setIsPending(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leave-session", sessionId);
      newSocket.disconnect();
    };
  }, [sessionId, token]);

  const pushOverride = useCallback(() => {
    if (!socket || !overrideKey) return;

    setIsPending(true);
    setError(null);

    let parsedValue: any = overrideValue;
    try {
      parsedValue = JSON.parse(overrideValue);
    } catch {
      if (overrideValue === "true") parsedValue = true;
      else if (overrideValue === "false") parsedValue = false;
      else if (!isNaN(Number(overrideValue))) parsedValue = Number(overrideValue);
    }

    socket.emit("override-push", {
      sessionId,
      payload: {
        entityId: entityId || undefined,
        key: overrideKey,
        value: parsedValue,
      },
    });
  }, [socket, sessionId, entityId, overrideKey, overrideValue]);

  const quickOverrides = [
    { label: "Aggressive", key: "behavior", value: "aggressive" },
    { label: "Passive", key: "behavior", value: "passive" },
    { label: "Speed +50%", key: "speed_multiplier", value: "1.5" },
    { label: "Pause AI", key: "ai_enabled", value: "false" },
    { label: "Resume AI", key: "ai_enabled", value: "true" },
    { label: "Day Time", key: "time_of_day", value: "12" },
    { label: "Night Time", key: "time_of_day", value: "0" },
  ];

  return (
    <div className="bg-[#141517] border border-[#2a2d33] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold">Live Overrides</h3>
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}
            data-testid="status-connection"
          >
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-[#9aa0a6]">
          <span className="flex items-center gap-1" data-testid="text-client-count">
            <Users className="w-4 h-4" />
            {clientCount} client{clientCount !== 1 ? "s" : ""}
          </span>
          {onClose && (
            <button onClick={onClose} className="text-[#9aa0a6] hover:text-white">
              Close
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Entity ID (optional)"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="bg-[#1f2125] border border-[#2a2d33] rounded-lg px-3 py-2 text-white placeholder-[#9aa0a6] text-sm"
            data-testid="input-entity-id"
          />
          <input
            type="text"
            placeholder="Key (e.g., behavior)"
            value={overrideKey}
            onChange={(e) => setOverrideKey(e.target.value)}
            className="bg-[#1f2125] border border-[#2a2d33] rounded-lg px-3 py-2 text-white placeholder-[#9aa0a6] text-sm"
            data-testid="input-override-key"
          />
          <input
            type="text"
            placeholder="Value"
            value={overrideValue}
            onChange={(e) => setOverrideValue(e.target.value)}
            className="bg-[#1f2125] border border-[#2a2d33] rounded-lg px-3 py-2 text-white placeholder-[#9aa0a6] text-sm"
            data-testid="input-override-value"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={pushOverride}
            disabled={!connected || !overrideKey || isPending}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-sm"
            data-testid="button-push-override"
          >
            <Send className="w-4 h-4" />
            {isPending ? "Pushing..." : "Push Live"}
          </button>

          <div className="flex gap-2 flex-wrap">
            {quickOverrides.map((qo) => (
              <button
                key={`${qo.key}-${qo.value}`}
                onClick={() => {
                  setOverrideKey(qo.key);
                  setOverrideValue(qo.value);
                }}
                className="px-3 py-1 bg-[#1f2125] hover:bg-[#2a2d33] rounded-lg text-xs text-[#9aa0a6] hover:text-white"
                data-testid={`button-quick-${qo.key}-${qo.value}`}
              >
                {qo.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[#9aa0a6] mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Override History
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {overrideHistory.length === 0 ? (
            <p className="text-[#9aa0a6] text-sm">No overrides yet</p>
          ) : (
            overrideHistory.map((event, i) => (
              <div
                key={`${event.timestamp}-${i}`}
                className="flex items-center justify-between bg-[#1f2125] rounded-lg p-2 text-sm"
                data-testid={`row-override-${i}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-purple-400 font-mono">{event.payload.key}</span>
                  <span className="text-white">=</span>
                  <span className="text-green-400 font-mono">
                    {JSON.stringify(event.payload.value)}
                  </span>
                  {event.payload.entityId && (
                    <span className="text-[#9aa0a6] text-xs">
                      → {event.payload.entityId}
                    </span>
                  )}
                </div>
                <span className="text-[#9aa0a6] text-xs">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface SessionWithToken {
  id: string;
  name: string;
  status: string;
  connected_clients: number;
  token?: string;
}

interface SessionManagerProps {
  username: string;
}

export function SessionManager({ username }: SessionManagerProps) {
  const [sessions, setSessions] = useState<SessionWithToken[]>([]);
  const [sessionTokens, setSessionTokens] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [newSessionName, setNewSessionName] = useState("");
  const [activeSession, setActiveSession] = useState<{ id: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/v5/sessions?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async () => {
    if (!newSessionName.trim()) return;

    try {
      const res = await fetch("/v5/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name: newSessionName }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setSessions((prev) => [data.session, ...prev]);
        setSessionTokens((prev) => new Map(prev).set(data.session.id, data.token));
        setNewSessionName("");
        setActiveSession({ id: data.session.id, token: data.token });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to create session");
    }
  };

  const connectToSession = async (sessionId: string) => {
    let token = sessionTokens.get(sessionId);
    
    if (!token) {
      try {
        const res = await fetch(`/v5/sessions/${sessionId}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        if (res.ok && data.token) {
          token = data.token as string;
          setSessionTokens((prev) => new Map(prev).set(sessionId, data.token));
        } else {
          setError("Failed to get session token");
          return;
        }
      } catch (err) {
        setError("Failed to connect to session");
        return;
      }
    }
    
    if (!token) return;
    setActiveSession({ id: sessionId, token });
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await fetch(`/v5/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSessionTokens((prev) => {
        const newTokens = new Map(prev);
        newTokens.delete(sessionId);
        return newTokens;
      });
      if (activeSession?.id === sessionId) setActiveSession(null);
    } catch (err) {
      setError("Failed to delete session");
    }
  };

  if (activeSession) {
    return (
      <LiveOverrides
        sessionId={activeSession.id}
        token={activeSession.token}
        username={username}
        onClose={() => setActiveSession(null)}
      />
    );
  }

  return (
    <div className="bg-[#141517] border border-[#2a2d33] rounded-2xl p-6">
      <h3 className="text-xl font-bold mb-6">Live Override Sessions</h3>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-red-300">
            &times;
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="New session name..."
          value={newSessionName}
          onChange={(e) => setNewSessionName(e.target.value)}
          className="flex-1 bg-[#1f2125] border border-[#2a2d33] rounded-lg px-4 py-2 text-white placeholder-[#9aa0a6]"
          data-testid="input-session-name"
          onKeyDown={(e) => e.key === "Enter" && createSession()}
        />
        <button
          onClick={createSession}
          disabled={!newSessionName.trim()}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium"
          data-testid="button-create-session"
        >
          Create Session
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-[#9aa0a6]">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-[#9aa0a6]">No sessions yet. Create one to start pushing live overrides to game servers.</p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between bg-[#1f2125] rounded-lg p-4"
              data-testid={`row-session-${session.id}`}
            >
              <div>
                <p className="font-medium">{session.name}</p>
                <p className="text-sm text-[#9aa0a6]">
                  {session.connected_clients} client{session.connected_clients !== 1 ? "s" : ""} connected
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    session.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {session.status}
                </span>
                <button
                  onClick={() => connectToSession(session.id)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium"
                  data-testid={`button-connect-${session.id}`}
                >
                  Connect
                </button>
                <button
                  onClick={() => deleteSession(session.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                  data-testid={`button-delete-${session.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
