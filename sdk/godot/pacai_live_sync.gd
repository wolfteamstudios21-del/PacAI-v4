# PacAI v6.3 Godot SDK - Live Sync Module (REST Polling)
# Uses REST API polling for engines without socket.io support
# For real-time WebSocket, use godot-socketio-client addon
extends Node

class_name PacAILiveSync

signal override_received(data: Dictionary)
signal npcs_received(npcs: Array)
signal dialogs_received(dialogs: Array)
signal conflicts_received(conflicts: Array)
signal world_chunk_received(world: Dictionary)
signal generation_received(data: Dictionary)
signal connected()
signal disconnected()

@export var server_url: String = "https://your-pacai-server.com"
@export var project_id: String = ""
@export var auth_token: String = ""

@export_group("Generation Settings")
@export var subscribe_to_world: bool = true
@export var subscribe_to_npcs: bool = true
@export var subscribe_to_dialog: bool = true
@export var subscribe_to_conflict: bool = true
@export var poll_frequency_seconds: float = 5.0

var _http_request: HTTPRequest
var _poll_timer: Timer
var _is_connected: bool = false
var _last_tick: int = 0

func _ready() -> void:
        _setup_http()
        _setup_timer()
        _check_connection()

func _setup_http() -> void:
        _http_request = HTTPRequest.new()
        add_child(_http_request)
        _http_request.request_completed.connect(_on_request_completed)

func _setup_timer() -> void:
        _poll_timer = Timer.new()
        _poll_timer.wait_time = poll_frequency_seconds
        _poll_timer.autostart = false
        _poll_timer.timeout.connect(_poll_generation)
        add_child(_poll_timer)

func _check_connection() -> void:
        var url = server_url + "/v5/health"
        _http_request.request(url, _get_headers(), HTTPClient.METHOD_GET)

func _get_headers() -> PackedStringArray:
        return PackedStringArray([
                "Content-Type: application/json",
                "Authorization: Bearer " + auth_token
        ])

func start_polling() -> void:
        if project_id.is_empty():
                push_error("[PacAI] Project ID required")
                return
        
        _poll_timer.start()
        _is_connected = true
        connected.emit()
        print("[PacAI] Started polling for project: %s" % project_id)

func stop_polling() -> void:
        _poll_timer.stop()
        _is_connected = false
        disconnected.emit()
        print("[PacAI] Stopped polling")

func _poll_generation() -> void:
        var url = server_url + "/v5/gen/random"
        _http_request.request(url, _get_headers(), HTTPClient.METHOD_GET)

func poll_tick() -> void:
        if project_id.is_empty():
                return
        
        var url = server_url + "/v5/projects/" + project_id + "/tick"
        var body = JSON.stringify({"deltaTime": poll_frequency_seconds})
        _http_request.request(url, _get_headers(), HTTPClient.METHOD_POST, body)

func push_override(command: String) -> void:
        if project_id.is_empty():
                push_error("[PacAI] Project ID required")
                return
        
        var url = server_url + "/v5/projects/" + project_id + "/override"
        var body = JSON.stringify({"command": command, "user": "godot-client"})
        
        var http = HTTPRequest.new()
        add_child(http)
        http.request_completed.connect(func(_result, _code, _headers, body_bytes):
                var response = JSON.parse_string(body_bytes.get_string_from_utf8())
                if response and response.has("override"):
                        override_received.emit(response["override"])
                http.queue_free()
        )
        http.request(url, _get_headers(), HTTPClient.METHOD_POST, body)

func fetch_project_state() -> void:
        if project_id.is_empty():
                return
        
        var url = server_url + "/v5/projects/" + project_id
        _http_request.request(url, _get_headers(), HTTPClient.METHOD_GET)

func _on_request_completed(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
        if result != HTTPRequest.RESULT_SUCCESS:
                push_error("[PacAI] Request failed: %d" % result)
                return
        
        if response_code != 200:
                push_error("[PacAI] Server returned: %d" % response_code)
                return
        
        var json = JSON.new()
        var parse_result = json.parse(body.get_string_from_utf8())
        if parse_result != OK:
                return
        
        var data = json.get_data()
        if not data is Dictionary:
                return
        
        _process_response(data)

func _process_response(data: Dictionary) -> void:
        # Health check response
        if data.has("status") and data["status"] == "operational":
                print("[PacAI] Server connected: %s" % data.get("version", "unknown"))
                start_polling()
                return
        
        # Generation response (from /v5/gen/random)
        if data.has("seed") and data.has("biome"):
                generation_received.emit(data)
                
                if data.has("positions") and subscribe_to_world:
                        world_chunk_received.emit({
                                "positions": data["positions"],
                                "biome": data["biome"],
                                "seed": data["seed"]
                        })
                return
        
        # Tick response
        if data.has("tick") and data.has("entity_updates"):
                _last_tick = data["tick"]
                if data.has("events"):
                        for event in data["events"]:
                                if event["type"] == "combat":
                                        conflicts_received.emit([event])
                return
        
        # Project state response
        if data.has("state") and data.has("id"):
                print("[PacAI] Project state loaded: %s" % data["name"])
                return

func _exit_tree() -> void:
        stop_polling()


# Example usage in your game:
#
# extends Node3D
#
# var pacai: PacAILiveSync
#
# func _ready():
#     pacai = PacAILiveSync.new()
#     pacai.server_url = "https://your-server.com"
#     pacai.project_id = "proj_abc123"
#     pacai.auth_token = "your-jwt-token"
#     pacai.poll_frequency_seconds = 5.0
#     add_child(pacai)
#     
#     pacai.generation_received.connect(_on_generation)
#     pacai.override_received.connect(_on_override)
#
# func _on_generation(data: Dictionary):
#     print("New generation: ", data)
#     for pos in data.get("positions", []):
#         spawn_entity(Vector3(pos.x, pos.y, pos.z))
#
# func _on_override(data: Dictionary):
#     if data.get("success"):
#         print("Override applied: ", data.get("command"))
#
# func spawn_enemy():
#     pacai.push_override("spawn 5 hostile at 10, 20")
