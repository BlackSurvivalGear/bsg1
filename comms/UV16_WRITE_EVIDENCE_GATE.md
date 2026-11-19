# HN5RV01 write-protocol engineering — evidence gate

## What is established
The existing UV-16 read-only session has a known firmware-matched handshake and validated 64-byte read blocks. Frequency fields in occupied channel records have been observed and tested offline. This is **not** a validated write protocol.

## This stage
`uv16-protocol-evidence.js` classifies text serial traces offline, identifies already known read requests, validates complete read frames and inventories otherwise unclassified host frames. It deliberately does not interpret an unknown frame as a write opcode or generate device traffic. No hardware access or upload occurs.

## Missing proof before a physical write
1. Independently sourced, firmware-matched documentation or a complete known-good HN5RV01 write trace with identity, framing, ACK/NAK and commit sequence; independently corroborate it.
2. Authoritative writable address boundaries and treatment of manufacturer/reserved bytes.
3. A **complete restorable** backup and demonstrated recovery after interrupted or failed programming, preferably using a nonessential spare device.
4. A bounded, single-channel change protocol tested with a mock transport and negative cases, preserving all unrelated bytes and settings.
5. A separately authorised physical experiment followed by independent full readback and comparison.

## Explicit prohibitions
Do not guess a write opcode from a read opcode. Do not replay unclassified frames. Do not treat an exported read-region snapshot as a restorable backup. Do not enable the website's Write/Verify buttons. Do not use the user's working radio for protocol discovery by trial and error.

## Status
Write protocol: **UNVERIFIED**. Recovery: **UNVERIFIED**. Physical write: **BLOCKED**.
