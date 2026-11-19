// Isolated, opt-in website preview. Never persists memories or exposes write commands.
import {UV16ReadOnlySession,UV16_MEMORY_SLOTS} from './uv16-read-only-wire.js';
import {validateUV16ReadRegions} from './uv16-read-regions.js';
export async function readUV16WebsiteSample({connection,model,consent=false,Session=UV16ReadOnlySession,signal,onProgress,captureRaw=false,captureCHIRPGuard=false}={}){
  if(model!=='uv-16-pro-v2')throw Error('Memory reading is limited to Baofeng UV-16 Pro V2');
  if(!consent)throw Error('Explicit confirmation is required before sending read commands');
  if(connection?.state!=='connected'||connection?.mode!=='usb'||!connection.port)
    throw Error('Connect the UV-16 USB cable before reading');
  if(captureCHIRPGuard&&!captureRaw)throw Error('CHIRP guard capture requires a raw snapshot');
  // PR #51: one uninterrupted handshake, firmware validation and full memory read.
  const session=new Session({port:connection.port});
  const result=await session.readMemory({signal,onProgress,captureRaw,captureCHIRPGuard});
  if(result.readOnly!==true||!Array.isArray(result.channels)||result.channels.length>UV16_MEMORY_SLOTS||result.capacity!==UV16_MEMORY_SLOTS)
    throw Error('Unexpected memory response; no channel data accepted');
  const seen=new Set();
  const channels=result.channels.map(channel=>{
    if(!Number.isInteger(channel.slot)||channel.slot<0||channel.slot>=UV16_MEMORY_SLOTS||seen.has(channel.slot)||
       !Number.isFinite(channel.rx)||!Number.isFinite(channel.tx))
      throw Error('Invalid radio memory sample');
    seen.add(channel.slot);
    return Object.freeze({slot:channel.slot,rx:channel.rx,tx:channel.tx});
  });
  if(captureRaw){
    if(!result.rawSnapshot||!validateUV16ReadRegions(result.rawSnapshot))throw Error('Read-region capture unavailable; no backup accepted');
  }
  if(captureCHIRPGuard){
    const capture=result.chirpGuardCapture;
    if(capture?.format!=='bsg-uv16-chirp-guard-capture-v1'||capture.firmware!=='HN5RV01'||capture.readOnly!==true||capture.restorable!==false||
      !Array.isArray(capture.regions)||capture.regions.length!==3||
      ![0x1f00,0x1f40,0x1f80].every((address,i)=>capture.regions[i]?.address===address&&/^(?:[0-9a-fA-F]{2}){64}$/.test(capture.regions[i]?.bytesHex??'')))
      throw Error('Incomplete CHIRP guard capture; no evidence accepted');
  }
  return Object.freeze({firmware:result.firmware,capacity:result.capacity,channels:Object.freeze(channels),hardwareVerified:false,rawSnapshot:captureRaw?result.rawSnapshot:null,
    chirpGuardCapture:captureCHIRPGuard?result.chirpGuardCapture:null});
}
export function formatUV16Sample(result){
  return [
    'Read complete — '+result.channels.length+' programmed channels found',
    'Scanned '+result.capacity+' memory locations.',
    'Radio firmware: '+result.firmware,
    'Channel frequencies retrieved. Mode, tones and power not yet verified.'
  ].join('\n');
}
