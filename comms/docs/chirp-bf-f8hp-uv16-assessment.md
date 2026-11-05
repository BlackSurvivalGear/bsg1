# CHIRP BF-F8HP / Baofeng UV-16 driver assessment

Status: **research only — no radio protocol implementation or hardware verification**. Baseline: BSG COMMS `main` commit `269bbcc7070d9b2faf95a060df05b5af093d6602` (PR #10 merged).

## Evidence and compatibility

- CHIRP issue [#9833](https://chirpmyradio.com/issues/9833) records users successfully downloading/uploading UV-16 or UV-16 Pro variants using **Baofeng / BF-F8HP**, with explicit incompatibility warnings. This does **not** establish universal UV-16 Pro V2 compatibility.
- Related [#9977](https://chirpmyradio.com/issues/9977) is a UV-16 Pro V2 model-support request. Do not represent a BF-F8HP profile as a verified native UV-16 Pro V2 driver.
- The CHIRP discussion distinguishes 2-band/2-power UV-5R from 2-band/3-power BF-F8HP and 3-band UV-5RX3. Model capabilities matter.
- Reports mention COM1 and COM6 depending on cable/computer. Web Serial cannot reveal Windows COM-port names.

## Relevant upstream implementation

- [CHIRP `chirp/drivers/uv5r.py`](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/uv5r.py): UV-5R-family identification, memory handling and model subclasses; locate the BF-F8HP class and its actual inherited methods before porting.
- [CHIRP `chirp/drivers/baofeng_common.py`](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/baofeng_common.py): shared Baofeng clone handling for applicable radio families. **Do not assume this module is the BF-F8HP implementation** without tracing the model's class.
- Upstream CHIRP code is GPL-licensed; check the precise applicable licence, attribution, distribution obligations and compatibility before copying or translating source into this browser application. This assessment does not incorporate upstream code.

## Existing BSG COMMS architecture

- `comms/models.js` lists UV-5R, UV-16 Pro V2, UV-32 and BF-F8HP; a selectable model is **not** a working hardware driver.
- `comms/connection.js` opens a Web Serial port at 9600 baud, reports USB-adapter metadata and deliberately sends **no radio commands**.
- `comms/radio-settings.js` presents previously authorised USB ports and a model selector; choosing a port in the dialog is **not** a confirmed binding for `Connect USB`.
- `comms/index.html` disables Read/Write radio controls. Preserve these safeguards until the hardware validation gate is met.

## Proposed phased implementation (separate PRs)

1. **Offline driver specification and tests:** identify the exact BF-F8HP implementation, model signatures, handshake, read framing, image size, firmware handling and error paths from pinned upstream source. Write deterministic fixtures and a mock serial transport. Do not touch hardware.
2. **Explicit opt-in read-only hardware trial:** after cable arrives, confirm the radio's full label, firmware display, adapter ID and CHIRP backup on the same unit. Use a deliberate confirmation gate before any identification/read traffic. Never auto-detect by writing. Bound reads, timeouts, retries and aborts; preserve original binary image as a backup.
3. **Validate compatibility:** compare repeated dumps, verify size/checksums/firmware identifiers and decode channels offline. Stop if any mismatch, unexpected response or incomplete transfer. Do not assume success based on a matching USB adapter ID.
4. **Writes remain disabled:** only consider a separately reviewed, explicitly authorised write phase after confirmed exact-model support, round-trip fixtures, full-image backup/restore planning and physical testing.

## Acceptance criteria for the next engineering PR

- A pinned CHIRP source revision and a documented BF-F8HP class inheritance trace.
- Unit tests for valid/invalid signatures, framing, partial responses, timeout, disconnect and image parsing.
- No serial writes, no radio uploads, no silent firmware/model fallback, no changed production configuration.
- Existing BSG COMMS checks pass; manual hardware tests reported separately, never implied by CI.

**Decision:** use BF-F8HP as a *candidate protocol reference*, not as proof that UV-16 Pro V2 hardware is identical. No programming is authorised by this document.
