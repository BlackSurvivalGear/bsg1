// UV-16 write readiness assessment ONLY. No serial transport, firmware writes or radio mutation.
// A frequency-only read is not a lossless 16-byte memory backup.
import {normaliseChannel} from './channels.js';
export const WRITE_BLOCKERS=Object.freeze({
  NO_FULL_BACKUP:'A verified, complete raw radio memory backup is required before writing.',
  UNVERIFIED_PROTOCOL:'A model- and firmware-matched physical write protocol has not been verified.',
  UNVERIFIED_FIELDS:'Tone, power, mode and the rest of the 16-byte channel record have not been decoded and validated.'
});
function slotOf(name){
  const match=/^UV16-M(\d{2,3})$/.exec(name);
  if(!match)return null;
  const number=Number(match[1]);
  return number>=1&&number<=128?number-1:null;
}
export function assessUV16WriteReadiness({model,firmware,editorChannels,rawBackupVerified=false,writeProtocolVerified=false,allFieldsVerified=false}={}){
  const blockers=[];
  if(model!=='uv-16-pro-v2')blockers.push('Only the UV-16 Pro V2 is in scope.');
  if(firmware!=='HN5RV01')blockers.push('Radio firmware identity must be confirmed as HN5RV01.');
  if(!Array.isArray(editorChannels)||editorChannels.length>128)blockers.push('Provide at most 128 valid Channel Editor rows.');
  const proposed=[];
  const slots=new Set();
  if(Array.isArray(editorChannels)&&editorChannels.length<=128){
    editorChannels.forEach((row,index)=>{
      try{
        const channel=normaliseChannel(row);
        const slot=slotOf(channel.name);
        if(slot===null)throw Error('No unambiguous physical memory slot');
        if(slots.has(slot))throw Error('Duplicate physical memory slot');
        slots.add(slot);
        if(channel.receiveOnly!==true)throw Error('Only receive-only candidate rows are accepted by the preparation stage');
        proposed.push(Object.freeze({slot,rx:Number(channel.rx),tx:Number(channel.tx)}));
      }catch(error){blockers.push('Editor row '+(index+1)+': '+error.message);}
    });
  }
  if(!rawBackupVerified)blockers.push(WRITE_BLOCKERS.NO_FULL_BACKUP);
  if(!writeProtocolVerified)blockers.push(WRITE_BLOCKERS.UNVERIFIED_PROTOCOL);
  if(!allFieldsVerified)blockers.push(WRITE_BLOCKERS.UNVERIFIED_FIELDS);
  // A readiness report never grants write permission, even if callers claim guards satisfied.
  return Object.freeze({model,firmware,prepared:proposed.length,proposed:Object.freeze(proposed),
    blockers:Object.freeze(blockers),canWrite:false,requiresSeparateHardwareAuthorisation:true});
}
export function compareUV16FrequencyReadback({proposed,readback}={}){
  if(!Array.isArray(proposed)||!readback||readback.firmware!=='HN5RV01'||readback.capacity!==128||
      !Array.isArray(readback.channels))throw Error('Complete, firmware-matched readback is required');
  const actual=new Map();
  for(const channel of readback.channels){
    if(!Number.isInteger(channel.slot)||channel.slot<0||channel.slot>=128||actual.has(channel.slot)||
       !Number.isFinite(channel.rx)||!Number.isFinite(channel.tx))throw Error('Malformed readback');
    actual.set(channel.slot,channel);
  }
  const seen=new Set(),differences=[];
  for(const channel of proposed){
    if(!Number.isInteger(channel.slot)||channel.slot<0||channel.slot>=128||seen.has(channel.slot)||
       !Number.isFinite(channel.rx)||!Number.isFinite(channel.tx))throw Error('Malformed proposal');
    seen.add(channel.slot);
    const observed=actual.get(channel.slot);
    if(!observed||Math.abs(observed.rx-channel.rx)>0.000005||Math.abs(observed.tx-channel.tx)>0.000005)
      differences.push(Object.freeze({slot:channel.slot,expectedRx:channel.rx,expectedTx:channel.tx,
        observedRx:observed?.rx??null,observedTx:observed?.tx??null}));
  }
  return Object.freeze({frequenciesMatch:differences.length===0,checked:proposed.length,
    differences:Object.freeze(differences),settingsVerified:false,writeVerified:false});
}
