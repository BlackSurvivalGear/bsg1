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

## PR #68 — unknown-setting evidence audit and protocol gates (offline only)

The user-supplied HN5RV01 snapshot and matching editor backup were examined locally (not committed):
- All five occupied slots (zero-based 2–6) have the same bytes 8–15: `00 00 00 00 00 00 00 44`.
- **There is no controlled variation in these eight bytes**, so there is **no evidence to identify power, CTCSS/DCS, scan, bandwidth or transmit-disable bit positions**. The trailing `0x44` must not be labelled a flag or checksum.
- 123 slots are treated as unprogrammed by first-byte `0xff`, of which only two are entirely `ff`. The other 121 contain residual values, including a repeated apparent prior frequency pattern. No interpretation of these as current settings is warranted.
- The three auxiliary regions contain additional bytes, including recognizable ASCII, but the fields' semantic meanings and safe write ranges are unknown. They are **read-only evidence**, not presumed settings.
- The firmware-matched radio **write command, ACK sequencing, writable address boundaries, erase/commit stage, on-device image validation and interrupted-write recovery are NOT established**. An existing READ command does not establish a WRITE command.

`uv16-settings-evidence.js` now offers a *purely offline* audit and optional comparison of **two independently captured, validated read snapshots**. It inventories active and unused slots, shows raw bytes 8–15 without guessing field names, reports absolute byte changes in occupied records and auxiliary blocks, and rejects changed slot occupancy. It intentionally ignores residual changes in unprogrammed slots and never outputs a write buffer or communicates with any serial port. Tests use synthetic snapshots, not uploaded radio data.

**Future evidence requirement:** A properly controlled series of read-only before/after captures with a known single radio setting changed by the radio's own user interface could allow a tentative mapping, but correlation alone is insufficient to authorize physical writes. The radio's built-in controls and capabilities must be documented and the write protocol independently corroborated. Preserve readback and recovery safeguards; do not unlock any physical programming controls in this PR.

### Gate for any later physical write
- [ ] Confirm exact firmware/identity and authorized writable ranges.
- [ ] Independently map and test all fields that will be changed; preserve unknown bits and reserved bytes.
- [ ] Establish complete **restorable** backup and successful restoration, including auxiliary settings.
- [ ] Verify protocol framing, acknowledgement/commit behavior and partial-transfer recovery without risking the user's working radio.
- [ ] Test exact desired channels and transmit restrictions under applicable authorization.
- [ ] Require explicit, separate approval before hardware writing, then independently verify readback.

At PR #68 all gates above remain open. **Hardware Write and Verify remain disabled.**
