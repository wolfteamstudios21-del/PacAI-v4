// PacAI v5.3 Unity SDK - Live Sync Module
// Connects to PacAI WebSocket for real-time override sync and continuous generation

using System;
using System.Collections.Generic;
using UnityEngine;
using SocketIOClient;

namespace PacAI.SDK
{
    [Serializable]
    public class NPCData
    {
        public string id;
        public string type;
        public string faction;
        public Vector3 position;
        public int health;
        public string behavior;
        public float aggression;
        public string[] equipment;
    }

    [Serializable]
    public class DialogData
    {
        public string id;
        public string speaker;
        public string text;
        public string priority;
        public long timestamp;
        public int duration;
    }

    [Serializable]
    public class ConflictEvent
    {
        public string id;
        public string type;
        public Vector3 location;
        public string[] factions;
        public float intensity;
        public string outcome;
    }

    [Serializable]
    public class OverrideData
    {
        public string projectId;
        public string command;
        public string user;
        public bool success;
        public Dictionary<string, object> changes;
        public long timestamp;
    }

    public class PacAILiveSync : MonoBehaviour
    {
        [Header("Connection Settings")]
        public string serverUrl = "https://your-pacai-server.com";
        public string projectId;
        public string authToken;

        [Header("Generation Settings")]
        public bool subscribeToWorld = true;
        public bool subscribeToNPCs = true;
        public bool subscribeToDialog = true;
        public bool subscribeToConflict = true;
        public float generationFrequencySeconds = 30f;

        [Header("Events")]
        public Action<OverrideData> OnOverrideReceived;
        public Action<NPCData[]> OnNPCsReceived;
        public Action<DialogData[]> OnDialogsReceived;
        public Action<ConflictEvent[]> OnConflictsReceived;
        public Action<object> OnWorldChunkReceived;

        private SocketIO socket;
        private bool isConnected = false;

        async void Start()
        {
            await ConnectToServer();
        }

        async System.Threading.Tasks.Task ConnectToServer()
        {
            socket = new SocketIO(serverUrl, new SocketIOOptions
            {
                Path = "/ws",
                Auth = new { token = authToken }
            });

            socket.OnConnected += (sender, e) =>
            {
                Debug.Log("[PacAI] Connected to live sync server");
                isConnected = true;
                SubscribeToProject();
                SubscribeToGeneration();
            };

            socket.OnDisconnected += (sender, e) =>
            {
                Debug.Log("[PacAI] Disconnected from server");
                isConnected = false;
            };

            socket.On("project-override", response =>
            {
                var data = response.GetValue<OverrideData>();
                Debug.Log($"[PacAI] Override received: {data.command}");
                MainThread.Enqueue(() => OnOverrideReceived?.Invoke(data));
            });

            socket.On("project-generated", response =>
            {
                Debug.Log("[PacAI] New world generation received");
            });

            socket.On("project-state", response =>
            {
                Debug.Log("[PacAI] State update received");
            });

            socket.On("gen-pull", response =>
            {
                var data = response.GetValue<Dictionary<string, object>>();
                ProcessGenerationData(data);
            });

            socket.On("global-event", response =>
            {
                Debug.Log("[PacAI] Global event received");
            });

            socket.On("error", response =>
            {
                Debug.LogError($"[PacAI] Error: {response}");
            });

            await socket.ConnectAsync();
        }

        void SubscribeToProject()
        {
            if (string.IsNullOrEmpty(projectId)) return;
            socket.EmitAsync("subscribe-project", new { projectId });
            Debug.Log($"[PacAI] Subscribed to project: {projectId}");
        }

        void SubscribeToGeneration()
        {
            socket.EmitAsync("subscribe-gen", new
            {
                type = "all",
                frequency = (int)(generationFrequencySeconds * 1000),
                projectId,
                includeNPCs = subscribeToNPCs,
                includeDialog = subscribeToDialog,
                includeConflict = subscribeToConflict
            });
            Debug.Log("[PacAI] Subscribed to continuous generation");
        }

        void ProcessGenerationData(Dictionary<string, object> data)
        {
            MainThread.Enqueue(() =>
            {
                if (data.ContainsKey("npcs") && subscribeToNPCs)
                {
                    var npcs = JsonUtility.FromJson<NPCData[]>(data["npcs"].ToString());
                    OnNPCsReceived?.Invoke(npcs);
                }

                if (data.ContainsKey("dialogs") && subscribeToDialog)
                {
                    var dialogs = JsonUtility.FromJson<DialogData[]>(data["dialogs"].ToString());
                    OnDialogsReceived?.Invoke(dialogs);
                }

                if (data.ContainsKey("conflicts") && subscribeToConflict)
                {
                    var conflicts = JsonUtility.FromJson<ConflictEvent[]>(data["conflicts"].ToString());
                    OnConflictsReceived?.Invoke(conflicts);
                }

                if (data.ContainsKey("world") && subscribeToWorld)
                {
                    OnWorldChunkReceived?.Invoke(data["world"]);
                }
            });
        }

        public async void PushOverride(string command)
        {
            if (!isConnected) return;
            await socket.EmitAsync("override-push", new
            {
                sessionId = projectId,
                payload = new { key = "override", value = command }
            });
        }

        async void OnDestroy()
        {
            if (socket != null)
            {
                await socket.DisconnectAsync();
            }
        }
    }

    public static class MainThread
    {
        private static Queue<Action> actions = new Queue<Action>();
        
        public static void Enqueue(Action action)
        {
            lock (actions) actions.Enqueue(action);
        }

        public static void Update()
        {
            lock (actions)
            {
                while (actions.Count > 0) actions.Dequeue()?.Invoke();
            }
        }
    }
}
