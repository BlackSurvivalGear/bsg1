# UV-16 Pro V2 direct reading: verification gate

The user confirmed a CHIRP **BF-F8HP** download from a physical **UV-16 Pro V2** through a Prolific serial cable at COM4. This verifies a specific CHIRP session, not the exact handshake bytes, full memory layout, or firmware revision needed for a new browser implementation.

## This branch

- Adds a bounded **receive-only Web Serial byte adapter** with exact-length accumulation, buffering, aborts, timeout, disconnection detection and error codes.
- The adapter has **no ability to send commands**: `write()` always rejects with `HARDWARE_UNVERIFIED`.
- Existing USB selection, CHIRP CSV importer, channel editor and synthetic simulator are unchanged.
- **Read Radio remains disabled** for physical hardware. No live radio communication is claimed.

## Required before enabling physical reads

1. Obtain an independently validated UV-16 Pro V2 identification handshake and firmware fingerprint, for example from a redacted CHIRP debug capture or reproducible protocol traces for the exact hardware.
2. Confirm memory address ranges, block read framing and ACK handling from that firmware, then test with deterministic fixtures.
3. Implement an explicit read-only command allowlist and verify every response, rejecting mismatches before parsing memory.
4. Decode memories in a separate model-specific module, rejecting invalid frequencies and unsupported settings instead of guessing.
5. Add cancellation, timeout, unplug and read-only regression tests, then conduct an **explicitly authorised** physical read against the known six memories and compare the output with the CHIRP export.
6. Preserve the existing editor channels unless the user confirms replacement. No upload/erase/programming command is permitted.

Sources reviewed: CHIRP Baofeng UV-5R family and BF-F8HP compatibility implementation, and BTECH's model-specific warning that “PRO”, “HP” and “V2” variants are not interchangeable.

**No radio writes, merge or deployment are authorised by this branch.**


## 19 November 2026 — CHIRP trace findings and offline decoder

A user-provided CHIRP serial trace of a successful read showed COM4 / Prolific, 9600 baud, a seven-byte initial identification sequence, a response/ACK exchange, the readable firmware identifier `HN5RV01`, and 64-byte `S`/ `X` framed memory-block reads. The trace and full radio memory dump are **not committed** to the public repository.

`uv16-trace-decoder.js` now validates acknowledged 64-byte read frames **offline** and extracts the first six BCD RX/TX frequency pairs from the first two blocks. A minimal anonymised regression fixture represents the six CHIRP-exported factory frequencies. The decoder does **not** infer FM/NFM, tones, power settings or memory identity from unverified bits.

### Remaining hardware gate

- Independently confirm model and firmware compatibility; the `HN5RV01` identifier from a BF-F8HP-selected CHIRP session is not sufficient to identify every UV-16 Pro V2 variant.
- Verify each block sequence, address range and error response, and integrate a tightly controlled, read-only protocol after separate hardware testing.
- Compare complete decoded channel settings with the CHIRP image/export and confirm memory locations, not merely list positions.
- Exercise timeout, unplug, partial-frame, bad-fingerprint and user-cancel scenarios on actual hardware.
- No code path sends radio programming commands or enables physical `Read Radio` or `Write Radio` controls.

