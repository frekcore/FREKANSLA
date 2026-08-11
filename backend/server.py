from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import copy
from pathlib import Path
from datetime import datetime, timezone

import frek_crypto as fc
from frek_models import (
    SessionCreate, CertifyRequest, VerifyRequest, DiagnosticsRequest,
    now_iso, new_id,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="FREKANSLA v0.1 API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("frekansla")

FK_VERSION = "0.1"
GENERATOR = "FREKANSLA v0.1 (Web Prototype)"


# ---------------- FREK-ID ----------------
async def get_or_create_identity() -> dict:
    ident = await db.frek_identity.find_one({"active": True}, {"_id": 0})
    if ident:
        return ident
    ident = fc.generate_identity()
    ident["active"] = True
    await db.frek_identity.insert_one(dict(ident))
    await append_provenance(None, "FREK_ID_GENERATED", "L0",
                            {"did": ident["did"], "alg": ident["key_alg"]})
    return ident


def public_identity(ident: dict) -> dict:
    return {
        "did": ident["did"],
        "public_key": ident["public_key"],
        "key_alg": ident["key_alg"],
        "branch": ident["branch"],
        "created_at": ident["created_at"],
        "label": "FREK-ID",
    }


# ---------------- Provenance (append-only) ----------------
async def append_provenance(object_id, event: str, level: str, detail: dict):
    entry = {
        "id": new_id(),
        "object_id": object_id,
        "event": event,
        "level": level,
        "actor": "FREK-ID",
        "detail": detail,
        "timestamp": now_iso(),
    }
    await db.provenance_events.insert_one(dict(entry))
    entry.pop("_id", None)
    return entry


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "FREKANSLA v0.1 API online", "version": FK_VERSION}


@api_router.get("/identity")
async def get_identity():
    ident = await get_or_create_identity()
    return public_identity(ident)


@api_router.post("/sessions")
async def create_session(payload: SessionCreate):
    """Pipeline step 1-2: Session Analyzer + Asset Compiler (L0/L1 proofs)."""
    ident = await get_or_create_identity()

    stems = [s.model_dump() for s in payload.stems]
    if not stems:
        # derive default stems from the source
        stems = [
            {"name": "Synth 1", "hash": fc.sha256_hex(f"synth1-{new_id()}".encode()),
             "duration": payload.duration, "source": payload.source_type},
            {"name": "Synth 2", "hash": fc.sha256_hex(f"synth2-{new_id()}".encode()),
             "duration": payload.duration, "source": payload.source_type},
        ]

    session = {
        "id": new_id(),
        "title": payload.title,
        "bpm": payload.bpm,
        "source_type": payload.source_type,
        "sample_hash": payload.sample_hash,
        "duration": payload.duration,
        "macros": payload.macros.model_dump(),
        "stems": stems,
        "owner_did": ident["did"],
        "created_at": now_iso(),
        "proofs_collected": {
            "L0_session": {"status": "collected", "at": now_iso(),
                            "desc": "Active session captured"},
            "L1_provenance": {"status": "verified", "at": now_iso(),
                              "coverage": 100, "desc": "Stem provenance verified"},
        },
    }
    await db.sessions.insert_one(dict(session))
    await append_provenance(session["id"], "SESSION_CREATED", "L0",
                            {"title": payload.title, "bpm": payload.bpm})
    await append_provenance(session["id"], "PROVENANCE_VERIFIED", "L1",
                            {"stems": len(stems), "coverage": 100})
    session.pop("_id", None)
    return session


def build_fk_object(session: dict, ident: dict, license_str: str) -> dict:
    content = {
        "session": {
            "title": session["title"],
            "bpm": session["bpm"],
            "macros": session["macros"],
        },
        "audio": {
            "source_type": session["source_type"],
            "sample_hash": session.get("sample_hash"),
            "duration": session["duration"],
        },
        "stems": session["stems"],
    }
    c_hash = fc.content_hash(content)

    manifest = {
        "type": "audio_certification",
        "title": session["title"],
        "created_at": now_iso(),
        "generator": GENERATOR,
        "fk_version": FK_VERSION,
        "content_hash": c_hash,
    }

    credentials = [
        {"level": "L0", "type": "session_capture", "issuer": ident["did"],
         "status": "collected"},
        {"level": "L1", "type": "provenance_verification", "issuer": ident["did"],
         "status": "verified", "coverage": 100},
        {"level": "L2", "type": "hardware_attestation", "issuer": "FREK Secure Element V3",
         "status": "confirmed", "simulated": True},
    ]

    proofs = {
        "attestation_level": "L2",
        "secure_element": {
            "model": "FREK Secure Element V3",
            "attestation_id": fc.sha256_hex(f"se-{session['id']}".encode())[:24],
            "simulated": True,
        },
        "anchor": {
            "type": "FREK-Chain / OpenTimestamps",
            "anchor_ref": fc.sha256_hex(f"anchor-{session['id']}".encode())[:32],
            "simulated": True,
            "status": "pending_confirmation",
        },
    }

    fk_object = {
        "fk_version": FK_VERSION,
        "object_id": new_id(),
        "manifest": manifest,
        "identity": public_identity(ident),
        "content": content,
        "rights": {
            "license": license_str,
            "owner_did": ident["did"],
            "transferable": True,
        },
        "credentials": credentials,
        "provenance": [],
        "proofs": proofs,
    }
    return fk_object


def signable_payload(fk_object: dict) -> dict:
    """Everything that is signed = the object without the signature block & provenance log."""
    payload = copy.deepcopy(fk_object)
    payload.get("proofs", {}).pop("signature", None)
    payload.pop("provenance", None)
    return payload


@api_router.post("/certify")
async def certify(payload: CertifyRequest):
    """Pipeline step 3-4: FK Object Creator (V3 hardware) + Secure Signature (Ed25519)."""
    session = await db.sessions.find_one({"id": payload.session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    ident_full = await get_or_create_identity()

    fk_object = build_fk_object(session, ident_full, payload.license)

    # Real Ed25519 signature over the canonical signable payload.
    payload_to_sign = signable_payload(fk_object)
    signed_fields_hash = fc.content_hash(payload_to_sign)
    signature_value = fc.sign_payload(ident_full["enc_private_key"], payload_to_sign)

    fk_object["proofs"]["signature"] = {
        "alg": "Ed25519",
        "did": ident_full["did"],
        "public_key": ident_full["public_key"],
        "signed_fields_hash": signed_fields_hash,
        "value": signature_value,
        "signed_at": now_iso(),
    }

    # provenance journal (append-only)
    events = []
    events.append(await append_provenance(fk_object["object_id"], "HARDWARE_ATTESTED", "L2",
                  {"secure_element": "V3", "simulated": True}))
    events.append(await append_provenance(fk_object["object_id"], "OBJECT_SIGNED", "L2",
                  {"alg": "Ed25519", "did": ident_full["did"]}))
    fk_object["provenance"] = events

    record = {
        "object_id": fk_object["object_id"],
        "session_id": payload.session_id,
        "title": fk_object["manifest"]["title"],
        "fk_object": fk_object,
        "published": False,
        "created_at": now_iso(),
    }
    await db.fk_objects.insert_one(dict(record))
    return fk_object


@api_router.get("/objects")
async def list_objects():
    docs = await db.fk_objects.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [{
        "object_id": d["object_id"],
        "title": d["title"],
        "created_at": d["created_at"],
        "published": d.get("published", False),
        "did": d["fk_object"]["identity"]["did"],
        "attestation_level": d["fk_object"]["proofs"]["attestation_level"],
        "content_hash": d["fk_object"]["manifest"]["content_hash"],
    } for d in docs]


@api_router.get("/objects/{object_id}")
async def get_object(object_id: str):
    d = await db.fk_objects.find_one({"object_id": object_id}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Object not found")
    return d["fk_object"]


@api_router.get("/objects/{object_id}/download")
async def download_object(object_id: str):
    d = await db.fk_objects.find_one({"object_id": object_id}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Object not found")
    filename = f"{d['title'].replace(' ', '_')}_{object_id[:8]}.fk"
    return JSONResponse(
        content=d["fk_object"],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api_router.get("/objects/{object_id}/provenance")
async def object_provenance(object_id: str):
    events = await db.provenance_events.find(
        {"object_id": object_id}, {"_id": 0}).sort("timestamp", 1).to_list(500)
    return events


@api_router.post("/objects/{object_id}/publish")
async def publish_object(object_id: str):
    d = await db.fk_objects.find_one({"object_id": object_id}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Object not found")
    kora_ref = fc.sha256_hex(f"kora-{object_id}".encode())[:32]
    await db.fk_objects.update_one(
        {"object_id": object_id},
        {"$set": {"published": True, "kora_ref": kora_ref, "published_at": now_iso()}},
    )
    await append_provenance(object_id, "PUBLISHED_TO_KORA", "L2",
                            {"kora_ref": kora_ref, "simulated": True})
    return {"object_id": object_id, "published": True, "kora_ref": kora_ref,
            "status": {"FREKCORE": "synced", "DAW_SYNC": "active", "HARDWARE": "attested"}}


# ---------------- Verification engine ----------------
def verify_engine(fk_object: dict, known_dids: set) -> dict:
    """Returns AUTHENTIC / VALID / UNVERIFIABLE / INVALID + tamper detection."""
    checks = {}
    proofs = fk_object.get("proofs", {})
    sig = proofs.get("signature")

    if not sig or "value" not in sig or "public_key" not in sig:
        return {"result": "UNVERIFIABLE", "reason": "Missing signature block",
                "checks": {"signature_present": False}, "tampered": False}

    payload = signable_payload(fk_object)
    recomputed_hash = fc.content_hash(payload)

    # tamper detection: signed_fields_hash must match recomputed payload hash
    hash_match = recomputed_hash == sig.get("signed_fields_hash")
    checks["signed_fields_hash_match"] = hash_match

    # content hash integrity
    content_ok = fc.content_hash(fk_object.get("content", {})) == \
        fk_object.get("manifest", {}).get("content_hash")
    checks["content_hash_match"] = content_ok

    sig_valid = fc.verify_signature(sig["public_key"], payload, sig["value"])
    checks["signature_valid"] = sig_valid

    did_known = sig.get("did") in known_dids
    checks["issuer_recognized"] = did_known

    tampered = (not hash_match) or (not content_ok) or (not sig_valid)

    if tampered:
        return {"result": "INVALID", "reason": "Signature or content integrity failed",
                "checks": checks, "tampered": True}
    if did_known:
        return {"result": "AUTHENTIC",
                "reason": "Signature valid, content intact, issuer recognized by FREKCORE",
                "checks": checks, "tampered": False}
    return {"result": "VALID",
            "reason": "Signature valid & content intact, issuer not in local FREKCORE registry",
            "checks": checks, "tampered": False}


async def known_dids_set() -> set:
    dids = await db.frek_identity.distinct("did")
    return set(dids)


@api_router.post("/verify")
async def verify(payload: VerifyRequest):
    known = await known_dids_set()
    return verify_engine(payload.fk_object, known)


@api_router.get("/objects/{object_id}/verify")
async def verify_object(object_id: str):
    d = await db.fk_objects.find_one({"object_id": object_id}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Object not found")
    known = await known_dids_set()
    return verify_engine(d["fk_object"], known)


# ---------------- Diagnostics console ----------------
async def resolve_object(req: DiagnosticsRequest) -> dict:
    if req.fk_object:
        return req.fk_object
    if req.object_id:
        d = await db.fk_objects.find_one({"object_id": req.object_id}, {"_id": 0})
        if d:
            return d["fk_object"]
    raise HTTPException(status_code=400, detail="Provide object_id or fk_object")


@api_router.post("/diagnostics")
async def diagnostics(req: DiagnosticsRequest):
    cmd = req.command.lower()
    lines = []
    if cmd == "inspect":
        obj = await resolve_object(req)
        m = obj["manifest"]
        lines = [
            f"$ frek inspect {obj['object_id']}",
            f"fk_version      : {obj['fk_version']}",
            f"type            : {m['type']}",
            f"title           : {m['title']}",
            f"generator       : {m['generator']}",
            f"issuer (did)    : {obj['identity']['did']}",
            f"attestation     : {obj['proofs']['attestation_level']}",
            f"stems           : {len(obj['content']['stems'])}",
            f"content_hash    : {m['content_hash'][:32]}...",
            "OK",
        ]
    elif cmd == "check":
        obj = await resolve_object(req)
        required = ["manifest", "identity", "content", "rights", "credentials", "proofs"]
        missing = [k for k in required if k not in obj]
        sig_ok = "signature" in obj.get("proofs", {})
        lines = [f"$ frek check {obj['object_id']}"]
        for k in required:
            lines.append(f"[{'OK' if k not in missing else 'FAIL'}] section: {k}")
        lines.append(f"[{'OK' if sig_ok else 'FAIL'}] signature present")
        lines.append("STRUCTURE VALID" if not missing and sig_ok else "STRUCTURE INCOMPLETE")
    elif cmd == "verify":
        obj = await resolve_object(req)
        known = await known_dids_set()
        res = verify_engine(obj, known)
        lines = [f"$ frek verify {obj['object_id']}"]
        for k, v in res["checks"].items():
            lines.append(f"[{'OK' if v else 'FAIL'}] {k}")
        lines.append(f"RESULT: {res['result']} — {res['reason']}")
    elif cmd == "doctor":
        obj = await resolve_object(req)
        known = await known_dids_set()
        res = verify_engine(obj, known)
        lines = [
            f"$ frek doctor {obj['object_id']}",
            "== IDENTITY ==",
            f"  did: {obj['identity']['did']}",
            f"  key_alg: {obj['identity']['key_alg']}",
            "== ATTESTATION ==",
            f"  level: {obj['proofs']['attestation_level']}",
            f"  secure_element: {obj['proofs']['secure_element']['model']} (simulated)",
            f"  anchor: {obj['proofs']['anchor']['type']} (simulated)",
            "== INTEGRITY ==",
        ]
        for k, v in res["checks"].items():
            lines.append(f"  [{'OK' if v else 'FAIL'}] {k}")
        lines.append(f"== VERDICT: {res['result']} ==")
    else:
        raise HTTPException(status_code=400, detail="Unknown command")
    return {"command": cmd, "lines": lines}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
