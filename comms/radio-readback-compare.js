// Pure comparison gate for future decoded radio reads. No serial operations or writes.
// The caller must separately verify radio identity, protocol and memory decoding.
import {normaliseChannel} from './channels.js';

export class ReadbackComparisonError extends Error {
  constructor(message,code='INVALID_READBACK') {
    super(message);this.name='ReadbackComparisonError';this.code=code;
  }
}
const fail=(message,code)=>{throw new ReadbackComparisonError(message,code);};
const frequencyHz=value=>{
  const number=Number(value);
  if(!Number.isFinite(number)||number<1||number>999.999999)fail('Invalid decoded frequency','INVALID_FREQUENCY');
  const hz=number*1000000;
  if(Math.abs(hz-Math.round(hz))>0.00001)fail('Frequency precision exceeds 1 Hz','INVALID_FREQUENCY');
  return Math.round(hz);
};
function validated(channels,label) {
  if(!Array.isArray(channels)||channels.length<1||channels.length>1000)
    fail(label+' must contain 1–1000 memories','INVALID_LENGTH');
  return channels.map((channel,index)=>{
    if(!channel||typeof channel!=='object')fail(label+' memory '+index+' is invalid','INVALID_MEMORY');
    try{return normaliseChannel(channel);}
    catch(error){fail(label+' memory '+index+': '+error.message,'INVALID_MEMORY');}
  });
}
// This is a comparison of two already-decoded channel lists, NOT proof of a
// physical radio read or permission to enable hardware read/write controls.
export function compareDecodedMemories({referenceChannels,decodedChannels}={}) {
  const expected=validated(referenceChannels,'Reference');
  const actual=validated(decodedChannels,'Decoded');
  if(actual.length!==expected.length)
    fail('Memory count differs: expected '+expected.length+', received '+actual.length,'MEMORY_COUNT_MISMATCH');
  const mismatches=[];
  for(let slot=0;slot<expected.length;slot++){
    for(const field of ['rx','tx','mode']){
      const left=expected[slot][field],right=actual[slot][field];
      const same=field==='mode'?left===right:frequencyHz(left)===frequencyHz(right);
      if(!same)mismatches.push({slot,field,expected:left,actual:right});
    }
  }
  return {match:mismatches.length===0,compared:expected.length,mismatches};
}
