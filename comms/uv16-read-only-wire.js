// Experimental UV-16 captured-session read commands. No UI integration.
// Sends identification and two sample-memory reads only; no write/erase opcodes.
import {SerialByteTransport} from './serial-byte-transport.js';
export class UV16ReadError extends Error {
  constructor(message,code='READ_FAILED'){super(message);this.name='UV16ReadError';this.code=code;}
}
const fail=(message,code)=>{throw new UV16ReadError(message,code);};
const MAGIC=[0x50,0xbb,0xff,0x20,0x12,0x07,0x25];
const ID=[0xaa,0x30,0x76,0x04,0,5,0x20,0xdd];
const AUX=[0x1e80,0x1ec0,0x1fc0];
const SAMPLE=[0,64];
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
function freq(raw){
  const digits=[...raw].reverse().map(v=>{
    if((v>>4)>9||(v&15)>9)fail('Invalid frequency BCD','BAD_BCD');
    return String(v>>4)+String(v&15);
  }).join('');
  const mhz=Number(digits)/100000;
  if(!Number.isFinite(mhz)||mhz<=0||mhz>=1000)fail('Invalid frequency','BAD_BCD');
  return mhz;
}
const abortCheck=signal=>{if(signal?.aborted)fail('Cancelled','ABORTED');};
export class UV16ReadOnlySession {
  #port; #rx; #used=false; #closed=false;
  constructor({port,timeoutMs=2000}={}){
    if(!port?.readable?.getReader||!port?.writable?.getWriter)fail('Open serial port required','PORT_UNAVAILABLE');
    this.#port=port;
    this.#rx=new SerialByteTransport({port,timeoutMs,maxRead:68});
  }
  close(){this.#closed=true;this.#rx.close();}
  async #command(bytes,signal){
    abortCheck(signal);
    if(this.#closed)fail('Session closed','CLOSED');
    // Entire byte sequence is controlled internally by the state machine:
    // no public arbitrary command write API exists.
    const writer=this.#port.writable.getWriter();
    try{await writer.write(Uint8Array.from(bytes));}
    finally{writer.releaseLock();}
  }
  async #receive(count,signal){abortCheck(signal);return this.#rx.read(count,{signal});}
  async #readBlock(address,signal){
    if(![...AUX,...SAMPLE].includes(address))fail('Address denied','ADDRESS_DENIED');
    await this.#command([0x53,address>>8,address&255,64],signal);
    const first=(await this.#receive(1,signal))[0];
    if(first!==6&&first!==0x58)fail('Invalid block ACK','BAD_ACK');
    const header=first===6?await this.#receive(4,signal):Uint8Array.from([first,...await this.#receive(3,signal)]);
    if(!same([...header],[0x58,address>>8,address&255,64]))fail('Wrong frame or address','BAD_FRAME');
    const block=await this.#receive(64,signal);
    await this.#command([6],signal);
    return block;
  }
  async readSample({signal}={}){
    if(this.#used)fail('Session already used','SESSION_USED');
    this.#used=true;
    try{
      for(const byte of MAGIC)await this.#command([byte],signal);
      if(!same([...await this.#receive(1,signal)],[6]))fail('Magic rejected','BAD_ACK');
      await this.#command([2],signal);
      if(!same([...await this.#receive(8,signal)],ID))fail('Unexpected identity','WRONG_IDENTITY');
      await this.#command([6],signal);
      if(!same([...await this.#receive(1,signal)],[6]))fail('Identity ACK rejected','BAD_ACK');
      for(const address of AUX){
        const block=await this.#readBlock(address,signal);
        if(address===0x1ec0){
          const firmware=String.fromCharCode(...block.slice(48,55));
          if(firmware!=='HN5RV01')fail('Unexpected firmware','WRONG_FIRMWARE');
        }
      }
      const blocks=new Map();
      for(const address of SAMPLE)blocks.set(address,await this.#readBlock(address,signal));
      const raw=new Uint8Array(128);raw.set(blocks.get(0));raw.set(blocks.get(64),64);
      const channels=[];
      for(let slot=0;slot<8;slot++){
        const memory=raw.slice(slot*16,(slot+1)*16);
        if(memory[0]===0xff)continue;
        channels.push({slot,rx:freq(memory.slice(0,4)),tx:freq(memory.slice(4,8))});
      }
      if(channels.length!==6)fail('Expected six populated channels','MEMORY_COUNT_MISMATCH');
      return {firmware:'HN5RV01',channels,readOnly:true,hardwareVerified:false};
    }finally{this.close();}
  }
}
