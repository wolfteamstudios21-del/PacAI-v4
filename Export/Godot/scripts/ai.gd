extends Node
class_name PacAI_AI

# PacAI v6.3 Generated AI Controller
# This script handles NPC behavior trees and decision making

signal behavior_changed(npc_id: String, behavior: String)
signal target_acquired(npc_id: String, target: Node3D)
signal alert_triggered(npc_id: String, level: int)

enum BehaviorState {
        IDLE,
        PATROL,
        ALERT,
        COMBAT,
        FLEE,
        SEARCH
}

var current_state: BehaviorState = BehaviorState.IDLE
var awareness: float = 0.5
var aggression: float = 0.5
var patrol_points: Array[Vector3] = []
var current_patrol_index: int = 0

func _ready() -> void:
        print("PacAI AI Controller initialized")

func set_behavior(behavior: String, params: Dictionary = {}) -> void:
        match behavior:
                "patrol":
                        current_state = BehaviorState.PATROL
                        if params.has("points"):
                                patrol_points = params["points"]
                "alert":
                        current_state = BehaviorState.ALERT
                        if params.has("level"):
                                emit_signal("alert_triggered", name, params["level"])
                "combat":
                        current_state = BehaviorState.COMBAT
                "flee":
                        current_state = BehaviorState.FLEE
                "idle":
                        current_state = BehaviorState.IDLE
        
        emit_signal("behavior_changed", name, behavior)

func get_next_patrol_point() -> Vector3:
        if patrol_points.is_empty():
                return Vector3.ZERO
        
        var point = patrol_points[current_patrol_index]
        current_patrol_index = (current_patrol_index + 1) % patrol_points.size()
        return point

func calculate_threat_response(threat_level: float) -> BehaviorState:
        var response_threshold = aggression * awareness
        
        if threat_level > response_threshold * 1.5:
                return BehaviorState.FLEE if aggression < 0.3 else BehaviorState.COMBAT
        elif threat_level > response_threshold:
                return BehaviorState.ALERT
        else:
                return current_state

func apply_override(override_type: String, value: Variant) -> void:
        match override_type:
                "awareness":
                        awareness = clamp(float(value), 0.0, 1.0)
                "aggression":
                        aggression = clamp(float(value), 0.0, 1.0)
                "freeze":
                        current_state = BehaviorState.IDLE
                "alert_all":
                        current_state = BehaviorState.ALERT
