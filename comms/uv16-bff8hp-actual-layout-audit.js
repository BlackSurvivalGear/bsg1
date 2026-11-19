// BF-F8HP actual CHIRP uv5r.py image layout. Offline inspection only.
// Source: kk7ds/chirp/chirp/drivers/uv5r.py, BaofengBFF8HPRadio -> BaofengUV5R.
import {inspectUV16CHIRPImage} from './uv16-chirp-image-audit.js';
import {validateUV16ReadRegions} from './uv16-read-regions.js';
export const BF_F8HP_LAYOUT_AUDIT_FORMAT='bsg-uv16-bff8hp-layout-audit-v1';
const MAIN_FILE_START=8,MAIN_LENGTH=0x1800,AUX_FILE_START=0x1808,AUX_RADIO_START=0x1ec0,AUX_LENGTH=0x140;
const EQUALITY_RANGES=Object.freeze([[0x1f00,0x1f60],[0x1f70,0x1f80],[0x1f90,0x1fc0]].map(x=>Object.freeze(x)));
const MAIN_DEFAULT=Object.freeze([[0x0008,0x0cf8],[0x0d08,0x0df8],[0x0e08,0x1808]].map(x=>Object.freeze(x)));
const AUX_LIMITED=Object.freeze([[0x1ee0,0x1ef0],[0x1f60,0x1f70],[0x1f80,0x1f90],[0x1fc0,0x1fd0]].map(x=>Object.freeze(x)));
const AUX_FULL=Object.freeze([[0x1ec0,0x2000]].map(x=>Object.freeze(x)));
const equal=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const hex=s=>Uint8Array.from(s.match(/../g),x=>parseInt(x,16));
function fail(s){throw Error(s);}
export function inspectBFF8HPActualLayout(image,{snapshot}={}){
 const parsed=inspectUV16CHIRPImage(image,{snapshot});
 if(parsed.payloadBytes<AUX_FILE_START+AUX_LENGTH)fail('CHIRP BF-F8HP image has incomplete auxiliary payload');
 if(parsed.metadata.driver!=='BaofengBFF8HPRadio')fail('Image metadata is not BF-F8HP driver');
 const regions=snapshot===undefined?[]:(validateUV16ReadRegions(snapshot),snapshot.auxiliary.map(region=>{
  const bytes=hex(region.bytesHex);
  const represented=region.address>=AUX_RADIO_START&&region.address+bytes.length<=AUX_RADIO_START+AUX_LENGTH;
  const fileOffset=represented?AUX_FILE_START+(region.address-AUX_RADIO_START):null;
  const exact=represented?equal(image.subarray(fileOffset,fileOffset+64),bytes):null;
  return Object.freeze({radioAddress:region.address,representedInImage:represented,fileOffset,exactMatch:exact});
 }));
 return Object.freeze({
  format:BF_F8HP_LAYOUT_AUDIT_FORMAT,kind:'OFFLINE_LAYOUT_INSPECTION_ONLY',
  driverModule:'chirp/drivers/uv5r.py',driverClass:'BaofengBFF8HPRadio',
  main:Object.freeze({fileStart:MAIN_FILE_START,fileEndExclusive:MAIN_FILE_START+MAIN_LENGTH,radioStart:0,radioEndExclusive:MAIN_LENGTH}),
  auxiliary:Object.freeze({fileStart:AUX_FILE_START,fileEndExclusive:AUX_FILE_START+AUX_LENGTH,radioStart:AUX_RADIO_START,radioEndExclusive:0x2000}),
  trailingPreMetadataBytes:parsed.payloadBytes-(AUX_FILE_START+AUX_LENGTH),
  channelSpanOffsets:parsed.exactChannelSpanOffsets,
  snapshotRegions:Object.freeze(regions),
  block1E80StoredInCHIRPImage:false,
  // The original BSG 0x1e80 read is not evidence of CHIRP upload coverage.
  fullMemoryMapVerified:false,physicalWriteVerified:false,canWrite:false,
  warning:'BF-F8HP image omits 0x1e80. Exact read layout does not establish HN5RV01 write compatibility.'
 });
}
/** Model uv5r.py _do_upload default decisions; does not create or transmit packets. */
export function auditBFF8HPUploadDecision({image,radioComparisonAreas,hasDroppedByte=false,rangeOverride=false}={}){
 const layout=inspectBFF8HPActualLayout(image);
 if(!Array.isArray(radioComparisonAreas)||radioComparisonAreas.length!==3||![96,16,48].every((n,i)=>radioComparisonAreas[i] instanceof Uint8Array&&radioComparisonAreas[i].length===n))
  fail('Three fresh radio auxiliary comparison areas required');
 if(typeof hasDroppedByte!=='boolean'||typeof rangeOverride!=='boolean')fail('Invalid upload decision inputs');
 const comparison=EQUALITY_RANGES.map(([start,end],i)=>{
  const offset=AUX_FILE_START+(start-AUX_RADIO_START);
  return Object.freeze({radioStart:start,radioEndExclusive:end,fileOffset:offset,
   matches:equal(image.subarray(offset,offset+end-start),radioComparisonAreas[i])});
 });
 const auxMatched=comparison.every(x=>x.matches);
 const blocked=hasDroppedByte&&!auxMatched&&!rangeOverride;
 const auxiliaryDefault=hasDroppedByte||auxMatched?AUX_FULL:AUX_LIMITED;
 return Object.freeze({
  format:BF_F8HP_LAYOUT_AUDIT_FORMAT,kind:'OFFLINE_SOURCE_DECISION_ONLY',
  comparison:Object.freeze(comparison),auxMatched,hasDroppedByte,rangeOverride,
  blockedByCHIRPGuard:blocked,
  defaultMainRanges:MAIN_DEFAULT,defaultAuxiliaryRanges:auxiliaryDefault,
  defaultWouldWrite1E80:false,
  defaultWouldWrite1EC0:auxiliaryDefault===AUX_FULL,
  rangeOverrideRequiresSeparateReview:rangeOverride,
  firmwareSpecificWriteSafetyVerified:false,restorableBackupVerified:false,
  physicalWriteVerified:false,canWrite:false,
  warning:'Read-only uv5r.py policy model. No fresh physical auxiliary readback or recovery validation.'
 });
}
