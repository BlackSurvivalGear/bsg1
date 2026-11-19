# UV-16 HN5RV01 — CHIRP driver comparison and mock-only upload

Source inspected: https://github.com/kk7ds/chirp/blob/master/chirp/drivers/baofeng_common.py (accessed 2026-11-19). This is a **generic Baofeng-family driver**, not independent proof that HN5RV01 accepts uploads.

## Source-derived findings
- `_make_frame` constructs a four-byte header with one-byte command, two-byte big-endian address and one-byte length, then appends optional data.
- `_download` sends `S` read requests; `_recv` expects `X` headers.
- `_upload` identifies the radio, reads auxiliary/firmware information, checks image compatibility, chooses model-dependent ranges, then sends `X` frames with image data and requires `0x06` acknowledgement per block.
- `_get_aux_data_from_radio` reads additional blocks `0x1F00`, `0x1F40`, `0x1F80`, beyond the three read regions in the existing BSG capture. The current BSG snapshot therefore cannot substantiate CHIRP's auxiliary comparison or a restorable full image.
- The driver has model-specific ranges, sizes, firmware checks and dropped-byte handling. **Do not copy generic ranges or assume the same firmware behaviour for HN5RV01.**

## Comparison with BSG's observed read-only implementation
BSG has evidence for the read-side handshake and 64-byte read frames with firmware HN5RV01. Similarities in read framing are useful leads, **not verification of a write-side handshake, accepted ranges or safe restoration**.

## Mock implementation
`uv16-chirp-mock-upload.js` is a self-contained in-memory block simulator for synthetic 2,048-byte channel images. It:
- accepts only a branded in-memory mock, not a serial port;
- checks baseline identity and restricts changes to frequency bytes in already occupied slots;
- simulates 64-byte blocks, acknowledgements, NAK and interruption;
- compares mock memory with the intended synthetic result;
- returns `canWrite:false` and never constructs a physical frame or connects to a device.

A 64-byte mock block may contain unchanged unknown bytes, but this does **not** prove safe hardware writes or recovery. This is a protocol exercise, not a physical write implementation.

## Remaining gates
Obtain firmware-matched write evidence, verify actual writable ranges, capture and validate a complete restorable backup including auxiliary settings, establish interruption recovery, then seek separate physical-write authorisation. The website Write and Verify buttons stay disabled.

## Licensing
CHIRP is GPL-licensed. This module is an independently authored structural mock, not copied CHIRP implementation. Reassess licence obligations before incorporating CHIRP code or distributing a derivative.
