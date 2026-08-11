"""FREK-ID cryptographic services.

Ed25519 signing with private keys encrypted at rest (Fernet).
Private keys are NEVER stored in cleartext. This module is the reference
"signature service": FREKANSLA -> API -> signing service -> protected key -> Ed25519.
"""
import os
import json
import base64
import hashlib
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature

_MASTER_KEY = os.environ["FREK_MASTER_KEY"].encode()
_fernet = Fernet(_MASTER_KEY)


def b64e(data: bytes) -> str:
    return base64.b64encode(data).decode()


def b64d(data: str) -> bytes:
    return base64.b64decode(data.encode())


def canonical_json(obj) -> bytes:
    """Deterministic serialization used for hashing & signing."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def content_hash(obj) -> str:
    return sha256_hex(canonical_json(obj))


def generate_identity() -> dict:
    """Create a new FREK-ID: did:frek + Ed25519 keypair (private key encrypted)."""
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    raw_priv = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    raw_pub = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )

    # DID derived from the public key fingerprint (culturally traceable FREKCORE id).
    fingerprint = sha256_hex(raw_pub)[:40]
    did = f"did:frek:{fingerprint}"

    enc_priv = _fernet.encrypt(raw_priv).decode()

    return {
        "did": did,
        "public_key": b64e(raw_pub),
        "enc_private_key": enc_priv,
        "key_alg": "Ed25519",
        "branch": "FREK-ID / FREKCORE",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _load_private_key(enc_private_key: str) -> Ed25519PrivateKey:
    raw_priv = _fernet.decrypt(enc_private_key.encode())
    return Ed25519PrivateKey.from_private_bytes(raw_priv)


def sign_payload(enc_private_key: str, payload: dict) -> str:
    """Return base64 Ed25519 signature over the canonical payload."""
    key = _load_private_key(enc_private_key)
    signature = key.sign(canonical_json(payload))
    return b64e(signature)


def verify_signature(public_key_b64: str, payload: dict, signature_b64: str) -> bool:
    try:
        pub = Ed25519PublicKey.from_public_bytes(b64d(public_key_b64))
        pub.verify(b64d(signature_b64), canonical_json(payload))
        return True
    except (InvalidSignature, ValueError, Exception):
        return False
