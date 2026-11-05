# BF-F8HP protocol readiness (offline only)

## Scope
The BF-F8HP is the priority hardware target. The programming cable has not arrived. This phase validates **only a synthetic identification exchange** using an in-memory mock byte transport.

- `bff8hp-readonly-ident.js` contains an experimental identification handshake. Its bytes must not be treated as verified for the user's individual BF-F8HP or firmware.
- `bff8hp-offline-readiness.js` exercises that identifier against bounded synthetic responses, with a timeout, cancellation, response-length validation and explicit unverified results.
- `uv5r-family-mock.js` exercises a synthetic 64-byte read. Its fixture is **not** a verified BF-F8HP memory map.
- `connection.js` opens a USB serial port only; it does not issue radio commands.
- `native-driver.js` continues to block physical memory reads and writes.

## Hardware arrival gate
1. Confirm programming cable chipset and port enumeration using USB Diagnostics.
2. Establish correct physical wiring, firmware variant, power/battery and model-specific protocol evidence.
3. Review the exact identification bytes and responses before authorising any on-device exchange.
4. Add a separately reviewed, explicit-consent read-only physical identification path only after protocol verification.
5. Keep memory read/write disabled until the identity and firmware are verified and a backup path is tested.

No hardware tests have been performed. A passing mock does not identify or validate a real radio.
