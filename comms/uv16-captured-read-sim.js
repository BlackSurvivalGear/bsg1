// Evidence-backed offline byte-protocol validator. Never uses Web Serial.
export class ReadProtocolError extends Error{
 constructor(message,code='INVALID_FRAME'){super(message);this.name='ReadProtocolError';this.code=code;}
}
const fail=(message,code)=>{throw new ReadProtocolError(message,code);};
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const MAGIC=Object.freeze([0x50,0xbb,0xff,0x20,0x12,0x07,0x25]);
const MARKER=Object.freeze([0x48,0x4e,0x35,0x52,0x56,0x30,0x31]);
const token=Symbol('trusted-offline-replay');
export class OfflineCapturedPeer{
 constructor({blocks,corruptFrame=false,disconnectAfter=-1}={}){
  if(!(blocks instanceof Map)||![0,64].every(a=>blocks.get(a) instanceof Uint8Array&&blocks.get(a).length===64))
    fail('Two complete 64-byte fixtures required','INVALID_FIXTURE');
  this[token]=true;this.blocks=blocks;this.corruptFrame=corruptFrame;
  this.disconnectAfter=disconnectAfter;this.steps=0;this.sent=[];
 }
 async request(out,expected){
  if(!(out instanceof Uint8Array))fail('Invalid simulated command','INVALID_COMMAND');
  if(this.disconnectAfter===this.steps++)fail('Simulated disconnect','DISCONNECTED');
  const a=[...out];this.sent.push(a);
  if(equal(a,MAGIC)&&expected===1)return Uint8Array.of(6);
  if(equal(a,[2])&&expected===8)return Uint8Array.from([0xaa,0x30,0x76,4,0,5,0x20,0xdd]);
  if(equal(a,[6])&&expected===1)return Uint8Array.of(6);
  if(equal(a,[0x53,0x1e,0xc0,0x40])&&expected===1)return Uint8Array.of(6);
  if(equal(a,[6])&&expected===68&&this.auxiliary){
    this.auxiliary=false;
    const v=new Uint8Array(68).fill(0xff);v.set([0x58,0x1e,0xc0,0x40]);v.set(MARKER,52);return v;
  }
  if(a.length===4&&a[0]===0x53&&a[3]===64&&expected===1){
    const address=(a[1]<<8)|a[2];
    if(address===0x1ec0){this.auxiliary=true;return Uint8Array.of(6);}
    if(address!==0&&address!==64)fail('Out-of-scope address','ADDRESS_DENIED');
    this.pending=address;return Uint8Array.of(6);
  }
  if(equal(a,[6])&&expected===68&&this.pending!==undefined){
    const address=this.pending;delete this.pending;
    const v=new Uint8Array(68);
    v.set([this.corruptFrame?0x59:0x58,address>>8,address&255,64]);
    v.set(this.blocks.get(address),4);return v;
  }
  fail('Unsupported simulated request','INVALID_COMMAND');
 }
}
const requireFrame=(reply,length)=>{
 if(!(reply instanceof Uint8Array)||reply.length!==length)fail('Wrong frame length');
 return [...reply];
};
// A mock-only state machine. This cannot be passed a physical serial transport.
export async function replayCapturedRead(peer){
 if(!(peer instanceof OfflineCapturedPeer)||peer[token]!==true)fail('Physical transport prohibited','HARDWARE_DISABLED');
 const ask=async(out,n)=>requireFrame(await peer.request(Uint8Array.from(out),n),n);
 if(!equal(await ask(MAGIC,1),[6]))fail('Handshake ACK missing','BAD_ACK');
 if(!equal(await ask([2],8),[0xaa,0x30,0x76,4,0,5,0x20,0xdd]))fail('Identity mismatch','WRONG_IDENTITY');
 if(!equal(await ask([6],1),[6]))fail('Identity acknowledgement rejected','BAD_ACK');
 // The captured session uses an auxiliary read carrying the firmware marker.
 const readBlock=async(address)=>{
  if(!equal(await ask([0x53,address>>8,address&255,64],1),[6]))fail('Block acknowledgement rejected','BAD_ACK');
  const frame=await ask([6],68);
  if(!equal(frame.slice(0,4),[0x58,address>>8,address&255,64]))fail('Block header mismatch','INVALID_FRAME');
  return Uint8Array.from(frame.slice(4));
 };
 const auxiliary=await readBlock(0x1ec0);
 if(!equal([...auxiliary.slice(48,55)],MARKER))fail('Firmware marker mismatch','WRONG_FIRMWARE');
 const blocks=new Map();
 for(const address of [0,64])blocks.set(address,await readBlock(address));
 return {firmware:'HN5RV01',blocks,simulated:true};
}
