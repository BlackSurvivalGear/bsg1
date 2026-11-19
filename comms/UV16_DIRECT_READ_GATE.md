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
