// Experimental physical write: one occupied HN5RV01 memory slot, RX frequency only.
// No general-purpose write API, auxiliary write, or whole-radio CHIRP upload.
import {SerialByteTransport} from './serial-byte-transport.js';
import {captureUV16ReadRegions} from './uv16-read-regions.js';
import {inspectUV16Slot,prepareUV16OfflineFrequencyDiff} from './uv16-offline-frequency-codec.js';
const MAGIC=[0x50,0xbb,0xff,0x20,0x12,0x07,0x25];
const ID=[0xaa,0x30,0x76,0x04,0x00,0x05,0x20,0xdd];
const AUX=[0x1ec0,0x1f00,0x1f40,0x1f80,0x1fc0];
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
const fromHex=s=>Uint8Array.from(s.match(/../g),x=>parseInt(x,16));
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const fail=s=>{throw Error(s);};
export function prepareUV16HardwareChange({capture,slot,newRxMHz}={}){
 if(capture?.format!=='bsg-uv16-full-main-read-v1'||capture.firmware!=='HN5RV01'||
    capture.readOnly!==true||capture.restorable!==false||capture.main?.start!==0||
    capture.main?.length!==6144||!/^[0-9a-f]{12288}$/i.test(capture.main.bytesHex??'')||
    !Array.isArray(capture.auxiliary)||capture.auxiliary.length!==5||
    !AUX.every((address,i)=>capture.auxiliary[i]?.address===address&&/^[0-9a-f]{128}$/i.test(capture.auxiliary[i]?.bytesHex??'')))
   fail('Complete HN5RV01 full-read evidence required');
 if(!Number.isInteger(slot)||slot<0||slot>=128)fail('Invalid radio memory');
 const main=fromHex(capture.main.bytesHex);
 // Existing validated BCD codec requires a read-region snapshot, but full-read
 // evidence does not store 0x1e80. A synthetic unused 0x1e80 block is supplied
 // for codec shape validation only and is never sent to the device.
 const aux=new Map(capture.auxiliary.map(x=>[x.address,x.bytesHex.toLowerCase()]));
 const snapshot=captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:main.slice(0,2048),
  auxiliary:new Map([0x1e80,0x1ec0,0x1fc0].map(address=>
    [address,fromHex(aux.get(address)??'00'.repeat(64))]))});
 const original=inspectUV16Slot(snapshot,slot);
 const diff=prepareUV16OfflineFrequencyDiff({snapshot,slot,
  expectedRxMHz:original.rxMHz,expectedTxMHz:original.txMHz,
  newRxMHz,newTxMHz:original.txMHz});
 if(diff.changedOffsets.length===0||diff.changedOffsets.some(offset=>offset<slot*16||offset>=slot*16+4))
   fail('Change must affect selected RX frequency only');
 const before=main.slice(slot*16,slot*16+16),after=fromHex(diff.afterRecordHex);
 if(!same(after.slice(4),before.slice(4)))fail('TX frequency or retained channel settings would change');
 return Object.freeze({slot,oldRxMHz:original.rxMHz,newRxMHz,txMHz:original.txMHz,
  beforeHex:hex(before),afterHex:hex(after),capturedMainHex:capture.main.bytesHex.toLowerCase(),
  auxiliary:Object.freeze(capture.auxiliary.map(x=>Object.freeze({address:x.address,bytesHex:x.bytesHex.toLowerCase()}))),
  changedByteOffsets:Object.freeze(diff.changedOffsets),type:'HN5RV01_SINGLE_RX_CHANGE'});
}
export async function writeUV16OneChannel({port,capture,slot,newRxMHz,consent=false}={}){
 if(consent!==true)fail('Explicit hardware write confirmation required');
 // Preflight is completed before first radio command.
 const plan=prepareUV16HardwareChange({capture,slot,newRxMHz});
 if(!port?.readable?.getReader||!port?.writable?.getWriter)fail('Open physical USB connection required');
 const rx=new SerialByteTransport({port,timeoutMs:3000,maxRead:68});
 const send=async bytes=>{const writer=port.writable.getWriter();try{await writer.write(Uint8Array.from(bytes));}finally{writer.releaseLock();}};
 const receive=count=>rx.read(count);
 const readBlock=async address=>{
  await send([0x53,address>>8,address&255,64]);
  const first=(await receive(1))[0];
  if(first!==6&&first!==0x58)fail('Read response rejected at 0x'+address.toString(16));
  const header=first===6?await receive(4):Uint8Array.from([first,...await receive(3)]);
  if(!same(header,[0x58,address>>8,address&255,64]))fail('Read frame mismatch');
  const data=await receive(64);await send([6]);return data;
 };
 let writeAttempted=false;
 try{
  for(const byte of MAGIC)await send([byte]);
  if(!same(await receive(1),[6]))fail('Radio handshake refused');
  await send([2]);if(!same(await receive(8),ID))fail('Radio identity mismatch');
  await send([6]);if(!same(await receive(1),[6]))fail('Radio identity ACK refused');
  // Read non-aux block before auxiliary, as CHIRP uv5r.py requires.
  const baseAddress=Math.floor(slot/4)*64;
  const current=await readBlock(baseAddress);
  const offset=(slot%4)*16;
  if(!same(current.slice(offset,offset+16),fromHex(plan.beforeHex)))
   fail('Radio channel differs from captured baseline. NO WRITE SENT.');
  for(const item of plan.auxiliary){
   const observed=await readBlock(item.address);
   if(hex(observed)!==item.bytesHex)fail('Auxiliary memory changed at 0x'+item.address.toString(16)+'. NO WRITE SENT.');
   if(item.address===0x1ec0&&String.fromCharCode(...observed.slice(48,55))!=='HN5RV01')
    fail('Firmware mismatch. NO WRITE SENT.');
  }
  // CHIRP uv5r.py::_send_block uses ASCII X, address BE, 16-byte payload, ACK=0x06.
  // This is the first actual HN5RV01 write attempt, not previously validated on hardware.
  const address=slot*16;
  writeAttempted=true;
  await send([0x58,address>>8,address&255,16,...fromHex(plan.afterHex)]);
  const ack=(await receive(1))[0];
  if(ack!==6)fail('Radio did not ACK write. Radio state UNKNOWN; read back before retrying.');
  return {status:'ACK_RECEIVED_NOT_VERIFIED',slot,address,plan,
   warning:'Physical radio may have changed. Reconnect and read all memory to verify; do not write twice.'};
 }catch(error){
  if(writeAttempted)error.message+=' Physical radio state UNKNOWN; do not retry until full readback.';
  throw error;
 }finally{rx.close();}
}
export function compareUV16HardwareReadback({plan,capture}={}){
 if(plan?.type!=='HN5RV01_SINGLE_RX_CHANGE')fail('No prepared hardware change');
 // Strictly validate the new read, and ensure every byte outside the one slot
 // remains exactly equal to the pre-write capture.
 prepareUV16HardwareChange({capture,slot:plan.slot,newRxMHz:plan.oldRxMHz});
 const before=fromHex(plan.capturedMainHex),after=fromHex(capture.main.bytesHex);
 const changed=fromHex(plan.afterHex),offset=plan.slot*16;
 before.set(changed,offset);
 const mainMatches=same(before,after);
 const auxiliaryMatches=AUX.every((addr,i)=>capture.auxiliary[i].address===addr&&
  capture.auxiliary[i].bytesHex.toLowerCase()===plan.auxiliary[i].bytesHex);
 return Object.freeze({verified:mainMatches&&auxiliaryMatches,mainMatches,auxiliaryMatches,
  changedSlot:plan.slot});
}
