// Read-only UV-16 write preview. No serial APIs, device commands, or writable image.
import {validateUV16ReadRegions} from './uv16-read-regions.js';
import {inspectUV16Slot,prepareUV16OfflineFrequencyDiff} from './uv16-offline-frequency-codec.js';

export const UV16_WRITE_PREVIEW_FORMAT='bsg-uv16-write-preview-v1';
const blockers=Object.freeze([
 'Captured read regions are not a verified complete, restorable radio backup.',
 'HN5RV01 physical write framing, acknowledgement and recovery are unverified.',
 'Channel settings and reserved bytes are not mapped; no hardware writing is permitted.'
]);
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);

/**
 * Preview only explicitly selected, already occupied physical slots.
 * Never infer slot mapping from editor order or channel names.
 * Each request must include exact observed old RX/TX and proposed new RX/TX.
 * Only frequency fields are investigated; other settings are never encoded.
 */
export function previewUV16OfflineWrite({snapshot,changes}={}){
 validateUV16ReadRegions(snapshot);
 if(!Array.isArray(changes)||changes.length===0||changes.length>128)
  throw Error('Provide 1 to 128 explicit slot changes');
 const seen=new Set(),rows=[];
 for(const [index,change] of changes.entries()){
  if(!change||typeof change!=='object'||Array.isArray(change))
   throw Error('Invalid change at position '+(index+1));
  const keys=['slot','expectedRxMHz','expectedTxMHz','newRxMHz','newTxMHz'];
  if(keys.some(key=>!own(change,key))||Object.keys(change).some(key=>!keys.includes(key)))
   throw Error('Only explicit slot and RX/TX frequency fields are accepted');
  const {slot}=change;
  if(!Number.isInteger(slot)||slot<0||slot>=128||seen.has(slot))
   throw Error('Invalid or duplicate physical slot');
  seen.add(slot);
  const source=inspectUV16Slot(snapshot,slot);
  const diff=prepareUV16OfflineFrequencyDiff({snapshot,...change});
  rows.push(Object.freeze({
   slot,displayMemory:slot+1,
   beforeRxMHz:source.rxMHz,beforeTxMHz:source.txMHz,
   afterRxMHz:diff.rxMHzAfter,afterTxMHz:diff.txMHzAfter,
   changedOffsets:diff.changedOffsets,
   changedByteCount:diff.changedOffsets.length,
   unknownFieldsPreserved:diff.unknownFieldsPreserved,
   // No encoded record, raw memory image, or protocol frame is exposed.
   unchanged:diff.changedOffsets.length===0
  }));
 }
 return Object.freeze({
  format:UV16_WRITE_PREVIEW_FORMAT,kind:'OFFLINE_PREVIEW_ONLY',
  firmware:'HN5RV01',sourceSnapshotChecksum:snapshot.integrity.value,
  previewCount:rows.length,changedSlots:rows.filter(row=>!row.unchanged).length,
  rows:Object.freeze(rows),blockers,
  backupRestorable:false,settingsVerified:false,protocolVerified:false,
  hardwareWriteEnabled:false,canWrite:false,writeVerified:false,
  warning:'Preview only: never use this report as a radio-memory image or write instruction.'
 });
}
export function formatUV16OfflineWritePreview(preview){
 if(preview?.format!==UV16_WRITE_PREVIEW_FORMAT||preview.canWrite!==false)
  throw Error('Invalid offline write preview');
 return [
  'UV-16 Pro V2 — OFFLINE WRITE PREVIEW (NO RADIO COMMANDS)',
  'Hardware write: BLOCKED',
  'Source snapshot checksum: '+preview.sourceSnapshotChecksum,
  'Selected slots: '+preview.previewCount+'; changed: '+preview.changedSlots,
  ...preview.rows.map(row=>'Memory '+row.displayMemory+': '+row.beforeRxMHz+'/'+row.beforeTxMHz+
   ' MHz → '+row.afterRxMHz+'/'+row.afterTxMHz+' MHz; changed frequency-byte offsets: '+
   (row.changedOffsets.join(', ')||'none')+'; unknown fields preserved'),
  ...preview.blockers.map(reason=>'Blocker: '+reason),
  preview.warning
 ].join('\n');
}
