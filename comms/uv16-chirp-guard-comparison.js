// Read-only BF-F8HP guard comparison. No radio command, no writable output.
import {inspectBFF8HPActualLayout} from './uv16-bff8hp-actual-layout-audit.js';
export const GUARD_COMPARISON_FORMAT='bsg-uv16-chirp-guard-comparison-v1';
const ADDRESSES=[0x1f00,0x1f40,0x1f80];
function fail(s){throw Error(s);}
function decode(hex){if(typeof hex!=='string'||!/^(?:[a-fA-F0-9]{2}){64}$/.test(hex))fail('Expected exactly 64 captured bytes');return Uint8Array.from(hex.match(/../g),x=>parseInt(x,16));}
export function compareBFF8HPCHIRPGuard(image,capture){
 const layout=inspectBFF8HPActualLayout(image);
 if(!capture||capture.format!=='bsg-uv16-chirp-guard-capture-v1'||capture.firmware!=='HN5RV01'||capture.readOnly!==true||capture.restorable!==false||
  !Array.isArray(capture.regions)||capture.regions.length!==3)fail('Complete HN5RV01 read-only guard capture required');
 const blocks=ADDRESSES.map((address,i)=>{
  const region=capture.regions[i];
  if(!region||region.address!==address)fail('Unexpected or reordered guard address');
  return decode(region.bytesHex);
 });
 const areas=[{start:0x1f00,bytes:blocks[0].length+32,radio:Uint8Array.from([...blocks[0],...blocks[1].slice(0,32)])},
  {start:0x1f70,bytes:16,radio:blocks[1].slice(48)},
  {start:0x1f90,bytes:48,radio:blocks[2].slice(16)}];
 const comparisons=areas.map(a=>{
  const fileOffset=layout.auxiliary.fileStart+(a.start-layout.auxiliary.radioStart);
  const expected=image.subarray(fileOffset,fileOffset+a.bytes);
  const differences=[];for(let i=0;i<a.bytes;i++)if(expected[i]!==a.radio[i])differences.push(i);
  return Object.freeze({radioStart:a.start,fileOffset,bytes:a.bytes,matchingBytes:a.bytes-differences.length,
   exactMatch:differences.length===0,differingOffsets:Object.freeze(differences)});
 });
 return Object.freeze({format:GUARD_COMPARISON_FORMAT,kind:'READ_ONLY_EVIDENCE',firmware:'HN5RV01',
  comparisons:Object.freeze(comparisons),allGuardAreasMatch:comparisons.every(x=>x.exactMatch),
  // Even a match only confirms these areas, not upload or recovery.
  writeProtocolVerified:false,restorableBackupVerified:false,physicalWriteVerified:false,canWrite:false,
  warning:'Auxiliary guard comparison does not authorize CHIRP Upload or BSG physical Write.'});
}
