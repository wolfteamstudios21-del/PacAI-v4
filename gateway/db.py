# gateway/db.py
import os
from sqlalchemy import create_engine, Column, String, DateTime, JSON, Integer, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/aibraindb")
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# Models
class Project(Base):
    __tablename__ = "v3_projects"
    project_id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    name = Column(String)
    description = Column(String, nullable=True)
    template = Column(String, default="generic")
    access_roles = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Export(Base):
    __tablename__ = "v3_exports"
    export_id = Column(String, primary_key=True)
    project_id = Column(String, index=True)
    user_id = Column(String)
    export_url = Column(String, nullable=True)
    status = Column(String, default="queued")
    created_at = Column(DateTime, default=datetime.utcnow)

class Animation(Base):
    __tablename__ = "v3_animations"
    anim_id = Column(String, primary_key=True)
    project_id = Column(String, index=True)
    user_id = Column(String)
    metadata = Column(JSON, default={})
    asset_url = Column(String, nullable=True)
    status = Column(String, default="queued")
    created_at = Column(DateTime, default=datetime.utcnow)

class Snapshot(Base):
    __tablename__ = "v3_snapshots"
    snapshot_id = Column(String, primary_key=True)
    project_id = Column(String, index=True)
    user_id = Column(String)
    snapshot_json = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

class Webhook(Base):
    __tablename__ = "v3_webhooks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, index=True)
    user_id = Column(String)
    callback_url = Column(String)
    secret = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
