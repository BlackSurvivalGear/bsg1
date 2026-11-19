# HN5RV01 backup completeness and recovery — PR #75

## Current physical evidence
The verified read-only capture contains 2,048 bytes of channel memory (0x0000–0x07ff) and three 64-byte auxiliary regions (0x1e80, 0x1ec0, 0x1fc0). It includes an FNV-1a integrity check, which detects accidental alterations but is neither a cryptographic authenticity check nor evidence of completeness.

## Coverage gap
The CHIRP Baofeng-common driver references additional auxiliary addresses 0x1f00, 0x1f40 and 0x1f80. They are **not present** in the BSG snapshot. Those references are leads only: they do not prove that these are all required HN5RV01 regions or that reading them is safe on this firmware. Do not add new physical read commands without separately validating the read-side safety and device identity.

## Recovery experiment
A purely in-memory two-block scenario changes synthetic frequency bytes in two occupied slots. The mock acknowledges the first block, then simulates an interruption before the second. A separate mock transfer restores the synthetic baseline from the partial state and compares every byte. Tests also cover failure before the first block, invalid addresses, tampered snapshots and incomplete images.

This demonstrates **only** that the software model can reverse an interrupted synthetic change. It does not demonstrate a radio restore, power-loss handling, verified writable ranges, complete backup, or safe hardware commands.

## Physical-write gate
- [ ] Identify all firmware-specific memory and auxiliary regions.
- [ ] Obtain a complete independently validated **restorable** backup.
- [ ] Verify HN5RV01-specific write framing, ACK/NAK, commit and writable bounds.
- [ ] Demonstrate interrupted-transfer recovery on appropriate nonessential hardware.
- [ ] Obtain separate physical-write authorisation and independently verify full readback.

Physical Write/Verify remain disabled. No live radio operations, production deployment or changes to working read paths are in this PR.
