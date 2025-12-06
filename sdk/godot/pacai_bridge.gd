## PacAI v5 Live Override Bridge for Godot 4.x
##
## This script connects your Godot game to PacAI's live override system,
## allowing real-time tweaks from the dashboard without restarting the game.
##
## INSTALLATION:
## 1. Add this script to an autoload singleton (Project > Project Settings > Autoload)
## 2. Configure the session_id and auth_token from your PacAI export
## 3. Call connect_to_server() to start receiving overrides
##
## USAGE:
## - Connect the override_received signal to your game logic
## - The bridge handles reconnection and fallback polling automatically

extends Node

## Connection settings
@export var server_url: String = "https://pacaiwolfstudio.com"
@export var session_id: String = ""
@export var auth_token: String = ""

## Fallback settings
@export var poll_interval: float = 10.0
@export var enable_logging: bool = true

## Signals
signal connected()
signal disconnected()
signal override_received(payload: Dictionary)
signal client_count_changed(count: int)

var _socket: WebSocketPeer
var _is_connected: bool = false
var _poll_timer: float = 0.0
var _http_request: HTTPRequest
var _reconnect_timer: float = 0.0
var _reconnect_delay: float = 5.0

func _ready() -> void:
	_socket = WebSocketPeer.new()
	_http_request = HTTPRequest.new()
	add_child(_http_request)
	_http_request.request_completed.connect(_on_poll_completed)

func _process(delta: float) -> void:
	if _is_connected:
		_socket.poll()
		var state = _socket.get_ready_state()
		
		if state == WebSocketPeer.STATE_OPEN:
			while _socket.get_available_packet_count() > 0:
				var packet = _socket.get_packet()
				_handle_message(packet.get_string_from_utf8())
		elif state == WebSocketPeer.STATE_CLOSED:
			_is_connected = false
			emit_signal("disconnected")
			_log("Disconnected from server")
	else:
		# Fallback polling
		_poll_timer += delta
		if _poll_timer >= poll_interval:
			_poll_timer = 0.0
			_poll_overrides()
		
		# Reconnection
		_reconnect_timer += delta
		if _reconnect_timer >= _reconnect_delay:
			_reconnect_timer = 0.0
			connect_to_server()

## Connect to PacAI server
func connect_to_server() -> void:
	if session_id.is_empty() or auth_token.is_empty():
		push_error("[PacAI] Session ID and Auth Token are required")
		return
	
	var ws_url = server_url.replace("https://", "wss://").replace("http://", "ws://")
	ws_url += "/ws/?token=" + auth_token.uri_encode()
	
	var err = _socket.connect_to_url(ws_url)
	if err != OK:
		push_error("[PacAI] Failed to connect: " + str(err))
		return
	
	_is_connected = true
	_log("Connecting to server...")

## Disconnect from server
func disconnect_from_server() -> void:
	if _socket.get_ready_state() == WebSocketPeer.STATE_OPEN:
		_send_message({
			"type": "leave-session",
			"sessionId": session_id
		})
		_socket.close()
	_is_connected = false

func _handle_message(data: String) -> void:
	var json = JSON.new()
	var error = json.parse(data)
	if error != OK:
		push_warning("[PacAI] Failed to parse message: " + data)
		return
	
	var msg = json.get_data()
	if not msg is Dictionary:
		return
	
	# Handle Socket.IO protocol
	if msg.has("type"):
		match msg["type"]:
			"connect":
				_log("Connected to server")
				emit_signal("connected")
				_send_message({
					"type": "join-session",
					"sessionId": session_id
				})
			
			"apply-override":
				var payload = msg.get("payload", {})
				_log("Override received: %s = %s" % [payload.get("key", "?"), str(payload.get("value", "?"))])
				emit_signal("override_received", payload)
				_apply_override(payload)
			
			"client-count":
				var count = msg.get("count", 0)
				_log("Clients connected: " + str(count))
				emit_signal("client_count_changed", count)

func _send_message(data: Dictionary) -> void:
	if _socket.get_ready_state() == WebSocketPeer.STATE_OPEN:
		_socket.send_text(JSON.stringify(data))

## Override this method to apply changes to your game
func _apply_override(payload: Dictionary) -> void:
	var key = payload.get("key", "")
	var value = payload.get("value")
	var entity_id = payload.get("entityId", "")
	
	match key:
		"behavior":
			# Example: Find entity and change behavior
			# var entity = get_node_or_null("/root/Game/Entities/" + entity_id)
			# if entity and entity.has_method("set_behavior"):
			#     entity.set_behavior(str(value))
			pass
		
		"speed_multiplier":
			Engine.time_scale = float(value) if value else 1.0
		
		"ai_enabled":
			# Example: Toggle AI processing
			# get_tree().call_group("ai_agents", "set_ai_enabled", bool(value))
			pass
		
		"time_of_day":
			# Example: Set time of day
			# var world_env = get_node_or_null("/root/Game/WorldEnvironment")
			# if world_env:
			#     world_env.environment.sky.set_sky_time(float(value))
			pass
		
		_:
			_log("Unhandled override: " + key)

func _poll_overrides() -> void:
	if session_id.is_empty():
		return
	
	var url = server_url + "/v5/sessions/" + session_id + "/overrides"
	var error = _http_request.request(url)
	if error != OK:
		push_warning("[PacAI] Poll request failed: " + str(error))

func _on_poll_completed(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code != 200:
		return
	
	var json = JSON.new()
	var error = json.parse(body.get_string_from_utf8())
	if error != OK:
		return
	
	var data = json.get_data()
	if data is Dictionary and data.has("liveQueue"):
		for override in data["liveQueue"]:
			if override.has("payload"):
				_apply_override(override["payload"])

func _log(message: String) -> void:
	if enable_logging:
		print("[PacAI] " + message)
