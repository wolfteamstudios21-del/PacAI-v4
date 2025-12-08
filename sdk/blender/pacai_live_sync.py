"""
PacAI v5.3 Blender SDK - Live Sync Module
Connects to PacAI WebSocket for real-time override sync and continuous generation
"""

import bpy
import json
import threading
from typing import Callable, Optional, Dict, List, Any
from dataclasses import dataclass

try:
    import socketio
except ImportError:
    print("[PacAI] Installing python-socketio...")
    import subprocess
    subprocess.check_call([bpy.app.binary_path_python, "-m", "pip", "install", "python-socketio[client]"])
    import socketio


@dataclass
class NPCData:
    id: str
    type: str
    faction: str
    position: tuple
    health: int
    behavior: str
    aggression: float
    equipment: List[str]


@dataclass
class DialogData:
    id: str
    speaker: str
    text: str
    priority: str
    timestamp: int
    duration: int


@dataclass
class ConflictEvent:
    id: str
    type: str
    location: tuple
    factions: List[str]
    intensity: float
    outcome: str


class PacAILiveSync:
    """Live sync client for PacAI WebSocket connection in Blender."""
    
    def __init__(
        self,
        server_url: str,
        project_id: str,
        auth_token: str,
        generation_frequency_seconds: float = 30.0,
        subscribe_to_world: bool = True,
        subscribe_to_npcs: bool = True,
        subscribe_to_dialog: bool = True,
        subscribe_to_conflict: bool = True
    ):
        self.server_url = server_url
        self.project_id = project_id
        self.auth_token = auth_token
        self.generation_frequency_seconds = generation_frequency_seconds
        self.subscribe_to_world = subscribe_to_world
        self.subscribe_to_npcs = subscribe_to_npcs
        self.subscribe_to_dialog = subscribe_to_dialog
        self.subscribe_to_conflict = subscribe_to_conflict
        
        self.sio = socketio.Client()
        self.is_connected = False
        
        # Callbacks
        self.on_override: Optional[Callable[[Dict], None]] = None
        self.on_npcs: Optional[Callable[[List[NPCData]], None]] = None
        self.on_dialogs: Optional[Callable[[List[DialogData]], None]] = None
        self.on_conflicts: Optional[Callable[[List[ConflictEvent]], None]] = None
        self.on_world_chunk: Optional[Callable[[Dict], None]] = None
        self.on_generation: Optional[Callable[[Dict], None]] = None
        
        self._setup_handlers()
    
    def _setup_handlers(self):
        @self.sio.on('connect')
        def on_connect():
            print("[PacAI] Connected to live sync server")
            self.is_connected = True
            self._subscribe_to_project()
            self._subscribe_to_generation()
        
        @self.sio.on('disconnect')
        def on_disconnect():
            print("[PacAI] Disconnected from server")
            self.is_connected = False
        
        @self.sio.on('project-override')
        def on_project_override(data):
            print(f"[PacAI] Override received: {data.get('command', '')}")
            if self.on_override:
                self._run_in_main_thread(lambda: self.on_override(data))
        
        @self.sio.on('project-generated')
        def on_project_generated(data):
            print("[PacAI] New world generation received")
            if self.on_generation:
                self._run_in_main_thread(lambda: self.on_generation(data))
        
        @self.sio.on('gen-pull')
        def on_gen_pull(data):
            self._process_generation_data(data)
        
        @self.sio.on('global-event')
        def on_global_event(data):
            print(f"[PacAI] Global event: {data.get('name', '')}")
        
        @self.sio.on('error')
        def on_error(data):
            print(f"[PacAI] Error: {data.get('message', 'Unknown')}")
    
    def _run_in_main_thread(self, func: Callable):
        """Run function in Blender's main thread."""
        bpy.app.timers.register(func, first_interval=0)
    
    def _subscribe_to_project(self):
        if not self.project_id:
            return
        self.sio.emit('subscribe-project', {'projectId': self.project_id})
        print(f"[PacAI] Subscribed to project: {self.project_id}")
    
    def _subscribe_to_generation(self):
        self.sio.emit('subscribe-gen', {
            'type': 'all',
            'frequency': int(self.generation_frequency_seconds * 1000),
            'projectId': self.project_id,
            'includeNPCs': self.subscribe_to_npcs,
            'includeDialog': self.subscribe_to_dialog,
            'includeConflict': self.subscribe_to_conflict
        })
        print("[PacAI] Subscribed to continuous generation")
    
    def _process_generation_data(self, data: Dict):
        def process():
            if 'npcs' in data and self.subscribe_to_npcs and self.on_npcs:
                npcs = [NPCData(
                    id=n['id'],
                    type=n['type'],
                    faction=n['faction'],
                    position=(n['position']['x'], n['position']['y'], n['position']['z']),
                    health=n['health'],
                    behavior=n['behavior'],
                    aggression=n['aggression'],
                    equipment=n.get('equipment', [])
                ) for n in data['npcs']]
                self.on_npcs(npcs)
            
            if 'dialogs' in data and self.subscribe_to_dialog and self.on_dialogs:
                dialogs = [DialogData(
                    id=d['id'],
                    speaker=d['speaker'],
                    text=d['text'],
                    priority=d['priority'],
                    timestamp=d['timestamp'],
                    duration=d['duration']
                ) for d in data['dialogs']]
                self.on_dialogs(dialogs)
            
            if 'conflicts' in data and self.subscribe_to_conflict and self.on_conflicts:
                conflicts = [ConflictEvent(
                    id=c['id'],
                    type=c['type'],
                    location=(c['location']['x'], c['location']['y'], c['location']['z']),
                    factions=c['factions'],
                    intensity=c['intensity'],
                    outcome=c['outcome']
                ) for c in data['conflicts']]
                self.on_conflicts(conflicts)
            
            if 'world' in data and self.subscribe_to_world and self.on_world_chunk:
                self.on_world_chunk(data['world'])
        
        self._run_in_main_thread(process)
    
    def connect(self):
        """Connect to PacAI server in background thread."""
        def _connect():
            try:
                self.sio.connect(
                    self.server_url,
                    socketio_path='/ws',
                    auth={'token': self.auth_token}
                )
            except Exception as e:
                print(f"[PacAI] Connection failed: {e}")
        
        thread = threading.Thread(target=_connect, daemon=True)
        thread.start()
    
    def push_override(self, command: str):
        """Push an override command to the server."""
        if not self.is_connected:
            print("[PacAI] Not connected, cannot push override")
            return
        
        self.sio.emit('override-push', {
            'sessionId': self.project_id,
            'payload': {'key': 'override', 'value': command}
        })
    
    def disconnect(self):
        """Disconnect from server."""
        if self.sio.connected:
            self.sio.emit('unsubscribe-project', {'projectId': self.project_id})
            self.sio.emit('unsubscribe-gen', {'type': 'all', 'projectId': self.project_id})
            self.sio.disconnect()


# Blender Operator for easy integration
class PACAI_OT_LiveSync(bpy.types.Operator):
    bl_idname = "pacai.live_sync"
    bl_label = "PacAI Live Sync"
    bl_description = "Connect to PacAI for live world generation"
    
    _client: Optional[PacAILiveSync] = None
    
    def execute(self, context):
        if PACAI_OT_LiveSync._client and PACAI_OT_LiveSync._client.is_connected:
            PACAI_OT_LiveSync._client.disconnect()
            PACAI_OT_LiveSync._client = None
            self.report({'INFO'}, "Disconnected from PacAI")
        else:
            # Configure via preferences or scene properties
            client = PacAILiveSync(
                server_url="https://your-pacai-server.com",
                project_id="your-project-id",
                auth_token="your-jwt-token",
                generation_frequency_seconds=30.0
            )
            
            client.on_npcs = self.handle_npcs
            client.on_world_chunk = self.handle_world
            
            client.connect()
            PACAI_OT_LiveSync._client = client
            self.report({'INFO'}, "Connecting to PacAI...")
        
        return {'FINISHED'}
    
    @staticmethod
    def handle_npcs(npcs: List[NPCData]):
        for npc in npcs:
            bpy.ops.mesh.primitive_cube_add(location=npc.position)
            obj = bpy.context.active_object
            obj.name = f"NPC_{npc.id}"
            obj.scale = (0.5, 0.5, 1.0)
    
    @staticmethod
    def handle_world(world: Dict):
        print(f"[PacAI] World chunk received with {len(world.get('tiles', []))} tiles")


def register():
    bpy.utils.register_class(PACAI_OT_LiveSync)


def unregister():
    bpy.utils.unregister_class(PACAI_OT_LiveSync)


if __name__ == "__main__":
    register()
