// Offline, read-only CHIRP serial-trace decoder for the captured HN5RV01
// BF-F8HP-compatible read session. No serial ports, radio commands, or writes.
export class UV16TraceError extends Error {
  constructor(message,code='INVALID_TRACE'){super(message);this.name='UV16TraceError';this.code=code;}
}
const reject=(message,code)=>{throw new UV16TraceError(message,code);};
const hexTokens=(line)=>{
  const m=line.match(/^\s*\d+(?:\.\d+)?\s+([WR])\s+\d{3}:\s+((?:[0-9a-fA-F]{2}(?:\s+|$))+)/);
  return m?{direction:m[1],bytes:m[2].trim().split(/\s+/).map(x=>parseInt(x,16))}:null;
};
function toFrequency(bytes){
  if(bytes.length!==4)reject('Expected four BCD bytes','INVALID_BCD');
  const digits=[...bytes].reverse().map(b=>{
    if((b>>4)>9||(b&15)>9)reject('Invalid BCD frequency','INVALID_BCD');
    return (b>>4).toString()+(b&15).toString();
  }).join('');
  const mhz=Number(digits)/100000;
  if(mhz<1||mhz>999.999999)reject('Frequency out of range','INVALID_FREQUENCY');
  return mhz;
}
// Reconstruct only complete, acknowledged 64-byte read frames.
// A frame must have a request S, acknowledgement 06, matching response X,
// 64 bytes of payload and host acknowledgement 06.
export function extractReadBlocks(trace){
  if(typeof trace!=='string'||trace.length>5_000_000)reject('Invalid trace size','INVALID_TRACE');
  const entries=trace.split(/\r?\n/).map(hexTokens).filter(Boolean);
  const blocks=new Map();
  for(let i=0;i<entries.length;i++){
    const request=entries[i];
    if(request.direction!=='W'||request.bytes.length!==4||request.bytes[0]!==0x53||request.bytes[3]!==0x40)continue;
    const address=(request.bytes[1]<<8)|request.bytes[2];
    if(address%64)reject('Unaligned read address','INVALID_FRAME');
    if(blocks.has(address))reject('Duplicate memory block','DUPLICATE_BLOCK');
    const ack=entries[++i];
    if(!ack||ack.direction!=='R'||ack.bytes.length!==1||ack.bytes[0]!==6)reject('Missing radio ACK','INVALID_FRAME');
    const response=entries[++i];
    if(!response||response.direction!=='R'||response.bytes.length!==4||response.bytes[0]!==0x58||response.bytes[1]!==request.bytes[1]||response.bytes[2]!==request.bytes[2]||response.bytes[3]!==0x40)
      reject('Memory response header mismatch','INVALID_FRAME');
    const payload=[];
    while(payload.length<64){
      const part=entries[++i];
      if(!part||part.direction!=='R'||part.bytes.length===0||payload.length+part.bytes.length>64)reject('Incomplete memory block','INVALID_FRAME');
      payload.push(...part.bytes);
    }
    const finalAck=entries[++i];
    if(!finalAck||finalAck.direction!=='W'||finalAck.bytes.length!==1||finalAck.bytes[0]!==6)reject('Missing host ACK','INVALID_FRAME');
    blocks.set(address,Uint8Array.from(payload));
  }
  return blocks;
}
export function decodeKnownUV16Memories(trace,{count=6}={}){
  if(!Number.isInteger(count)||count<1||count>6)reject('Only six reference memories are supported','UNSUPPORTED_COUNT');
  // The six-memory reference occupies addresses 0x0000 and 0x0040.
  // This is not an independent firmware fingerprint or live hardware validation.
  if(!/HN5RV01/.test(trace))reject('Expected firmware identifier not present','UNKNOWN_FIRMWARE');
  const blocks=extractReadBlocks(trace);
  for(const address of [0,0x40])if(!blocks.has(address))reject('Missing expected memory block','MISSING_BLOCK');
  const memory=new Uint8Array(128);
  memory.set(blocks.get(0),0);memory.set(blocks.get(0x40),64);
  const channels=[];
  // Four 16-byte records live in each 64-byte block. Empty memory
  // locations can occur between programmed channels; do not shift
  // physical slot numbers to manufacture contiguous addresses.
  for(let slot=0;slot<memory.length/16&&channels.length<count;slot++){
    const offset=slot*16;
    const raw=memory.slice(offset,offset+16);
    // The captured CHIRP image uses 0xff in the first RX byte for
    // unprogrammed slots, including partly initialised records.
    if(raw[0]===0xff)continue;
    const rx=toFrequency(raw.slice(0,4));
    const tx=toFrequency(raw.slice(4,8));
    // Mode byte interpretation is not yet independently validated;
    // do not infer FM/NFM or tone settings from this trace.
    channels.push({slot,rx,tx,rawHex:[...raw].map(b=>b.toString(16).padStart(2,'0')).join(' ')});
  }
  if(channels.length!==count)reject('Insufficient populated reference memories','EMPTY_MEMORY');
  return {firmware:'HN5RV01',source:'CHIRP trace (offline only)',channels};
}
