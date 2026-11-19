// HN5RV01 single-slot write rehearsal. In-memory only; no WebSerial or radio commands.
// Mirrors BF-F8HP uv5r.py's 16-byte X block ACK semantics for a mock device.
import {validateUV16ReadRegions} from './uv16-read-regions.js';
import {prepareUV16OfflineFrequencyDiff} from './uv16-offline-frequency-codec.js';
const BLOCK=16, LENGTH=2048;
const fail=s=>{throw Error(s);};
const equal=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
export function createUV16WriteRehearsalDevice({baseline,ack=true,interrupt=false}={}){
 if(!(baseline instanceof Uint8Array)||baseline.length!==LENGTH)fail('2048-byte mock baseline required');
 const state=baseline.slice();
 return Object.freeze({kind:'IN_MEMORY_ONLY',
  apply(address,payload){
   if(!Number.isInteger(address)||address<0||address>=LENGTH||address%BLOCK||
    !(payload instanceof Uint8Array)||payload.length!==BLOCK)fail('Invalid mock block');
   if(interrupt)throw Error('Mock interrupted before ACK');
   if(!ack)return false;
   state.set(payload,address);return true;
  },readback(){return state.slice();}
 });
}
export function rehearseUV16SingleChannelWrite({snapshot,slot,expectedRxMHz,expectedTxMHz,newRxMHz,newTxMHz,device}={}){
 validateUV16ReadRegions(snapshot);
 if(!Number.isInteger(slot)||slot<0||slot>=128)fail('Invalid physical slot');
 if(device?.kind!=='IN_MEMORY_ONLY'||typeof device.apply!=='function'||typeof device.readback!=='function')
  fail('In-memory rehearsal device required');
 const before=Uint8Array.from(snapshot.memory.bytesHex.match(/../g),x=>parseInt(x,16));
 if(!equal(device.readback(),before))fail('Mock baseline differs from read snapshot');
 const diff=prepareUV16OfflineFrequencyDiff({snapshot,slot,expectedRxMHz,expectedTxMHz,newRxMHz,newTxMHz});
 if(!diff.changedOffsets?.length)fail('No frequency change proposed');
 if(diff.changedOffsets.some(offset=>Math.floor(offset/BLOCK)!==slot||offset%BLOCK>=8))
  fail('Change outside selected channel frequency fields');
 const address=slot*BLOCK;
 // The existing validated frequency codec only supplies an offline diff. Build
 // the candidate locally, retaining all other channel bytes verbatim.
 const after=before.slice();
 after.set(Uint8Array.from(diff.afterRecordHex.match(/../g),x=>parseInt(x,16)),address);
 const changed=[];for(let i=0;i<LENGTH;i++)if(before[i]!==after[i])changed.push(i);
 if(!changed.length||changed.some(i=>Math.floor(i/BLOCK)!==slot||i%BLOCK>=8))
  fail('Invalid candidate frequency change');
 let ack=false,error=null;
 try{ack=device.apply(address,after.slice(address,address+BLOCK))===true;}
 catch(e){error=e.message;}
 const observed=device.readback();
 const fullMatch=ack&&equal(observed,after);
 const unchanged=observed.every((byte,i)=>Math.floor(i/BLOCK)===slot||byte===before[i]);
 return Object.freeze({kind:'OFFLINE_SINGLE_CHANNEL_REHEARSAL',slot,address,
  changedOffsets:Object.freeze(changed),mockAck:ack,interrupted:!!error,error,
  fullReadbackMatches:fullMatch,otherSlotsUnchanged:unchanged,
  pass:fullMatch&&unchanged,canWrite:false,physicalWriteVerified:false,
  recoveryVerified:false,warning:'Mock-only. No HN5RV01 hardware write is authorised.'});
}
