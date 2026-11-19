# HN5RV01 — bounded single-channel write rehearsal

The designated test UV-16 Pro V2 is the only future physical test target. The other two radios are excluded.

This change rehearses a **single occupied channel**, changing only its RX/TX BCD bytes, preserving its eight unknown bytes and all other slots. It uses the existing validated offline frequency codec and a strictly in-memory mock, including ACK/NAK, interruption and full-image readback comparison. It does **not** connect to USB, send a CHIRP `X` frame, expose writable bytes through the website, or enable Write/Verify.

CHIRP BF-F8HP in `chirp/drivers/uv5r.py` uses 16-byte writes and expects an ACK, but its full upload writes many main and auxiliary ranges. This is **not** equivalent to an established safe one-block HN5RV01 hardware operation.

**Still required before any physical write:** independently validate one-block HN5RV01 write/commit behaviour, verify allowed ranges and recovery from interruption, and retain a genuinely restorable backup. Neither the existing `.img` nor the BSG read-region snapshot is yet verified as a recovery image. Explicit separate authorisation will be required for a physical test. No deployment or merge is authorised by this PR.
