// Offline write-preparation only. Do NOT add a radio command or encoder here.
// The reader now optionally exports captured raw read regions, not a complete verified
// radio image. These bytes are NOT restorable without an independently verified writer.
import {normaliseChannel} from './channels.js';
import {UV16_MEMORY_SLOTS} from './uv16-read-only-wire.js';

export const WRITE_PREP_FORMAT='bsg-uv16-write-preparation-v1';
export const WRITE_PREP_MODEL='uv-16-pro-v2';

const freezeEntries=entries=>Object.freeze(entries.map(entry=>Object.freeze(entry)));
const fixedBlockers=Object.freeze([
 'A complete, restorable raw radio-memory backup is unavailable: the captured read regions are not a verified restorable hardware image.',
 'A firmware-matched UV-16 write encoder and reserved-field mapping have not been verified.',
 'Physical write, readback verification and interruption recovery are not implemented.'
]);

/**
 * Offline risk assessment for the currently displayed Channel Editor.
 * Not a memory encoder. It never opens a serial connection or yields writable bytes.
 */
export function prepareUV16WritePlan({model,channels}={}){
 const issues=[];
 const entries=[];
 if(model!==WRITE_PREP_MODEL)issues.push('Dry-run preparation is supported only for the UV-16 Pro V2.');
 if(!Array.isArray(channels))issues.push('No Channel Editor list was supplied.');
 const input=Array.isArray(channels)?channels:[];
 if(input.length===0)issues.push('No channels are available to prepare.');
 if(input.length>UV16_MEMORY_SLOTS)
  issues.push('Editor has '+input.length+' channels but this radio has only '+UV16_MEMORY_SLOTS+' memory slots.');
 const names=new Set();
 input.forEach((original,index)=>{
  let channel;
  try{channel=normaliseChannel(original??{});}
  catch(error){issues.push('Channel '+(index+1)+': '+error.message);return;}
  const nameKey=channel.name.toLocaleLowerCase('en');
  if(names.has(nameKey))issues.push('Channel '+(index+1)+': duplicate channel name '+channel.name+'.');
  names.add(nameKey);
  if(!channel.receiveOnly)issues.push('Channel '+(index+1)+' ('+channel.name+'): transmit configuration is not authorised or verified.');
  if(channel.tone!=='None'||channel.power!=='Default'||channel.direction!=='Simplex'||Number(channel.offset)!==0)
   issues.push('Channel '+(index+1)+' ('+channel.name+'): radio encoding of advanced settings is unverified.');
  entries.push({
   editorPosition:index+1,name:channel.name,rxMHz:Number(channel.rx),txMHz:Number(channel.tx),
   mode:channel.mode,power:channel.power,tone:channel.tone,toneValue:channel.toneValue,
   direction:channel.direction,offsetMHz:Number(channel.offset),scan:channel.scan,
   receiveOnly:channel.receiveOnly,
   // The editor doesn't retain authoritative physical memory slot IDs. Never guess.
   radioMemorySlot:null
  });
 });
 return Object.freeze({
  format:WRITE_PREP_FORMAT,model:WRITE_PREP_MODEL,
  kind:'OFFLINE_DRY_RUN_ONLY',readyForHardware:false,writeEnabled:false,
  editorCount:input.length,validatedCount:entries.length,
  radioCapacity:UV16_MEMORY_SLOTS,
  rawMemoryBackupAvailable:false,firmwareMatchedEncoderVerified:false,
  entries:freezeEntries(entries),
  issues:Object.freeze(issues),
  blockers:fixedBlockers
 });
}
export function formatUV16WritePlan(plan){
 if(!plan||plan.format!==WRITE_PREP_FORMAT)throw new Error('Invalid write preparation report');
 return [
  'UV-16 Pro V2 — OFFLINE WRITE PREPARATION (NO RADIO COMMANDS)',
  'Hardware write: BLOCKED',
  'Editor channels: '+plan.editorCount+' · Validated: '+plan.validatedCount+' / '+plan.radioCapacity+' capacity',
  'Memory slots: not assigned; optional captured read regions are NOT a restorable backup',
  ...plan.issues.map(issue=>'Check: '+issue),
  ...plan.blockers.map(blocker=>'Blocker: '+blocker),
  'Your current editor channels may be backed up as JSON. This is NOT a restorable radio-memory image.'
 ].join('\n');
}
