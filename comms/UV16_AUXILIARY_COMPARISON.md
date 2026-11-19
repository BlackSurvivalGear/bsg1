# HN5RV01 CHIRP auxiliary comparison — PR #77

## Source evidence
Compared the actual user-provided `Baofeng_BF-F8HP_20261119.img` (6,673 bytes) with `bsg-uv16-hn5rv01-read-regions(1).json`. Neither private file is committed.

- **Channel bytes:** 2,048 of 2,048 identical at CHIRP file offset 8.
- **0x1EC0:** all 64 bytes match at CHIRP file offset 6152.
- **0x1FC0:** all 64 bytes match at CHIRP file offset 6408.
- **0x1E80:** no exact 64-byte match anywhere in the CHIRP pre-metadata payload. At the *candidate* offset 6088, only **14/64 bytes** match. The candidate file slice is all `ff`; the BSG read has distinctive `b5`, `65`, `46` and settings bytes.
- CHIRP-reference auxiliary addresses `0x1F00`, `0x1F40`, `0x1F80` have no independent BSG read snapshots to compare.

The two exact auxiliary matches are consistent with a candidate offset formula `fileOffset = radioAddress - 0x6B8` in this part of the file, but **this is not an independently verified firmware memory mapping**. A missing `0x1E80` match could indicate that CHIRP omits the block, replaces it with defaults, transforms it, or maps it elsewhere. We cannot distinguish these explanations from the current captures.

## Implementation
`uv16-auxiliary-image-comparison.js` accepts a validated BSG read-regions JSON and CHIRP image bytes, reports exact matches across the full pre-metadata payload, and compares the three captured auxiliary blocks at candidate offsets. It preserves all non-writable gates and does not transmit, alter or commit radio data.

## Next evidence required
Examine the specific CHIRP BF-F8HP driver image layout and upload ranges against this firmware; do not treat the CHIRP image as a restorable backup or enable physical writes. The unmatched `0x1E80` block is a material unresolved discrepancy.
