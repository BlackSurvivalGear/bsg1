// Isolated, opt-in website preview. Never persists memories or exposes write commands.
import {UV16ReadOnlySession} from './uv16-read-only-wire.js';
export async function readUV16WebsiteSample({connection,model,consent=false,Session=UV16ReadOnlySession,signal}={}){
  if(model!=='uv-16-pro-v2')throw Error('Sample reading is limited to Baofeng UV-16 Pro V2');
  if(!consent)throw Error('Explicit confirmation is required before sending read commands');
  if(connection?.state!=='connected'||connection?.mode!=='usb'||!connection.port)
    throw Error('Connect the UV-16 USB cable before reading');
  const session=new Session({port:connection.port});
  const result=await session.readSample({signal});
  if(result.readOnly!==true||!Array.isArray(result.channels)||result.channels.length!==6)
    throw Error('Unexpected sample response; no channel data accepted');
  const seen=new Set();
  const channels=result.channels.map(channel=>{
    if(!Number.isInteger(channel.slot)||channel.slot<0||channel.slot>7||seen.has(channel.slot)||
       !Number.isFinite(channel.rx)||!Number.isFinite(channel.tx))
      throw Error('Invalid radio memory sample');
    seen.add(channel.slot);
    return Object.freeze({slot:channel.slot,rx:channel.rx,tx:channel.tx});
  });
  return Object.freeze({firmware:result.firmware,channels:Object.freeze(channels),hardwareVerified:false});
}
export function formatUV16Sample(result){
  return ['EXPERIMENTAL USB SAMPLE READ — NOT VERIFIED',
    'Firmware: '+result.firmware,
    ...result.channels.map(c=>'Memory '+(c.slot+1)+': RX '+c.rx.toFixed(5)+' MHz / TX '+c.tx.toFixed(5)+' MHz'),
    'Read-only preview. Saved channel editor unchanged. Compare with CHIRP backup.'].join('\n');
}
