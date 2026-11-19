# UV-16 Pro V2 / HN5RV01 — Read-region evidence and write-protocol readiness

## Verified by existing physical reads
- The read-only session enters its verified handshake once, checks identity and firmware `HN5RV01`, reads three existing auxiliary regions and scans **128 × 16-byte channel slots** in **32 × 64-byte blocks**.
- This PR optionally saves the original 2,048 channel-memory bytes plus the existing 64-byte regions at `0x1E80`, `0x1EC0` and `0x1FC0` from **the same read transaction**. It does **not** issue any extra commands.
- The snapshot records the exact read bytes in hexadecimal, address/length metadata, and a non-cryptographic integrity check. It is exported only at the user's request, after a complete successful read, and is never uploaded or persisted automatically.

## Not yet established
- Whether additional regions hold settings or reserved manufacturer data.
- Which byte offsets encode transmit inhibition, power, bandwidth, tones, scan, channel identity and radio options.
- Whether any device writes, acknowledgements or commit stages work for firmware HN5RV01.
- How to handle incomplete writes, restore original data, or prove end-to-end readback verification.
- How memory locations from the Channel Editor map to physical slots; the editor preserves frequencies, not authoritative slot assignment.

**Therefore the exported file is explicitly NOT a verified complete or restorable radio-memory backup.** It must never be uploaded directly to the device or presented as safe write data.

## Future work gates (separate authorised PRs)
1. Establish documented firmware-matched write encoding and reserved-bit preservation using controlled offline fixtures, with no physical writing.
2. Demonstrate that unchanged source bytes can round-trip through an encoder without modification, and that changing a single intended setting modifies only the documented bytes.
3. Establish an independently recoverable backup/restore process; validate power-loss and partial-write handling.
4. Only after evidence supports all of the above, separately authorise a narrowly scoped physical write experiment and validate by independent readback.
5. Keep existing physical Write and Verify disabled until those requirements are met.

### Threat model
A write command built from frequency-only editor rows could erase unknown per-channel flags or settings. A technically successful write command is not proof of a recoverable or correctly configured radio. The existing read-only protocol is the protected baseline.

## PR #67: offline frequency field investigation (no device write)
User-supplied HN5RV01 raw-read-region snapshot and matching local editor JSON were checked **offline**, without committing either file to this repository. Evidence:
- Snapshot integrity check matched the declared non-cryptographic FNV-1a value.
- Five programmed frequency pairs match the editor's corresponding slots (human-visible memories M03–M07, zero-based slots 2–6).
- Two slots were all `0xff`, while 121 additional records had first byte `0xff` **but retained other non-`0xff` bytes**. These unused records must not be filled using a default or blank template.
- In the five populated records, the first 4 bytes encode RX and the next 4 TX as reverse-byte-order packed decimal (BCD), scaled by 100,000 to MHz. The evidence supports an exact 0.00001 MHz (10 Hz) representation for the observed frequencies.
- Fields at offsets 8–15, including the final byte, are **not** confirmed as power, tones, bandwidth, flags or checksum. Their meanings remain unverified.

New `uv16-offline-frequency-codec.js` is an isolated experiment: it supports encode/decode round trips for four-byte frequency BCD and hypothetical single-record diffs only when the caller supplies an existing populated slot and its exact expected RX and TX frequencies. The result lists the changed absolute byte offsets, preserves offsets 8–15, **does not emit a full writable image or hardware protocol frame**, and explicitly declares hardware write disabled. Automated tests use **synthetic records**, not the user's personal snapshot.

**NOT A VERIFIED RADIO WRITER:** These offline BCD results do not establish the write opcode, channel-option mapping, erase/commit requirements, full recoverability, slot assignment for editor rows or independent physical verification. No code in this PR opens a serial port, changes device memory or enables Write/Verify. Never treat the hypothetical diff as a write-ready payload.
