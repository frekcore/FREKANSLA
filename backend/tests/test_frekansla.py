"""Backend API tests for FREKANSLA v0.1."""
import os
import copy
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # fallback: read frontend/.env
    from pathlib import Path
    envp = Path("/app/frontend/.env").read_text()
    for line in envp.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------------- Identity ----------------
def test_identity_persistence(s):
    r1 = s.get(f"{API}/identity")
    assert r1.status_code == 200, r1.text
    d1 = r1.json()
    assert d1["did"].startswith("did:frek:")
    assert d1["key_alg"] == "Ed25519"
    assert isinstance(d1["public_key"], str) and len(d1["public_key"]) > 0

    r2 = s.get(f"{API}/identity")
    d2 = r2.json()
    assert d1["did"] == d2["did"], "FREK-ID must persist"
    assert d1["public_key"] == d2["public_key"]


# ---------------- Session ----------------
@pytest.fixture(scope="module")
def session_id(s):
    payload = {
        "title": "TEST_Session_1",
        "bpm": 128,
        "source_type": "synth",
        "duration": 12.3,
        "macros": {"warm_analog": 40, "intention_morph_x": 0.6,
                   "intention_morph_y": 0.4, "harmonic_aggression": 20,
                   "spatial_depth": 30},
        "stems": [],
    }
    r = s.post(f"{API}/sessions", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "id" in data
    assert data["title"] == "TEST_Session_1"
    assert len(data["stems"]) >= 2  # default stems
    assert data["proofs_collected"]["L0_session"]["status"] == "collected"
    assert data["proofs_collected"]["L1_provenance"]["status"] == "verified"
    return data["id"]


# ---------------- Certify ----------------
@pytest.fixture(scope="module")
def fk_object(s, session_id):
    r = s.post(f"{API}/certify", json={"session_id": session_id})
    assert r.status_code == 200, r.text
    obj = r.json()
    assert obj["fk_version"] == "0.1"
    assert "manifest" in obj and "identity" in obj and "content" in obj
    assert "rights" in obj and "credentials" in obj and "provenance" in obj
    sig = obj["proofs"]["signature"]
    assert sig["alg"] == "Ed25519"
    assert sig["value"] and sig["public_key"] and sig["signed_fields_hash"]
    levels = [c["level"] for c in obj["credentials"]]
    assert set(levels) == {"L0", "L1", "L2"}
    return obj


def test_certify_bad_session(s):
    r = s.post(f"{API}/certify", json={"session_id": "does-not-exist"})
    assert r.status_code == 404


# ---------------- Objects listing & retrieval ----------------
def test_list_objects(s, fk_object):
    r = s.get(f"{API}/objects")
    assert r.status_code == 200
    lst = r.json()
    assert any(o["object_id"] == fk_object["object_id"] for o in lst)


def test_get_object(s, fk_object):
    r = s.get(f"{API}/objects/{fk_object['object_id']}")
    assert r.status_code == 200
    assert r.json()["object_id"] == fk_object["object_id"]


def test_download_object(s, fk_object):
    r = s.get(f"{API}/objects/{fk_object['object_id']}/download")
    assert r.status_code == 200
    cd = r.headers.get("content-disposition", "")
    assert "attachment" in cd.lower()
    assert ".fk" in cd


# ---------------- Verify ----------------
def test_verify_object_authentic(s, fk_object):
    r = s.get(f"{API}/objects/{fk_object['object_id']}/verify")
    assert r.status_code == 200
    v = r.json()
    assert v["result"] == "AUTHENTIC"
    assert v["tampered"] is False
    for k, val in v["checks"].items():
        assert val is True, f"check {k} was false"


def test_verify_tampered_invalid(s, fk_object):
    tampered = copy.deepcopy(fk_object)
    tampered["content"]["session"]["title"] = "HACKED"
    r = s.post(f"{API}/verify", json={"fk_object": tampered})
    assert r.status_code == 200
    v = r.json()
    assert v["result"] == "INVALID"
    assert v["tampered"] is True


def test_verify_unverifiable_missing_signature(s, fk_object):
    obj = copy.deepcopy(fk_object)
    obj["proofs"].pop("signature", None)
    r = s.post(f"{API}/verify", json={"fk_object": obj})
    assert r.status_code == 200
    v = r.json()
    assert v["result"] == "UNVERIFIABLE"


# ---------------- Provenance ----------------
def test_provenance(s, fk_object):
    r = s.get(f"{API}/objects/{fk_object['object_id']}/provenance")
    assert r.status_code == 200
    events = r.json()
    kinds = {e["event"] for e in events}
    assert "HARDWARE_ATTESTED" in kinds
    assert "OBJECT_SIGNED" in kinds


# ---------------- Publish ----------------
def test_publish(s, fk_object):
    r = s.post(f"{API}/objects/{fk_object['object_id']}/publish")
    assert r.status_code == 200
    d = r.json()
    assert d["published"] is True
    assert d["kora_ref"]
    assert d["status"]["FREKCORE"] == "synced"
    assert d["status"]["HARDWARE"] == "attested"


# ---------------- Diagnostics ----------------
@pytest.mark.parametrize("cmd", ["inspect", "check", "verify", "doctor"])
def test_diagnostics(s, fk_object, cmd):
    r = s.post(f"{API}/diagnostics",
               json={"command": cmd, "object_id": fk_object["object_id"]})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["command"] == cmd
    assert isinstance(data["lines"], list) and len(data["lines"]) > 0


def test_diagnostics_unknown_command(s, fk_object):
    r = s.post(f"{API}/diagnostics",
               json={"command": "nope", "object_id": fk_object["object_id"]})
    assert r.status_code == 400
