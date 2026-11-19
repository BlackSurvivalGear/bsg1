// Evidence-only comparison of CHIRP IMG with BSG HN5RV01 read-regions snapshot.
// No radio communication, image mutation, serial interface or hardware write path.
import {inspectUV16CHIRPImage} from './uv16-chirp-image-audit.js';
import {validateUV16ReadRegions} from './uv16-read-regions.js';
export const AUX_COMPARISON_FORMAT='bsg-uv16-aux-comparison-v1';
const fromHex=s=>Uint8Array.from(s.match(/../g),x=>parseInt(x,16));
const equal=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const REFERENCE=Object.freeze([0x1e80,0x1ec0,0x1f00,0x1f40,0x1f80,0x1fc0]);
export function compareUV16CHIRPAuxiliary(image,snapshot){
 validateUV16ReadRegions(snapshot);
 const inspection=inspectUV16CHIRPImage(image,{snapshot});
 const payload=image.subarray(0,inspection.payloadBytes);
 const aligned=inspection.exactChannelSpanOffsets.includes(8);
 // A proposed linear file offset is NOT an independently established radio address map.
 const entries=snapshot.auxiliary.map(region=>{
  const expected=fromHex(region.bytesHex);
  const candidateOffset=region.address+8;
  const candidate=payload.subarray(candidateOffset,candidateOffset+64);
  const exactOffsets=[];
  for(let i=0;i+64<=payload.length;i++)if(equal(payload.subarray(i,i+64),expected))exactOffsets.push(i);
  const matchedBytes=candidate.length===64?candidate.reduce((n,x,i)=>n+(x===expected[i]),0):null;
  return Object.freeze({address:region.address,bytes:64,candidateFileOffset:candidateOffset,
   candidateBytesCompared:candidate.length,matchedBytes,changedBytes:matchedBytes===null?null:64-matchedBytes,
   candidateExact:matchedBytes===64,exactFileOffsets:Object.freeze(exactOffsets)});
 });
 const reference=REFERENCE.filter(address=>!snapshot.auxiliary.some(x=>x.address===address));
 return Object.freeze({
  format:AUX_COMPARISON_FORMAT,kind:'OFFLINE_EVIDENCE_ONLY',
  firmware:snapshot.firmware,channelSpanAtFileOffset8:aligned,
  channelSpanMatches:inspection.exactChannelSpanOffsets,
  auxiliary:Object.freeze(entries),referenceAddressesWithoutBSGCapture:Object.freeze(reference),
  linearOffsetHypothesisVerified:false,fullMemoryMapVerified:false,
  restorableBackupVerified:false,physicalWriteVerified:false,canWrite:false,
  warning:'A matching or mismatching CHIRP file slice does not establish a firmware memory map or safe upload.'
 });
}
