// HN5RV01 offline-only frequency codec investigation.
// Supported evidence: five populated 16-byte records in a user-supplied read snapshot.
// No USB/serial imports, writer, upload, restore or executable device commands.
import {validateUV16ReadRegions} from './uv16-read-regions.js';

export const UV16_OFFLINE_DIFF_FORMAT='bsg-uv16-offline-frequency-diff-v1';
const RECORD_SIZE=16;
const SLOT_COUNT=128;
const SCALE=100000; // 0.00001 MHz / 10 Hz, the observed 4-byte BCD resolution
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const decodeHex=text=>Uint8Array.from({length:text.length/2},(_,i)=>parseInt(text.slice(i*2,i*2+2),16));
function record(snapshot,slot){
 validateUV16ReadRegions(snapshot);
 if(!Number.isInteger(slot)||slot<0||slot>=SLOT_COUNT)throw Error('Invalid UV-16 radio slot');
 const offset=slot*RECORD_SIZE;
 const bytes=decodeHex(snapshot.memory.bytesHex.slice(offset*2,(offset+RECORD_SIZE)*2));
 // First byte 0xff means unused to the verified reader. It does not mean
 // other bytes are unset or safe to overwrite.
 if(bytes[0]===0xff)throw Error('Unused radio slot: its retained bytes must not be overwritten');
 return {bytes,offset};
}
export function decodeUV16FrequencyBCD(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length!==4)throw Error('Frequency requires exactly four BCD bytes');
 const digits=Array.from(bytes).reverse().map(value=>{
  if((value>>>4)>9||(value&15)>9)throw Error('Invalid HN5RV01 BCD digit');
  return String(value>>>4)+String(value&15);
 }).join('');
 const mhz=Number(digits)/SCALE;
 if(!Number.isFinite(mhz)||mhz<=0||mhz>=1000)throw Error('Out-of-range HN5RV01 frequency');
 return mhz;
}
export function encodeUV16FrequencyBCD(mhz){
 if(typeof mhz!=='number'||!Number.isFinite(mhz)||mhz<=0||mhz>=1000)
  throw Error('Invalid HN5RV01 frequency');
 const scaled=Math.round(mhz*SCALE);
 if(Math.abs(mhz*SCALE-scaled)>0.000001||scaled<=0||scaled>=100000000)
  throw Error('Frequency not representable at 10 Hz resolution');
 const digits=String(scaled).padStart(8,'0');
 return Uint8Array.from([6,4,2,0].map(i=>Number(digits.slice(i,i+2)[0])*16+Number(digits.slice(i,i+2)[1])));
}
export function inspectUV16Slot(snapshot,slot){
 const {bytes,offset}=record(snapshot,slot);
 return Object.freeze({
  slot,offset,recordHex:hex(bytes),rxMHz:decodeUV16FrequencyBCD(bytes.slice(0,4)),
  txMHz:decodeUV16FrequencyBCD(bytes.slice(4,8)),
  unknownFieldsHex:hex(bytes.slice(8)),
  writeEnabled:false,restorable:false
 });
}
/**
 * Offline hypothetical single-record diff. Only the demonstrated RX/TX BCD
 * bytes may differ. An exact old-frequency match is mandatory to avoid stale
 * or incorrect slot assignments. Returns NO full image or device write frame.
 */
export function prepareUV16OfflineFrequencyDiff({snapshot,slot,expectedRxMHz,expectedTxMHz,newRxMHz,newTxMHz}={}){
 const {bytes,offset}=record(snapshot,slot);
 const rx=decodeUV16FrequencyBCD(bytes.slice(0,4));
 const tx=decodeUV16FrequencyBCD(bytes.slice(4,8));
 if(expectedRxMHz!==rx||expectedTxMHz!==tx)
  throw Error('Expected frequencies disagree with source snapshot; refusing stale slot change');
 const next=bytes.slice();
 next.set(encodeUV16FrequencyBCD(newRxMHz),0);
 next.set(encodeUV16FrequencyBCD(newTxMHz),4);
 if(!next.slice(8).every((value,i)=>value===bytes[i+8]))
  throw Error('Unknown channel fields changed');
 const changedOffsets=Object.freeze(Array.from({length:8},(_,i)=>i)
  .filter(i=>next[i]!==bytes[i]).map(i=>offset+i));
 return Object.freeze({
  format:UV16_OFFLINE_DIFF_FORMAT,kind:'HYPOTHETICAL_OFFLINE_ONLY',
  firmware:'HN5RV01',slot,
  sourceSnapshotChecksum:snapshot.integrity.value,
  beforeRecordHex:hex(bytes),afterRecordHex:hex(next),
  changedOffsets,
  rxMHzBefore:rx,txMHzBefore:tx,rxMHzAfter:newRxMHz,txMHzAfter:newTxMHz,
  unknownFieldsPreserved:true,hardwareWriteEnabled:false,restorable:false,
  warning:'An offline experiment only. No write protocol, complete backup or physical restoration is verified.'
 });
}
