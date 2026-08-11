"""FREK Object Model (FOM) & request/response schemas for FREKANSLA v0.1."""
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Inbound ----------
class MacroParams(BaseModel):
    warm_analog: float = 0.0        # 0..100
    intention_morph_x: float = 0.5  # 0..1
    intention_morph_y: float = 0.5  # 0..1
    harmonic_aggression: float = 0.0
    spatial_depth: float = 0.0


class Stem(BaseModel):
    name: str
    hash: str
    duration: float = 0.0
    source: str = "synth"  # synth | file


class SessionCreate(BaseModel):
    title: str = "Untitled Session"
    bpm: int = 124
    source_type: str = "synth"      # synth | file
    sample_hash: Optional[str] = None
    duration: float = 0.0
    macros: MacroParams = Field(default_factory=MacroParams)
    stems: List[Stem] = Field(default_factory=list)


class CertifyRequest(BaseModel):
    session_id: str
    license: str = "FREKCORE Creative Sovereign License v0.1"


class VerifyRequest(BaseModel):
    fk_object: Dict[str, Any]


class DiagnosticsRequest(BaseModel):
    command: str  # inspect | check | verify | doctor
    object_id: Optional[str] = None
    fk_object: Optional[Dict[str, Any]] = None
