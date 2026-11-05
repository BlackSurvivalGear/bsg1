# UV-5R / BF-F8HP protocol foundation (offline only)

Original BSG COMMS JavaScript, informed by published protocol facts, not copied CHIRP source. Reference: https://github.com/kk7ds/chirp/blob/master/chirp/drivers/uv5r.py

- UV-5R: published original seven-byte handshake profile; 9600 baud reference.
- BF-F8HP: shares the UV-5R driver family, but its model-specific handshake is deliberately **not assumed**. Offline tests inject a synthetic seven-byte value; this is **not a real BF-F8HP handshake**.
- Handshake: seven magic bytes, ACK 0x06, 0x02 identity request, eight-byte identity, final ACK exchange. Real firmware may differ.
- Read: S + big-endian 16-bit address + 0x40 length; expect ACK then X + matching address/size + 64-byte payload; acknowledge receipt.
- Transport is strictly kind=mock. No Web Serial integration, physical reads or writes.
- Identity bytes are not yet mapped to verified model/firmware fingerprints. No real radio may be connected.
- No memory-map decoding or channel conversion in this phase. These need verified samples.
- CHIRP is GPL-licensed; use protocol facts, do not incorporate its source.

Run tests: `node --test comms/tests/uv5r-family-protocol.test.mjs`.
