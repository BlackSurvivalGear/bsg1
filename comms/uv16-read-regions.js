// UV-16 HN5RV01 offline read-region snapshot. NOT a restorable radio backup.
// Captures only regions already read by the physically verified PR #51 transaction.
// No hardware write instructions, encoders, serial access or mutation of source bytes.
export const UV16_RAW_SNAPSHOT_FORMAT='bsg-uv16-read-regions-v1';
export const UV16_RAW_REGION_END=2048;
export const UV16_AUX_ADDRESSES=Object.freeze([0x1e80,0x1ec0,0x1fc0]);
const validBytes=(bytes,length)=>bytes instanceof Uint8Array&&bytes.length===length;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
function checksum(text){let value=2166136261;for(let i=0;i<text.length;i++){value^=text.charCodeAt(i);value=Math.imul(value,16777619);}return (value>>>0).toString(16).padStart(8,'0');}
export function captureUV16ReadRegions({firmware,channelBytes,auxiliary}={}){
 if(firmware!=='HN5RV01'||!validBytes(channelBytes,UV16_RAW_REGION_END))throw Error('Incomplete or unexpected UV-16 memory capture');
 if(!(auxiliary instanceof Map)||auxiliary.size!==UV16_AUX_ADDRESSES.length)throw Error('Incomplete UV-16 auxiliary capture');
 const aux=UV16_AUX_ADDRESSES.map(address=>{
  const bytes=auxiliary.get(address);
  if(!validBytes(bytes,64))throw Error('Incomplete UV-16 auxiliary read at '+address.toString(16));
  return Object.freeze({address,bytesHex:hex(bytes)});
 });
 const memoryHex=hex(channelBytes);
 const data=[memoryHex,...aux.map(a=>a.address.toString(16)+':'+a.bytesHex)].join('|');
 return Object.freeze({
  format:UV16_RAW_SNAPSHOT_FORMAT,model:'uv-16-pro-v2',firmware,
  readOnly:true,restorable:false,hardwareWriteEnabled:false,
  memory:Object.freeze({start:0,length:UV16_RAW_REGION_END,bytesHex:memoryHex}),
  auxiliary:Object.freeze(aux),
  integrity:Object.freeze({algorithm:'fnv1a32-noncryptographic',value:checksum(data)}),
  warning:'Read-region evidence only. Not a complete validated radio image or hardware-restorable backup. No write protocol is verified.'
 });
}
export function validateUV16ReadRegions(value){
 if(value?.format!==UV16_RAW_SNAPSHOT_FORMAT||value.model!=='uv-16-pro-v2'||value.firmware!=='HN5RV01'||value.readOnly!==true||value.restorable!==false||value.hardwareWriteEnabled!==false)
  throw Error('Unsupported UV-16 read-region snapshot');
 const memory=value.memory;
 if(memory?.start!==0||memory.length!==UV16_RAW_REGION_END||typeof memory.bytesHex!=='string'||!/^[0-9a-f]+$/.test(memory.bytesHex)||memory.bytesHex.length!==UV16_RAW_REGION_END*2)
  throw Error('Invalid UV-16 memory region');
 const aux=value.auxiliary;
 if(!Array.isArray(aux)||aux.length!==3||aux.some((a,i)=>a.address!==UV16_AUX_ADDRESSES[i]||typeof a.bytesHex!=='string'||!/^[0-9a-f]{128}$/.test(a.bytesHex)))
  throw Error('Invalid UV-16 auxiliary regions');
 const data=[memory.bytesHex,...aux.map(a=>a.address.toString(16)+':'+a.bytesHex)].join('|');
 if(value.integrity?.algorithm!=='fnv1a32-noncryptographic'||value.integrity.value!==checksum(data))
  throw Error('UV-16 snapshot integrity check failed');
 return true;
}
