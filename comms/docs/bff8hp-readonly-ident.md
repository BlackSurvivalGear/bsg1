# BF-F8HP experimental identification (read-only)
Source observations: CHIRP BF-F8HP logs show a seven-byte candidate handshake `50 BB FF 20 12 07 25` at 9600 8N1; these traces also show failed connections. https://www.chirpmyradio.com/attachments/14024/chirp_debug-znp59jum.txt
CHIRP supported radio list distinguishes BF-F8HP from BF-F8HP-PRO: https://chirpmyradio.com/projects/chirp/wiki/Supported_Radios

- Independent BSG COMMS implementation, no CHIRP source incorporated.
- Explicit consent required; injected serial/mock transport; no Web Serial UI hookup.
- Identification exchanges a candidate handshake, ACK and 8-byte identity query only.
- Unknown identity bytes are reported as **unconfirmed**. No firmware fingerprint allowlist exists yet.
- Read-memory and write-memory always reject. No radio memory blocks or channel decoding.
- BF-F8HP is **not** assumed compatible with UV-16 Pro V2.
- Hardware behavior unverified: do not claim physical compatibility until real trace and model identity are validated.
