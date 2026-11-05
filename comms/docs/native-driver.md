# BSG COMMS native driver foundation

This is original BSG COMMS JavaScript. No CHIRP source code is used.

- `native-driver.js`: model-aware driver contract, identification, simulated memory read, explicit physical hardware read and write guards.
- `virtual-radio.js`: deterministic in-memory radio for offline development.
- `tests/native-driver.test.mjs`: offline Node test coverage for isolation, failure, cancellation and write safeguards.

Run: `node --test comms/tests/native-driver.test.mjs`.

The virtual radio is not a verified UV-16 Pro V2 protocol emulator. Its commands and channel examples are internal test fixtures, not Baofeng protocol specifications. Existing UI simulation and USB transport remain unchanged; this foundation is deliberately isolated until integration and hardware verification can be completed. No physical radio commands are transmitted. Do not enable real memory writes before read-only hardware validation, complete backup and recovery testing.
