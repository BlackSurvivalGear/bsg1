// Validate simulated memory before it can enter the local channel editor.
import {normaliseChannel} from './channels.js';
export function validateVirtualMemory(memory,expectedModel,{maxChannels=1000}={}){
  if(!memory || memory.simulated!==true || memory.model!==expectedModel || !Array.isArray(memory.channels)) throw Error('Invalid simulated memory identity');
  if(memory.channels.length>maxChannels) throw Error('Simulated memory exceeds channel limit');
  const channels=memory.channels.map((channel,index)=>{
    if(!channel || typeof channel!=='object' || Array.isArray(channel)) throw Error('Invalid simulated channel at '+(index+1));
    try{return normaliseChannel(channel);}catch(error){throw Error('Invalid simulated channel '+(index+1)+': '+error.message);}
  });
  return {model:expectedModel,channels};
}
