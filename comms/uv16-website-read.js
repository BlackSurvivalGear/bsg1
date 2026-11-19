// Isolated, opt-in website preview. Never persists memories or exposes write commands.
import {UV16ReadOnlySession,UV16_MEMORY_SLOTS} from './uv16-read-only-wire.js';
export async function readUV16WebsiteSample({connection,model,consent=false,Session=UV16ReadOnlySession,signal,onProgress}={}){
  if(model!=='uv-16-pro-v2')throw Error('Memory reading is limited to Baofeng UV-16 Pro V2');
  if(!consent)throw Error('Explicit confirmation is required before sending read commands');
  if(connection?.state!=='connected'||connection?.mode!=='usb'||!connection.port)
    throw Error('Connect the UV-16 USB cable before reading');
  // PR #51: one uninterrupted handshake, firmware validation and full memory read.
  const session=new Session({port:connection.port});
  const result=await session.readMemory({signal,onProgress});
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
  return Object.freeze({firmware:result.firmware,capacity:result.capacity,channels:Object.freeze(channels),hardwareVerified:false});
}
export function formatUV16Sample(result){
  return [
    'Read complete — '+result.channels.length+' programmed channels found',
    'Scanned '+result.capacity+' memory locations.',
    'Radio firmware: '+result.firmware,
    'Channel frequencies retrieved. Mode, tones and power not yet verified.'
  ].join('\n');
}
