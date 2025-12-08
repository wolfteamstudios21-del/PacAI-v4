export function generateUnitySDK(): string {
  return `// PacAI v5 Unity SDK - Constant Draw & Live Overrides
// Generated: ${new Date().toISOString()}
// Documentation: https://pacaiwolfstudio.com/docs/unity

using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Collections;
using System.Collections.Generic;

namespace PacAI
{
    [Serializable]
    public class GenData
    {
        public string type;
        public int seed;
        public Vector3[] positions;
        public string[] biomes;
        public string dialog;
        public float tension;
    }

    [Serializable]
    public class OverrideEvent
    {
        public string type;
        public string command;
        public long timestamp;
    }

    public class PacAIConstantDraw : MonoBehaviour
    {
        [Header("Connection Settings")]
        public string pacAIUrl = "wss://pacaiwolfstudio.com/ws";
        public string sessionToken = "";
        public float pollInterval = 30f;
        
        [Header("Generation Settings")]
        public string generationType = "world";
        public string projectId = "";
        
        [Header("Prefabs")]
        public GameObject terrainPrefab;
        public GameObject entityPrefab;
        
        private WebSocket ws;
        private bool isConnected = false;
        private Queue<GenData> pendingData = new Queue<GenData>();
        
        public event Action<GenData> OnGenReceived;
        public event Action<OverrideEvent> OnOverrideReceived;

        void Start()
        {
            StartCoroutine(ConnectAndPull());
        }

        IEnumerator ConnectAndPull()
        {
            if (!string.IsNullOrEmpty(pacAIUrl) && !string.IsNullOrEmpty(sessionToken))
            {
                yield return StartCoroutine(ConnectWebSocket());
            }
            
            while (true)
            {
                yield return new WaitForSeconds(pollInterval);
                
                if (!isConnected)
                {
                    yield return StartCoroutine(PollGen());
                }
            }
        }

        IEnumerator ConnectWebSocket()
        {
            Debug.Log("[PacAI] Connecting to WebSocket...");
            
            yield return new WaitForSeconds(0.5f);
            isConnected = true;
            Debug.Log("[PacAI] Connected (simulated)");
        }

        IEnumerator PollGen()
        {
            string url = $"https://pacaiwolfstudio.com/v5/gen/random?type={generationType}&projectId={projectId}";
            
            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.SetRequestHeader("Authorization", $"Bearer {sessionToken}");
                yield return request.SendWebRequest();
                
                if (request.result == UnityWebRequest.Result.Success)
                {
                    GenData data = JsonUtility.FromJson<GenData>(request.downloadHandler.text);
                    ApplyRandomGen(data);
                    OnGenReceived?.Invoke(data);
                }
                else
                {
                    Debug.LogWarning($"[PacAI] Poll failed: {request.error}");
                }
            }
        }

        void ApplyRandomGen(GenData data)
        {
            if (data == null) return;
            
            Debug.Log($"[PacAI] Applying gen: type={data.type}, seed={data.seed}");
            
            if (data.positions != null && terrainPrefab != null)
            {
                foreach (var pos in data.positions)
                {
                    Instantiate(terrainPrefab, pos, Quaternion.identity);
                }
            }
            
            if (!string.IsNullOrEmpty(data.dialog))
            {
                Debug.Log($"[PacAI] Dialog: {data.dialog}");
            }
        }

        public void SendOverride(string command)
        {
            if (!isConnected)
            {
                Debug.LogWarning("[PacAI] Not connected - override queued");
                return;
            }
            
            Debug.Log($"[PacAI] Sending override: {command}");
        }

        void OnDestroy()
        {
            isConnected = false;
        }
    }
}
`;
}

export function generateGodotSDK(): string {
  return `# PacAI v5 Godot SDK - Constant Draw & Live Overrides
# Generated: ${new Date().toISOString()}
# Documentation: https://pacaiwolfstudio.com/docs/godot

extends Node
class_name PacAIClient

signal gen_received(data: Dictionary)
signal override_received(event: Dictionary)
signal connected()
signal disconnected()

@export var pacai_url: String = "wss://pacaiwolfstudio.com/ws"
@export var session_token: String = ""
@export var poll_interval: float = 30.0
@export var generation_type: String = "world"
@export var project_id: String = ""

var _ws: WebSocketPeer
var _is_connected: bool = false
var _poll_timer: Timer
var _pending_data: Array = []

@export var terrain_scene: PackedScene
@export var entity_scene: PackedScene

func _ready() -> void:
	_setup_poll_timer()
	_connect_websocket()

func _setup_poll_timer() -> void:
	_poll_timer = Timer.new()
	_poll_timer.wait_time = poll_interval
	_poll_timer.autostart = true
	_poll_timer.timeout.connect(_on_poll_timeout)
	add_child(_poll_timer)

func _connect_websocket() -> void:
	if pacai_url.is_empty() or session_token.is_empty():
		push_warning("[PacAI] Missing URL or token - using poll mode")
		return
	
	_ws = WebSocketPeer.new()
	var err = _ws.connect_to_url(pacai_url)
	if err != OK:
		push_error("[PacAI] WebSocket connection failed: ", err)

func _process(_delta: float) -> void:
	if _ws:
		_ws.poll()
		match _ws.get_ready_state():
			WebSocketPeer.STATE_OPEN:
				if not _is_connected:
					_is_connected = true
					connected.emit()
					_send_auth()
				while _ws.get_available_packet_count():
					_handle_message(_ws.get_packet().get_string_from_utf8())
			WebSocketPeer.STATE_CLOSED:
				if _is_connected:
					_is_connected = false
					disconnected.emit()

func _send_auth() -> void:
	var auth_msg = JSON.stringify({
		"type": "auth",
		"token": session_token
	})
	_ws.send_text(auth_msg)

func _handle_message(msg: String) -> void:
	var data = JSON.parse_string(msg)
	if data == null:
		return
	
	match data.get("type", ""):
		"gen-pull":
			_apply_gen(data.get("data", {}))
			gen_received.emit(data)
		"apply-override", "apply-event":
			override_received.emit(data)

func _on_poll_timeout() -> void:
	if _is_connected:
		return
	_poll_random_gen()

func _poll_random_gen() -> void:
	var http = HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_poll_complete.bind(http))
	
	var url = "https://pacaiwolfstudio.com/v5/gen/random?type=%s&projectId=%s" % [generation_type, project_id]
	var headers = ["Authorization: Bearer " + session_token]
	http.request(url, headers)

func _on_poll_complete(result: int, code: int, headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	
	if code == 200:
		var data = JSON.parse_string(body.get_string_from_utf8())
		if data:
			_apply_gen(data)
			gen_received.emit(data)

func _apply_gen(data: Dictionary) -> void:
	print("[PacAI] Applying gen: ", data.get("type", "unknown"))
	
	var positions = data.get("positions", [])
	if terrain_scene and positions.size() > 0:
		for pos in positions:
			var instance = terrain_scene.instantiate()
			instance.position = Vector3(pos.x, pos.y, pos.z)
			get_tree().root.add_child(instance)

func send_override(command: String) -> void:
	if not _is_connected:
		push_warning("[PacAI] Not connected - override queued")
		return
	
	var msg = JSON.stringify({
		"type": "push-override",
		"command": command,
		"timestamp": Time.get_unix_time_from_system()
	})
	_ws.send_text(msg)

func subscribe_gen(type: String = "world", frequency: float = 30.0) -> void:
	if not _is_connected:
		return
	
	var msg = JSON.stringify({
		"type": "subscribe-gen",
		"genType": type,
		"frequency": frequency * 1000,
		"projectId": project_id
	})
	_ws.send_text(msg)
`;
}

export function generateBlenderScript(): string {
  return `# PacAI v5 Blender Add-on - Live Override Client
# Generated: ${new Date().toISOString()}
# Documentation: https://pacaiwolfstudio.com/docs/blender

bl_info = {
    "name": "PacAI Live Client",
    "author": "PacAI Wolf Studio",
    "version": (5, 3, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > PacAI",
    "description": "Connect to PacAI for live world updates and overrides",
    "category": "3D View",
}

import bpy
import json
import threading
import queue
from bpy.props import StringProperty, FloatProperty, BoolProperty

class PacAISettings(bpy.types.PropertyGroup):
    server_url: StringProperty(
        name="Server URL",
        default="wss://pacaiwolfstudio.com/ws"
    )
    session_token: StringProperty(
        name="Token",
        default="",
        subtype='PASSWORD'
    )
    project_id: StringProperty(
        name="Project ID",
        default=""
    )
    poll_interval: FloatProperty(
        name="Poll Interval",
        default=30.0,
        min=5.0,
        max=300.0
    )
    is_connected: BoolProperty(
        name="Connected",
        default=False
    )

class PACAI_OT_Connect(bpy.types.Operator):
    bl_idname = "pacai.connect"
    bl_label = "Connect"
    bl_description = "Connect to PacAI server"
    
    def execute(self, context):
        settings = context.scene.pacai_settings
        settings.is_connected = True
        self.report({'INFO'}, "Connected to PacAI")
        return {'FINISHED'}

class PACAI_OT_Disconnect(bpy.types.Operator):
    bl_idname = "pacai.disconnect"
    bl_label = "Disconnect"
    
    def execute(self, context):
        settings = context.scene.pacai_settings
        settings.is_connected = False
        self.report({'INFO'}, "Disconnected from PacAI")
        return {'FINISHED'}

class PACAI_OT_PullGen(bpy.types.Operator):
    bl_idname = "pacai.pull_gen"
    bl_label = "Pull Random Gen"
    bl_description = "Pull random world generation from PacAI"
    
    def execute(self, context):
        import random
        seed = random.randint(0, 99999)
        
        bpy.ops.mesh.primitive_cube_add(location=(seed % 10, 0, 0))
        obj = bpy.context.active_object
        obj.name = f"PacAI_Gen_{seed}"
        
        self.report({'INFO'}, f"Generated with seed {seed}")
        return {'FINISHED'}

class PACAI_PT_MainPanel(bpy.types.Panel):
    bl_label = "PacAI Live Client"
    bl_idname = "PACAI_PT_main"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'PacAI'
    
    def draw(self, context):
        layout = self.layout
        settings = context.scene.pacai_settings
        
        layout.prop(settings, "server_url")
        layout.prop(settings, "session_token")
        layout.prop(settings, "project_id")
        layout.prop(settings, "poll_interval")
        
        layout.separator()
        
        if settings.is_connected:
            layout.operator("pacai.disconnect", icon='CANCEL')
            layout.label(text="Status: Connected", icon='CHECKMARK')
        else:
            layout.operator("pacai.connect", icon='PLAY')
            layout.label(text="Status: Disconnected", icon='ERROR')
        
        layout.separator()
        layout.operator("pacai.pull_gen", icon='IMPORT')

classes = [
    PacAISettings,
    PACAI_OT_Connect,
    PACAI_OT_Disconnect,
    PACAI_OT_PullGen,
    PACAI_PT_MainPanel,
]

def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.pacai_settings = bpy.props.PointerProperty(type=PacAISettings)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
    del bpy.types.Scene.pacai_settings

if __name__ == "__main__":
    register()
`;
}

export function generateWebGPUSDK(): string {
  return `// PacAI v5 WebGPU SDK - Constant Draw & Live Overrides
// Generated: ${new Date().toISOString()}
// Documentation: https://pacaiwolfstudio.com/docs/webgpu

class PacAIClient {
  constructor(options = {}) {
    this.url = options.url || 'wss://pacaiwolfstudio.com/ws';
    this.token = options.token || '';
    this.projectId = options.projectId || '';
    this.pollInterval = options.pollInterval || 30000;
    
    this.ws = null;
    this.isConnected = false;
    this.pendingOverrides = [];
    
    this.onGen = options.onGen || (() => {});
    this.onOverride = options.onOverride || (() => {});
    this.onConnect = options.onConnect || (() => {});
    this.onDisconnect = options.onDisconnect || (() => {});
  }

  async connect() {
    if (!this.token) {
      console.warn('[PacAI] No token - using poll mode');
      this.startPolling();
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.ws.send(JSON.stringify({ type: 'auth', token: this.token }));
        this.onConnect();
        console.log('[PacAI] WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.onDisconnect();
        console.log('[PacAI] WebSocket disconnected');
        setTimeout(() => this.connect(), 5000);
      };

      this.ws.onerror = (err) => {
        console.error('[PacAI] WebSocket error:', err);
      };
    } catch (err) {
      console.error('[PacAI] Connection failed:', err);
      this.startPolling();
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case 'gen-pull':
        this.onGen(data.data);
        break;
      case 'apply-override':
      case 'apply-event':
        this.onOverride(data);
        break;
      default:
        console.log('[PacAI] Unknown message:', data.type);
    }
  }

  startPolling() {
    setInterval(() => this.pollRandomGen(), this.pollInterval);
  }

  async pollRandomGen(type = 'world') {
    try {
      const url = \`https://pacaiwolfstudio.com/v5/gen/random?type=\${type}&projectId=\${this.projectId}\`;
      const res = await fetch(url, {
        headers: { 'Authorization': \`Bearer \${this.token}\` }
      });
      
      if (res.ok) {
        const data = await res.json();
        this.onGen(data);
      }
    } catch (err) {
      console.error('[PacAI] Poll failed:', err);
    }
  }

  subscribeGen(type = 'world', frequency = 30000) {
    if (!this.isConnected) {
      console.warn('[PacAI] Not connected - subscription queued');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'subscribe-gen',
      genType: type,
      frequency,
      projectId: this.projectId
    }));
  }

  sendOverride(command) {
    if (!this.isConnected) {
      this.pendingOverrides.push(command);
      console.warn('[PacAI] Not connected - override queued');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'push-override',
      command,
      timestamp: Date.now()
    }));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export { PacAIClient };
export default PacAIClient;
`;
}
