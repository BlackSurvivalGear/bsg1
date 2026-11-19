# PR #84 — UV-16 HN5RV01 real programming workflow

**Scope:** experimental one-channel **RX-only** write to the designated expendable UV-16 Pro V2, not the other two radios. This is a real device write, not simulation. A wrong response, interrupted write or firmware incompatibility could disable the test radio. No restoration or fallback recovery method has been demonstrated.

## Website sequence after authorised deployment

The successful read and the rejected write used the same magic and identification bytes. The identified defect is the website allowing a write after a completed full read without a fresh radio session; this patch does not change the CHIRP-compatible byte sequence or establish that a first hardware write will succeed.

1. Connect the test radio in desktop Chrome/Edge using the programming cable. Select UV-16 Pro V2.
2. Select **Read Full Radio** in the Radio Programming panel. If it fails, reconnect/power cycle and retry the read, not a write.
3. Select **Save Radio Backup Evidence**; store the JSON locally, as well as the original unmodified CHIRP `.img`. This is evidence, **not a proven restorable image**.
4. **Disconnect USB, power the test radio OFF and ON, and reconnect USB. Do not perform another Full Read in the new session: the saved capture remains available for programming.** The firmware may refuse a second programming handshake in the same powered session; the cause is not yet experimentally confirmed. Select one already occupied memory. Propose a new **RX** frequency. TX and all other bytes stay unchanged. The safest starting point is a known receiving frequency, with no transmit operation.
5. Press **Write Radio**. The software must reject a write in the same USB connection where the full read occurred. Confirm that you physically power-cycled the same radio; USB reconnect alone does not prove this. Review the old/new RX and unchanged TX; type `WRITE` and confirm the explicit risk prompt. A new handshake reads the target 64-byte block and five auxiliary 64-byte blocks, checks firmware HN5RV01 and checks that they match the saved baseline before emitting exactly one CHIRP BF-F8HP-style 16-byte `X` frame.
6. Whether an ACK is received or an error occurs **after attempting a write**, do not write again. Disconnect, power-cycle the same radio and reconnect.
7. Select **Verify Write**. The website reads all 6144 main bytes and five auxiliary blocks; verification passes only if all bytes match the original capture except the selected RX BCD changes. Export the newly read data. If anything differs, stop and preserve the original evidence.

No automatic retry, restore, full-image upload or auxiliary write is implemented. No claim is made that CHIRP BF-F8HP writing is proven safe for HN5RV01. The user must independently authorise deployment and physically click the confirmed write; creating/merging this PR **does not operate the radio**.
