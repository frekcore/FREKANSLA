# FREKANSLA v0.1 — PRD (Product Requirements & Build Log)

## Original problem statement
Web prototype faithfully reproducing the FREKANSLA plugin (spec v0.1 + 2 captures), with
real-time Web Audio DSP (Waves/FabFilter style) and serving as executable functional
specification for a future VST3/AU (JUCE) port. React + FastAPI + MongoDB.

Two screens:
1. **V026 CREATIVE ENGINE** — simulated Logic Pro X decor + FREKANSLA plugin window,
   SONIC FLOW real-time visualization, 4 macros (WARM ANALOG, INTENTION MORPH XY sphere,
   HARMONIC AGGRESSION, SPATIAL DEPTH), synth or WAV/MP3 source.
2. **MASTER CERTIFIER** — 4-step pipeline (Session Analyzer, Asset Compiler,
   FK Object Creator V3 hardware, Secure Signature Ed25519), .FK Explorer, diagnostics
   console (inspect/check/verify/doctor), action bar (Package .FK / Export Audio / Publish KORA).

## Confirmed user decisions
- Priority: **visual plugin + backend/certification/.FK first**; heavier DSP later.
- Audio: both synth + WAV/MP3 import, DSP kept intentionally minimal for v0.1.
- Ed25519 signing **backend-side**, private keys **encrypted at rest (Fernet)**, never cleartext.
- Faithful dark DAW visuals (anthracite plugin, gold/blue luminescence).
- JUCE/VST3 porting doc: deferred.

## Architecture
- **Backend** (`/app/backend`): `server.py` (routes), `frek_crypto.py` (Ed25519 + Fernet-encrypted
  key store + canonical JSON hashing/signing), `frek_models.py` (FOM schemas).
  MongoDB collections: `frek_identity`, `sessions`, `fk_objects`, `provenance_events`.
- **Frontend** (`/app/frontend/src`): `store/FrekContext.js` (shared state + audio engine),
  `audio/AudioEngine.js` (Web Audio DSP graph + offline WAV render), `pages/CreativeEngine.js`,
  `pages/CertificationPortal.js`, `components/plugin/*`, `components/cert/*`, `components/daw/*`.

## Implemented (2026-06)
- FREK-ID: did:frek + real Ed25519, private key encrypted at rest. Persistent across calls.
- FREK Object Model + versioned .FK container (manifest/identity/content/rights/credentials/proofs/provenance), downloadable.
- Real Ed25519 signing over canonical payload; content hashing.
- Verification engine: AUTHENTIC / VALID / UNVERIFIABLE / INVALID + tamper detection (verified via tests).
- Append-only provenance journal. Diagnostics console (inspect/check/verify/doctor).
- Publish to KORA (simulated), Secure Element V3 + FREK-Chain/OTS anchor (simulated).
- Creative Engine: DAW decor, plugin window, SONIC FLOW canvas visualizer, 4 macros + XY morph sphere,
  real-time Web Audio DSP (waveshaper/biquad/convolver), synth + file import, transport.
- Certification Portal: animated 4-step pipeline, .FK explorer, diagnostics, WAV export, publish.
- Tests: 15/15 backend pytest pass; full frontend e2e pass (iteration_1).

## Backlog
- P1: Provenance timeline UI panel per object; drag-and-drop .FK re-verify (upload external .FK).
- P1: Heavier/serious DSP engine (spectral morph, true stereo widener, better reverb).
- P2: JUCE/VST3 porting documentation (DSP mapping, parameter map, architecture).
- P2: Multi-identity / FREKCORE registry for real AUTHENTIC vs VALID distinction; KMS/HSM signing.
- P2: MP3 export (currently WAV only).

## Next tasks
- Await user feedback on visuals & flow; integrate the 2 real captures when provided.
