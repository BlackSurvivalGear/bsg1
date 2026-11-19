# PR #79 — Actual BF-F8HP CHIRP layout and upload decision

## Correction to PR #78 (important)
**PR #78 examined `chirp/drivers/baofeng_common.py`, but the CHIRP driver identified by the user's image, `BaofengBFF8HPRadio`, inherits `BaofengUV5R` in `chirp/drivers/uv5r.py`. Its physical upload implementation is `uv5r.py::_do_upload`, NOT `baofeng_common.py::_upload`.**

Do **not** use PR #78's `uv16-chirp-upload-policy-audit.js` as a BF-F8HP write policy. That source-level model is applicable only to the other Baofeng-common code path and has not been removed to preserve history. This PR introduces a separate, correctly scoped analyser.

Source: https://github.com/kk7ds/chirp/blob/master/chirp/drivers/uv5r.py
- `BaofengBFF8HPRadio` class near line 2378; `BaofengUV5R` base near 791.
- `_do_download` near 561; `_do_upload` near 615.
- Source observed during this investigation on 19 November 2026. CHIRP user version is `next-20261030`; source revisions may differ, so these findings are not a guarantee about that installed build.

## Exact image layout from source and actual user evidence
User files `Baofeng_BF-F8HP_20261119.img` and `bsg-uv16-hn5rv01-read-regions(1).json` (not committed):
- Identification: file `0x0000–0x0007`, 8 bytes.
- Main radio memory `0x0000–0x17FF`: file `0x0008–0x1807`, 6144 bytes. The BSG 2048-byte channel capture matches the first 2048 bytes exactly.
- Auxiliary radio memory `0x1EC0–0x1FFF`: file `0x1808–0x1947`, 320 bytes.
- User image has one extra pre-metadata byte at file offset `0x1948`; metadata marker begins at offset 6473 (`0x1949`). Its origin is not yet explained by the `_do_download` loop; **do not interpret it as radio address 0x2000**.
- BSG read `0x1EC0` equals CHIRP file `0x1808–0x1847` exactly; `0x1FC0` equals CHIRP file `0x1908–0x1947` exactly.
- BSG read `0x1E80` is **not present** in this CHIRP image. Its absence is expected from the BF-F8HP download loop, which starts aux storage at radio `0x1EC0`. The prior apparent discrepancy at candidate file offset 6088 was a mistaken linear-offset hypothesis.

## Actual BF-F8HP default upload policy (`uv5r.py`)
- The default main-memory ranges use file offsets `0x0008–0x0CF8`, `0x0D08–0x0DF8`, `0x0E08–0x1808`. During send, the file offset is translated to radio address by subtracting 8.
- `_get_aux_data_from_radio` reads radio blocks `0x1E80`, `0x1EC0`, `0x1F00`, `0x1F40`, `0x1F80`, `0x1FC0`, but the equality guard compares only three derived areas from radio `0x1F00–0x1F5F`, `0x1F70–0x1F7F`, `0x1F90–0x1FBF` against image data.
- For BF-F8HP, `_is_orig()` is always false. With matched guard data **or** a dropped-byte flag, the default aux upload range is radio `0x1EC0–0x1FFF`; with unmatched guard data and no dropped-byte flag, only `0x1EE0–0x1EEF`, `0x1F60–0x1F6F`, `0x1F80–0x1F8F`, `0x1FC0–0x1FCF` are selected.
- With a dropped-byte flag and failed guard, the default path rejects the image. An explicit range override is a separate dangerous path and is not modelled as permission.
- The default BF-F8HP upload **does not include `0x1E80`**. This corrects PR #78's warning that the generic driver could upload that block. The *real* remaining risk is that other auxiliary areas and firmware-specific settings may still be overwritten or misinterpreted; physical recovery is unproven.

## Safety and next evidence
The analyser reads bytes only, accepts optional validated BSG snapshot, and separately models synthetic guard decisions. No hardware write is implemented or enabled. The earlier BSG read-region snapshot does not include the guard areas `0x1F00`, `0x1F40`, `0x1F80`. To verify current CHIRP guard behaviour, obtain fresh **read-only** captures and compare all three derived areas; establish HN5RV01-specific writable ranges and independently demonstrated recovery before any physical write.

**Physical writing: BLOCKED.** No merge or deployment in this PR.
