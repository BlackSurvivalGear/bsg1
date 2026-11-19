// HN5RV01 evidence audit: compare existing read-only snapshots, never build radio commands.
// Offsets 0–7 are demonstrated frequency BCD; offsets 8–15 have UNKNOWN meanings.
import {validateUV16ReadRegions} from './uv16-read-regions.js';
import {decodeUV16FrequencyBCD} from './uv16-offline-frequency-codec.js';

export const UV16_SETTINGS_AUDIT_FORMAT='bsg-uv16-settings-evidence-v1';
const SLOT_BYTES=16, SLOTS=128, EXPECTED_FIRMWARE='HN5RV01';
const parseBytes=hex=>Uint8Array.from({length:hex.length/2},(_,i)=>parseInt(hex.slice(2*i,2*i+2),16));
const asHex=value=>value.toString(16).padStart(2,'0');
const hexRange=(bytes,start,end)=>Array.from(bytes.slice(start,end),asHex).join('');
function readSnapshot(snapshot){
 validateUV16ReadRegions(snapshot);
 if(snapshot.firmware!==EXPECTED_FIRMWARE)throw Error('Unsupported firmware');
 return parseBytes(snapshot.memory.bytesHex);
}
function occupancy(bytes,slot){return bytes[slot*SLOT_BYTES]!==0xff;}
export function auditUV16ChannelSettings(snapshot){
 const bytes=readSnapshot(snapshot);
 let unused=0,blank=0,residual=0;
 const active=[],different=new Set(),observed=new Map();
 for(let slot=0;slot<SLOTS;slot++){
  const base=slot*SLOT_BYTES, row=bytes.slice(base,base+SLOT_BYTES);
  if(!occupancy(bytes,slot)){
   unused++;
   if(row.every(v=>v===255))blank++;else residual++;
   continue;
  }
  const rxMHz=decodeUV16FrequencyBCD(row.slice(0,4));
  const txMHz=decodeUV16FrequencyBCD(row.slice(4,8));
  const settingsHex=hexRange(row,8,16);
  active.push(Object.freeze({slot,rxMHz,txMHz,settingsHex}));
  for(let offset=8;offset<16;offset++){
   if(!observed.has(offset))observed.set(offset,new Set());
   observed.get(offset).add(row[offset]);
   if(observed.get(offset).size>1)different.add(offset);
  }
 }
 return Object.freeze({
  format:UV16_SETTINGS_AUDIT_FORMAT,kind:'OFFLINE_EVIDENCE_ONLY',
  firmware:EXPECTED_FIRMWARE,sourceSnapshotChecksum:snapshot.integrity.value,
  activeSlots:Object.freeze(active),activeCount:active.length,unusedCount:unused,
  fullyFFUnusedCount:blank,residualUnusedCount:residual,
  unknownFieldOffsets:Object.freeze([8,9,10,11,12,13,14,15]),
  varyingUnknownOffsets:Object.freeze([...different].sort((a,b)=>a-b)),
  settingsIdentified:false,writeProtocolVerified:false,hardwareWriteEnabled:false,
  limitations:'Observed bytes cannot establish the meanings of power, tone, bandwidth, scan, transmit inhibit, options or reserved flags.'
 });
}
/**
 * Examine two independently validated read-only captures. Changing bytes do
 * NOT prove the setting that caused them to change. No writable frame is emitted.
 */
export function compareUV16ReadSnapshots(before,after){
 const left=readSnapshot(before),right=readSnapshot(after);
 const changes=[],auxiliaryChanges=[];
 for(let slot=0;slot<SLOTS;slot++){
  const base=slot*SLOT_BYTES;
  if(occupancy(left,slot)!==occupancy(right,slot))
   throw Error('Slot population changed; settings comparison requires unchanged occupancy');
  if(!occupancy(left,slot))continue; // residual bytes are not blank templates
  const changedOffsets=[];
  for(let offset=0;offset<SLOT_BYTES;offset++){
   if(left[base+offset]!==right[base+offset])
    changedOffsets.push(Object.freeze({recordOffset:offset,absoluteOffset:base+offset,oldHex:asHex(left[base+offset]),newHex:asHex(right[base+offset])}));
  }
  if(changedOffsets.length)changes.push(Object.freeze({
   slot,frequencyBytesChanged:changedOffsets.some(x=>x.recordOffset<8),
   unknownFieldBytesChanged:changedOffsets.some(x=>x.recordOffset>=8),
   changedOffsets:Object.freeze(changedOffsets)
  }));
 }
 for(let index=0;index<before.auxiliary.length;index++){
  const a=before.auxiliary[index],b=after.auxiliary[index];
  if(a.address!==b.address)throw Error('Auxiliary addresses differ');
  const leftAux=parseBytes(a.bytesHex),rightAux=parseBytes(b.bytesHex),offsets=[];
  for(let i=0;i<64;i++)if(leftAux[i]!==rightAux[i])offsets.push(i);
  if(offsets.length)auxiliaryChanges.push(Object.freeze({address:a.address,offsets:Object.freeze(offsets)}));
 }
 return Object.freeze({
  format:UV16_SETTINGS_AUDIT_FORMAT,kind:'OFFLINE_COMPARISON_ONLY',
  beforeChecksum:before.integrity.value,afterChecksum:after.integrity.value,
  changedPopulatedSlots:Object.freeze(changes),
  auxiliaryChanges:Object.freeze(auxiliaryChanges),
  skippedUnusedSlots:SLOTS-auditUV16ChannelSettings(before).activeCount,
  settingsIdentified:false,writeProtocolVerified:false,restorable:false,hardwareWriteEnabled:false,
  warning:'Byte differences alone do not identify settings. This report cannot write, verify or restore the radio.'
 });
}
