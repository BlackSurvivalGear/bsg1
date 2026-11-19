# UV-16 Pro V2: read-first acceptance gate

This is a **software-only comparison stage**, not a working hardware reader.

## Existing prerequisites
- PR #44 was merged into main. Its bounded receive-only Web Serial transport cannot send radio commands. It also includes an offline CHIRP-trace decoder for the six known factory frequencies; hardware read is still disabled.
- BSG COMMS already imports CHIRP CSV into receive-only channels.
- A successful BF-F8HP-labelled CHIRP export does **not** establish a UV-16 Pro V2 handshake, memory map, firmware compatibility or safe upload protocol.

## What this branch adds
- A pure comparison helper `compareDecodedMemories` that checks memory count and each corresponding RX, TX and FM/NFM mode using exact 1 Hz frequency units.
- Explicit mismatch reporting and fail-closed validation.
- Regression fixtures representing the six factory channel frequencies.

## Required hardware gate before a physical read button is enabled
1. The owner-provided CHIRP trace reports firmware identifier `HN5RV01` and demonstrates an acknowledged BF-F8HP-labelled read. Independently verify the precise radio model/firmware before using this with BSG; the trace alone does not prove all firmware variants compatible.
2. Complete the review of command bytes, frame boundaries, ACK rules, memory block addressing and failure behaviour using the captured session; do not infer unobserved behaviour from a related model.
3. Implement an allowlisted read protocol and model-specific decoder on top of the receive-only transport. Reject any unexpected response or model fingerprint.
4. Compare a decoded capture with the known six-memory CHIRP CSV using this helper; a match is necessary but **not sufficient** for protocol verification.
5. Test cancellation, timeout, disconnect, invalid frame, wrong model and malformed channels; run an authorised read on hardware.
6. Keep physical writes, erase and program commands disabled until a separately reviewed write protocol, pre-write backup, confirmation and read-back verification exist.

The `slot` in mismatch reports is a **zero-based array index**, not a verified physical memory address. Because the existing CHIRP importer discards Location, callers must ensure both arrays are aligned by actual memory location before comparison.

No frequency in a saved profile is automatically authorised for transmission. Do not program low-band frequencies into the UV-16.
