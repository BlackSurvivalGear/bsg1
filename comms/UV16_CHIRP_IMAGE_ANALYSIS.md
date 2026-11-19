# UV-16 HN5RV01 — offline CHIRP IMG analysis

## Evidence inspected
User-supplied `Baofeng_BF-F8HP_20261119.img` (19 November 2026), **6,673 bytes**, SHA-256 `cddbba967ba4d6e55334b3e9fb951ee7b2d1dba383373a47ce63b308c6fdd552`. The private image itself is **not committed** to the repository.

Observed:
- CHIRP metadata marker at file offset **6473** (0x1949), followed by base64 JSON identifying `BaofengBFF8HPRadio`, `BF-F8HP`, `next-20261030`.
- Initial eight bytes `aa 30 76 04 00 05 20 dd`, matching the previously observed read-side radio identification response.
- Firmware text `HN5RV01` at file offset **6200**.
- Five occupied 16-byte records at file offsets **40, 56, 72, 88, 104**. Their receive/transmit frequency bytes are:
  - channel 2: `00 25 52 14` / `00 25 52 14` (145.225 MHz)
  - channel 3: `00 25 03 15` / `00 25 03 15` (150.325 MHz)
  - channel 4: `00 25 01 44` / `00 25 01 44` (440.125 MHz)
  - channel 5: `00 25 52 44` / `00 25 52 44` (445.225 MHz)
  - channel 6: `00 25 03 45` / `00 25 03 45` (450.325 MHz)
- The records align with the previously documented channel positions **at an apparent +8 file-byte offset**. This is a *file alignment observation*, not a firmware address mapping.
- A complete byte-for-byte comparison against the earlier BSG read-region JSON was **not performed** in this PR because that original snapshot was not provided alongside this image in the current work session.

## Scope of the analyser
`uv16-chirp-image-audit.js` parses a supplied byte array without device access, validates the CHIRP metadata marker and JSON, extracts metadata and firmware-string positions, and optionally compares the **entire 2,048-byte channel span** against a separately supplied validated BSG read-regions snapshot. It reports *all* exact alignments, including zero matches, without guessing.

The 6,473-byte pre-metadata payload is **not** a proven physical memory image. CHIRP may compact, reorder or supplement regions; the CHIRP reference addresses `0x1e80`, `0x1ec0`, `0x1f00`, `0x1f40`, `0x1f80`, `0x1fc0` cannot be mapped from file offsets without driver-specific layout evidence. The additional three reference regions identified in PR #75 are still **not independently verified as backed up**.

## Acceptance / safety
- Offline parsing, deterministic synthetic tests, malformed-input rejection.
- No physical write frames, port access, image uploads or production changes.
- `canWrite:false`, `restorableBackupVerified:false`, `auxiliaryRegionMappingVerified:false`.
- Further step: compare the original BSG read-regions JSON to the CHIRP image byte-for-byte, then establish an independently evidenced driver-to-radio auxiliary map before claiming backup completeness.
