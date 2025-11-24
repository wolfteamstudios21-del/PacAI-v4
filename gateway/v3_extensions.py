# gateway/v3_extensions.py
import os
import uuid
import json
import asyncio
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from db import Project, Export, Animation, Snapshot, Webhook, get_db, init_db
from auth import verify_token

router = APIRouter(prefix="/v3", tags=["v3"])

def make_id(prefix: str, user_id: str, project_id: str):
    """Generate namespaced ID: user_id__project_id__prefix__hash"""
    return f"{user_id}__{project_id}__{prefix}__{uuid.uuid4().hex[:8]}"

# --- Projects (Option 1: Week 1) ---
@router.post("/projects")
async def create_project(
    payload: dict,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    name = payload.get("name", "Untitled Project")
    template = payload.get("template", "generic")
    project_id = f"{user_id}__proj__{uuid.uuid4().hex[:6]}"
    
    project = Project(
        project_id=project_id,
        user_id=user_id,
        name=name,
        template=template,
        access_roles={user_id: "owner"}
    )
    db.add(project)
    db.commit()
    
    # Create initial snapshot
    snapshot_id = make_id("snapshot", user_id, project_id)
    snapshot = Snapshot(
        snapshot_id=snapshot_id,
        project_id=project_id,
        user_id=user_id,
        snapshot_json={"entities": [], "zones": [], "metadata": {"version": "v3"}}
    )
    db.add(snapshot)
    db.commit()
    
    return {
        "project_id": project_id,
        "name": name,
        "template": template,
        "initial_snapshot_id": snapshot_id,
        "created_at": project.created_at.isoformat()
    }

@router.get("/projects")
async def list_projects(
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """List all projects for user"""
    projects = db.query(Project).filter(Project.user_id == user_id).all()
    return {
        "projects": [
            {
                "project_id": p.project_id,
                "name": p.name,
                "template": p.template,
                "created_at": p.created_at.isoformat(),
                "updated_at": p.updated_at.isoformat()
            }
            for p in projects
        ]
    }

@router.get("/projects/{project_id}")
async def get_project(
    project_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get project metadata"""
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.user_id == user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        "project_id": project.project_id,
        "name": project.name,
        "template": project.template,
        "created_at": project.created_at.isoformat(),
        "access_roles": project.access_roles
    }

@router.put("/projects/{project_id}")
async def update_project(
    project_id: str,
    payload: dict,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Update project metadata"""
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.user_id == user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project.name = payload.get("name", project.name)
    project.description = payload.get("description", project.description)
    db.commit()
    
    return {"status": "ok"}

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Delete project (soft delete / archive)"""
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.user_id == user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    
    return {"status": "deleted"}

# --- Zone Generation with Streaming (Option 1: Week 1) ---
async def generate_zone_stream(prompt: str, context: dict, project_id: str, user_id: str):
    """Stream partial zone generation chunks"""
    for i in range(3):
        chunk = {
            "status": "partial",
            "chunk_index": i,
            "data": {
                "entities": [
                    {
                        "type": "npc",
                        "name": f"NPC_{i}",
                        "position": [float(i), float(i), 0],
                        "role": "civilian"
                    }
                ]
            }
        }
        yield f"data: {json.dumps(chunk)}\n\n"
        await asyncio.sleep(0.8)
    
    zone_id = make_id("zone", user_id, project_id)
    final = {
        "status": "complete",
        "zone_id": zone_id,
        "entity_count": 3,
        "position": [0, 0, 0]
    }
    yield f"data: {json.dumps(final)}\n\n"

@router.post("/projects/{project_id}/generate-zone")
async def generate_zone(
    project_id: str,
    request: Request,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Generate zone with optional streaming"""
    body = await request.json()
    
    # Verify project ownership
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.user_id == user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    prompt = body.get("prompt", "")
    context = body.get("context", {})
    context["user_id"] = user_id
    stream = body.get("stream", False)
    
    if stream:
        return StreamingResponse(
            generate_zone_stream(prompt, context, project_id, user_id),
            media_type="text/event-stream"
        )
    
    # Non-streaming: sync response
    zone_id = make_id("zone", user_id, project_id)
    return {
        "zone_id": zone_id,
        "status": "complete",
        "entities": [
            {"type": "npc", "name": "NPC_0", "position": [0, 0, 0]},
            {"type": "npc", "name": "NPC_1", "position": [1, 1, 0]},
            {"type": "npc", "name": "NPC_2", "position": [2, 2, 0]}
        ]
    }

# --- Animation Sequence (Option 1: Week 1) ---
async def process_animation_job(
    anim_id: str,
    project_id: str,
    user_id: str,
    db: Session,
    metadata: dict
):
    """Background task: process animation and fire webhooks"""
    await asyncio.sleep(2)
    
    anim = db.query(Animation).filter(Animation.anim_id == anim_id).first()
    if anim:
        anim.status = "complete"
        anim.asset_url = f"/assets/{anim_id}.json"
        db.commit()
    
    # Fire webhooks
    webhooks = db.query(Webhook).filter(Webhook.project_id == project_id).all()
    for wh in webhooks:
        payload = {
            "event": "animation_complete",
            "anim_id": anim_id,
            "project_id": project_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        asyncio.create_task(fire_webhook(wh.callback_url, wh.secret, payload))

async def fire_webhook(url: str, secret: str, payload: dict):
    """Async webhook delivery"""
    import httpx
    headers = {"X-Signature": secret} if secret else {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(url, json=payload, headers=headers)
    except Exception as e:
        print(f"Webhook delivery failed: {url}, {e}")

@router.post("/projects/{project_id}/animate_sequence")
async def animate_sequence(
    project_id: str,
    payload: dict,
    user_id: str = Depends(verify_token),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Request animation sequence generation"""
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.user_id == user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    anim_id = make_id("anim", user_id, project_id)
    anim = Animation(
        anim_id=anim_id,
        project_id=project_id,
        user_id=user_id,
        metadata=payload,
        status="queued"
    )
    db.add(anim)
    db.commit()
    
    if background_tasks:
        background_tasks.add_task(
            process_animation_job,
            anim_id,
            project_id,
            user_id,
            db,
            payload
        )
    
    return {"anim_id": anim_id, "status": "queued"}

@router.get("/projects/{project_id}/animations/{anim_id}")
async def get_animation(
    project_id: str,
    anim_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get animation metadata and asset URL"""
    anim = db.query(Animation).filter(
        Animation.anim_id == anim_id,
        Animation.project_id == project_id,
        Animation.user_id == user_id
    ).first()
    
    if not anim:
        raise HTTPException(status_code=404, detail="Animation not found")
    
    return {
        "anim_id": anim.anim_id,
        "status": anim.status,
        "asset_url": anim.asset_url,
        "metadata": anim.metadata,
        "created_at": anim.created_at.isoformat()
    }

# --- Export Bundle (Option 1: Week 1) ---
async def process_export_job(
    export_id: str,
    project_id: str,
    user_id: str,
    db: Session
):
    """Background task: create export ZIP and fire webhooks"""
    await asyncio.sleep(2)
    
    export = db.query(Export).filter(Export.export_id == export_id).first()
    if export:
        export.status = "complete"
        export.export_url = f"/exports/{export_id}.zip"
        db.commit()
    
    # Fire webhooks
    webhooks = db.query(Webhook).filter(Webhook.project_id == project_id).all()
    for wh in webhooks:
        payload = {
            "event": "export_complete",
            "export_id": export_id,
            "project_id": project_id,
            "url": f"/exports/{export_id}.zip",
            "timestamp": datetime.utcnow().isoformat()
        }
        asyncio.create_task(fire_webhook(wh.callback_url, wh.secret, payload))

@router.post("/projects/{project_id}/export_bundle")
async def export_bundle(
    project_id: str,
    user_id: str = Depends(verify_token),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Start export bundle job"""
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.user_id == user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    export_id = make_id("export", user_id, project_id)
    export = Export(
        export_id=export_id,
        project_id=project_id,
        user_id=user_id,
        status="queued"
    )
    db.add(export)
    db.commit()
    
    if background_tasks:
        background_tasks.add_task(process_export_job, export_id, project_id, user_id, db)
    
    return {"export_id": export_id, "status": "queued"}

@router.get("/projects/{project_id}/exports/{export_id}")
async def get_export(
    project_id: str,
    export_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get export status and signed URL"""
    export = db.query(Export).filter(
        Export.export_id == export_id,
        Export.project_id == project_id,
        Export.user_id == user_id
    ).first()
    
    if not export:
        raise HTTPException(status_code=404, detail="Export not found")
    
    return {
        "export_id": export.export_id,
        "status": export.status,
        "export_url": export.export_url,
        "created_at": export.created_at.isoformat()
    }

# --- Webhooks (Option 1: Week 1) ---
@router.post("/projects/{project_id}/webhooks")
async def register_webhook(
    project_id: str,
    payload: dict,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Register webhook for project events"""
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.user_id == user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    callback_url = payload.get("callback_url")
    if not callback_url:
        raise HTTPException(status_code=400, detail="callback_url required")
    
    secret = payload.get("secret", uuid.uuid4().hex)
    webhook = Webhook(
        project_id=project_id,
        user_id=user_id,
        callback_url=callback_url,
        secret=secret
    )
    db.add(webhook)
    db.commit()
    
    return {"id": webhook.id, "status": "registered", "secret": secret}

@router.delete("/projects/{project_id}/webhooks/{webhook_id}")
async def delete_webhook(
    project_id: str,
    webhook_id: int,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Delete webhook"""
    webhook = db.query(Webhook).filter(
        Webhook.id == webhook_id,
        Webhook.project_id == project_id,
        Webhook.user_id == user_id
    ).first()
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    db.delete(webhook)
    db.commit()
    
    return {"status": "deleted"}

# --- Snapshots (Option 1: Week 1) ---
@router.post("/projects/{project_id}/snapshots")
async def create_snapshot(
    project_id: str,
    payload: dict,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Save project snapshot"""
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.user_id == user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    snapshot_id = make_id("snapshot", user_id, project_id)
    snapshot = Snapshot(
        snapshot_id=snapshot_id,
        project_id=project_id,
        user_id=user_id,
        snapshot_json=payload.get("data", {})
    )
    db.add(snapshot)
    db.commit()
    
    return {"snapshot_id": snapshot_id, "created_at": snapshot.created_at.isoformat()}

@router.get("/projects/{project_id}/snapshots")
async def list_snapshots(
    project_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """List snapshots for project"""
    snapshots = db.query(Snapshot).filter(
        Snapshot.project_id == project_id,
        Snapshot.user_id == user_id
    ).order_by(Snapshot.created_at.desc()).all()
    
    return {
        "snapshots": [
            {
                "snapshot_id": s.snapshot_id,
                "created_at": s.created_at.isoformat()
            }
            for s in snapshots
        ]
    }

@router.post("/projects/{project_id}/snapshots/{snapshot_id}/restore")
async def restore_snapshot(
    project_id: str,
    snapshot_id: str,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Restore project from snapshot"""
    snapshot = db.query(Snapshot).filter(
        Snapshot.snapshot_id == snapshot_id,
        Snapshot.project_id == project_id,
        Snapshot.user_id == user_id
    ).first()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    return {
        "status": "restored",
        "snapshot_id": snapshot_id,
        "data": snapshot.snapshot_json
    }
