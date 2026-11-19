# HN5RV01 — CHIRP BF-F8HP upload policy investigation (PR #78)

## Authoritative source examined
CHIRP upstream `chirp/drivers/baofeng_common.py`, `_upload`, `_get_aux_data_from_radio` and `_get_radio_firmware_version`:
https://github.com/kk7ds/chirp/blob/master/chirp/drivers/baofeng_common.py

This is a **source-code policy review**, not a successful or safe hardware write test. The source's behaviour is conditional on model-specific `radio._ranges`, vendor and radio readback.

## Key finding: 0x1E80 is excluded from the auxiliary equality check
Before writing, CHIRP reads six 64-byte auxiliary radio blocks: `0x1E80`, `0x1EC0`, `0x1F00`, `0x1F40`, `0x1F80`, `0x1FC0`. The first block at `0x1E80` is read but **not used** in the three comparison areas.

CHIRP compares image slices against radio-derived:
1. `0x1F00:0x1F60` (96 bytes; radio blocks 0x1F00 plus first 32 bytes of 0x1F40)
2. `0x1F70:0x1F80` (16 bytes; final 16 bytes of radio block 0x1F40)
3. `0x1F90:0x1FC0` (48 bytes; final 48 bytes of radio block 0x1F80)

If all match, and vendor is not BTECH, the common driver selects `(0x0000,0x0DF0)`, `(0x0E00,0x1800)`, **`(0x1E80,0x2000)`**. Thus the un-compared `0x1E80` block can be included in a full auxiliary upload. If comparison fails and no dropped-byte condition applies, CHIRP falls back to model-specific `radio._ranges`; **we must not assume those ranges are safe for HN5RV01**.

If a dropped-byte condition exists and the comparison fails, CHIRP rejects the image before uploading. The driver describes a known byte-drop issue around `0x1FCF` and reads a special final region to compensate.

## Relationship to user's actual captures
- BSG channel memory matches the CHIRP image byte-for-byte.
- BSG `0x1EC0` and `0x1FC0` captures match CHIRP.
- BSG `0x1E80` does **not** match the CHIRP image at its candidate position, and has no full 64-byte match.
- BSG does not yet have independent read captures of `0x1F00`, `0x1F40`, `0x1F80`; therefore the three CHIRP auxiliary equality checks **cannot be independently reproduced** with existing BSG evidence.
- The earlier observation of 14/64 equal bytes at the candidate `0x1E80` position does not prove the driver would overwrite those 50 differing bytes; it identifies a potentially material risk that must be resolved before any physical upload.

## Scope
Added an **offline synthetic** policy audit that models the source-level comparison, dropped-byte guard, vendor condition and conditional reference ranges. It never builds or transmits a write frame. The fallback range input is explicitly caller-provided or an illustrative synthetic default; not a verified BF-F8HP HN5RV01 map.

**Physical writing remains BLOCKED.** Required follow-up: establish the exact BF-F8HP class's `_ranges`, inspect actual CHIRP image addressing semantics, obtain safe read-only auxiliary captures and independently demonstrate recovery before permitting any write.
