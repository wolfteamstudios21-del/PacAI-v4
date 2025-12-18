/**
 * PacAI v6.3 Live Override Bridge for Unity
 * 
 * This script connects your Unity game to PacAI's live override system,
 * allowing real-time tweaks from the dashboard without restarting the game.
 * 
 * INSTALLATION:
 * 1. Install NuGet package: SocketIOUnity (via Unity Package Manager or NuGet)
 * 2. Add this script to a GameObject in your scene
 * 3. Configure the sessionId and token from your PacAI export
 * 
 * USAGE:
 * - The bridge connects automatically on Start()
 * - Override events are received and logged to console
 * - Implement HandleOverride() to apply changes to your game
 */

using UnityEngine;
using SocketIOClient;
using System;
using System.Collections.Generic;

[System.Serializable]
public class OverridePayload
{
    public string entityId;
    public string key;
    public object value;
}

[System.Serializable]
public class ApplyOverrideEvent
{
    public string sessionId;
    public OverridePayload payload;
    public long timestamp;
    public string userId;
}

public class PacAIBridge : MonoBehaviour
{
    [Header("Connection Settings")]
    [Tooltip("PacAI server URL (e.g., https://pacaiwolfstudio.com)")]
    public string serverUrl = "https://pacaiwolfstudio.com";
    
    [Tooltip("Session ID from PacAI dashboard")]
    public string sessionId;
    
    [Tooltip("Authentication token from export")]
    public string authToken;
    
    [Header("Fallback Settings")]
    [Tooltip("Poll interval in seconds when WebSocket is disconnected")]
    public float pollInterval = 10f;
    
    [Header("Debug")]
    public bool logOverrides = true;
    
    private SocketIOUnity socket;
    private bool isConnected = false;
    private float pollTimer = 0f;
    
    // Event for override received
    public event Action<OverridePayload> OnOverrideReceived;
    
    void Start()
    {
        ConnectToServer();
    }
    
    void Update()
    {
        // Fallback polling if WebSocket disconnected
        if (!isConnected)
        {
            pollTimer += Time.deltaTime;
            if (pollTimer >= pollInterval)
            {
                pollTimer = 0f;
                PollOverrides();
            }
        }
    }
    
    void OnDestroy()
    {
        Disconnect();
    }
    
    public void ConnectToServer()
    {
        if (string.IsNullOrEmpty(sessionId) || string.IsNullOrEmpty(authToken))
        {
            Debug.LogError("[PacAI] Session ID and Auth Token are required");
            return;
        }
        
        var uri = new Uri(serverUrl);
        
        socket = new SocketIOUnity(uri, new SocketIOOptions
        {
            Path = "/ws",
            Auth = new Dictionary<string, string>
            {
                { "token", authToken }
            },
            Transport = SocketIOClient.Transport.TransportProtocol.WebSocket
        });
        
        socket.OnConnected += (sender, e) =>
        {
            isConnected = true;
            Debug.Log("[PacAI] Connected to server");
            socket.EmitAsync("join-session", sessionId);
        };
        
        socket.OnDisconnected += (sender, e) =>
        {
            isConnected = false;
            Debug.LogWarning("[PacAI] Disconnected from server");
        };
        
        socket.OnError += (sender, e) =>
        {
            Debug.LogError($"[PacAI] Error: {e}");
        };
        
        socket.On("apply-override", response =>
        {
            try
            {
                var evt = response.GetValue<ApplyOverrideEvent>();
                if (logOverrides)
                {
                    Debug.Log($"[PacAI] Override received: {evt.payload.key} = {evt.payload.value}");
                }
                
                // Dispatch to main thread
                UnityMainThreadDispatcher.Instance.Enqueue(() =>
                {
                    HandleOverride(evt.payload);
                    OnOverrideReceived?.Invoke(evt.payload);
                });
            }
            catch (Exception ex)
            {
                Debug.LogError($"[PacAI] Failed to parse override: {ex.Message}");
            }
        });
        
        socket.On("client-count", response =>
        {
            var data = response.GetValue<Dictionary<string, object>>();
            if (logOverrides && data.ContainsKey("count"))
            {
                Debug.Log($"[PacAI] {data["count"]} clients connected to session");
            }
        });
        
        socket.ConnectAsync();
    }
    
    public void Disconnect()
    {
        if (socket != null)
        {
            socket.EmitAsync("leave-session", sessionId);
            socket.DisconnectAsync();
            socket.Dispose();
            socket = null;
        }
        isConnected = false;
    }
    
    /// <summary>
    /// Override this method to handle incoming overrides
    /// </summary>
    protected virtual void HandleOverride(OverridePayload payload)
    {
        // Example implementations:
        switch (payload.key)
        {
            case "behavior":
                // FindAIController(payload.entityId)?.SetBehavior(payload.value.ToString());
                break;
                
            case "speed_multiplier":
                // Time.timeScale = Convert.ToSingle(payload.value);
                break;
                
            case "ai_enabled":
                // ToggleAllAI(Convert.ToBoolean(payload.value));
                break;
                
            case "time_of_day":
                // SetTimeOfDay(Convert.ToSingle(payload.value));
                break;
                
            default:
                Debug.Log($"[PacAI] Unhandled override: {payload.key}");
                break;
        }
    }
    
    private async void PollOverrides()
    {
        try
        {
            using (var client = new System.Net.Http.HttpClient())
            {
                var response = await client.GetAsync($"{serverUrl}/v5/sessions/{sessionId}/overrides");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    // Parse and apply pending overrides
                    Debug.Log($"[PacAI] Polled overrides: {json}");
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogWarning($"[PacAI] Poll failed: {ex.Message}");
        }
    }
}

/// <summary>
/// Helper class to dispatch actions to the main Unity thread
/// </summary>
public class UnityMainThreadDispatcher : MonoBehaviour
{
    private static UnityMainThreadDispatcher _instance;
    private Queue<Action> _executionQueue = new Queue<Action>();
    
    public static UnityMainThreadDispatcher Instance
    {
        get
        {
            if (_instance == null)
            {
                var go = new GameObject("UnityMainThreadDispatcher");
                _instance = go.AddComponent<UnityMainThreadDispatcher>();
                DontDestroyOnLoad(go);
            }
            return _instance;
        }
    }
    
    public void Enqueue(Action action)
    {
        lock (_executionQueue)
        {
            _executionQueue.Enqueue(action);
        }
    }
    
    void Update()
    {
        lock (_executionQueue)
        {
            while (_executionQueue.Count > 0)
            {
                _executionQueue.Dequeue().Invoke();
            }
        }
    }
}
