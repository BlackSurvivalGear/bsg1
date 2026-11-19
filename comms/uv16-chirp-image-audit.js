// Offline inspection only. No serial, device, upload or write interfaces.
import {validateUV16ReadRegions} from './uv16-read-regions.js';
export const CHIRP_IMAGE_AUDIT_FORMAT='bsg-uv16-chirp-image-audit-v1';
const MARKER=Uint8Array.from([0xff,0x63,0x68,0x69,0x72,0x70,0xee,0x69,0x6d,0x67,0,1]);
const ID=Uint8Array.from([0xaa,0x30,0x76,0x04,0,5,0x20,0xdd]);
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
function fail(message){throw Error(message);}
function markerAt(bytes,offset){return offset>=0&&offset+MARKER.length<=bytes.length&&equal(bytes.subarray(offset,offset+MARKER.length),MARKER);}
function ascii(bytes){return String.fromCharCode(...bytes);}
function decode64(text){
 if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))fail('Invalid CHIRP metadata encoding');
 // Decode base64 without browser or Node APIs so the analyser remains portable.
 const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 const out=[];for(let i=0;i<text.length;i+=4){const part=text.slice(i,i+4);let n=0;for(const c of part)n=(n<<6)|(c==='='?0:chars.indexOf(c));
  out.push((n>>>16)&255);if(part[2]!=='=')out.push((n>>>8)&255);if(part[3]!=='=')out.push(n&255);
 }return ascii(out);
}
export function inspectUV16CHIRPImage(bytes,{snapshot}={}){
 if(!(bytes instanceof Uint8Array)||bytes.length<MARKER.length+32||bytes.length>1024*1024)fail('Invalid CHIRP image size or type');
 const markers=[];for(let i=0;i<=bytes.length-MARKER.length;i++)if(markerAt(bytes,i))markers.push(i);
 if(markers.length!==1)fail('Expected exactly one CHIRP metadata marker');
 const boundary=markers[0],payload=bytes.subarray(0,boundary);
 const encoded=ascii(bytes.subarray(boundary+MARKER.length));
 let meta;try{meta=JSON.parse(decode64(encoded));}catch{fail('Invalid CHIRP metadata JSON');}
 if(meta===null||typeof meta!=='object'||Array.isArray(meta))fail('Invalid CHIRP metadata');
 const identityMatches=payload.length>=8&&equal(payload.subarray(0,8),ID);
 const firmwareNeedle=Uint8Array.from([72,78,53,82,86,48,49]);
 const firmwareOffsets=[];
 for(let i=0;i<=payload.length-firmwareNeedle.length;i++)if(equal(payload.subarray(i,i+7),firmwareNeedle))firmwareOffsets.push(i);
 const matches=[];
 if(snapshot!==undefined){
  validateUV16ReadRegions(snapshot);
  const expected=Uint8Array.from(snapshot.memory.bytesHex.match(/../g),v=>parseInt(v,16));
  // An alignment is evidence only if the full captured 2048-byte span matches.
  for(let offset=0;offset+expected.length<=payload.length;offset++)
   if(equal(payload.subarray(offset,offset+expected.length),expected))matches.push(offset);
 }
 return Object.freeze({
  format:CHIRP_IMAGE_AUDIT_FORMAT,kind:'OFFLINE_INSPECTION_ONLY',
  fileBytes:bytes.length,payloadBytes:payload.length,metadataOffset:boundary,
  metadata:Object.freeze({driver:meta.rclass??null,vendor:meta.vendor??null,model:meta.model??null,chirpVersion:meta.chirp_version??null}),
  radioIdentityMatches:identityMatches,
  firmwareOffsets:Object.freeze(firmwareOffsets),
  snapshotCompared:snapshot!==undefined,
  exactChannelSpanOffsets:Object.freeze(matches),
  // CHIRP image offsets are not physical radio addresses.
  auxiliaryRegionMappingVerified:false,fullMemoryMapVerified:false,
  restorableBackupVerified:false,writeProtocolVerified:false,canWrite:false,
  warning:'Read-only CHIRP image analysis; file size, firmware string and channel matches do not prove safe hardware restoration.'
 });
}
