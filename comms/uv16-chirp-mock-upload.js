// CHIRP Baofeng-common upload *simulation*, not a HN5RV01 writer.
// This module accepts only an in-memory simulator, never a serial transport.
export const CHIRP_MOCK_FORMAT='bsg-uv16-chirp-mock-v1';
const SIZE=64;
function fail(message){throw new Error(message);}
function hex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join(' ');}
function validBytes(data,size){return data instanceof Uint8Array&&data.length===size;}
export function createUV16MockRadio({memory,ackFailures=[],interruptAt=null}={}){
 if(!validBytes(memory,2048))fail('Mock requires exactly 2048 bytes of synthetic memory');
 if(!Array.isArray(ackFailures)||ackFailures.some(x=>!Number.isInteger(x)||x<0||x>=2048||x%SIZE))fail('Invalid mock ACK failures');
 if(interruptAt!==null&&(!Number.isInteger(interruptAt)||interruptAt<0||interruptAt>=2048||interruptAt%SIZE))fail('Invalid mock interruption');
 const state=memory.slice(),failures=new Set(ackFailures);
 return Object.freeze({
  kind:'IN_MEMORY_SIMULATOR_ONLY',
  // Not a port, device, serial writer, or transferable frame interface.
  applyBlock(address,payload){
   if(!Number.isInteger(address)||address<0||address>=2048||address%SIZE||!validBytes(payload,SIZE))
    fail('Mock block rejected: invalid address or size');
   if(address===interruptAt)fail('Simulated interrupted transfer');
   if(failures.has(address))return {ack:false};
   state.set(payload,address);
   return {ack:true};
  },
  snapshot(){return state.slice();}
 });
}
/**
 * Study the CHIRP Baofeng-common upload structure using synthetic memory only.
 * The source driver uploads X/address/length/data and requires 0x06 per block.
 * No actual frame is emitted; no handshake or serial APIs are present.
 */
export function simulateCHIRPUpload({before,after,simulator}={}){
 if(!validBytes(before,2048)||!validBytes(after,2048))fail('Only 2048-byte synthetic memory images are accepted');
 if(simulator?.kind!=='IN_MEMORY_SIMULATOR_ONLY'||typeof simulator.applyBlock!=='function'||typeof simulator.snapshot!=='function')
  fail('Only an in-memory simulator is permitted');
 const current=simulator.snapshot();
 if(!validBytes(current,2048)||!current.every((byte,i)=>byte===before[i]))fail('Simulator initial state does not match baseline');
 const changed=[];
 for(let i=0;i<2048;i++)if(before[i]!==after[i])changed.push(i);
 // A mock may only investigate an occupied channel's eight frequency bytes.
 if(!changed.length)fail('No changed bytes; refuse unnecessary programming');
 if(changed.some(i=>i%16>=8||before[Math.floor(i/16)*16]===0xff||after[Math.floor(i/16)*16]===0xff))
  fail('Changes outside occupied-channel frequency fields are prohibited');
 const changedBlocks=[...new Set(changed.map(i=>Math.floor(i/SIZE)*SIZE))].sort((a,b)=>a-b);
 const steps=[];
 let stopped=false,error=null;
 for(const address of changedBlocks){
  const payload=after.slice(address,address+SIZE);
  try{
   const response=simulator.applyBlock(address,payload);
   if(response?.ack!==true)fail('Simulated NAK at block '+address);
   steps.push(Object.freeze({address,bytes:SIZE,ack:'06 (mock only)'}));
  }catch(e){stopped=true;error=e.message;break;}
 }
 const observed=simulator.snapshot();
 const matched=observed.every((b,i)=>b===after[i]);
 return Object.freeze({
  format:CHIRP_MOCK_FORMAT,kind:'OFFLINE_SIMULATION_ONLY',
  changedByteOffsets:Object.freeze(changed),attemptedBlocks:steps.length,
  steps:Object.freeze(steps),stopped,error,simulatedReadbackMatches:matched,
  physicalWriteVerified:false,restorableBackupVerified:false,
  deviceProtocolVerified:false,canWrite:false,hardwareWriteEnabled:false,
  // Even a complete mock match is not a recovery demonstration.
  warning:'In-memory CHIRP-style simulation only. Do not use with a physical radio.'
 });
}
