# v4 Export Packager

Multi-engine exporters for:
- **UE5** - Unreal Engine 5 (JSON → uasset + blueprint)
- **Unity** - Unity 2022+ (JSON → prefab + scriptable object)
- **Godot** - Godot 4.0+ (JSON → tscn + GDScript)
- **VBS4** - Virtual Battlespace 4 (metadata + scenario format)
- **OneTESS** - OneOp Test & Evaluation Subsystem (defense sim adapter)

## Build (Week 7-8)

Each exporter is a standalone Rust module that:
1. Accepts scenario JSON (schema v1.2)
2. Generates engine-native assets
3. Signs with Ed25519 (HSM)
4. Produces versioned manifest

```bash
cargo build --release --features ue5,unity,godot,vbs4,onetess
```
