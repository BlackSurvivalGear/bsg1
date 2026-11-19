# Captured UV-16 session: offline read validation

The owner-provided CHIRP serial trace captured a successful BF-F8HP-selected read over COM4 at 9600 baud, with identification response, firmware marker `HN5RV01`, and 64-byte memory block responses.

This PR adds a **mock-only**, non-serial byte-protocol replay that verifies the observed message shapes and two sampled frequency memory blocks. It cannot accept a Web Serial port or a real serial transport and does not modify the BSG COMMS UI. The captured trace and full memory image are not committed; test fixtures use only the six known factory frequency records.

The replay includes synthetic sequencing to exercise error paths. It does not establish a complete, exact read protocol and is **not** proof that a UV-16 Pro V2 can be read through the live website. In particular the hardware's byte timing, actual auxiliary ACK framing, full memory map, band settings, firmware variants, cancellation and model identification still require separate validation.

**Remaining gate:** compare the raw recorded transaction sequence byte-for-byte; implement an explicitly allowlisted, model-gated read protocol and obtain an authorised direct physical read test. Radio writing, erasing and configuration changes are out of scope, and deployment requires separate permission.
