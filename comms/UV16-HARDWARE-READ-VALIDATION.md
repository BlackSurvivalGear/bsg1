# Experimental UV-16 direct USB read protocol gate

The owner's CHIRP read trace showed COM4 at 9600 baud, seven identification bytes, a firmware marker `HN5RV01`, and acknowledged 64-byte `S` / `X` read blocks. This branch implements an **unconnected, opt-in** sample reader using only the observed identification and read-command families. It reads three auxiliary blocks and two frequency-memory blocks, and decodes six observed factory RX/TX frequencies. The complete trace and device image are deliberately not committed.

**No website button is enabled. No live radio was tested.** Code is currently exercised against a mocked Web Serial peer only. The helper requires an already opened Web Serial port; opening it and any physical validation must be separately authorised and supervised. The helper does send limited serial command bytes if a caller explicitly invokes it with an actual port, so passing CI is not permission for unsupervised hardware use.

Outbound commands are restricted internally to identification magic, `02`, `06` acknowledgements and `53` memory-read frames for the two known sample memory blocks plus the three required auxiliary blocks. There is no public arbitrary write method, nor `57` memory-write opcode or erase/program command. Read Radio, Write Radio, production settings, profiles and deployment are unchanged.

The protocol still needs owner-authorised hardware checks for the exact model identity, timings, missing/extra frames, cable disconnect, cancellation, full memory map, physical slot alignment, mode/tone/power fields and comparison to the CHIRP backup. Do **not** merge this as proof of hardware verification or deploy without separate authorisation.
