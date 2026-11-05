// Offline-only protocol exercise. Synthetic fixtures are NOT radio memory maps.
import {UV5RFamilyProtocol} from './uv5r-family-protocol.js';
const ACK=Uint8Array.of(6);
export async function runFamilyMockRead(model){
  if(!['uv-5r','bf-f8hp'].includes(model))throw Error('Unsupported mock protocol model');
  const address=0x40, payload=Uint8Array.from({length:64},(_,i)=>i);
  const replies=[ACK,Uint8Array.of(0x50,0x00,0x00,0x00,0x00,0x00,0x00,0x00),ACK,ACK,Uint8Array.of(0x58,0,0x40,0x40,...payload)];
  const writes=[];
  const transport={kind:'mock',async write(bytes){writes.push([...bytes]);},async read(size){const response=replies.shift();if(!response||response.length!==size)throw Error('Unexpected mock read size');return response;}};
  // BF-F8HP handshake bytes here are synthetic and never sent to a physical device.
  const options={transport,model,...(model==='bf-f8hp'?{magic:[1,2,3,4,5,6,7]}:{})};
  const protocol=new UV5RFamilyProtocol(options);
  const identity=await protocol.identify();
  const block=await protocol.readBlock(address);
  if(replies.length||block.length!==64||!block.every((v,i)=>v===payload[i]))throw Error('Mock memory validation failed');
  return Object.freeze({model:identity.model,identity:identity.identity,blockLength:block.length,request:writes.at(-2),mock:true});
}
