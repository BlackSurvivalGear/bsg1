# PR #80 — One read-only pre-write evidence capture

**Goal:** avoid another speculative write-protocol PR. Complete the missing CHIRP BF-F8HP auxiliary comparison with one additional, strictly read-only capture. **No physical Write is enabled.**

The existing `UV16ReadOnlySession.readMemory({captureRaw:true})` remains unchanged by default (35 block reads). For an explicitly requested extended capture, use `readMemory({captureRaw:true,captureCHIRPGuard:true})`. It reads the three extra 64-byte blocks at `0x1F00`, `0x1F40`, `0x1F80` with the existing read-only `S` request. Total: 38 reads. The result adds `chirpGuardCapture` with three hex regions and `restorable:false`. It does not create any `X` upload frame or enable the website Write button.

Use `compareBFF8HPCHIRPGuard(chirpImageBytes,readResult.chirpGuardCapture)` to compare CHIRP's three equality-guard areas. This returns per-area differences and always `canWrite:false`.

**Next physical step:** User-authorised read-only capture of the additional three blocks using the existing BSG serial reader. Capture is not yet wired to the website UI in this PR; this API is for integration. An offline guard match is not a restorable backup and is not sufficient for a radio write. A physical write still requires a verified firmware-specific write protocol and recoverability; do not use CHIRP Upload to Radio as a substitute.

Tests: existing read-only session tests plus new opt-in capture and comparison regression tests. No actual hardware tests are performed by CI. Do not merge or deploy without separate authorisation.
