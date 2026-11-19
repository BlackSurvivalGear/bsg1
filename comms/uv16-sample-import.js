// Convert an explicitly obtained UV-16 memory read into local editor rows.
// This module cannot communicate with a radio. Modes/tones/power are NOT read.
import {normaliseChannel} from './channels.js';
export function sampleToEditorRows(result){
  if(!result||result.hardwareVerified!==false||result.firmware!=='HN5RV01'||
      !Array.isArray(result.channels)||result.channels.length>128||result.capacity!==128)
    throw Error('A complete UV-16 sample read is required');
  const slots=new Set();
  return result.channels.map(item=>{
    if(!Number.isInteger(item.slot)||item.slot<0||item.slot>=128||slots.has(item.slot)||
       !Number.isFinite(item.rx)||!Number.isFinite(item.tx))throw Error('Invalid memory slot or frequency');
    slots.add(item.slot);
    return normaliseChannel({
      name:'UV16-M'+String(item.slot+1).padStart(2,'0'),
      rx:item.rx.toFixed(5),tx:item.tx.toFixed(5),
      mode:'FM',
      notes:'USB memory '+(item.slot+1)+'; frequency read only. Mode, tones and power NOT verified; FM is an editor placeholder.',
      receiveOnly:true
    });
  });
}
export function appendSampleRows(existing,sample,max=1000){
  if(!Array.isArray(existing)||!Array.isArray(sample)||sample.length>128||
      existing.length>max)throw Error('Invalid radio memory rows');
  // Sample rows must be validated; do not trust state or a mock result blindly.
  const rows=sample.map(c=>normaliseChannel(c));
  if(rows.some(c=>c.receiveOnly!==true))throw Error('Sample rows must be receive-only');
  // A repeated USB read must never append a second copy of the same memory.
  // Existing user-edited rows are left unchanged.
  const seen=new Set(existing.map(c=>[c.name,c.rx,c.tx].join('|')));
  const missing=rows.filter(c=>{
    const key=[c.name,c.rx,c.tx].join('|');
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
  if(existing.length+missing.length>max)throw Error('Maximum 1000 channels');
  return [...existing,...missing];
}
